"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { useFields } from "@/components/checkout/useFields";
import { TextArea, TextField } from "@/components/form/Fields";
import { Toast } from "./Toast";

type Field = "subject" | "message";
type Code = "subject_required" | "subject_too_short" | "message_required" | "message_too_short";

const TOAST_MS = 9000;

function validate(values: Record<Field, string>): Partial<Record<Field, Code>> {
  const errors: Partial<Record<Field, Code>> = {};
  const subject = values.subject.trim();
  const message = values.message.trim();
  if (!subject) errors.subject = "subject_required";
  else if (subject.length < 3) errors.subject = "subject_too_short";
  if (!message) errors.message = "message_required";
  else if (message.length < 10) errors.message = "message_too_short";
  return errors;
}

function Fields({ onSent }: { onSent: () => void }) {
  const t = useTranslations("Support.ticket");
  const v = useTranslations("Support.validation");
  const form = useFields<Field, Code>({ subject: "", message: "" }, validate, "tk");
  const message = (field: Field) => {
    const code = form.errorFor(field);
    return code ? v(code) : undefined;
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.attempt(["subject", "message"])) onSent();
  }

  return (
    // `noValidate`: our own translated messages replace the browser's native bubbles.
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5">
      <TextField
        {...form.bind("subject")}
        label={t("subject")}
        placeholder={t("subjectPlaceholder")}
        error={message("subject")}
        autoComplete="off"
        maxLength={120}
      />
      <TextArea
        {...form.bind("message")}
        label={t("message")}
        hint={t("messageHint")}
        error={message("message")}
        maxLength={2000}
      />
      <button
        type="submit"
        className="h-12 rounded-md bg-action px-8 text-[0.9375rem] font-semibold text-on-action transition-opacity hover:opacity-90"
      >
        {t("submit")}
      </button>
    </form>
  );
}

/**
 * Subject and message, validated in the browser. PREVIEW: nothing is sent anywhere yet, so the
 * notice under the form and the toast both say so plainly (a "sent!" message here would make a
 * merchant wait for an answer that will never come). When the backend exists, `onSent` is where
 * the request goes.
 */
export function TicketForm() {
  const t = useTranslations("Support.ticket");
  const [run, setRun] = useState(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <Fields
        key={run}
        onSent={() => {
          setToast(true);
          setRun((n) => n + 1); // a fresh, empty form
        }}
      />
      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-ink-muted">{t("preview")}</p>
      <Toast
        title={toast ? t("toast.title") : undefined}
        body={toast ? t("toast.body") : undefined}
        closeLabel={t("toast.close")}
        onClose={() => setToast(false)}
      />
    </>
  );
}
