import { normalizePhone } from "@/shared/checkout/schemas";

/** `+244 923456789` / `00244…` pasted in any shape → `923 456 789` (max 9 digits). */
export function formatPhone(raw: string): string {
  return normalizePhone(raw)
    .slice(0, 9)
    .replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** Digits grouped by four: `4242 4242 4242 4242`. */
export function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** `MM/YY`, inserting the slash and padding an obvious month (`3` → `03/`). */
export function formatExpiry(raw: string): string {
  let digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && digits > "1") digits = `0${digits}`;
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export const formatCvc = (raw: string) => raw.replace(/\D/g, "").slice(0, 4);
