import { z } from "zod";

export const meSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  role: z.enum(["owner", "staff"]),
  fullName: z.string(),
  email: z.string(),
  /** Preferred UI language, persisted server-side so emails/notifications match. */
  locale: z.enum(["pt", "en", "fr"]),
});

export type Me = z.infer<typeof meSchema>;
