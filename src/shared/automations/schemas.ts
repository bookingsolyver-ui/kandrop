import { z } from "zod";
import { phoneSchema } from "@/shared/checkout/schemas";

/** Messages are stable CODES; the UI translates `Automations.validation.<code>`. */
export type AutomationValidationCode =
  | "template_required"
  | "template_too_long"
  | "template_unknown_variable"
  | "template_braces"
  | "phone_required"
  | "phone_invalid";

export const FLOW_KEYS = ["abandonedCart", "paymentConfirmation", "shippingUpdate"] as const;
export type FlowKey = (typeof FLOW_KEYS)[number];

/** WhatsApp caps a message template body at 1024 characters; stay under it. */
export const TEMPLATE_MAX = 1000;

/**
 * What each flow can say. `variables` are the only placeholders a template may use; the
 * default text is what the merchant gets until they edit it. Templates are addressed to the
 * merchant's *customers* (Angolan Portuguese), so they are content, not interface text: they do
 * not change with the language of the dashboard.
 */
export const VARIABLE_NAMES = [
  "nome_cliente",
  "nome_produto",
  "link_pagamento",
  "nome_loja",
  "valor_total",
  "referencia",
  "link_recibo",
  "codigo_seguimento",
  "nome_estafeta",
] as const;
export type VariableName = (typeof VARIABLE_NAMES)[number];

export const FLOWS: Record<
  FlowKey,
  { variables: readonly VariableName[]; defaultTemplate: string }
> = {
  abandonedCart: {
    variables: ["nome_cliente", "nome_produto", "link_pagamento", "nome_loja"],
    defaultTemplate:
      "Olá {nome_cliente}, o seu {nome_produto} está à espera de si. Conclua a compra em segurança aqui: {link_pagamento}\n\nSe precisar de ajuda, basta responder a esta mensagem.\n{nome_loja}",
  },
  paymentConfirmation: {
    variables: ["nome_cliente", "valor_total", "referencia", "link_recibo", "nome_loja"],
    defaultTemplate:
      "Olá {nome_cliente}, recebemos o seu pagamento de {valor_total} (ref. {referencia}). Pode consultar o seu recibo aqui: {link_recibo}\n\nObrigado por comprar na {nome_loja}.",
  },
  shippingUpdate: {
    variables: ["nome_cliente", "nome_produto", "nome_estafeta", "codigo_seguimento", "nome_loja"],
    defaultTemplate:
      "Olá {nome_cliente}, o seu {nome_produto} já está a caminho com o estafeta {nome_estafeta}. Código de seguimento: {codigo_seguimento}\n\n{nome_loja}",
  },
};

/** Example values for the preview. Links use the reserved `.example` domain on purpose. */
export const SAMPLE_VALUES: Record<string, string> = {
  nome_cliente: "Ana Beatriz",
  nome_produto: "Smartwatch Série X",
  link_pagamento: "kandrop.example/p/8FQ2M",
  link_recibo: "kandrop.example/r/K7Q2X",
  referencia: "KD-7QX2M8",
  codigo_seguimento: "KD4123456AO",
  nome_estafeta: "Carlos",
};

const TOKEN = /\{([^{}]*)\}/g;

/** Variable names used in a template that this flow does not offer. */
export function unknownVariables(template: string, flow: FlowKey): string[] {
  const allowed = FLOWS[flow].variables;
  const unknown = new Set<string>();
  for (const [, name] of template.matchAll(TOKEN)) {
    if (!allowed.includes(name as VariableName)) unknown.add(name!);
  }
  return [...unknown];
}

/** The first thing wrong with a template, or `null` if it is fine. One rule set for browser and API. */
export function templateProblem(template: string, flow: FlowKey): AutomationValidationCode | null {
  const text = template.trim();
  if (text.length === 0) return "template_required";
  if (text.length > TEMPLATE_MAX) return "template_too_long";
  // A stray `{` or `}` left after removing the well-formed tokens is a typo, not text.
  if (/[{}]/.test(text.replace(TOKEN, ""))) return "template_braces";
  if (unknownVariables(text, flow).length > 0) return "template_unknown_variable";
  return null;
}

export type Segment = { text: string; variable?: string; unknown?: boolean };

/** Splits a template into plain text and variables, filling known ones from `values`. */
export function renderSegments(
  template: string,
  flow: FlowKey,
  values: Record<string, string>
): Segment[] {
  const allowed = FLOWS[flow].variables;
  const out: Segment[] = [];
  let last = 0;
  for (const match of template.matchAll(TOKEN)) {
    if (match.index > last) out.push({ text: template.slice(last, match.index) });
    const name = match[1]!;
    out.push(
      allowed.includes(name as VariableName)
        ? { text: values[name] ?? match[0], variable: name }
        : { text: match[0], unknown: true }
    );
    last = match.index + match[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

/** `+244 9•• ••• 789` — enough to recognise the number, not to use it. */
export const maskPhone = (national: string) => `+244 9•• ••• ${national.slice(-3)}`;

export const connectSchema = z.object({ phone: phoneSchema });
export type ConnectInput = z.input<typeof connectSchema>;

/** Any subset of: switch it, replace its message, or go back to the default message. */
export const updateFlowSchema = z.object({
  enabled: z.boolean().optional(),
  template: z.string().optional(),
  reset: z.literal(true).optional(),
});
export type UpdateFlowInput = z.input<typeof updateFlowSchema>;

export function firstAutomationError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, AutomationValidationCode> {
  const out: Record<string, AutomationValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as AutomationValidationCode;
  }
  return out;
}
