import type { Session } from "@/server/auth/session";
import type { Me } from "./schema";

/** STUB — load the user from the database once persistence exists. */
export async function getMe(session: Session): Promise<Me> {
  return {
    id: session.userId,
    storeId: session.storeId,
    role: session.role,
    locale: "pt",
  };
}
