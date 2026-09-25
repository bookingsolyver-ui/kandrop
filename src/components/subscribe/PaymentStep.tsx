"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CheckoutField } from "@/components/checkout/CheckoutField";
import {
  formatCardNumber,
  formatCvc,
  formatExpiry,
  formatPhone,
} from "@/components/checkout/formatInput";
import { LockIcon, PhoneIcon } from "@/components/checkout/icons";
import { Spinner } from "@/components/checkout/Spinner";
import { useFields, type FieldErrors } from "@/components/checkout/useFields";
import { Tabs, panelId, tabId } from "@/components/data/Tabs";
import { cardBrand, cardSchema, firstError, phoneSchema } from "@/shared/checkout/schemas";
import {
  EXAMPLE_IBAN,
  formatIban,
  isLocalCurrency,
  priceMinor,
  proofError,
  type Currency,
  type ProofCode,
  type SignupPlan,
} from "@/shared/subscribe/schemas";
import { useSubscribeMoney } from "./useSubscribeMoney";

export type PaidWith = "multicaixa" | "bank" | "card";
type KzTab = "multicaixa" | "bank";

const PAY_BUTTON =
  "flex h-14 w-full items-center justify-center gap-2.5 rounded-md bg-action text-[1.0625rem] font-semibold text-on-action tabular-nums transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-70";

/** A simulated wait, then `done`: the prototype's stand-in for a provider answering. */
function useSimulatedWait(active: boolean, ms: number, done: () => void) {
  const latest = useRef(done);
  useEffect(() => {
    latest.current = done;
  });
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => latest.current(), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
}

// ── Multicaixa Express (Kz) ───────────────────────────────────────────────────────────────

function MulticaixaPanel({ amount, onDone }: { amount: string; onDone: () => void }) {
  const t = useTranslations("Subscribe.pay");
  const [waiting, setWaiting] = useState(false);
  const form = useFields<"phone">(
    { phone: "" },
    (values) => {
      const r = phoneSchema.safeParse(values.phone);
      return r.success ? {} : { phone: r.error.issues[0]!.message as never };
    },
    "sp"
  );
  useSimulatedWait(waiting, 4000, onDone);

  if (waiting) {
    return (
      <div className="py-6 text-center">
        <Spinner>
          <PhoneIcon size={30} />
        </Spinner>
        <div role="status" aria-live="polite">
          <h3 className="font-serif text-[1.5rem] leading-tight">{t("waitingTitle")}</h3>
          <p className="mx-auto mt-3 max-w-sm text-ink-2">{t("waitingBody", { amount })}</p>
        </div>
      </div>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.attempt(["phone"])) setWaiting(true);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <CheckoutField
        {...form.bind("phone", formatPhone)}
        label={t("phone")}
        hint={t("phoneHint")}
        error={form.errorFor("phone")}
        prefix="+244"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="923 456 789"
        numeric
      />
      <p className="text-[13px] leading-snug text-ink-muted">{t("multicaixaNote")}</p>
      <button type="submit" className={PAY_BUTTON}>
        <LockIcon size={18} />
        {t("pay", { amount })}
      </button>
    </form>
  );
}

// ── Bank transfer (Kz) ────────────────────────────────────────────────────────────────────

function BankPanel({ amount, onDone }: { amount: string; onDone: () => void }) {
  const t = useTranslations("Subscribe.pay.bank");
  const v = useTranslations("Subscribe.validation");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<ProofCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useSimulatedWait(sending, 1400, onDone);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) return;
    const problem = proofError(picked);
    setError(problem);
    setFile(problem ? null : picked);
    if (problem) event.target.value = "";
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(EXAMPLE_IBAN);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the IBAN is on screen to copy by hand */
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const problem = proofError(file);
    setError(problem);
    if (problem) return input.current?.focus();
    setSending(true);
  }

  return (
    <form onSubmit={send} noValidate className="space-y-6">
      <p className="text-ink-2">{t("intro", { amount })}</p>

      <dl className="divide-y divide-line rounded-md border border-line text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <dt className="text-ink-muted">{t("iban")}</dt>
          <dd className="flex items-center gap-3">
            <span className="font-mono text-[15px] tracking-wide tabular-nums">
              {formatIban(EXAMPLE_IBAN)}
            </span>
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded px-1 text-[13px] text-accent underline underline-offset-4 hover:opacity-80"
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </dd>
        </div>
        <div className="flex justify-between gap-3 px-4 py-3">
          <dt className="text-ink-muted">{t("holder")}</dt>
          <dd className="font-medium">{t("holderName")}</dd>
        </div>
      </dl>
      <p className="-mt-3 text-[13px] leading-snug text-series-2">{t("example")}</p>

      <div>
        <p id="proof-label" className="mb-2 text-sm font-medium">
          {t("proof")}
        </p>
        <div className="relative rounded-md border border-dashed border-field p-4">
          <input
            ref={input}
            id="proof"
            type="file"
            accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
            onChange={choose}
            aria-labelledby="proof-label"
            aria-describedby="proof-note"
            aria-invalid={error ? true : undefined}
            className="peer sr-only"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="proof"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-field px-4 text-sm font-medium hover:bg-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
            >
              {file ? t("replace") : t("choose")}
            </label>
            {file && (
              <p className="min-w-0 flex-1 text-sm">
                <span className="sr-only">{t("chosen")}: </span>
                <span className="block truncate font-medium">{file.name}</span>
                <span className="text-[12px] text-ink-muted tabular-nums">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </p>
            )}
            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (input.current) input.current.value = "";
                }}
                className="min-h-11 rounded px-1 text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink"
              >
                {t("remove")}
              </button>
            )}
          </div>
        </div>
        <p
          id="proof-note"
          role={error ? "alert" : undefined}
          className={`mt-2 text-[13px] leading-snug ${error ? "text-down" : "text-ink-muted"}`}
        >
          {error ? v(error) : t("proofHint")}
        </p>
      </div>

      <button type="submit" disabled={sending} aria-busy={sending} className={PAY_BUTTON}>
        {sending ? t("sending") : t("send")}
      </button>
    </form>
  );
}

