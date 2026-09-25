import { useTranslations } from "next-intl";
import { InfoIcon } from "./icons";

/** A quiet notice: what to have ready when writing to support, and what is never asked of you. */
export function InfoBox() {
  const t = useTranslations("Support.info");
  const items = t.raw("items") as string[];

  return (
    <aside
      aria-labelledby="support-info-title"
      className="rounded-lg border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-ink-2">
          <InfoIcon />
        </span>
        <div>
          <h2 id="support-info-title" className="text-[15px] font-semibold">
            {t("title")}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-2 marker:text-ink-muted">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
