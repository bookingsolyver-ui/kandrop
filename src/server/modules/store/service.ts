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