// ── Card (EUR / USD) ──────────────────────────────────────────────────────────────────────

type CardField = "cardNumber" | "expiry" | "cvc" | "cardName";
const CARD_TO_FIELD = {
  number: "cardNumber",
  expiry: "expiry",
  cvc: "cvc",
  name: "cardName",
} as const;
const BRAND = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", unknown: "" } as const;

function CardPanel({ amount, onDone }: { amount: string; onDone: () => void }) {
  const t = useTranslations("Subscribe.pay");
  const c = useTranslations("Checkout.fields");
  const [paying, setPaying] = useState(false);
  const form = useFields<CardField>(
    { cardNumber: "", expiry: "", cvc: "", cardName: "" },
    (values) => {
      const r = cardSchema.safeParse({
        number: values.cardNumber,
        expiry: values.expiry,
        cvc: values.cvc,
        name: values.cardName,
      });
      const errors: FieldErrors<CardField> = {};
      if (!r.success) {
        for (const [key, code] of Object.entries(firstError(r.error.issues))) {
          errors[CARD_TO_FIELD[key as keyof typeof CARD_TO_FIELD]] = code;
        }
      }
      return errors;
    },
    "sc"
  );
  useSimulatedWait(paying, 1400, onDone);
  const brand = cardBrand(form.values.cardNumber.replace(/\D/g, ""));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.attempt(["cardNumber", "expiry", "cvc", "cardName"])) setPaying(true);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded-md border border-series-2 px-4 py-3 text-[13px] leading-snug">
        {t("card.note")}
      </p>
      <CheckoutField
        {...form.bind("cardNumber", formatCardNumber)}
        label={c("cardNumber")}
        error={form.errorFor("cardNumber")}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        suffix={BRAND[brand]}
        numeric
      />
      <div className="grid grid-cols-2 gap-4">
        <CheckoutField
          {...form.bind("expiry", formatExpiry)}
          label={c("expiry")}
          error={form.errorFor("expiry")}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder={c("expiryPlaceholder")}
          maxLength={5}
          numeric
        />
        <CheckoutField
          {...form.bind("cvc", formatCvc)}
          label={c("cvc")}
          error={form.errorFor("cvc")}
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          maxLength={4}
          numeric
        />
      </div>
      <CheckoutField
        {...form.bind("cardName")}
        label={c("cardName")}
        error={form.errorFor("cardName")}
        autoComplete="cc-name"
        autoCapitalize="words"
      />
      <p className="text-[13px] leading-snug text-ink-muted">{t("card.test")}</p>
      <button type="submit" disabled={paying} aria-busy={paying} className={PAY_BUTTON}>
        <LockIcon size={18} />
        {paying ? t("paying") : t("pay", { amount })}
      </button>
    </form>
  );
}

/**
 * Step 3. In Kwanzas: Multicaixa Express (asks for the mobile number) or a bank transfer (shows an
 * EXAMPLE IBAN and asks for the receipt). In euros or dollars: a card form. Everything here is a
 * prototype — no request is made; the "provider" answers after a short simulated wait.
 */
export function PaymentStep({
  plan,
  currency,
  onBack,
  onDone,
}: {
  plan: SignupPlan;
  currency: Currency;
  onBack: () => void;
  onDone: (method: PaidWith) => void;
}) {
  const t = useTranslations("Subscribe.pay");
  const money = useSubscribeMoney();
  const amount = money(priceMinor(plan, currency), currency);
  const [tab, setTab] = useState<KzTab>("multicaixa");
  const local = isLocalCurrency(currency);

  return (
    <div>
      {local ? (
        <>
          <Tabs<KzTab>
            idPrefix="pay"
            label={t("methods")}
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "multicaixa", label: t("tabs.multicaixa") },
              { id: "bank", label: t("tabs.bank") },
            ]}
          />
          <div
            id={panelId("pay", tab)}
            role="tabpanel"
            aria-labelledby={tabId("pay", tab)}
            className="pt-6"
          >
            {tab === "multicaixa" ? (
              <MulticaixaPanel amount={amount} onDone={() => onDone("multicaixa")} />
            ) : (
              <BankPanel amount={amount} onDone={() => onDone("bank")} />
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-5 text-sm font-medium">{t("tabs.card")}</p>
          <CardPanel amount={amount} onDone={() => onDone("card")} />
        </>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-6 min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {t("back")}
      </button>
    </div>
  );
}
