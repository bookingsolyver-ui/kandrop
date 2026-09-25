import type { ApiErrorCode } from "@/server/http/errors";

export type ApiResult<T, F extends string = string> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** Translated through `Errors.<code>`. */
      code: ApiErrorCode;
      /** Set when the server rejected specific fields (rare: the browser validates first). */
      fieldErrors: Record<string, F>;
    };

interface ApiBody<T> {
  data?: T;
  error?: { code?: ApiErrorCode; details?: Array<{ path: PropertyKey[]; message: string }> };
}

/**
 * JSON over `fetch`, folding every failure mode (offline, 4xx, 5xx) into one result shape.
 * `fieldErrors` maps validation details to per-field codes with the caller's own mapper.
 */
export async function request<T, F extends string = string>(
  url: string,
  init: RequestInit | undefined,
  fieldErrors: (details: Array<{ path: PropertyKey[]; message: string }>) => Record<string, F>
): Promise<ApiResult<T, F>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, code: "internal", fieldErrors: {} };
  }

  if (res.status === 204) return { ok: true, data: undefined as T };
  const body = (await res.json().catch(() => ({}))) as ApiBody<T>;
  if (res.ok && body.data !== undefined) return { ok: true, data: body.data };

  const code = body.error?.code ?? "internal";
  // The plan ran out while the page was open: the payment gate applies here too. (Not on the
  // `/checkout` page itself, whose own requests are the ones that start the payment.)
  if (code === "payment_required" && !location.pathname.includes("/checkout")) {
    // A full navigation on purpose: this runs outside React, and the server decides what comes next.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- no router here
    window.location.href = `/${location.pathname.split("/")[1] || "pt"}/checkout`;
  }
  return {
    ok: false,
    code,
    fieldErrors:
      code === "validation_failed" && body.error?.details ? fieldErrors(body.error.details) : {},
  };
}
