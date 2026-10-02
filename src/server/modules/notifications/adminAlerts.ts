import "server-only";
import { getEnv } from "@/server/config/env";
import { createAdminNotification } from "./adminFeed";
import { sendPush } from "./push";
import { sendNewRequestAdminEmails } from "./subscriptionEmail";

const PLAN_NAMES = { starter: "Starter", pro: "Pro" } as const;
/** Where the notice leads: the approvals tab of the console (the page opens on it when requests are waiting). */
const APPROVALS = "/admin/subscricoes";

/**
 * A merchant just submitted a request for a plan: tell the administrators on three channels at once: the notification centre (the bell),
 * Web Push to every registered device and an e-mail. Run AFTER the response (`after()` in the route), and every channel is isolated: one failing
 * never stops the others, and nothing here can undo or delay the merchant's request. Never throws.
 */
export async function notifyNewPlanRequest(request: { storeName: string; merchantEmail: string; plan: keyof typeof PLAN_NAMES; requestedAt: number }): Promise<void> {
  const plan = PLAN_NAMES[request.plan];
  const message = `Novo pedido da loja ${request.storeName} para o plano ${plan}.`;
  const admins = (getEnv().ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const results = await Promise.allSettled([
    createAdminNotification({ title: "Novo pedido de adesão", message, type: "plan_request", link: APPROVALS }),
    sendPush("admin", undefined, { title: "Novo pedido de adesão", body: message, url: APPROVALS, tag: "kandrop-plan-request" }),
    sendNewRequestAdminEmails({ to: admins, storeName: request.storeName, merchantEmail: request.merchantEmail, planName: plan, requestedAt: request.requestedAt }),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[admin-alert] ${["notification", "push", "email"][i]} failed`, r.reason instanceof Error ? r.reason.message : r.reason);
  });
}
