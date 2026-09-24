import { MAX_IMAGE_DATA_URL_CHARS } from "@/shared/products/schemas";

export type ImageProblem = "type" | "size" | "unreadable";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Progressively smaller attempts until the result fits the API's limit. */
const ATTEMPTS: Array<{ side: number; quality: number }> = [
  { side: 1200, quality: 0.82 },
  { side: 900, quality: 0.7 },
  { side: 640, quality: 0.6 },
];

/**
 * Phone photos are several MB. Resizing here keeps uploads fast on slow connections and inside the
 * server's limit. Output is always JPEG (transparent PNGs are flattened onto white).
 */
export async function prepareImage(
  file: File
): Promise<{ ok: true; dataUrl: string } | { ok: false; problem: ImageProblem }> {
  if (!ACCEPTED.includes(file.type)) return { ok: false, problem: "type" };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, problem: "size" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, problem: "unreadable" };
  }

  try {
    for (const { side, quality } of ATTEMPTS) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, problem: "unreadable" };
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS) return { ok: true, dataUrl };
    }
    return { ok: false, problem: "size" };
  } finally {
    bitmap.close();
  }
}
