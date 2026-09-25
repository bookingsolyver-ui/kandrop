import { getEnv } from "@/server/config/env";
import { normalizePhone } from "@/shared/checkout/schemas";

/** Where a shopper sends a bank transfer for a Kandrop plan, and who receives the proof. */
export interface TransferInfo {
  bank: string;
  holder: string;
  account: string;
  /** Digits only, `AO06` + 21 digits. */
  iban: string;
  /** National number, 9 digits (the `+244` is added when a link is built). */
  whatsapp: string;
  /** True when these are the sandbox EXAMPLE details, not a real account. */
  example: boolean;
}

/** !! Fictional, and shown as such (`example: true`). Never used outside sandbox mode. */
const EXAMPLE: TransferInfo = {
  bank: "Banco BAI",
  holder: "Kandrop (exemplo)",
  account: "123456789",
  iban: "AO06000000000000000000000",
  whatsapp: "900000000",
  example: true,
};

const IBAN = /^AO06\d{21}$/;
const NATIONAL = /^9\d{8}$/;

/**
 * The transfer details to show, or `null` when bank transfer must not be offered. From the
 * environment (`BANK_TRANSFER_*`, `SUPPORT_WHATSAPP`); invalid or partial settings are refused
 * (logged, never guessed at); in sandbox mode the labelled example fills the gap.
 */
export function transferInfo(): TransferInfo | null {
  const env = getEnv();
  const set = [
    env.BANK_TRANSFER_BANK,
    env.BANK_TRANSFER_ACCOUNT,
    env.BANK_TRANSFER_IBAN,
    env.SUPPORT_WHATSAPP,
  ];
  if (set.every((v) => v === undefined)) return env.PAYMENTS_MODE === "sandbox" ? EXAMPLE : null;

  const iban = (env.BANK_TRANSFER_IBAN ?? "").replace(/\s/g, "").toUpperCase();
  const whatsapp = normalizePhone(env.SUPPORT_WHATSAPP ?? "");
  if (set.some((v) => v === undefined) || !IBAN.test(iban) || !NATIONAL.test(whatsapp)) {
    console.error(
      "[payments] bank transfer is misconfigured (need BANK_TRANSFER_BANK, _ACCOUNT, _IBAN as AO06 + 21 digits, and SUPPORT_WHATSAPP as a 9-digit Angolan number): not offered"
    );
    return null;
  }
  return {
    bank: env.BANK_TRANSFER_BANK!,
    holder: env.BANK_TRANSFER_HOLDER ?? "Kandrop",
    account: env.BANK_TRANSFER_ACCOUNT!,
    iban,
    whatsapp,
    example: false,
  };
}
