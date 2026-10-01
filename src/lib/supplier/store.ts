"use client";

import { useCallback, useMemo } from "react";
import { readList, useLocalList, writeList } from "@/lib/localStore";
import {
  SEED_SUBMISSIONS,
  SUPPLIERS,
  submissionToVitrine,
  supplierById,
  type Submission,
  type SubmissionStatus,
  type Supplier,
} from "@/shared/supplier/mock";
import type { VitrineKind, VitrineProduct } from "@/shared/vitrine/mock";
import type { SupplierRegisterInput } from "@/shared/supplier/schemas";

/**
 * The supplier side of the demo, in the browser: accounts created through the sign-up, the signed-in
 * supplier, the products they submit, the team's decisions and the withdrawals they ask for.
 * !! DEMO ONLY: real supplier accounts need a table, server sessions and a hashed password in the
 * database. Nothing here is a security boundary, and the portal only shows invented data.
 */
const K = {
  accounts: "kandrop:supplier-accounts:v1",
  session: "kandrop:supplier-session:v1",
  created: "kandrop:supplier-submissions:v1",
  decisions: "kandrop:supplier-decisions:v1",
  withdrawals: "kandrop:supplier-withdrawals:v1",
} as const;

export interface SupplierAccount {
  id: string;
  companyName: string;
  nif: string;
  phone: string;
  email: string;
  province: string;
  municipality: string;
  salt: string;
  passwordHash: string;
  createdAt: number;
  status: "pending_review" | "active";
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useSupplierAccounts() {
  const [accounts] = useLocalList<SupplierAccount>(K.accounts);

  /** Creates an account (the e-mail must be new). `null` when the e-mail is taken. */
  const register = useCallback(async (input: Required<SupplierRegisterInput>) => {
    const current = readList<SupplierAccount>(K.accounts);
    const email = input.email.trim().toLowerCase();
    if (current.some((a) => a.email === email) || SUPPLIERS.some((s) => s.email === email)) return null;
    const salt = crypto.randomUUID();
    const account: SupplierAccount = {
      id: `sup_${crypto.randomUUID().slice(0, 8)}`,
      companyName: input.companyName.trim(),
      nif: input.nif.replace(/\D/g, ""),
      phone: input.phone.replace(/\D/g, ""),
      email,
      province: input.province,
      municipality: input.municipality.trim(),
      salt,
      passwordHash: await sha256(`${salt}:${input.password}`),
      createdAt: Date.now(),
      status: "pending_review",
    };
    writeList(K.accounts, [account, ...current]);
    return account;
  }, []);

  /** The account whose e-mail and password match, or `null`. */
  const verify = useCallback(async (emailRaw: string, password: string) => {
    const email = emailRaw.trim().toLowerCase();
    const account = readList<SupplierAccount>(K.accounts).find((a) => a.email === email);
    if (!account) return null;
    return (await sha256(`${account.salt}:${password}`)) === account.passwordHash ? account : null;
  }, []);

  return { accounts, register, verify };
}

/** The signed-in supplier (an id) and the means to sign in or out. */
export function useSupplierSession() {
  const [ids, ready] = useLocalList<string>(K.session);
  const signIn = useCallback((id: string) => writeList(K.session, [id]), []);
  const signOut = useCallback(() => writeList(K.session, []), []);
  return { supplierId: ids[0] ?? null, ready, signIn, signOut };
}

/** The signed-in supplier as a `Supplier`: a seeded one, or a company that registered in this browser. */
export function useCurrentSupplier(): { supplier: Supplier | null; ready: boolean; seeded: boolean } {
  const { supplierId, ready } = useSupplierSession();
  const { accounts } = useSupplierAccounts();
  return useMemo(() => {
    if (!supplierId) return { supplier: null, ready, seeded: false };
    const seeded = supplierById(supplierId);
    if (seeded) return { supplier: seeded, ready, seeded: true };
    const a = accounts.find((x) => x.id === supplierId);
    if (!a) return { supplier: null, ready, seeded: false };
    const supplier: Supplier = {
      id: a.id,
      name: a.companyName,
      nif: a.nif,
      kind: "nacional",
      province: a.province,
      municipality: a.municipality,
      phone: a.phone,
      email: a.email,
      rating: 0,
      reviews: 0,
      since: new Date(a.createdAt).getFullYear(),
      description: "",
      brands: [a.companyName],
      banner: ["#ff7e2e", "#ff5a00"],
      status: a.status === "active" ? "active" : "pending_review",
    };
    return { supplier, ready, seeded: false };
  }, [supplierId, accounts, ready]);
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

/** The approved submissions of known suppliers, as Vitrine products of the given kind (empty until approved). */
export function useApprovedVitrine(kind?: VitrineKind): VitrineProduct[] {
  const { items } = useSubmissions();
  return useMemo(
    () =>
      items
        .filter((s) => s.status === "approved" && supplierById(s.supplierId))
        .map(submissionToVitrine)
        .filter((p) => !kind || p.kind === kind),
    [items, kind]
  );
}
