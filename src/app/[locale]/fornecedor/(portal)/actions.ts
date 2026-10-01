"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { readSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter } from "@/server/http/rateLimit";
import { supplierBank, supplierProducts } from "@/server/modules/supplier/catalog";
import { MIN_WITHDRAWAL, requestWithdrawal } from "@/server/modules/supplier/withdrawals";
import { findSupplier, verifySupplierPassword } from "@/server/modules/supplier/service";
import { MAX_IMAGE_BYTES, sniffImage } from "@/server/security/imageSniff";
import { bankDetailsSchema, productInputSchema } from "@/shared/supplier/schemas";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: Record<string, string> }
  | { ok: false; error: "unauthorized" | "not_found" | "password_incorrect" | "rate_limited" | "insufficient_balance" | "no_bank_account" | "internal" };

const fieldsOf = (err: ZodError): ActionResult => {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fields[field]) fields[field] = issue.message;
  }
  return { ok: false, error: "validation", fields };
};

/**
 * Every action starts here: a signed-in supplier whose account is APPROVED. Nothing the browser sends
 * (not even an id) is trusted to say who is acting: the supplier id comes from the session.
 */
async function currentSupplierId(): Promise<string | null> {
  const session = await readSession();
  if (!session || session.role !== "supplier") return null;
  const supplier = await findSupplier(session.userId);
  return supplier && supplier.status === "approved" ? supplier.id : null;
}

/** The optional image of the form: size first, then what the bytes really are (never the name or the declared type). */
async function readImage(data: FormData): Promise<{ mime: "image/jpeg" | "image/png" | "image/webp"; base64: string } | null | "invalid"> {
  const file = data.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return "invalid";
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  return mime ? { mime, base64: bytes.toString("base64") } : "invalid";
}

/** Creates a product (status `in_review`) or, with an `id`, edits one of THIS supplier's products. */
export async function saveProductAction(data: FormData): Promise<ActionResult> {
  const supplierId = await currentSupplierId();
  if (!supplierId) return { ok: false, error: "unauthorized" };

  let input;
  try {
    input = productInputSchema.parse({
      id: (data.get("id") as string) || undefined,
      name: data.get("name"),
      description: data.get("description"),
      category: data.get("category"),
      costPrice: data.get("costPrice"),
      stock: data.get("stock"),
    });
  } catch (err) {
    if (err instanceof ZodError) return fieldsOf(err);
    return { ok: false, error: "internal" };
  }
  const image = await readImage(data);
  if (image === "invalid") return { ok: false, error: "validation", fields: { image: "image_invalid" } };

  try {
    if (input.id) {
      const updated = await supplierProducts.update(supplierId, input.id, input, image);
      if (!updated) return { ok: false, error: "not_found" };
    } else {
      await supplierProducts.create(supplierId, input, image);
    }
    revalidatePath("/[locale]/fornecedor", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[supplier] saveProduct failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const supplierId = await currentSupplierId();
  if (!supplierId) return { ok: false, error: "unauthorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "not_found" };
  try {
    const removed = await supplierProducts.remove(supplierId, id);
    if (!removed) return { ok: false, error: "not_found" };
    revalidatePath("/[locale]/fornecedor", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[supplier] deleteProduct failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

// 5 wrong passwords per supplier per 15 minutes: the form is not a guessing oracle for a stolen session.
const passwordAttempts = attemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

/**
 * Saves where the supplier is paid. The password is re-checked first, and the IBAN is ENCRYPTED
 * (AES-256-GCM, `DATA_ENCRYPTION_KEY`) before it is stored: the database never holds it in the clear.
 */
export async function saveBankDetailsAction(raw: unknown): Promise<ActionResult> {
  const supplierId = await currentSupplierId();
  if (!supplierId) return { ok: false, error: "unauthorized" };

  let input;
  try {
    input = bankDetailsSchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) return fieldsOf(err);
    return { ok: false, error: "internal" };
  }

  const key = `supplier-bank:${supplierId}`;
  try {
    passwordAttempts.assertAllowed(key);
  } catch {
    return { ok: false, error: "rate_limited" };
  }
  try {
    if (!(await verifySupplierPassword(supplierId, input.password))) {
      passwordAttempts.recordFailure(key);
      return { ok: false, error: "password_incorrect" };
    }
    passwordAttempts.reset(key);
    await supplierBank.save(supplierId, { bankName: input.bankName, holderName: input.holderName, iban: input.iban });
    revalidatePath("/[locale]/fornecedor", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[supplier] saveBankDetails failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

/**
 * Asks Kandrop to pay the supplier. The amount (whole Kwanzas from the form) is checked in the database against the
 * supplier's REAL balance (delivered and payment-verified lines, minus earlier withdrawals) in one locked transaction.
 */
export async function requestWithdrawalAction(amountKz: number): Promise<ActionResult> {
  const supplierId = await currentSupplierId();
  if (!supplierId) return { ok: false, error: "unauthorized" };
  if (!Number.isSafeInteger(amountKz) || amountKz <= 0 || amountKz * 100 < MIN_WITHDRAWAL) return { ok: false, error: "insufficient_balance" };
  try {
    await requestWithdrawal(supplierId, amountKz * 100);
    revalidatePath("/[locale]/fornecedor", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && (err.code === "insufficient_balance" || err.code === "no_bank_account" || err.code === "not_found")) return { ok: false, error: err.code };
    console.error("[supplier] requestWithdrawal failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
