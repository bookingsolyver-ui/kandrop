import "server-only";
import { ApiError } from "@/server/http/errors";
import type { Session } from "@/server/auth/session";
import { userRepository } from "@/server/modules/auth/userRepository";
import { storeRepository } from "./repository";
import type { Store } from "./schema";

/** The store of the session, from the database (created from the owner's sign-up data on first use). */
export async function getStore(session: Session): Promise<Store> {
  if (!session.storeId) throw new ApiError("not_found");
  const existing = await storeRepository.get(session.storeId);
  if (existing) return existing;
  const owner = await userRepository.findById(session.userId);
  return storeRepository.ensure(session.storeId, owner?.storeName ?? "Loja Demo", session.userId);
}

/** "Load demo data": owner only. The store then shows sample numbers, orders, products and so on. */
export async function enableDemoData(session: Session): Promise<void> {
  if (session.role !== "owner") throw new ApiError("forbidden");
  const store = await getStore(session); // makes sure the store row exists
  await storeRepository.enableDemo(store.id);
}
