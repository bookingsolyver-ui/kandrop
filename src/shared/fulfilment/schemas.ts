import { z } from "zod";
import { PROVINCES } from "@/shared/supplier/schemas";

/**
 * The parcel's journey from the supplier's warehouse to the shopper, driven by the Kandrop team.
 * One table for the API (the rule) and the screens (which button to offer), so they cannot drift.
 */
export const LOGISTICS_STATUSES = ["pending", "preparing", "picked_up", "in_transit", "delivered"] as const;
export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];

/** Forward one step at a time; `delivered` is final. */
export const nextLogisticsStatus = (s: LogisticsStatus): LogisticsStatus | null => LOGISTICS_STATUSES[LOGISTICS_STATUSES.indexOf(s) + 1] ?? null;
export const canAdvanceLogistics = (from: LogisticsStatus, to: LogisticsStatus) => nextLogisticsStatus(from) === to;

/** What the buyer types on the product page. Messages are codes: `Storefront.buy.validation.<code>`. */
const digits = (s: string) => s.replace(/[\s.-]/g, "");
export const buyerSchema = z.object({
  name: z.string().trim().min(3, "name_invalid").max(80, "name_invalid"),
  phone: z.string().transform(digits).pipe(z.string().regex(/^9\d{8}$/, "phone_invalid")),
  province: z.enum(PROVINCES, "province_invalid"),
  city: z.string().trim().min(2, "city_invalid").max(80, "city_invalid"),
  street: z.string().trim().min(3, "street_invalid").max(160, "street_invalid"),
  reference: z.string().trim().max(160, "reference_invalid").optional().transform((v) => v || undefined),
});
export type BuyerInput = z.input<typeof buyerSchema>;
