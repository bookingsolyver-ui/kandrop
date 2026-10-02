import "server-only";
import { encryptField, tryDecryptField } from "@/server/crypto/field";
import { db, must } from "@/server/db/client";
import type { ImageMime } from "@/server/modules/products/schema";
import { maskIban } from "@/shared/bank/schemas";

export type ProductStatus = "in_review" | "approved" | "rejected";

/** A catalogue row WITHOUT the image bytes (lists stay light; the image has its own route). */
export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  description: string;
  category: string;
  /** Minor units. */
  costPrice: number;
  stock: number;
  status: ProductStatus;
  hasImage: boolean;
  createdAt: number;
  updatedAt: number;
}

const LIST_COLUMNS = "id,supplier_id,name,description,category,cost_price,stock,status,image_mime,created_at,updated_at";

function fromRow(row: Record<string, unknown>): SupplierProduct {
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    category: String(row.category),
    costPrice: Number(row.cost_price),
    stock: Number(row.stock),
    status: (["in_review", "approved", "rejected"].includes(String(row.status)) ? row.status : "in_review") as ProductStatus,
    hasImage: row.image_mime != null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/** EVERY query below filters by `supplier_id`: a supplier only ever reaches its own rows. */
export const supplierProducts = {
  async list(supplierId: string): Promise<SupplierProduct[]> {
    const data = must(
      "supplier_products.list",
      await db().from("supplier_products").select(LIST_COLUMNS).eq("supplier_id", supplierId).order("created_at", { ascending: false })
    );
    return (data ?? []).map(fromRow);
  },

  async get(supplierId: string, id: string): Promise<SupplierProduct | null> {
    const row = must(
      "supplier_products.get",
      await db().from("supplier_products").select(LIST_COLUMNS).eq("supplier_id", supplierId).eq("id", id).maybeSingle()
    );
    return row ? fromRow(row) : null;
  },

  /** New products start `in_review`; an edit sends the product back to review (the team approved the old version). */
  async create(supplierId: string, input: { name: string; description: string; category: string; costPrice: number; stock: number }, image: { mime: ImageMime; base64: string } | null) {
    const now = Date.now();
    const row = must(
      "supplier_products.create",
      await db()
        .from("supplier_products")
        .insert({
          supplier_id: supplierId,
          name: input.name,
          description: input.description,
          category: input.category,
          cost_price: input.costPrice * 100,
          stock: input.stock,
          status: "in_review",
          image_mime: image?.mime ?? null,
          image_data: image?.base64 ?? null,
          created_at: now,
          updated_at: now,
        })
        .select(LIST_COLUMNS)
        .single()
    );
    if (!row) throw new Error("Database error: supplier_products.create returned no row");
    return fromRow(row);
  },

  async update(supplierId: string, id: string, input: { name: string; description: string; category: string; costPrice: number; stock: number }, image: { mime: ImageMime; base64: string } | null): Promise<SupplierProduct | null> {
    const patch: Record<string, unknown> = {
      name: input.name,
      description: input.description,
      category: input.category,
      cost_price: input.costPrice * 100,
      stock: input.stock,
      status: "in_review",
      updated_at: Date.now(),
    };
    if (image) {
      patch.image_mime = image.mime;
      patch.image_data = image.base64;
    }
    const row = must(
      "supplier_products.update",
      await db().from("supplier_products").update(patch).eq("supplier_id", supplierId).eq("id", id).select(LIST_COLUMNS).maybeSingle()
    );
    return row ? fromRow(row) : null;
  },

  async remove(supplierId: string, id: string): Promise<boolean> {
    const rows = must(
      "supplier_products.delete",
      await db().from("supplier_products").delete().eq("supplier_id", supplierId).eq("id", id).select("id")
    );
    return (rows ?? []).length > 0;
  },

  async image(supplierId: string, id: string): Promise<{ mime: ImageMime; data: Buffer } | null> {
    const row = must(
      "supplier_products.image",
      await db().from("supplier_products").select("image_mime,image_data").eq("supplier_id", supplierId).eq("id", id).maybeSingle()
    );
    if (!row || !row.image_data || !row.image_mime) return null;
    return { mime: row.image_mime as ImageMime, data: Buffer.from(String(row.image_data), "base64") };
  },

  /** For the Kandrop team's review queue (all suppliers). */
  async listForReview(): Promise<Array<SupplierProduct & { supplierName: string }>> {
    const data = must(
      "supplier_products.review",
      await db().from("supplier_products").select(`${LIST_COLUMNS}, suppliers(company_name)`).eq("status", "in_review").order("created_at", { ascending: true }).limit(200)
    );
    return (data ?? []).map((r) => ({
      ...fromRow(r),
      supplierName: String((r as { suppliers?: { company_name?: string } | null }).suppliers?.company_name ?? "—"),
    }));
  },

  async setStatus(id: string, status: ProductStatus): Promise<{ before: ProductStatus } | null> {
    const current = must("supplier_products.status", await db().from("supplier_products").select("status").eq("id", id).maybeSingle());
    if (!current) return null;
    must("supplier_products.setStatus", await db().from("supplier_products").update({ status, updated_at: Date.now() }).eq("id", id));
    return { before: current.status as ProductStatus };
  },
};

// ── Bank details ──────────────────────────────────────────────────────────────────────────

const ibanContext = (supplierId: string) => `supplier_bank_accounts.iban:${supplierId}`;

export interface SupplierBankPublic {
  bankName: string;
  holderName: string;
  /** `AO06 •••• •••• •••• •••• 1234`: the full IBAN never leaves the server. */
  ibanMasked: string;
  updatedAt: number;
}

export const supplierBank = {
  async get(supplierId: string): Promise<SupplierBankPublic | null> {
    const row = must("supplier_bank_accounts.get", await db().from("supplier_bank_accounts").select("*").eq("supplier_id", supplierId).maybeSingle());
    if (!row) return null;
    // Decrypted in memory only to be masked; a legacy plaintext value is masked the same way.
    const iban = tryDecryptField(String(row.iban), ibanContext(supplierId));
    // Unreadable (the key changed): show "no details yet" so the supplier enters them again, rather than crash.
    if (iban === null) return null;
    return { bankName: String(row.bank_name), holderName: String(row.holder_name), ibanMasked: maskIban(iban), updatedAt: Number(row.updated_at) };
  },

  /** The FULL account, decrypted: only for the administrator's transfer export (audited), never for a page payload. */
  async getFull(supplierId: string): Promise<{ bankName: string; holderName: string; iban: string } | null> {
    const row = must("supplier_bank_accounts.getFull", await db().from("supplier_bank_accounts").select("*").eq("supplier_id", supplierId).maybeSingle());
    if (!row) return null;
    const iban = tryDecryptField(String(row.iban), ibanContext(supplierId));
    return iban === null ? null : { bankName: String(row.bank_name), holderName: String(row.holder_name), iban };
  },

  async save(supplierId: string, input: { bankName: string; holderName: string; iban: string }): Promise<void> {
    must(
      "supplier_bank_accounts.save",
      await db().from("supplier_bank_accounts").upsert({
        supplier_id: supplierId,
        bank_name: input.bankName,
        holder_name: input.holderName,
        // ENCRYPTED before it touches the database.
        iban: encryptField(input.iban, ibanContext(supplierId)),
        updated_at: Date.now(),
      })
    );
  },
};
