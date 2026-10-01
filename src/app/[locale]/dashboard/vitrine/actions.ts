"use server";

import { revalidatePath } from "next/cache";
import { hasAccess } from "@/server/auth/access";
import { readSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { importSupplierProduct } from "@/server/modules/vitrine/service";

export type ImportResult =
  | { ok: true; productId: string }
  | { ok: false; error: "unauthorized" | "not_found" | "already_imported" | "plan_limit" | "internal" };

/** A merchant adds an approved supplier product to their own store (as a draft they can then price). */
export async function importSupplierProductAction(supplierProductId: string): Promise<ImportResult> {
  const session = await readSession();
  // Only a paying merchant: a supplier's session, or an unpaid account, is refused.
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return { ok: false, error: "unauthorized" };
  if (!/^[0-9a-f-]{36}$/i.test(supplierProductId)) return { ok: false, error: "not_found" };
  try {
    const { productId } = await importSupplierProduct(session, supplierProductId);
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true, productId };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "not_found") return { ok: false, error: "not_found" };
      if (err.code === "delivery_exists") return { ok: false, error: "already_imported" };
      if (err.code === "plan_limit_reached") return { ok: false, error: "plan_limit" };
      if (err.code === "payment_required") return { ok: false, error: "unauthorized" };
    }
    console.error("[vitrine] import failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
