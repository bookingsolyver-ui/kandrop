/**
 * FR-23 — captura de `?ref=` e UTMs.
 * Guarda em sessionStorage de primeira parte, sempre em try/catch
 * (storage bloqueado nunca parte a inscrição).
 */

const KEY = "kd_attr";

export interface Attribution {
  ref: string | null;
  utm: { source: string | null; medium: string | null; campaign: string | null };
}

const EMPTY: Attribution = {
  ref: null,
  utm: { source: null, medium: null, campaign: null },
};

/** Códigos de convite são 4 caracteres alfanuméricos (FR-22). */
const REF_RE = /^[A-Za-z0-9]{4}$/;

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  let stored: Attribution | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    stored = raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    stored = null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const refRaw = params.get("ref");
    // `ref` mal formado → ignorar em silêncio, nunca mostrar erro (FR-23)
    const ref = refRaw && REF_RE.test(refRaw) ? refRaw.toUpperCase() : null;

    const source = params.get("utm_source");
    const medium = params.get("utm_medium");
    const campaign = params.get("utm_campaign");

    const hasNew =
      ref !== null || source !== null || medium !== null || campaign !== null;
    if (!hasNew) return stored ?? EMPTY;

    const next: Attribution = {
      ref: ref ?? stored?.ref ?? null,
      utm: {
        source: source ?? stored?.utm.source ?? null,
        medium: medium ?? stored?.utm.medium ?? null,
        campaign: campaign ?? stored?.utm.campaign ?? null,
      },
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return stored ?? EMPTY;
  }
}
