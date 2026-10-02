"use client";

import { KWZ } from "@/lib/money";

/** The unit shown after an amount in the product form's price fields: `Kz`. */
export function useCurrencySymbol(): string {
  return KWZ;
}
