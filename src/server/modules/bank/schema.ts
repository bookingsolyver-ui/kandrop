export interface BankAccountRecord {
  storeId: string;
  holderName: string;
  /** Normalised full IBAN. Never sent to the browser after it is saved. */
  iban: string;
  updatedAt: number;
}

/** What the browser may see: the account is recognisable, not usable. */
export interface PublicBankAccount {
  holderName: string;
  ibanMasked: string;
  updatedAt: string;
}
