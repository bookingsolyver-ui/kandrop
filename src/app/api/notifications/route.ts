import { isAdmin } from "@/server/auth/admin";
import { requireSession, requireSupplierSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { findSupplier } from "@/server/modules/supplier/service";
import { newSales, type NotificationScope } from "@/server/modules/notifications/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Look this far BEHIND `since` so an order saved a moment after the previous poll is never missed (the browser de-duplicates). */
const OVERLAP_MS = 20_000;

/**
 * New sales for the signed-in person, scoped by WHO they are, never by what the browser asks for:
 *  - `merchant`: the orders of their own store;
 *  - `supplier`: the supplier lines addressed to them (an approved supplier);
 *  - `admin`: every order of the platform (administrators only).
 * Without `since` it only returns the server clock (the baseline), so opening a panel never replays old sales.
 */
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") as NotificationScope | null;
  if (scope !== "merchant" && scope !== "supplier" && scope !== "admin") throw new ApiError("validation_failed");
  const sinceParam = url.searchParams.get("since");
  const now = Date.now();
  const headers = { "Cache-Control": "no-store" };

  let owner: { storeId?: string; supplierId?: string };
  if (scope === "supplier") {
    // A supplier's session opens nothing of the merchant API (`requireSession` refuses it), so this scope has its own gate.
    const session = await requireSupplierSession(req);
    const supplier = await findSupplier(session.userId);
    if (!supplier || supplier.status !== "approved") throw new ApiError("forbidden");
    owner = { supplierId: supplier.id };
  } else if (scope === "admin") {
    const session = await requireSession(req, { allowUnpaid: true });
    if (!(await isAdmin(session))) throw new ApiError("not_found");
    owner = {};
  } else {
    const session = await requireSession(req);
    owner = { storeId: session.storeId };
  }

  const since = sinceParam === null ? null : Number(sinceParam);
  if (since === null || !Number.isFinite(since)) return json({ now, items: [] }, { headers });
  return json({ now, items: await newSales(scope, owner, Math.max(0, since - OVERLAP_MS)) }, { headers });
});
