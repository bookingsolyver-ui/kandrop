import { verifyPassword } from "@/server/auth/password";
import type { Session } from "@/server/auth/types";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter } from "@/server/http/rateLimit";
import { userRepository } from "@/server/modules/auth/userRepository";
import { bankAccountSchema, maskIban } from "@/shared/bank/schemas";
import { bankRepository } from "./repository";
import type { BankAccountRecord, PublicBankAccount } from "./schema";

// The password is re-checked to change the destination of every payout, so it must not be a
// free guessing oracle for someone holding a stolen session: 5 wrong tries per user per 15 min.
const attempts = attemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

export const toPublic = (a: BankAccountRecord): PublicBankAccount => ({
  holderName: a.holderName,
  ibanMasked: maskIban(a.iban),
  updatedAt: new Date(a.updatedAt).toISOString(),
});

export async function getBankAccount(auth: Session): Promise<PublicBankAccount | null> {
  const account = bankRepository.get(auth.storeId);
  return account ? toPublic(account) : null;
}

async function confirmPassword(auth: Session, password: string) {
  const user = await userRepository.findById(auth.userId);
  if (!user) {
    // Only the development bypass session has no stored user (and it never runs in production).
    const env = getEnv();
    if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production") return;
    throw new ApiError("invalid_credentials");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    attempts.recordFailure(`bank:${auth.userId}`);
    throw new ApiError("invalid_credentials");
  }
  attempts.reset(`bank:${auth.userId}`);
}

/** Creates or replaces the store's payout account. Owner only, and re-authenticated. */
export async function saveBankAccount(auth: Session, input: unknown): Promise<PublicBankAccount> {
  if (auth.role !== "owner") throw new ApiError("forbidden");
  attempts.assertAllowed(`bank:${auth.userId}`);

  const data = bankAccountSchema.parse(input); // shape first: cheap, and no hashing for junk
  await confirmPassword(auth, data.password);

  return toPublic(
    bankRepository.save({
      storeId: auth.storeId,
      holderName: data.holderName,
      iban: data.iban,
      updatedAt: Date.now(),
    })
  );
}
