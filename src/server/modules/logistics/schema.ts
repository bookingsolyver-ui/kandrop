import type {
  DeliveryOutcome,
  DeliveryStage,
  DeliveryStatus,
  ReturnReason,
  Vehicle,
} from "@/shared/logistics/schemas";

/**
 * Internal record. The *state* of a delivery (stage, progress, status) is never stored: it is
 * derived from `createdAt` + `durationMs` and the clock, so it cannot go stale.
 * Customer name and address are copied from the order at dispatch (personal data: never logged).
 */
export interface DeliveryRecord {
  id: string;
  storeId: string;
  orderId: string;
  orderNumber: number;
  /** The tracking code the order carries (`KD1234567AO`). */
  code: string;
  zone: string;
  street: string;
  reference?: string;
  customerName: string;
  courierId: string;
  createdAt: number;
  durationMs: number;
  outcome: DeliveryOutcome;
  returnReason?: ReturnReason;
  /** Whether the order has been moved to its final status (delivered / cancelled). */
  orderSynced: boolean;
}

export interface PublicDeliveryEvent {
  stage: DeliveryStage;
  /** When it happened; absent while it is still ahead. */
  at?: string;
}

export interface PublicDelivery {
  id: string;
  orderId: string;
  orderNumber: number;
  code: string;
  zone: string;
  street: string;
  reference?: string;
  customerName: string;
  courier: { id: string; name: string; phone: string; vehicle: Vehicle };
  createdAt: string;
  durationMs: number;
  outcome: DeliveryOutcome;
  status: DeliveryStatus;
  stage: DeliveryStage;
  /** 0..1 as of the server's clock. */
  progress: number;
  /** When it is expected to arrive (or, once over, when it did). */
  etaAt: string;
  events: PublicDeliveryEvent[];
  returnReason?: ReturnReason;
  /** Only once delivered. */
  proof?: PublicProof;
}

export interface PublicProof {
  /** What the courier captured: a photo of the parcel, the customer's signature, or both. */
  kinds: Array<"photo" | "signature">;
  recipientName: string;
  deliveredAt: string;
  /** Seeds the (simulated) picture so the same delivery always draws the same one. */
  seed: number;
}

export interface DeliveryPage {
  items: PublicDelivery[];
  total: number;
  counts: Record<DeliveryStatus | "all", number>;
  page: number;
  pageSize: number;
  /** The server's clock, so browsers can keep time with it. */
  now: string;
}
