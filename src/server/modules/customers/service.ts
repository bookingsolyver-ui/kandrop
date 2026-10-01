import { orderRepository } from "@/server/modules/orders/repository";
import type { CustomerRow } from "@/shared/customers/types";
import { aggregateCustomers } from "./aggregate";

/** Customers of one store, from its real orders. Always scoped to `storeId`. */
export async function listCustomers(storeId: string): Promise<CustomerRow[]> {
  return aggregateCustomers(await orderRepository.all(storeId));
}
