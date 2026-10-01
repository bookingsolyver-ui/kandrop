import type { OrderRecord } from "@/server/modules/orders/schema";
import type { CustomerRow } from "@/shared/customers/types";

/**
 * The store's customers, derived from its orders (grouped by phone number), most recent first.
 * Cancelled orders do not count as orders; only payment-verified ones count as money spent.
 * Name/contact/address come from the customer's latest order.
 */
export function aggregateCustomers(orders: OrderRecord[]): CustomerRow[] {
  const byPhone = new Map<string, CustomerRow>();
  for (const order of [...orders].sort((a, b) => a.createdAt - b.createdAt)) {
    const phone = order.customer.phone.replace(/\D/g, "");
    if (!phone) continue;
    const live = order.status !== "cancelled";
    const prev = byPhone.get(phone);
    byPhone.set(phone, {
      phone,
      name: order.customer.name,
      email: order.customer.email ?? prev?.email ?? null,
      city: order.address.city,
      province: order.address.province,
      orders: (prev?.orders ?? 0) + (live ? 1 : 0),
      spent: (prev?.spent ?? 0) + (live && order.paymentStatus === "paid_verified" ? order.total : 0),
      lastOrderAt: order.createdAt,
    });
  }
  return [...byPhone.values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
}
