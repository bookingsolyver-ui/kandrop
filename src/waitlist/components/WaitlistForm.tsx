"use client";

/**
 * FR-11 a FR-18 — formulário funcional (M3) + ecrã de sucesso (M5).
 * · Valida no cliente ao sair do campo e SEMPRE no servidor (FR-13).
 * · Erros ligados com `aria-describedby`; foco no primeiro campo inválido.
 * · Honeypot `website` invisível (FR-24) + `requestId` idempotente.
 * · Sucesso abre o modal SuccessScreen (FR-17, secção 3.6); o código fica em
 *   localStorage e volta a ser confirmado em GET /api/status (FR-18).
 * · Campo de email: acréscimo pedido pelo responsável (fora do PRD original,
 *   que previa só nome + WhatsApp).
 */

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { KandropButton } from "@/waitlist/components/ui/KandropButton";
import PhoneInput from "@/waitlist/components/PhoneInput";
import SuccessScreen from "@/waitlist/components/SuccessScreen";
import { IconMail, IconUser } from "./sections/icons";
import { copy } from "@/waitlist/lib/copy";
import { DEFAULT_ISO, type CountryIso } from "@/waitlist/lib/phone";
import { captureAttribution, type Attribution } from "@/waitlist/lib/referral";
import { validate, type FieldErrors, type FieldName } from "@/waitlist/lib/validation";
import {
  buildShareUrl,
  claimRestore,
  clearLocalStatus,
  readLocalStatus,
  writeLocalStatus,
} from "@/waitlist/lib/local-status";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-base text-brand-white placeholder:text-brand-white/35 focus:border-brand-orange focus:outline-none disabled:opacity-60";

const errorClass =
  "mt-1.5 block text-sm font-medium text-brand-orange";

interface SuccessInfo {
  code: string;
  position: number;
  validInvites: number;
  shareUrl: string;
}

const EMPTY_ATTR: Attribution = {
  ref: null,
  utm: { source: null, medium: null, campaign: null },
};

