import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import type { LoginInput, RegisterInput } from "@/shared/auth/schemas";
import { loginSchema, registerSchema } from "@/shared/auth/schemas";
import type { Me } from "./schema";
import { userRepository, type UserRecord } from "./userRepository";

const toMe = (user: UserRecord): Me => ({
  id: user.id,
  storeId: user.storeId,
  role: user.role,
  fullName: user.fullName,
  email: user.email,
  locale: user.locale,
});

export const toSession = (user: UserRecord): Session => ({
  userId: user.id,
  storeId: user.storeId,
  role: user.role,
});

export async function registerUser(input: RegisterInput): Promise<UserRecord> {
  const data = registerSchema.parse(input);
  return userRepository.create({
    email: data.email,
    fullName: data.fullName,
    storeName: data.storeName,
    locale: data.locale,
    passwordHash: await hashPassword(data.password),
  });
}

/** Same error for "no such e-mail" and "wrong password", with equal cost either way. */
export async function authenticate(input: LoginInput): Promise<UserRecord> {
  const { email, password } = loginSchema.parse(input);
  const user = await userRepository.findByEmail(email);
  if (!user) {
    await burnPasswordCheck(password);
    throw new ApiError("invalid_credentials");
  }
  if (!(await verifyPassword(password, user.passwordHash)))
    throw new ApiError("invalid_credentials");
  return user;
}

export async function getMe(session: Session): Promise<Me> {
  const user = await userRepository.findById(session.userId);
  if (user) return toMe(user);
  // Development bypass session (no stored user).
  return {
    id: session.userId,
    storeId: session.storeId,
    role: session.role,
    fullName: "Demo",
    email: "demo@kandrop.local",
    locale: "pt",
  };
}

export { toMe };
