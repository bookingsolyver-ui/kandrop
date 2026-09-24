import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { PublicBankAccount } from "@/server/modules/bank/schema";
import {
  firstBankError,
  type BankAccountInput,
  type BankValidationCode,
} from "@/shared/bank/schemas";

export type ApiResult<T> = Result<T, BankValidationCode>;

/** The account as the server has it right now (masked), or `null` if none is set up. */
export const getBankAccount = () =>
  request<PublicBankAccount | null, BankValidationCode>(
    "/api/settings/bank",
    { cache: "no-store" },
    firstBankError
  );

export const saveBankAccount = (body: BankAccountInput) =>
  request<PublicBankAccount, BankValidationCode>(
    "/api/settings/bank",
    { method: "PUT", body: JSON.stringify(body) },
    firstBankError
  );
