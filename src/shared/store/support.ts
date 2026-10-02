import { z } from "zod";

/** Messages are stable CODES; the UI translates `Settings.support.validation.<code>`. */
export type StoreSupportCode = "whatsapp_invalid" | "email_invalid";

/** The store's OWN support contacts, shown to ITS customers (never the platform's). Both optional; empty removes. */
export const storeSupportSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, "").replace(/^\+?244/, ""))
    .refine((v) => v === "" || /^9\d{8}$/.test(v), "whatsapp_invalid"),
  email: z.string().trim().toLowerCase().max(120, "email_invalid").refine((v) => v === "" || z.email().safeParse(v).success, "email_invalid"),
});
export type StoreSupportInput = z.input<typeof storeSupportSchema>;

export interface StoreSupport {
  whatsapp: string | null;
  email: string | null;
}
