"use client";

import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/data/icons";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicFlow } from "@/server/modules/automations/schema";
import {
  FLOWS,
  TEMPLATE_MAX,
  templateProblem,
  unknownVariables,
} from "@/shared/automations/schemas";
import { updateFlow } from "./automationsApi";
import { MessagePreview } from "./MessagePreview";

/**
 * Where the merchant reads and edits what a flow says. A side sheet (native `<dialog>`: focus
 * trap, Esc, backdrop), like the order sheet, so the list behind it keeps its place. Variable
 * buttons insert `{name}` at the cursor; the preview beside it fills them with example data.
 */
export function FlowEditor({
  flow,
  storeName,
  canManage,
  onClose,
  onSaved,
}: {
  flow: PublicFlow;
  storeName: string;
  canManage: boolean;
  onClose: () => void;
  onSaved: (flow: PublicFlow) => void;
}) {
  const t = useTranslations("Automations");
  const errors = useTranslations("Errors");
  const dialog = useRef<HTMLDialogElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(flow.template);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [saved, setSaved] = useState(false);
  /** Where the cursor goes after the next render (a controlled textarea resets it to the end). */
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = area.current;
    if (caret.current === null || !el) return;
    el.focus();
    el.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [text]);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const spec = FLOWS[flow.key];
  const problem = templateProblem(text, flow.key);
  const unknown = unknownVariables(text, flow.key);
  const dirty = text.trim() !== flow.template;
  const title = t(`flows.items.${flow.key}.title`);

  function insert(variable: string) {
    const el = area.current;
    const token = `{${variable}}`;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    caret.current = start + token.length;
    setText(text.slice(0, start) + token + text.slice(end));
    setSaved(false);
  }

  async function save(body: { template: string } | { reset: true }) {
    setPending(true);
    setError(null);
    const result = await updateFlow(flow.key, body);
    setPending(false);
    if (!result.ok) return setError(result.code);
    onSaved(result.data);
    setText(result.data.template);
    setSaved(true);
  }

  const message = problem
    ? t(`validation.${problem}`, {
        names: unknown.map((n) => `{${n}}`).join(", "),
        example: "{nome_cliente}",
      })
    : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby="flow-editor-title"
      className="fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-full max-w-xl overflow-hidden border-l border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              {t("editor.template")}
            </p>
            <h2 id="flow-editor-title" className="mt-1 font-serif text-[1.5rem] leading-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t("editor.close")}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          <div>
            <label htmlFor="flow-template" className="mb-2 block text-sm font-medium">
              {t("editor.template")}
            </label>
            <textarea
              id="flow-template"
              ref={area}
              value={text}
              readOnly={!canManage}
              onChange={(e) => {
                setText(e.target.value);
                setSaved(false);
              }}
              rows={8}
              spellCheck
              aria-invalid={problem ? true : undefined}
              aria-describedby="flow-template-note"
              className={`w-full resize-y rounded-md border bg-surface px-3.5 py-3 text-base leading-relaxed text-ink ${
                problem ? "border-down" : "border-field"
              }`}
            />
            <div
              id="flow-template-note"
              className="mt-2 flex items-start justify-between gap-4 text-[13px]"
            >
              <p className={problem ? "text-down" : "text-ink-muted"}>
                {message ?? t("editor.templateHint")}
              </p>
              <p
                className={`shrink-0 tabular-nums ${text.trim().length > TEMPLATE_MAX ? "text-down" : "text-ink-muted"}`}
              >
                {t("editor.counter", {
                  count: String(text.trim().length),
                  max: String(TEMPLATE_MAX),
                })}
              </p>
            </div>
          </div>

          {canManage && (
            <div>
              <p className="mb-2 text-sm font-medium">{t("editor.variables")}</p>
              <ul className="flex flex-wrap gap-2">
                {spec.variables.map((variable) => (
                  <li key={variable}>
                    <button
                      type="button"
                      onClick={() => insert(variable)}
                      title={t(`editor.variableNames.${variable}`)}
                      aria-label={t("editor.insert", { variable: `{${variable}}` })}
                      className="min-h-10 rounded-md border border-field bg-page px-3 font-mono text-[13px] text-accent hover:border-accent"
                    >
                      {`{${variable}}`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <MessagePreview template={text} flow={flow.key} storeName={storeName} />

          <p className="text-[13px] leading-relaxed text-ink-muted">{t("editor.approval")}</p>
        </div>

        <footer className="space-y-3 border-t border-line px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7">
          <p role="status" className="text-sm text-up empty:hidden">
            {saved ? t("editor.saved") : ""}
          </p>
          {error && (
            <p role="alert" className="text-sm text-down">
              {errors(error)}
            </p>
          )}
          {canManage ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => save({ template: text })}
                disabled={pending || !dirty || problem !== null}
                aria-busy={pending}
                className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? t("editor.saving") : t("editor.save")}
              </button>
              {text !== spec.defaultTemplate && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    flow.isDefault ? setText(spec.defaultTemplate) : save({ reset: true })
                  }
                  className="min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  {t("editor.reset")}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-2">{t("connection.ownerOnly")}</p>
          )}
        </footer>
      </div>
    </dialog>
  );
}
