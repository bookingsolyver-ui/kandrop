import { createAnonClient } from "@/lib/supabase/server";
import { decryptNullable, encryptNullable } from "@/server/crypto/field";
import { db, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { userRepository } from "@/server/modules/auth/userRepository";
import { supplierRegisterSchema, type SupplierRegisterInput } from "@/shared/supplier/schemas";

export type SupplierStatus = "pending" | "approved" | "rejected";

export interface SupplierRecord {
  id: string;
  email: string;
  companyName: string;
  /** Decrypted in memory only. */
  nif: string | null;
  phone: string | null;
  address: string | null;
  status: SupplierStatus;
  createdAt: number;
}

const nifContext = (id: string) => `suppliers.nif:${id}`;

function fromRow(row: Record<string, unknown>, email: string): SupplierRecord {
  const id = String(row.id);
  return {
    id,
    email,
    companyName: String(row.company_name),
    nif: decryptNullable(row.nif === null ? null : String(row.nif), nifContext(id)),
    phone: row.phone === null ? null : String(row.phone),
    address: row.address === null ? null : String(row.address),
    status: (["pending", "approved", "rejected"].includes(String(row.status)) ? row.status : "pending") as SupplierStatus,
    createdAt: Number(row.created_at),
  };
}

/** The supplier row of an account, or `null` (the account is not a supplier). Never throws on "no row". */
export async function findSupplier(id: string): Promise<SupplierRecord | null> {
  const row = must("suppliers.get", await db().from("suppliers").select("*").eq("id", id).maybeSingle());
  if (!row) return null;
  const { data } = await db().auth.admin.getUserById(id);
  return fromRow(row, data.user?.email ?? "");
}

/** The cheap check used on every request: does a supplier row exist, and is it not rejected? */
export async function supplierIsActive(id: string): Promise<boolean> {
  const row = must("suppliers.status", await db().from("suppliers").select("status").eq("id", id).maybeSingle());
  return !!row && row.status !== "rejected";
}

/**
 * Creates the Supabase Auth user (role `supplier`) and its `suppliers` row, with the tax number
 * encrypted. Validation is the same Zod schema the form uses: the server never trusts the browser.
 */
export async function registerSupplier(raw: unknown): Promise<SupplierRecord> {
  const input = supplierRegisterSchema.parse(raw as SupplierRegisterInput);

  // Merchants live in our own `users` table: one e-mail, one kind of account.
  if (await userRepository.findByEmail(input.email)) throw new ApiError("email_taken");

  const { data, error } = await db().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    // `app_metadata` can only be written with the service key: it is the role that is trusted.
    // `user_metadata` carries it too, as asked, for display; it is never used for a decision.
    app_metadata: { role: "supplier" },
    user_metadata: { role: "supplier", company_name: input.companyName },
  });
  if (error || !data.user) {
    if (error && (error.code === "email_exists" || error.status === 422)) throw new ApiError("email_taken");
    console.error("[supplier] could not create the auth user:", error?.code, error?.message);
    throw new Error("Failed to create supplier");
  }
  const id = data.user.id;

  const { error: insertError } = await db()
    .from("suppliers")
    .insert({
      id,
      company_name: input.companyName,
      nif: encryptNullable(input.nif, nifContext(id)),
      phone: input.phone,
      address: `${input.municipality}, ${input.province}`,
      status: "pending",
    });
  if (insertError) {
    // No half-created accounts: remove the auth user again.
    await db().auth.admin.deleteUser(id);
    console.error("[supplier] could not insert the supplier row:", insertError.code, insertError.message);
    throw new Error("Failed to create supplier");
  }
  const supplier = await findSupplier(id);
  if (!supplier) throw new Error("Failed to create supplier");
  return supplier;
}

/**
 * Checks an e-mail and password against Supabase Auth and that the account really is a supplier
 * (trusted `app_metadata.role` AND a `suppliers` row that is not rejected). Every failure is the same
 * `invalid_credentials`: a merchant, a rejected supplier, an unknown e-mail and a wrong password
 * cannot be told apart from outside.
 */
export async function authenticateSupplier(emailRaw: unknown, password: unknown): Promise<SupplierRecord> {
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!email || typeof password !== "string" || password.length === 0 || password.length > 128) {
    throw new ApiError("invalid_credentials");
  }
  const { data, error } = await createAnonClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new ApiError("invalid_credentials");
  if (data.user.app_metadata?.role !== "supplier") throw new ApiError("invalid_credentials");
  const supplier = await findSupplier(data.user.id);
  if (!supplier || supplier.status === "rejected") throw new ApiError("invalid_credentials");
  return supplier;
}
