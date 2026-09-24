import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/http/respond";
import { ensureDemoPublisher } from "@/server/realtime/demoPublisher";
import { eventBus } from "@/server/realtime/eventBus";
import { sseResponse } from "@/server/realtime/sse";

// SSE needs a long-lived Node process — not the Edge runtime, not a cached response.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const session = await requireSession(req);
  ensureDemoPublisher(session.storeId);

  return sseResponse({
    signal: req.signal,
    start: (send) => eventBus.subscribe(session.storeId, send),
  });
});
