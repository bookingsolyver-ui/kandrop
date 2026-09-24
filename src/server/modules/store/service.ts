import { ApiError } from "@/server/http/errors";
import type { Session } from "@/server/auth/session";
import { userRepository } from "@/server/modules/auth/userRepository";
import type { Store } from "./schema";

/** STUB — load from the database, scoped by session.storeId. */
export async function getStore(session: Session): Promise<Store> {
  if (!session.storeId) throw new ApiError("not_found");
  const owner = await userRepository.findById(session.userId);
  return {
    id: session.storeId,
    name: owner?.storeName ?? "Loja Demo",
    nif: null,
    currency: "AOA",
    status: "pending_verification",
  };
}
