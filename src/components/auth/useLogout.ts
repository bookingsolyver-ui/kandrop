"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** Ends the session (the server clears the httpOnly cookie) and goes back to the sign-in page. */
export function useLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return { logout, pending };
}
