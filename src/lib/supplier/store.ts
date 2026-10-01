"use client";

import { useCallback, useMemo } from "react";
import { useSupplierContext } from "@/components/supplier/SupplierProvider";
import { readList, useLocalList, writeList } from "@/lib/localStore";
import {
  SEED_SUBMISSIONS,
  supplierById,
  type Submission,
  type SubmissionStatus,
  type Supplier,
} from "@/shared/supplier/mock";

/**
 * The supplier's products-in-review, the team's decisions and the withdrawals, still kept in the browser.
 * !! DEMO ONLY: the ACCOUNT is real (Supabase Auth + `suppliers` table + server session), but these three
 * lists need their own tables before they are. Nothing here is a security boundary.
 */
const K = {
  created: "kandrop:supplier-submissions:v1",
  decisions: "kandrop:supplier-decisions:v1",
  withdrawals: "kandrop:supplier-withdrawals:v1",
} as const;

/**
 * The signed-in supplier comes from the server now (`SupplierProvider`, filled by the portal layout from
 * the real account). A seeded demo supplier is only recognised when its id matches, which a real
 * (uuid) account never does: real suppliers start with an empty portal.
 */
export function useCurrentSupplier(): { supplier: Supplier | null; ready: boolean; seeded: boolean } {
  const supplier = useSupplierContext();
  return { supplier, ready: true, seeded: !!(supplier && supplierById(supplier.id)) };
}

interface Decision {
  id: string;
  status: SubmissionStatus;
}

/** Submitted products (the seed ones plus those created here) with the team's decisions applied. */
export function useSubmissions() {
  const [created] = useLocalList<Submission>(K.created);
  const [decisions] = useLocalList<Decision>(K.decisions);
  const items = useMemo(() => {
    const decided = new Map(decisions.map((d) => [d.id, d.status]));
    return [...created, ...SEED_SUBMISSIONS].map((s) => ({ ...s, status: decided.get(s.id) ?? s.status }));
  }, [created, decisions]);

  const create = useCallback((s: Submission) => writeList(K.created, [s, ...readList<Submission>(K.created)]), []);
  const decide = useCallback((id: string, status: SubmissionStatus) => {
    writeList(K.decisions, [{ id, status }, ...readList<Decision>(K.decisions).filter((d) => d.id !== id)]);
  }, []);
  return { items, create, decide };
}

export interface Withdrawal {
  id: string;
  supplierId: string;
  amount: number;
  at: number;
}

export function useWithdrawals(supplierId: string | null) {
  const [all] = useLocalList<Withdrawal>(K.withdrawals);
  const mine = useMemo(() => all.filter((w) => w.supplierId === supplierId), [all, supplierId]);
  const request = useCallback(
    (amount: number) => {
      if (!supplierId) return;
      const entry: Withdrawal = { id: `SUP-WD-${String(readList<Withdrawal>(K.withdrawals).length + 1).padStart(3, "0")}`, supplierId, amount, at: Date.now() };
      writeList(K.withdrawals, [entry, ...readList<Withdrawal>(K.withdrawals)]);
    },
    [supplierId]
  );
  return { withdrawals: mine, request };
}
