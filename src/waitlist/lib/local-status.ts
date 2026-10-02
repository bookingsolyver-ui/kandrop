/**
 * FR-18 — persistência local do inscrito (só o código e o estado, nunca o
 * número nem o nome). Tudo envolvido em try/catch: storage vazio, bloqueado
 * ou em modo privado não pode partir a página.
 */

export interface LocalStatus {
  code: string;
  position: number;
  validInvites: number;
}

const KEY = "kandrop:inscricao:v1";

export function readLocalStatus(): LocalStatus | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LocalStatus>;
    if (!v || typeof v.code !== "string" || v.code.length < 4) return null;
    return {
      code: v.code,
      position: Number(v.position) || 0,
      validInvites: Number(v.validInvites) || 0,
    };
  } catch {
    return null;
  }
}

export function writeLocalStatus(s: LocalStatus): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage indisponível — segue sem persistir */
  }
}

export function clearLocalStatus(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}

/**
 * Só UMA instância do formulário restaura o ecrã de sucesso (o formulário
 * existe no hero e no CTA final — dois modais empilhados seria erro visual).
 * O dono é reentregue na repetição de efeitos do StrictMode (dev), para não
 * perder a restauração nem a desbloquear para a segunda instância.
 */
let claimedBy: unknown = null;

export function claimRestore(owner: unknown): boolean {
  if (claimedBy !== null && claimedBy !== owner) return false;
  claimedBy = owner;
  return true;
}

/** Link de partilha: BASE_URL do build, ou a origem actual (FR-22). */
export function buildShareUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/?ref=${code}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/?ref=${code}`;
}
