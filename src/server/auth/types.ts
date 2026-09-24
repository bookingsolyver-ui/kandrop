export interface Session {
  userId: string;
  storeId: string;
  role: "owner" | "staff";
}
