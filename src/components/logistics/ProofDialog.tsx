"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/data/icons";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import type { PublicDelivery } from "@/server/modules/logistics/schema";
import { PhotoArt, SignatureArt } from "./ProofArt";

/**
 * Proof of delivery: the photo of the parcel and/or the customer's signature, with when, who
 * received it and who delivered it. Everything shown is SIMULATED and labelled as such — in
 * production this is what the courier's app captured. A centred modal (native `<dialog>`).
 */
export function ProofDialog({
  delivery,
  onClose,
}: {
  delivery: PublicDelivery;
  onClose: () => void;
}) {
  const t = useTranslations("Logistics.proof");
  const fmt = useOrderFormat();
  const ref = useRef<HTMLDialogElement>(null);
  const proof = delivery.proof!;
  const [kind, setKind] = useState(proof.kinds[0]!);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const when = fmt.long(proof.deliveredAt);
  const tab = (k: "photo" | "signature") =>
    `min-h-11 rounded-md border px-4 text-sm font-medium ${
      kind === k
        ? "border-accent bg-accent/10 text-accent"
        : "border-field text-ink-2 hover:bg-ink/5"
    }`;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="proof-title"
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              {t("eyebrow")}
            </p>
            <h2
              id="proof-title"
              className="mt-1 font-serif text-[1.5rem] leading-tight tabular-nums"
            >
              {t("title", { number: fmt.number(delivery.orderNumber) })}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("close")}
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        {proof.kinds.length > 1 && (
          <div role="group" aria-label={t("kind")} className="mt-5 flex gap-2">
            {proof.kinds.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={tab(k)}
              >
                {t(`kinds.${k}`)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          {kind === "photo" ? (
            <PhotoArt
              seed={proof.seed}
              stamp={`${fmt.short(proof.deliveredAt)} · ${delivery.zone}`}
              label={t("photoLabel")}
              note={t("test")}
            />
          ) : (
            <SignatureArt seed={proof.seed} label={t("signatureLabel")} note={t("test")} />
          )}
        </div>

        <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
          {[
            [t("deliveredAt"), when],
            [t("receivedBy"), proof.recipientName],
            [t("courier"), delivery.courier.name],
            [t("place"), `${delivery.street} · ${delivery.zone}`],
            [t("code"), delivery.code],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{t("simulated")}</p>
      </div>
    </dialog>
  );
}
