import { getEnv } from "@/server/config/env";
import { normalizePhone } from "@/shared/checkout/schemas";

export interface SupportContacts {
  /** National number, 9 digits (the `+244` is added when a link is built). */
  whatsapp: string;
  email: string;
}

/**
 * The contact details on the Support page. They are the ones the product owner gave; each can be
 * overridden from the environment (`SUPPORT_WHATSAPP`, shared with the bank-transfer proofs, and
 * `SUPPORT_EMAIL`), so that changing them never needs a code change.
 * NOTE: the default e-mail is on the `ikaruspay.com` domain, not Kandrop's: confirm it is intended.
 */
const DEFAULTS: SupportContacts = { whatsapp: "973966207", email: "suporte@ikaruspay.com" };

export function supportContacts(): SupportContacts {
  const env = getEnv();
  const whatsapp = normalizePhone(env.SUPPORT_WHATSAPP ?? "");
  return {
    whatsapp: /^9\d{8}$/.test(whatsapp) ? whatsapp : DEFAULTS.whatsapp,
    email: env.SUPPORT_EMAIL ?? DEFAULTS.email,
  };
}
