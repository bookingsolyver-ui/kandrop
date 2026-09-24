import { randomUUID } from "node:crypto";
import { ApiError } from "@/server/http/errors";

export interface UserRecord {
  id: string;
  /** Lower-cased, unique. */
  email: string;
  passwordHash: string;
  fullName: string;
  storeId: string;
  storeName: string;
  role: "owner" | "staff";
  locale: "pt" | "en" | "fr";
  createdAt: string;
}

export type NewUser = Pick<
  UserRecord,
  "email" | "passwordHash" | "fullName" | "storeName" | "locale"
>;

/**
 * STUB — in-memory, per process, lost on restart. This interface is the seam: implement it
 * on top of the real database (unique index on `email`) and nothing else changes.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** The store's owner (its name is the store's public name). */
  findOwnerByStore(storeId: string): Promise<UserRecord | null>;
  /** Must throw `ApiError("email_taken")` on a duplicate e-mail. */
  create(user: NewUser): Promise<UserRecord>;
}

const g = globalThis as unknown as { __kandropUsers?: Map<string, UserRecord> };
const users = (g.__kandropUsers ??= new Map<string, UserRecord>());

export const userRepository: UserRepository = {
  async findByEmail(email) {
    return [...users.values()].find((u) => u.email === email) ?? null;
  },
  async findById(id) {
    return users.get(id) ?? null;
  },
  async findOwnerByStore(storeId) {
    return [...users.values()].find((u) => u.storeId === storeId && u.role === "owner") ?? null;
  },
  async create(input) {
    if ([...users.values()].some((u) => u.email === input.email)) {
      throw new ApiError("email_taken");
    }
    const user: UserRecord = {
      ...input,
      id: `usr_${randomUUID()}`,
      storeId: `sto_${randomUUID()}`,
      role: "owner",
      createdAt: new Date().toISOString(),
    };
    users.set(user.id, user);
    return user;
  },
};
