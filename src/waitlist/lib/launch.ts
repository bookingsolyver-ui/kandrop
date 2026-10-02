// Contagem decrescente: 60 dias (2 meses) a partir de 01/10/2026
// Alvo: 30/11/2026 23:00 UTC (01/12/2026 00:00 WAT) = exatamente 60 dias
export const LAUNCH_TARGET_ISO = "2026-11-30T23:00:00Z";

const envLaunchAt = process.env.NEXT_PUBLIC_LAUNCH_AT;
export const LAUNCH_AT =
  envLaunchAt && !envLaunchAt.includes("2026-10-19") && !envLaunchAt.includes("2026-10-20")
    ? new Date(envLaunchAt).getTime()
    : new Date(LAUNCH_TARGET_ISO).getTime();

/** Lê o modo a partir da variável de ambiente (server-side) */
export function getLaunchMode(): "waitlist" | "launched" {
  const raw = (process.env.LAUNCH_MODE ?? "waitlist") as "waitlist" | "launched";
  if (raw === "launched") return "launched";
  if (raw === "waitlist") return "waitlist";
  // fallback: se já passou do alvo e não mudou a variável
  const now = new Date().getTime();
  if (now >= LAUNCH_AT) return "launched";
  return "waitlist";
}