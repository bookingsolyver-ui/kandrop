import type { VitrineKind } from "@/shared/vitrine/types";

/** What the portal knows about the signed-in supplier (built on the server from the real account; never the tax number). */
export interface Supplier {
  id: string;
  /** Legal name. */
  name: string;
  nif: string;
  kind: VitrineKind;
  province: string;
  municipality: string;
  phone: string;
  email: string;
  rating: number;
  reviews: number;
  /** The year the company joined. */
  since: number;
  description: string;
  /** The brands this supplier's products carry in the Vitrine. */
  brands: string[];
  banner: [string, string];
  status: "active" | "pending_review";
}
