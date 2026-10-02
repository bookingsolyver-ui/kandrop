import "server-only";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { findSupplier, type SupplierRecord } from "@/server/modules/supplier/service";
import { readSession } from "./session";

/**
 * For the supplier portal (Server Components): the signed-in supplier, or a redirect — to the supplier
 * sign-in when there is no session, to the merchant dashboard when the session is a merchant's. The
 * proxy does the same first; this is the second lock.
 */
export async function requireSupplier(locale: Locale): Promise<SupplierRecord> {
  const session = await readSession();
  if (!session) return redirect({ href: "/fornecedor/login", locale });
  if (session.role !== "supplier") return redirect({ href: "/dashboard", locale });
  const supplier = await findSupplier(session.userId);
  if (!supplier || supplier.status === "rejected") return redirect({ href: "/fornecedor/login", locale });
  return supplier;
}

/** Sign-in and sign-up pages: a supplier who is already in goes straight to the portal. */
export async function redirectIfSupplier(locale: Locale): Promise<void> {
  const session = await readSession();
  if (session?.role === "supplier") redirect({ href: "/fornecedor", locale });
}
