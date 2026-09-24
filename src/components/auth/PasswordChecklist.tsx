"use client";

import { useTranslations } from "next-intl";
import { evaluatePassword, PASSWORD_MIN, type PasswordChecks } from "@/shared/auth/schemas";

const RULES: Array<keyof PasswordChecks> = ["length", "letterAndNumber", "notCommon", "notEmail"];

/**
 * Live rule list. Met and unmet differ by shape (tick vs empty ring) and by a screen-reader
 * word, never by colour alone. Rules are shown neutrally until the user starts typing, so an
 * empty field is never presented as a wall of failures.
 */
export function PasswordChecklist({
  id,
  password,
  email,
}: {
  id: string;
  password: string;
  email: string;
}) {
  const t = useTranslations("Auth.password");
  const checks = evaluatePassword(password, email);
  const started = password.length > 0;

  return (
    <div id={id} className="mt-3">
      <p className="mb-2 text-[13px] text-ink-muted">{t("rulesTitle")}</p>
      <ul className="space-y-1.5">
        {RULES.map((rule) => {
          const met = started && checks[rule];
          return (
            <li
              key={rule}
              className={`flex items-center gap-2 text-[13px] ${met ? "text-ink" : "text-ink-muted"}`}
            >
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={met ? "text-up" : "text-field"}
              >
                <circle cx="7" cy="7" r="5.75" />
                {met && <path d="M4.5 7.2l1.7 1.7 3.3-3.6" />}
              </svg>
              <span>{t(`rules.${rule}`, { min: PASSWORD_MIN })}</span>
              <span className="sr-only">— {met ? t("met") : t("unmet")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
