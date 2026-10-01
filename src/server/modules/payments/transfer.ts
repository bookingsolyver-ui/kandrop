import { getEnv } from "@/server/config/env";
import { normalizePhone } from "@/shared/checkout/schemas";
import { hasValidIbanChecksum, normalizeIban } from "@/shared/bank/schemas";

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

/**
 * What the shopper's order page may show for paying Kandrop, field by field, each one only when it is set AND
 * valid. Nothing is ever invented and the sandbox example is never used here: a shopper would send real money
 * to it. Read from `BANK_TRANSFER_BANK_NAME` (or `BANK_TRANSFER_BANK`), `BANK_TRANSFER_ACCOUNT_NAME` (or
 * `BANK_TRANSFER_HOLDER`), `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_BIC_SWIFT` (optional) and `SUPPORT_WHATSAPP`.
 * A missing or blank value simply is not there; an invalid IBAN or number is left out and logged.
 */
export interface OrderPaymentInfo {
  bank?: string;
  holder?: string;
  /** Upper-case, no spaces. Present only when it passes the Angolan IBAN check. */
  iban?: string;
  bic?: string;
  /** National 9-digit number (the `+244` is added when a link is built). */
  whatsapp?: string;
}

const clean = (v: string | undefined, max = 80) => {
  const t = v?.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
};

export function orderPaymentInfo(): OrderPaymentInfo {
  const env = getEnv();
  const info: OrderPaymentInfo = {
    bank: clean(env.BANK_TRANSFER_BANK_NAME ?? env.BANK_TRANSFER_BANK),
    holder: clean(env.BANK_TRANSFER_ACCOUNT_NAME ?? env.BANK_TRANSFER_HOLDER),
  };

  const rawIban = clean(env.BANK_TRANSFER_IBAN, 60);
  if (rawIban) {
    const iban = normalizeIban(rawIban);
    if (hasValidIbanChecksum(iban)) info.iban = iban;
    else console.error("[payments] BANK_TRANSFER_IBAN is not a valid Angolan IBAN (AO + 23 digits, with a correct check): not shown");
  }

  const bic = clean(env.BANK_TRANSFER_BIC_SWIFT, 20)?.replace(/\s/g, "").toUpperCase();
  if (bic) {
    if (/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) info.bic = bic;
    else console.error("[payments] BANK_TRANSFER_BIC_SWIFT is not a valid BIC/SWIFT code (8 or 11 characters): not shown");
  }

  const rawWhatsapp = clean(env.SUPPORT_WHATSAPP, 30);
  if (rawWhatsapp) {
    const number = normalizePhone(rawWhatsapp);
    if (/^9\d{8}$/.test(number)) info.whatsapp = number;
    else console.error("[payments] SUPPORT_WHATSAPP is not a 9-digit Angolan mobile number: the WhatsApp button is hidden");
  }
  return info;
}