export default function WaitlistForm() {
  const f = copy.form;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [iso, setIso] = useState<CountryIso>(DEFAULT_ISO);
  const [profile, setProfile] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const requestId = useRef<string>("");
  const attr = useRef<Attribution>(EMPTY_ATTR);
  const reopenRef = useRef<HTMLSpanElement>(null);
  const restoreRan = useRef(false);
  const mounted = useRef(false);

  // IDs únicos por instância (o formulário aparece no hero e no CTA final)
  const uid = useId();
  const idOf = (name: string) => `wl-${name}-${uid}`;
  const errOf = (name: string) => `${idOf(name)}-error`;
  function fieldId(field: FieldName): string {
    return idOf(field === "whatsapp" ? "phone" : field);
  }

  // requestId gerado uma vez (idempotência — PRD 8) + captura de ref/UTM (FR-23)
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    requestId.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    attr.current = captureAttribution();
  }, []);

  // FR-17: o foco para o título acontece dentro do SuccessScreen (montagem);
  // quando o modal fecha, o foco volta para o botão de reabrir
  useEffect(() => {
    if (success && !modalOpen) reopenRef.current?.focus();
  }, [success, modalOpen]);

  // FR-18: o visitante que volta vê o ecrã de sucesso — lê o código do
  // localStorage e confirma em GET /api/status (404 → limpa o storage).
  // Só a instância do hero restaura (claimRestore), nunca as duas.
  useEffect(() => {
    if (restoreRan.current) return;
    restoreRan.current = true;
    if (!claimRestore(restoreRan)) return;
    const stored = readLocalStatus();
    if (!stored) return;

    const show = (info: { position: number; validInvites: number }) => {
      setSuccess({
        code: stored.code,
        position: info.position,
        validInvites: info.validInvites,
        shareUrl: buildShareUrl(stored.code),
      });
      setModalOpen(true);
    };

    (async () => {
      try {
        const res = await fetch(`/api/status?code=${encodeURIComponent(stored.code)}`);
        if (res.status === 404) {
          clearLocalStatus();
          return;
        }
        if (res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { position?: number; validInvites?: number }
            | null;
          if (body && typeof body.position === "number") {
            const fresh = {
              position: body.position,
              validInvites: Number(body.validInvites) || 0,
            };
            writeLocalStatus({ code: stored.code, ...fresh });
            show(fresh);
            return;
          }
        }
        // 503/500 → usa o snapshot guardado (nunca inventa valores)
        if (stored.position > 0) show(stored);
      } catch {
        // offline → snapshot guardado
        if (stored.position > 0) show(stored);
      }
    })();
  }, []);

  function clearError(field: FieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validateOnBlur(field: FieldName) {
    const result = validate({
      name,
      email,
      whatsapp: phone,
      country: iso,
      profile,
      consent,
      website,
    });
    if (result.ok) setErrors({});
    else setErrors((prev) => ({ ...prev, [field]: result.errors[field] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setFormError(null);

    const input = {
      name,
      email,
      whatsapp: phone,
      country: iso,
      profile,
      consent,
      website,
    };
    const result = validate(input);
    if (!result.ok) {
      setErrors(result.errors);
      // Foco no primeiro campo inválido (FR-13)
      const order: FieldName[] = ["name", "email", "whatsapp", "consent"];
      const first = order.find((k) => result.errors[k]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setErrors({});
    setSending(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          requestId: requestId.current,
          ref: attr.current.ref,
          utm: attr.current.utm,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | {
            status: string;
            code?: string;
            position?: number;
            validInvites?: number;
            shareUrl?: string;
            errors?: FieldErrors;
          }
        | null;

      if (res.ok && body && (body.status === "created" || body.status === "duplicate")) {
        const info: SuccessInfo = {
          code: body.code ?? "",
          position: body.position ?? 0,
          validInvites: body.validInvites ?? 0,
          shareUrl: body.shareUrl || (body.code ? buildShareUrl(body.code) : ""),
        };
        // FR-18: persiste o código próprio (sem nome nem número)
        if (info.code) {
          writeLocalStatus({
            code: info.code,
            position: info.position,
            validInvites: info.validInvites,
          });
        }
        setSuccess(info);
        setModalOpen(true);
        return;
      }

      if (res.status === 400 && body?.errors) {
        setErrors(body.errors);
        const order: FieldName[] = ["name", "email", "whatsapp", "consent"];
        const first = order.find((k) => body.errors?.[k]);
        if (first) document.getElementById(fieldId(first))?.focus();
        return;
      }

      if (res.status === 429) {
        setFormError(f.errors.rateLimited);
        return;
      }
      if (res.status === 403) {
        setFormError(f.errors.closed);
        return;
      }
      // 503 / respostas inesperadas → mensagem genérica, dados mantidos (FR-13)
      setFormError(f.errors.network);
    } catch {
      setFormError(f.errors.network);
    } finally {
      setSending(false);
    }
  }

  if (success) {
    const s = copy.success;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg text-brand-white/80">
          {s.cardNote} {s.positionPrefix}
          <span className="font-bold text-brand-orange">{success.position}</span>
        </p>
        {/* Modal do ecrã de sucesso (FR-17) — fechado, fica este cartão */}
        <span ref={reopenRef} tabIndex={-1} className="focus:outline-none">
          <KandropButton label={s.reopen} onClick={() => setModalOpen(true)} size="md" />
        </span>
        {/* Só monta no cliente (o sucesso só nasce em eventos/efeitos) */}
        {modalOpen && (
          <SuccessScreen
            position={success.position}
            validInvites={success.validInvites}
            shareUrl={success.shareUrl || buildShareUrl(success.code)}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Nome */}
      <div>
        <label htmlFor={idOf("name")} className="mb-1.5 block text-sm font-medium text-brand-white/80">
          {f.nameLabel}
        </label>
        <div className="relative">
          <IconUser className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-white/40" />
          <input
            id={idOf("name")}
            name="name"
            type="text"
            placeholder={f.namePlaceholder}
            autoComplete="name"
            maxLength={80}
            value={name}
            disabled={sending}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? errOf("name") : undefined}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            onBlur={() => validateOnBlur("name")}
            className={inputClass}
          />
        </div>
        {errors.name && (
          <span id={errOf("name")} role="alert" className={errorClass}>
            {errors.name}
          </span>
        )}
      </div>

      {/* Email (acréscimo do responsável) */}
      <div>
        <label htmlFor={idOf("email")} className="mb-1.5 block text-sm font-medium text-brand-white/80">
          {f.emailLabel}
        </label>
        <div className="relative">
          <IconMail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-white/40" />
          <input
            id={idOf("email")}
            name="email"
            type="email"
            inputMode="email"
            placeholder={f.emailPlaceholder}
            autoComplete="email"
            value={email}
            disabled={sending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errOf("email") : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            onBlur={() => validateOnBlur("email")}
            className={inputClass}
          />
        </div>
        {errors.email && (
          <span id={errOf("email")} role="alert" className={errorClass}>
            {errors.email}
          </span>
        )}
      </div>

      {/* WhatsApp — selector de país + número (FR-12) */}
      <div>
        <label htmlFor={idOf("phone")} className="mb-1.5 block text-sm font-medium text-brand-white/80">
          {f.phoneLabel}
        </label>
        <PhoneInput
          id={idOf("phone")}
          value={phone}
          iso={iso}
          placeholder={f.phonePlaceholder}
          disabled={sending}
          invalid={!!errors.whatsapp}
          errorId={errors.whatsapp ? errOf("phone") : undefined}
          onValueChange={(v) => {
            setPhone(v);
            clearError("whatsapp");
          }}
          onCountryChange={setIso}
          onBlur={() => validateOnBlur("whatsapp")}
        />
        {errors.whatsapp && (
          <span id={errOf("phone")} role="alert" className={errorClass}>
            {errors.whatsapp}
          </span>
        )}
      </div>

      {/* Perfil (opcional — FR-14) */}
      <div>
        <label htmlFor={idOf("profile")} className="mb-1.5 block text-sm font-medium text-brand-white/80">
          {f.profileLabel}
        </label>
        <select
          id={idOf("profile")}
          name="profile"
          value={profile}
          disabled={sending}
          onChange={(e) => setProfile(e.target.value)}
          className={`${inputClass} pl-4`}
        >
          <option value="">—</option>
          {f.profileOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Honeypot — fora do ecrã, não focável (FR-24) */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <label htmlFor={idOf("website")}>Não preenches este campo</label>
        <input
          id={idOf("website")}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Consentimento — não pré-marcado (FR-11) */}
      <div className="flex items-start gap-3">
        <input
          id={idOf("consent")}
          name="consent"
          type="checkbox"
          checked={consent}
          disabled={sending}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? errOf("consent") : undefined}
          onChange={(e) => {
            setConsent(e.target.checked);
            clearError("consent");
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-orange"
        />
        <label htmlFor={idOf("consent")} className="text-sm leading-6 text-brand-white/70">
          {f.consentPre}{" "}
          <Link href="/waitlist/privacidade" className="underline underline-offset-2 hover:text-brand-white">
            {f.consentLink}
          </Link>
          .
        </label>
      </div>
      {errors.consent && (
        <span id={errOf("consent")} role="alert" className={errorClass}>
          {errors.consent}
        </span>
      )}

      {/* Erro de servidor/rede (FR-13) */}
      {formError && (
        <p role="alert" className="rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-center text-sm text-brand-white">
          {formError}
        </p>
      )}

      {/* Submit — largura total, alvo de toque ≥ 44px; desactivado durante o envio */}
      <KandropButton
        label={sending ? f.submitting : f.submit}
        type="submit"
        size="md"
        disabled={sending}
        fullWidth
      />
    </form>
  );
}
