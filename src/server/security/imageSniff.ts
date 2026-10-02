import "server-only";
import type { ImageMime } from "@/server/modules/products/schema";

/** The most an uploaded image may weigh once decoded (the data URL schema caps the request even lower). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ascii = (b: Buffer, from: number, to: number) => b.subarray(from, to).toString("latin1");

/** Text that has no business inside a picture: a script or a PHP tag hidden in the metadata or the pixels' tail. */
const ACTIVE_CONTENT = /<\?php|<\?=|<script|<html|<svg|#!\/|MZ\x90\x00|\x7fELF/i;

function isPng(b: Buffer): boolean {
  // 8-byte signature, then the first chunk must be IHDR (13 bytes of data) and the file must end with IEND.
  return (
    b.length > 33 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
    b.readUInt32BE(8) === 13 &&
    ascii(b, 12, 16) === "IHDR" &&
    ascii(b, b.length - 8, b.length - 4) === "IEND"
  );
}

function isJpeg(b: Buffer): boolean {
  // SOI, a marker right after it, and EOI at the end (a few trailing zero bytes are tolerated).
  if (b.length < 125 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return false;
  let end = b.length;
  while (end > 2 && b[end - 1] === 0) end--;
  return b[end - 2] === 0xff && b[end - 1] === 0xd9;
}

function isWebp(b: Buffer): boolean {
  // RIFF <size> WEBP, the declared size must match the file, and the first chunk is a WebP one.
  return (
    b.length > 20 &&
    ascii(b, 0, 4) === "RIFF" &&
    ascii(b, 8, 12) === "WEBP" &&
    b.readUInt32LE(4) + 8 === b.length &&
    ["VP8 ", "VP8L", "VP8X"].includes(ascii(b, 12, 16))
  );
}

/**
 * What the bytes really are, by their file signature and structure (never by the name or the declared
 * type): `null` when they are not a well-formed JPEG/PNG/WebP, are too big, or carry active content.
 */
export function sniffImage(b: Buffer): ImageMime | null {
  if (b.length === 0 || b.length > MAX_IMAGE_BYTES) return null;
  const mime: ImageMime | null = isPng(b) ? "image/png" : isJpeg(b) ? "image/jpeg" : isWebp(b) ? "image/webp" : null;
  if (!mime) return null;
  if (ACTIVE_CONTENT.test(b.toString("latin1"))) return null;
  return mime;
}
