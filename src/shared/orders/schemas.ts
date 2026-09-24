import { z } from "zod";

/** Messages are stable CODES; the UI translates `Orders.validation.<code>`. */
export type OrderValidationCode = "status_invalid" | "tracking_too_long";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SORTS = ["date", "total", "customer"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

/**
 * The fulfilment flow. A paid order moves forward one step at a time; it can be cancelled until
 * it ships. `delivered` and `cancelled` are final. One table for the API (the rule) and the UI
 * (which buttons to offer), so they cannot drift apart.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from].includes(to);

export const MAX_TRACKING_LENGTH = 40;

const c = (code: OrderValidationCode) => ({ error: code });

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, c("status_invalid")),
  /** Only kept when the order is being marked as shipped. */
  trackingCode: z.string().trim().max(MAX_TRACKING_LENGTH, c("tracking_too_long")).optional(),
});
export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  sort: z.enum(ORDER_SORTS).default("date"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListOrdersQuery = z.input<typeof listOrdersQuerySchema>;

export function firstOrderError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, OrderValidationCode> {
  const out: Record<string, OrderValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as OrderValidationCode;
  }
  return out;
}
