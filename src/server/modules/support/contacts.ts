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
 * The default inbox is `suporte@kandrop.com`: make sure that mailbox exists before launch.
 */
const DEFAULTS: SupportContacts = { whatsapp: "973966207", email: "suporte@kandrop.com" };

export function supportContacts(): SupportContacts {
  const env = getEnv();
  const whatsapp = normalizePhone(env.SUPPORT_WHATSAPP ?? "");
  return {
    whatsapp: /^9\d{8}$/.test(whatsapp) ? whatsapp : DEFAULTS.whatsapp,
    email: env.SUPPORT_EMAIL ?? DEFAULTS.email,
  };
}
