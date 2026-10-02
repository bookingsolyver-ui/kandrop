"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { hasAccess } from "@/server/auth/access";
import { readSession } from "@/server/auth/session";
import { CouponCodeTaken, couponRepository } from "@/server/modules/coupons/repository";
import { getStore } from "@/server/modules/store/service";
import { couponInputSchema, storedValue } from "@/shared/coupons/schemas";

export type CouponResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: Record<string, string> }
  | { ok: false; error: "unauthorized" | "forbidden" | "not_found" | "internal" };

/** Only a signed-in OWNER of a paid store: the store always comes from the session, never from the browser. */
async function ownerStoreId(): Promise<string | "unauthorized" | "forbidden"> {
  const session = await readSession();
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return "unauthorized";
  if (session.role !== "owner") return "forbidden";
  return (await getStore(session)).id;
}

/** Creates a coupon for the merchant's own store. The code is made upper case and must be new in this store. */
export async function createCouponAction(raw: unknown): Promise<CouponResult> {
  const store = await ownerStoreId();
  if (store === "unauthorized" || store === "forbidden") return { ok: false, error: store };
  try {
    const input = couponInputSchema.parse(raw);
    await couponRepository.create(store, { code: input.code, type: input.type, value: storedValue(input.type, input.value) });
    revalidatePath("/[locale]/dashboard/coupons", "page");
    return { ok: true };
  } catch (err) {
    if (err instanceof CouponCodeTaken) return { ok: false, error: "validation", fields: { code: "code_taken" } };
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const i of err.issues) { const k = String(i.path[0] ?? ""); if (k && !fields[k]) fields[k] = i.message; }
      return { ok: false, error: "validation", fields };
    }
    console.error("[coupons] create failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

/** Switches one of the merchant's coupons off (or on again). A deactivated coupon stops working at checkout at once. */
export async function setCouponActiveAction(id: string, isActive: boolean): Promise<CouponResult> {
  const store = await ownerStoreId();
  if (store === "unauthorized" || store === "forbidden") return { ok: false, error: store };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "not_found" };
  try {
    if (!(await couponRepository.setActive(store, id, isActive))) return { ok: false, error: "not_found" };
    revalidatePath("/[locale]/dashboard/coupons", "page");
    return { ok: true };
  } catch (err) {
    console.error("[coupons] toggle failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
