"use client";

import { useLocale } from "next-intl";
import { useState } from "react";

/**
 * Ends the session and goes back to the sign-in page. The session is Kandrop's own cookie (not a
 * Supabase Auth session), so "signing out" is the server clearing that httpOnly cookie. Only after
 * it confirmed, a full page load to the sign-in page (not a client-side navigation): it drops all
 * client state (live connection, caches) so nothing from the old session can crash the next screen.
 */
export function useLogout() {
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error(`logout failed: ${res.status}`);
      // Deliberately a full page load (see above), not `router.push`.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/${locale}/login`;
    } catch (error) {
      console.error("[auth] could not sign out", error);
      setPending(false); // stay put: the session is still there, the button works again
    }
  }

  return { logout, pending };
}
