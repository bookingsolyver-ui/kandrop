import { z } from "zod";

export const storeSchema = z.object({
  id: z.string(),
  /** Merchant-entered legal/trade name — user content, not a translatable UI string. */
  name: z.string().min(1),
  /** Angolan taxpayer number (NIF). */
  nif: z.string().nullable(),
  currency: z.literal("AOA"),
  status: z.enum(["pending_verification", "active", "suspended"]),
});

export type Store = z.infer<typeof storeSchema>;
