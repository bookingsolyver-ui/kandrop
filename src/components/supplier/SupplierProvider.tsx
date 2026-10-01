"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Supplier } from "@/shared/supplier/mock";

const SupplierContext = createContext<Supplier | null>(null);

/** The signed-in supplier, loaded on the server (real account) and handed down to the portal's client views. */
export function SupplierProvider({ supplier, children }: { supplier: Supplier; children: ReactNode }) {
  return <SupplierContext.Provider value={supplier}>{children}</SupplierContext.Provider>;
}

export const useSupplierContext = () => useContext(SupplierContext);
