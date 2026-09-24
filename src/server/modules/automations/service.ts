import { randomBytes, randomInt } from "node:crypto";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import {
  FLOWS,
  FLOW_KEYS,
  connectSchema,
  maskPhone,
  templateProblem,
  updateFlowSchema,
  type ConnectInput,
  type FlowKey,
  type UpdateFlowInput,
} from "@/shared/automations/schemas";
import { automationRepository } from "./repository";
import type { AutomationState, PublicAutomations, PublicFlow } from "./schema";

/** SANDBOX: how long until the simulated phone "scans" the code. */
const SCAN_MIN_MS = 7_000;
const SCAN_MAX_MS = 12_000;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newPairingCode = () =>
  `KD-WA-${Array.from(randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join("")}`;

function requireOwner(auth: Session) {
  if (auth.role !== "owner") throw new ApiError("forbidden");
}

/** Lazily applies the simulated scan once its delay has passed. */
function settle(state: AutomationState): AutomationState {
  const c = state.connection;
  if (c.status === "pending" && c.connectAt !== undefined && Date.now() >= c.connectAt) {
    state.connection = { status: "connected", phone: c.phone, connectedAt: c.connectAt };
  }
  return state;
}

function publicFlow(key: FlowKey, state: AutomationState): PublicFlow {
  const flow = state.flows[key];
  return {
    key,
    enabled: flow.enabled,
    template: flow.template ?? FLOWS[key].defaultTemplate,
    isDefault: flow.template === null,
    updatedAt: flow.updatedAt ? new Date(flow.updatedAt).toISOString() : undefined,
  };
}

function toPublic(state: AutomationState): PublicAutomations {
  const c = state.connection;
  return {
    connection: {
      status: c.status,
      phoneMasked: c.phone ? maskPhone(c.phone) : undefined,
      connectedAt: c.connectedAt ? new Date(c.connectedAt).toISOString() : undefined,
      pairingCode: c.status === "pending" ? c.pairingCode : undefined,
    },
    flows: FLOW_KEYS.map((key) => publicFlow(key, state)),
  };
}

export async function getAutomations(auth: Session): Promise<PublicAutomations> {
  return toPublic(settle(automationRepository.get(auth.storeId)));
}

/** Starts pairing the merchant's WhatsApp number. Simulated: a code appears, then it "connects". */
export async function connectWhatsApp(
  auth: Session,
  input: ConnectInput
): Promise<PublicAutomations> {
  requireOwner(auth);
  const { phone } = connectSchema.parse(input);
  const state = settle(automationRepository.get(auth.storeId));
  if (state.connection.status === "connected") throw new ApiError("whatsapp_already_connected");

  state.connection = {
    status: "pending",
    phone,
    pairingCode: newPairingCode(),
    connectAt: Date.now() + randomInt(SCAN_MIN_MS, SCAN_MAX_MS + 1),
  };
  return toPublic(state);
}

/** Cancels a pairing in progress, or disconnects. Disconnecting also turns every flow off. */
export async function disconnectWhatsApp(auth: Session): Promise<PublicAutomations> {
  requireOwner(auth);
  const state = settle(automationRepository.get(auth.storeId));
  state.connection = { status: "disconnected" };
  // Nothing can be sent without a connection, so nothing may stay switched on.
  for (const key of FLOW_KEYS) state.flows[key].enabled = false;
  return toPublic(state);
}

export async function updateFlow(
  auth: Session,
  key: FlowKey,
  input: UpdateFlowInput
): Promise<PublicFlow> {
  requireOwner(auth);
  if (!FLOW_KEYS.includes(key)) throw new ApiError("not_found");
  const patch = updateFlowSchema.parse(input);
  const state = settle(automationRepository.get(auth.storeId));
  const flow = state.flows[key];

  if (patch.template !== undefined) {
    const problem = templateProblem(patch.template, key);
    if (problem) {
      throw new ApiError("validation_failed", [{ path: ["template"], message: problem }]);
    }
  }
  if (patch.enabled === true && state.connection.status !== "connected") {
    throw new ApiError("whatsapp_not_connected");
  }

  if (patch.reset) flow.template = null;
  else if (patch.template !== undefined) {
    const text = patch.template.trim();
    flow.template = text === FLOWS[key].defaultTemplate ? null : text;
  }
  if (patch.enabled !== undefined) flow.enabled = patch.enabled;
  flow.updatedAt = Date.now();
  return publicFlow(key, state);
}
