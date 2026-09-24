import type { FlowKey } from "@/shared/automations/schemas";

export type ConnectionStatus = "disconnected" | "pending" | "connected";

export interface ConnectionRecord {
  status: ConnectionStatus;
  /** National number, 9 digits. */
  phone?: string;
  /** What the (simulated) QR code encodes. */
  pairingCode?: string;
  /** When the simulated scan will happen. */
  connectAt?: number;
  connectedAt?: number;
}

export interface FlowRecord {
  enabled: boolean;
  /** `null` = the flow's default message. */
  template: string | null;
  updatedAt?: number;
}

/** Per store. Always looked up by the session's `storeId`. */
export interface AutomationState {
  connection: ConnectionRecord;
  flows: Record<FlowKey, FlowRecord>;
}

export interface PublicFlow {
  key: FlowKey;
  enabled: boolean;
  /** The message in force: the merchant's, or the default. */
  template: string;
  isDefault: boolean;
  updatedAt?: string;
}

export interface PublicAutomations {
  connection: {
    status: ConnectionStatus;
    phoneMasked?: string;
    connectedAt?: string;
    /** Only while `pending`: what the simulated QR code encodes. */
    pairingCode?: string;
  };
  flows: PublicFlow[];
}
