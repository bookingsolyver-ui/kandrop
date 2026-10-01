import { z } from "zod";
import { PROVINCES } from "@/shared/supplier/schemas";
import { isDeliverableDay, isSunday, parseIsoDay } from "./deliveryDate";

/**
 * The parcel's journey from the supplier's warehouse to the shopper, driven by the Kandrop team.
 * One table for the API (the rule) and the screens (which button to offer), so they cannot drift.
 */
export const LOGISTICS_JOURNEY = ["pending", "preparing", "picked_up", "in_transit", "delivered"] as const;
/** The journey, plus the one way out: an administrator cancelled the order before it left the warehouse. */
export const LOGISTICS_STATUSES = [...LOGISTICS_JOURNEY, "cancelled"] as const;
export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];

/** Forward one step at a time; `delivered` and `cancelled` are final. */
export const nextLogisticsStatus = (s: LogisticsStatus): LogisticsStatus | null => {
  const i = (LOGISTICS_JOURNEY as readonly string[]).indexOf(s);
  return i < 0 ? null : (LOGISTICS_JOURNEY[i + 1] ?? null);
};
export const canAdvanceLogistics = (from: LogisticsStatus, to: LogisticsStatus) => nextLogisticsStatus(from) === to;

/** What the buyer types on the product page. Messages are codes: `Storefront.buy.validation.<code>`. */
const digits = (s: string) => s.replace(/[\s.-]/g, "");
export const buyerSchema = z.object({
  name: z.string().trim().min(3, "name_invalid").max(80, "name_invalid"),
  email: z.string().trim().toLowerCase().max(120, "email_invalid").email("email_invalid"),
  phone: z.string().transform(digits).pipe(z.string().regex(/^9\d{8}$/, "phone_invalid")),
  province: z.enum(PROVINCES, "province_invalid"),
  city: z.string().trim().min(2, "city_invalid").max(80, "city_invalid"),
  street: z.string().trim().min(3, "street_invalid").max(160, "street_invalid"),
  reference: z.string().trim().max(160, "reference_invalid").optional().transform((v) => v || undefined),
  /** The day the shopper wants it (`YYYY-MM-DD`): from tomorrow, within 30 days, never a Sunday. */
  deliveryDate: z.string().trim().superRefine((value, ctx) => {
    const day = parseIsoDay(value);
    if (day === null) return ctx.addIssue({ code: "custom", message: "date_invalid" });
    if (isSunday(day)) return ctx.addIssue({ code: "custom", message: "date_sunday" });
    if (!isDeliverableDay(day)) ctx.addIssue({ code: "custom", message: "date_invalid" });
  }),
  /** A coupon code the shopper typed. No coupon system exists yet: it is only recorded with the order. */
  coupon: z.string().trim().toUpperCase().optional().transform((v) => v || undefined).pipe(z.string().regex(/^[A-Z0-9_-]{3,32}$/, "coupon_invalid").optional()),
});
export type BuyerInput = z.input<typeof buyerSchema>;
