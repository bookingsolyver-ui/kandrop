"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/shell/icons";

type Status = "idle" | "copied" | "failed";

/** How long "Link copied" stays before the button goes back to "Copy link". */
const COPIED_MS = 2500;

/**
 * The affiliate's own link, with the two things anyone does with it: copy it, or send it on
 * WhatsApp. The field is read-only but selectable, which is also the fallback when the browser
 * refuses clipboard access (it selects the link and says so).
 */
export function LinkCard({ link }: { link: string }) {
  const t = useTranslations("Affiliates.link");
  const [status, setStatus] = useState<Status>("idle");
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
      timer.current = setTimeout(() => setStatus("idle"), COPIED_MS);
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("failed");
    }
  }

  const shown = link.replace(/^https?:\/\//, "");
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(t("whatsappMessage", { link }))}`;
  const big =
    "flex h-14 items-center justify-center gap-2.5 rounded-md px-6 text-[1.0625rem] font-semibold transition-colors motion-reduce:transition-none";

  return (
    <section
      aria-labelledby="link-title"
      className="rounded-lg border border-line bg-surface p-6 sm:p-8"
    >
      <h2
        id="link-title"
        className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
      >
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t("hint")}</p>

      <input
        ref={input}
        readOnly
        value={shown}
        aria-label={t("label")}
        onFocus={(e) => e.currentTarget.select()}
        spellCheck={false}
        className="mt-6 h-14 w-full rounded-md border border-field bg-page px-4 font-mono text-base text-ink sm:text-lg"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={copy}
          className={`${big} bg-action text-on-action hover:opacity-90`}
        >
          <svg
            aria-hidden
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {status === "copied" ? (
              <path d="M4 10.5 8 14.5 16 5.5" />
            ) : (
              <>
                <rect x="7" y="7" width="9" height="9" rx="1.75" />
                <path d="M13 7V5.25A1.75 1.75 0 0 0 11.25 3.5h-6A1.75 1.75 0 0 0 3.5 5.25v6c0 .97.78 1.75 1.75 1.75H7" />
              </>
            )}
          </svg>
          {status === "copied" ? t("copied") : t("copy")}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={`${big} border border-accent/70 text-accent hover:bg-accent/10`}
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </a>
      </div>

      {/* Always in the page, so screen readers hear the change; the height is reserved. */}
      <p role="status" className="mt-3 min-h-5 text-sm text-ink-2">
        {status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : ""}
      </p>
    </section>
  );
}
