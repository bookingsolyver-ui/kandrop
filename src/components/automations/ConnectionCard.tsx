"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useFields } from "@/components/checkout/useFields";
import { formatPhone } from "@/components/checkout/formatInput";
import { TextField } from "@/components/form/Fields";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicAutomations } from "@/server/modules/automations/schema";
import { connectSchema, type AutomationValidationCode } from "@/shared/automations/schemas";
import { SimulatedQr } from "./SimulatedQr";

type Connection = PublicAutomations["connection"];

/** Status as text first; the dot's shape (solid / ring / dash) is a second, non-colour cue. */
export function ConnectionBadge({ status }: { status: Connection["status"] }) {
  const t = useTranslations("Automations.connection.status");
  const tone = {
    connected: "border-accent/40 bg-accent/10 text-accent",
    pending: "border-series-2/50 bg-series-2/10 text-series-2",
    disconnected: "border-line text-ink-2",
  }[status];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium ${tone}`}
    >
      <svg aria-hidden width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
        {status === "connected" && <circle cx="4" cy="4" r="4" fill="currentColor" />}
        {status === "pending" && (
          <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        )}
        {status === "disconnected" && <path d="M0 4h8" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
      {t(status)}
    </span>
  );
}

/** Asks for the number, shows the (simulated) code while it "connects", and the result. */
export function ConnectionCard({
  connection,
  canManage,
  onConnect,
  onDisconnect,
}: {
  connection: Connection;
  canManage: boolean;
  onConnect: (phone: string) => Promise<ApiErrorCode | null>;
  onDisconnect: () => Promise<void>;
}) {
  const t = useTranslations("Automations.connection");
  const validation = useTranslations("Automations.validation");
  const errors = useTranslations("Errors");
  const fmt = useOrderFormat();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);

  const form = useFields<"phone", AutomationValidationCode>(
    { phone: "" },
    (values) => {
      const parsed = connectSchema.safeParse(values);
      return parsed.success
        ? {}
        : { phone: parsed.error.issues[0]!.message as AutomationValidationCode };
    },
    "wa"
  );
  const phoneError = form.errorFor("phone");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    if (!form.attempt(["phone"])) return;
    setPending(true);
    const error = await onConnect(form.values.phone);
    setPending(false);
    if (error) setFormError(error);
  }

  async function disconnect() {
    setPending(true);
    await onDisconnect();
    setPending(false);
    setConfirming(false);
  }

  const outline =
    "h-11 rounded-md border border-field px-5 text-sm font-medium hover:bg-ink/5 disabled:opacity-60";

  return (
    <section
      aria-labelledby="connection-title"
      className="rounded-lg border border-line bg-surface p-5 sm:p-7"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2
            id="connection-title"
            className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <ConnectionBadge status={connection.status} />
      </header>

      <div className="mt-6 border-t border-line pt-6">
        {connection.status === "disconnected" && (
          <form onSubmit={submit} noValidate className="max-w-md">
            <p className="mb-5 text-ink-2">{t("disconnected.body")}</p>
            {formError && (
              <p role="alert" className="mb-4 text-sm text-down">
                {errors(formError)}
              </p>
            )}
            <TextField
              {...form.bind("phone", formatPhone)}
              label={t("disconnected.phone")}
              hint={t("disconnected.phoneHint")}
              error={phoneError ? validation(phoneError) : undefined}
              prefix="+244"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="923 456 789"
              numeric
            />
            {canManage ? (
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className="mt-5 h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:cursor-progress disabled:opacity-70"
              >
                {pending ? t("disconnected.connecting") : t("disconnected.connect")}
              </button>
            ) : (
              <p className="mt-5 text-sm text-ink-2">{t("ownerOnly")}</p>
            )}
          </form>
        )}

        {connection.status === "pending" && (
          <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto sm:mx-0">
              <SimulatedQr
                code={connection.pairingCode ?? "pending"}
                label={t("pending.qrLabel")}
              />
              <p className="mt-2 text-center text-[12px] text-ink-muted">{t("pending.qrLabel")}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl leading-tight font-medium">{t("pending.title")}</h3>
              <ol className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-2">
                {(["open", "menu", "scan"] as const).map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span
                      aria-hidden
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-field text-[12px] tabular-nums"
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">
                      {t(`pending.steps.${step}`, { phone: connection.phoneMasked ?? "" })}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 flex items-center gap-2 text-sm text-ink-muted">
                <span aria-hidden className="pulse size-2 rounded-full bg-series-2" />
                {t("pending.waiting")}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={pending}
                  className={`${outline} mt-5`}
                >
                  {t("pending.cancel")}
                </button>
              )}
            </div>
          </div>
        )}

        {connection.status === "connected" && (
          <div>
            <p className="text-ink-2">
              {t("connected.body", { phone: connection.phoneMasked ?? "" })}
            </p>
            {connection.connectedAt && (
              <p className="mt-1 text-[13px] text-ink-muted">
                {t("connected.since", { date: fmt.long(connection.connectedAt) })}
              </p>
            )}
            {canManage &&
              (confirming ? (
                <div className="mt-5 rounded-md border border-line bg-page p-4">
                  <p className="font-medium">{t("connected.confirmTitle")}</p>
                  <p className="mt-1 text-sm text-ink-2">{t("connected.confirmBody")}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirming(false)}
                      disabled={pending}
                      className="h-11 rounded-md bg-action px-5 text-sm font-semibold text-on-action hover:opacity-90"
                    >
                      {t("connected.keep")}
                    </button>
                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={pending}
                      aria-busy={pending}
                      className="h-11 rounded-md border border-down px-5 text-sm font-medium text-down disabled:opacity-60"
                    >
                      {t("connected.confirm")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className={`${outline} mt-5`}
                >
                  {t("connected.disconnect")}
                </button>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
