export interface Session {
  userId: string;
  storeId: string;
  role: "owner" | "staff";
  /** When the token was issued (seconds since the epoch); absent for the dev bypass. */
  issuedAt?: number;
}
