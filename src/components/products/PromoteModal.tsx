"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { promoteLinks, type MyProductRow } from "@/shared/products/myProducts";

type LinkKey = "checkout" | "landing";
/** What the modal needs of a product: nothing more (and all of it typed, never optional). */
export type PromoteTarget = Pick<MyProductRow, "id" | "slug" | "title">;

const svg = { "aria-hidden": true, width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const CopyIcon = () => <svg {...svg}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>;
const OpenIcon = () => <svg {...svg}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>;
const CloseIcon = () => <svg {...svg}><path d="M6 6l12 12M18 6 6 18" /></svg>;

/** Copies text; the modern API first, then `execCommand` for browsers (or insecure contexts) without it. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

const PRIMARY = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black shadow-[0_6px_18px_-8px_rgba(255,90,0,0.8)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_10px_22px_-8px_rgba(255,90,0,0.9)] focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none active:translate-y-0";
const SECONDARY = "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--ink-200)] bg-white px-5 text-sm font-semibold text-[var(--ink-900)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--ink-300)] hover:shadow-[var(--sh-md)] focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none active:translate-y-0";

/**
 * "Links de Divulgação": the two public addresses of an active product, ready to paste in WhatsApp, Instagram or an
 * ad: the direct checkout and the sales page. Each has a read-only field, "Copiar" (with a confirmation toast) and
 * "Testar" (opens it in a new tab, as the shopper sees it). The addresses are built from the product's slug on the
 * public site address (`siteOrigin`), never typed by hand.
 */
export function PromoteModal({ product, siteOrigin, onClose }: { product: PromoteTarget | null; siteOrigin: string; onClose: () => void }) {
  const t = useTranslations("MyProducts.promote");
  const locale = useLocale();
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<LinkKey | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  const links = product ? promoteLinks(siteOrigin, locale, product.slug) : null;

  async function copy(key: LinkKey) {
    if (!links) return;
    const ok = await copyText(links[key]);
    toast({ message: t(ok ? "copied" : "copyFailed") });
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2200);
    }
  }

  const sections: Array<{ key: LinkKey; n: string }> = [
    { key: "checkout", n: "1" },
    { key: "landing", n: "2" },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby="promote-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-[var(--ink-200)] bg-white p-0 text-[var(--ink-900)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      {product && links && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="promote-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">{t("title")}</h2>
              <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-[var(--ink-600)]">{t("subtitle")}</p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label={t("close")} className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-500)] transition-colors hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]">
              <CloseIcon />
            </button>
          </div>
          <p className="mt-4 truncate rounded-xl bg-[var(--ink-50)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-700)]">{product.title}</p>

          <div className="mt-6 space-y-6">
            {sections.map(({ key, n }) => (
              <section key={key} aria-labelledby={`promote-${key}`}>
                <h3 id={`promote-${key}`} className="flex items-center gap-2.5 text-[15px] font-bold">
                  <span aria-hidden className="grid size-6 place-items-center rounded-full bg-brand-orange text-[12px] font-extrabold text-brand-black">{n}</span>
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-1 text-[13px] text-[var(--ink-500)]">{t(`${key}.hint`)}</p>
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    readOnly
                    value={links[key]}
                    aria-label={t(`${key}.title`)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-3.5 font-mono text-[13px] text-[var(--ink-800,var(--ink-900))] outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15"
                  />
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => void copy(key)} className={`${PRIMARY} flex-1 sm:flex-none`}>
                      <CopyIcon />
                      {copied === key ? t("copiedShort") : t("copy")}
                    </button>
                    <a href={links[key]} target="_blank" rel="noopener noreferrer" className={`${SECONDARY} flex-1 sm:flex-none`}>
                      <OpenIcon />
                      {t("test")}
                    </a>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}
