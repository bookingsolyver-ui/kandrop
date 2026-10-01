"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { hasPublicPage, publicPath, type MyProductRow } from "@/shared/products/myProducts";

const BUTTON =
  "grid size-9 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-700)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--ink-300)] hover:text-[var(--ink-900)] hover:shadow-[var(--sh-md)] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none active:translate-y-0";
const DISABLED = "grid size-9 cursor-not-allowed place-items-center rounded-full border border-[var(--ink-100)] bg-[var(--ink-50)] text-[var(--ink-300)]";

const EyeIcon = () => (
  <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const CopyIcon = () => (
  <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
  </svg>
);

/** Copies text; the modern API first, then the old `execCommand` for browsers (or insecure contexts) without it. */
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

/**
 * The "Links" cell: see the product as the shopper does (opens the public sales page in a new tab) and copy the
 * public link to share. Only an active product has a public page; for the others both buttons are inactive and say why.
 */
export function ProductLinks({ product }: { product: Pick<MyProductRow, "id" | "slug" | "status" | "title"> }) {
  const t = useTranslations("MyProducts.links");
  const locale = useLocale();
  const toast = useToast();
  const path = publicPath(locale, product.slug);

  if (!hasPublicPage(product)) {
    return (
      <div className="flex items-center justify-center gap-2">
        {([["preview", <EyeIcon key="e" />], ["copy", <CopyIcon key="c" />]] as const).map(([key, icon]) => (
          <Tooltip key={key} label={t("inactive")}>
            <span role="img" aria-label={`${t(key)} (${t("inactive")})`} className={DISABLED}>{icon}</span>
          </Tooltip>
        ))}
      </div>
    );
  }

  const share = async () => {
    // The absolute address is built in the browser, so it is the domain the merchant is on (ready to paste anywhere).
    const ok = await copyText(`${window.location.origin}${path}`);
    toast({ message: t(ok ? "copied" : "copyFailed") });
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Tooltip label={t("preview")}>
        <a href={path} target="_blank" rel="noopener noreferrer" aria-label={`${t("preview")}: ${product.title}`} className={BUTTON}>
          <EyeIcon />
        </a>
      </Tooltip>
      <Tooltip label={t("copy")}>
        <button type="button" onClick={share} aria-label={`${t("copy")}: ${product.title}`} className={BUTTON}>
          <CopyIcon />
        </button>
      </Tooltip>
    </div>
  );
}
