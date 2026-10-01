"use client";

import { useCallback } from "react";

/**
 * Writes an entry to the admin audit trail after an action succeeded. Fire-and-forget: the
 * server fills in who, when and from where, and a failure here must not undo the admin's action.
 */
export function useAudit() {
  return useCallback(
    (action: string, target: string, before?: Record<string, unknown>, after?: Record<string, unknown>) => {
      void fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target, before, after }),
      }).catch(() => undefined);
    },
    []
  );
}
