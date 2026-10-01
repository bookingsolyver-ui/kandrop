import { listSupplierOrders } from "./service";
import type { SupplierOrderRow } from "@/components/supplier/types";

/** A supplier's orders as the portal shows them: only what the supplier needs, never the shopper or the sale price. */
export async function supplierOrderRows(supplierId: string): Promise<SupplierOrderRow[]> {
  const rows = await listSupplierOrders(supplierId).catch((err) => {
    console.error("[supplier] could not load the orders", err instanceof Error ? err.message : err);
    return [];
  });
  return rows.map((o) => ({
    id: o.id, orderNumber: o.orderNumber, productTitle: o.productTitle, quantity: o.quantity,
    costTotal: o.costTotal, status: o.status, createdAt: o.createdAt, invoiceNumber: o.invoice?.number ?? null,
  }));
}

/** The server's clock for a page that needs "the last 30 days" (a function, so a page does not read the clock while rendering). */
export const serverNow = () => Date.now();
