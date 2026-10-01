import { z } from "zod";

/** Messages are stable CODES; the UI translates `Settings.integrations.validation.<code>`. */
export type MetaPixelCode = "pixel_invalid";

/** The merchant's Meta Pixel id: digits only (6 to 20). Empty = remove the pixel. */
export const metaPixelSchema = z.object({
  metaPixelId: z.string().trim().refine((v) => v === "" || /^\d{6,20}$/.test(v), "pixel_invalid"),
});
export type MetaPixelInput = z.input<typeof metaPixelSchema>;
