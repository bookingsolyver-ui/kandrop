import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/server/http/errors";
import { db, must } from "@/server/db/client";

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
  /** Sessions issued before this instant (epoch ms) are dead: password change, "sign out everywhere", ban. */
  sessionsValidAfter: number;
  banned: boolean;
}

export type NewUser = Pick<
  UserRecord,
  "email" | "passwordHash" | "fullName" | "storeName" | "locale"
>;

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findOwnerByStore(storeId: string): Promise<UserRecord | null>;
  create(user: NewUser): Promise<UserRecord>;
  /** Kill switch: every session issued up to now stops working, on every device. */
  revokeSessions(id: string): Promise<void>;
  /** Bans (and so signs out everywhere) or reinstates an account. */
  setBanned(id: string, banned: boolean): Promise<void>;
}

function mapRowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    passwordHash: String(row.password_hash ?? ""),
    fullName: String(row.full_name ?? ""),
    storeId: String(row.store_id ?? ""),
    storeName: String(row.store_name ?? ""),
    role: (row.role === "staff" ? "staff" : "owner"),
    locale: (["pt", "en", "fr"].includes(String(row.locale)) ? (row.locale as "pt" | "en" | "fr") : "pt"),
    createdAt: String(row.created_at ?? ""),
    // Missing until the security migration runs: then nobody is revoked or banned.
    sessionsValidAfter: Number(row.sessions_valid_after ?? 0),
    banned: row.banned === true,
  };
}

export const userRepository: UserRepository = {
  async findByEmail(email) {
    const data = must(
      "users.find",
      await db().from("users").select("*").eq("email", email).maybeSingle()
    );
    return data ? mapRowToUser(data) : null;
  },

  async findById(id) {
    const data = must(
      "users.find",
      await db().from("users").select("*").eq("id", id).maybeSingle()
    );
    return data ? mapRowToUser(data) : null;
  },

  async findOwnerByStore(storeId) {
    const data = must(
      "users.find",
      await db().from("users").select("*").eq("store_id", storeId).eq("role", "owner").maybeSingle()
    );
    return data ? mapRowToUser(data) : null;
  },

  async create(input) {
    const user: UserRecord = {
      ...input,
      id: `usr_${randomUUID()}`,
      storeId: `sto_${randomUUID()}`,
      role: "owner",
      createdAt: new Date().toISOString(),
      sessionsValidAfter: 0,
      banned: false,
    };

    const { error } = await db().from("users").insert({
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      full_name: user.fullName,
      store_id: user.storeId,
      store_name: user.storeName,
      role: user.role,
      locale: user.locale,
      created_at: user.createdAt,
    });

    if (error) {
      if (error.code === "23505") {
        throw new ApiError("email_taken");
      }
      console.error("[userRepository] create error:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return user;
  },

  async revokeSessions(id) {
    must("users.revokeSessions", await db().from("users").update({ sessions_valid_after: Date.now() }).eq("id", id));
  },

  async setBanned(id, banned) {
    must(
      "users.setBanned",
      await db().from("users").update({ banned, sessions_valid_after: Date.now() }).eq("id", id)
    );
  },
};
