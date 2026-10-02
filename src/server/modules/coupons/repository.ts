import { db, isUniqueViolation, must } from "@/server/db/client";
import type { CouponRow, CouponType } from "@/shared/coupons/schemas";

/** The code is already used by another coupon of the same store. */
export class CouponCodeTaken extends Error {}

const toRow = (r: Record<string, unknown>): CouponRow => ({
  id: String(r.id),
  code: String(r.code),
  type: r.type === "fixed" ? "fixed" : "percent",
  value: Number(r.value),
  isActive: r.is_active === true,
  createdAt: Number(r.created_at),
});

/** EVERY query filters by `store_id`: a merchant only ever reaches their own coupons. */
export const couponRepository = {
  async list(storeId: string): Promise<CouponRow[]> {
    const data = must("coupons.list", await db().from("coupons").select("*").eq("store_id", storeId).order("created_at", { ascending: false }).limit(200));
    return (data ?? []).map(toRow);
  },

  async create(storeId: string, input: { code: string; type: CouponType; value: number }): Promise<CouponRow> {
    const { data, error } = await db().from("coupons").insert({ store_id: storeId, code: input.code, type: input.type, value: input.value, is_active: true, created_at: Date.now() }).select("*").single();
    if (isUniqueViolation(error)) throw new CouponCodeTaken();
    return toRow(must("coupons.create", { data, error }));
  },

  async setActive(storeId: string, id: string, isActive: boolean): Promise<boolean> {
    const row = must("coupons.setActive", await db().from("coupons").update({ is_active: isActive }).eq("store_id", storeId).eq("id", id).select("id").maybeSingle());
    return !!row;
  },

  /** An ACTIVE coupon of THIS store by its code, or `null`. Never throws on a missing table (before the migration it simply finds nothing). */
  async findActive(storeId: string, code: string): Promise<CouponRow | null> {
    const { data, error } = await db().from("coupons").select("*").eq("store_id", storeId).eq("code", code).eq("is_active", true).maybeSingle();
    if (error) {
      console.error("[coupons] lookup failed", error.code, error.message);
      return null;
    }
    return data ? toRow(data) : null;
  },
};
