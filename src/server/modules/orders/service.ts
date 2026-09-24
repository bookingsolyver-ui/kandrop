import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import {
  ORDER_STATUSES,
  canTransition,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
  type ListOrdersQuery,
  type OrderStatus,
} from "@/shared/orders/schemas";
import { orderRepository } from "./repository";
import type { OrderPage, OrderRecord, PublicOrder } from "./schema";

const notFound = () => new ApiError("not_found");

/** Lower-cases and strips accents so "joao" finds "João". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function toPublic(o: OrderRecord): PublicOrder {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    customer: o.customer,
    address: o.address,
    items: o.items,
    subtotal: o.total - o.shippingAmount,
    shippingAmount: o.shippingAmount,
    total: o.total,
    currency: o.currency,
    payment: { ...o.payment, paidAt: new Date(o.payment.paidAt).toISOString() },
    trackingCode: o.trackingCode,
    history: o.history.map((h) => ({ status: h.status, at: new Date(h.at).toISOString() })),
    createdAt: new Date(o.createdAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
  };
}

export async function listOrders(auth: Session, rawQuery: ListOrdersQuery): Promise<OrderPage> {
  const query = listOrdersQuerySchema.parse(rawQuery);
  const all = orderRepository.all(auth.storeId);

  // "#1042" and "1042" both find order 1042.
  const terms = query.q ? fold(query.q).replace(/#/g, "").split(/\s+/).filter(Boolean) : [];
  const searched = all.filter((o) => {
    if (terms.length === 0) return true;
    const haystack = fold(
      `${o.number} ${o.customer.name} ${o.customer.phone} ${o.items.map((i) => i.name).join(" ")}`
    );
    return terms.every((term) => haystack.includes(term));
  });

  const counts = Object.fromEntries([
    ["all", searched.length],
    ...ORDER_STATUSES.map((s) => [s, searched.filter((o) => o.status === s).length]),
  ]) as Record<OrderStatus | "all", number>;

  const matching = query.status ? searched.filter((o) => o.status === query.status) : searched;

  const sign = query.dir === "asc" ? 1 : -1;
  const key = (o: OrderRecord): number | string => {
    if (query.sort === "customer") return fold(o.customer.name);
    if (query.sort === "total") return o.total;
    return o.createdAt;
  };
  matching.sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    const order =
      typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
    return sign * order || b.number - a.number; // stable when values tie
  });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: matching.slice(start, start + query.pageSize).map(toPublic),
    total: matching.length,
    overall: all.length,
    counts,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getOrder(auth: Session, id: string): Promise<PublicOrder> {
  const order = orderRepository.get(auth.storeId, id);
  if (!order) throw notFound();
  return toPublic(order);
}

/** Moves an order one step along the fulfilment flow. Anything else is a 409. */
export async function updateOrderStatus(
  auth: Session,
  id: string,
  input: unknown
): Promise<PublicOrder> {
  const order = orderRepository.get(auth.storeId, id);
  if (!order) throw notFound();

  const { status, trackingCode } = updateOrderStatusSchema.parse(input);
  if (!canTransition(order.status, status)) throw new ApiError("invalid_transition");

  const now = Date.now();
  const next: OrderRecord = {
    ...order,
    status,
    trackingCode: status === "shipped" ? trackingCode || undefined : order.trackingCode,
    history: [...order.history, { status, at: now }],
    updatedAt: now,
  };
  return toPublic(orderRepository.save(next));
}

/**
 * Moves an order on behalf of another module (logistics), scoped by store. It follows the same
 * flow as the merchant's button, except that `force` lets a *returned* delivery cancel an order
 * that had already shipped (the merchant-facing flow does not allow cancelling once shipped).
 * Idempotent: an order already in the target status is left alone.
 */
export function transitionOrder(
  storeId: string,
  id: string,
  status: OrderStatus,
  options: { trackingCode?: string; force?: boolean } = {}
): PublicOrder {
  const order = orderRepository.get(storeId, id);
  if (!order) throw notFound();
  if (order.status === status) return toPublic(order);
  if (!options.force && !canTransition(order.status, status)) {
    throw new ApiError("invalid_transition");
  }
  const now = Date.now();
  return toPublic(
    orderRepository.save({
      ...order,
      status,
      trackingCode: status === "shipped" ? options.trackingCode : order.trackingCode,
      history: [...order.history, { status, at: now }],
      updatedAt: now,
    })
  );
}
