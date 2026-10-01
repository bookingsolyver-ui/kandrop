import { z } from "zod";
import { PROVINCES } from "@/shared/supplier/schemas";

/** Messages are stable CODES; the UI translates `Settings.location.validation.<code>`. */
export type StoreProfileCode = "province_invalid" | "municipality_invalid";

/** Where the store operates: the province/city and the municipality. */
export const storeProfileSchema = z.object({
  province: z.enum(PROVINCES, "province_invalid"),
  municipality: z.string().trim().min(2, "municipality_invalid").max(80, "municipality_invalid"),
});
export type StoreProfileInput = z.input<typeof storeProfileSchema>;
