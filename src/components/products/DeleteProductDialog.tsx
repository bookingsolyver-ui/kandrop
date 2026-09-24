"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ApiErrorCode } from "@/server/http/errors";
import { deleteProduct } from "./productsApi";

/**
 * Native `<dialog>`: focus is trapped inside, Escape closes it and focus returns to the button
 * that opened it — without a focus-trap dependency. Cancel is the emphasised action; the
 * destructive one is outlined so it is never the easy thing to hit.
 */
export function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: { id: string; title: string } | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("Catalog.delete");
  const errors = useTranslations("Errors");
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  async function confirm() {
    if (!product || pending) return;
    setPending(true);
    setError(null);
    const result = await deleteProduct(product.id);
    setPending(false);
    if (result.ok) return onDeleted(product.id);
    // Already gone (deleted elsewhere) is the outcome the merchant wanted.
    if (result.code === "not_found") return onDeleted(product.id);
    setError(result.code);
  }

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setError(null);
        onClose();
      }}
      onClick={(e) => e.target === ref.current && !pending && ref.current?.close()}
      aria-labelledby="delete-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="p-6">
        <h2 id="delete-title" className="font-serif text-[1.375rem] leading-tight font-medium">
          {t("title")}
        </h2>
        <p className="mt-2 text-ink-2">{t("body", { title: product?.title ?? "" })}</p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-down">
            {errors(error)}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
            className="h-12 rounded-md border border-down px-5 font-medium text-down disabled:opacity-60 sm:h-11"
          >
            {pending ? t("deleting") : t("confirm")}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            disabled={pending}
            className="h-12 rounded-md bg-action px-5 font-medium text-on-action hover:opacity-90 disabled:opacity-60 sm:h-11"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
