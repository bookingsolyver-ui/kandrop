import { useTranslations } from "next-intl";

export interface BankDetailsData { bank: string; holder: string; iban: string; whatsapp: string; example: boolean }

/** Where to send the payment and the proof: bank, holder and IBAN (when set), and the WhatsApp that receives the proof. */
export function BankDetails({ info }: { info: BankDetailsData }) {
  const t = useTranslations("Subscribe.bank");
  const rows: Array<[string, string]> = [[t("bank"), info.bank], [t("holder"), info.holder], [t("iban"), info.iban.replace(/(.{4})/g, "$1 ").trim()]];
  return (
    <div className="rounded-lg border border-line p-5">
      <p className="text-[11px] font-bold tracking-[0.14em] text-accent uppercase">{t("title")}</p>
      <dl className="mt-3 divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="mono-num text-right font-medium break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {info.example && <p className="mt-3 text-[13px] text-ink-muted">{t("example")}</p>}
    </div>
  );
}
