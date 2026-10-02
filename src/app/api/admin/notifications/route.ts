import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { clearAdminNotifications, listAdminNotifications, markAdminNotificationsRead } from "@/server/modules/notifications/adminFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

async function requireAdminSession(req: Request) {
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
}

const query = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(15),
  before: z.coerce.number().int().positive().optional(),
});
const ids = z.array(z.string().min(1).max(60)).min(1).max(100);

/** The administrators' notifications, newest first: `?limit=` (1-50) and `?before=<createdAt of the last item>` for the next page. Also the unread count. */
export const GET = handle(async (req) => {
  await requireAdminSession(req);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { limit, before } = query.parse(params);
  return json(await listAdminNotifications({ limit, before }), { headers: noStore });
});

/** Marks as read: `{ ids: [...] }` or `{ all: true }`. */
export const PATCH = handle(async (req) => {
  assertSameOrigin(req);
  await requireAdminSession(req);
  const body = z.union([z.object({ ids }), z.object({ all: z.literal(true) })]).parse(await readJson(req));
  await markAdminNotificationsRead(body);
  return json({ ok: true }, { headers: noStore });
});

/** Clears: `{ ids: [...] }`, `{ onlyRead: true }` or `{ all: true }`. */
export const DELETE = handle(async (req) => {
  assertSameOrigin(req);
  await requireAdminSession(req);
  const body = z.union([z.object({ ids }), z.object({ onlyRead: z.literal(true) }), z.object({ all: z.literal(true) })]).parse(await readJson(req));
  await clearAdminNotifications(body);
  return json({ ok: true }, { headers: noStore });
});
