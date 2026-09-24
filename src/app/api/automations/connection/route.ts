import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { connectWhatsApp, disconnectWhatsApp } from "@/server/modules/automations/service";
import type { ConnectInput } from "@/shared/automations/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };

/** Starts pairing a WhatsApp number (simulated): `{ phone }`, 9 national digits. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  return json(await connectWhatsApp(auth, (await readJson(req, 1_000)) as ConnectInput), noStore);
});

/** Cancels a pairing in progress, or disconnects (which also switches every flow off). */
export const DELETE = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  return json(await disconnectWhatsApp(auth), noStore);
});
