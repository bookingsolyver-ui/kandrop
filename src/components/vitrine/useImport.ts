"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { importSupplierProductAction } from "@/app/[locale]/dashboard/vitrine/actions";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import type { VitrineProduct } from "@/shared/vitrine/types";

/**
 * "Start selling": adds an approved supplier product to the merchant's own store (a draft in their
 * catalogue, cost price = the supplier's) through the server, and remembers what is already there.
 * A product that is already imported goes straight to the catalogue.
 */
export function useImport(initial: string[]) {
  const t = useTranslations("Vitrine");
  const toast = useToast();
  const router = useRouter();
  const [imported, setImported] = useState(() => new Set(initial));
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const start = (p: VitrineProduct) => {
    if (imported.has(p.id)) return router.push("/dashboard/products");
    setBusy(p.id);
    startTransition(async () => {
      const result = await importSupplierProductAction(p.id);
      setBusy(null);
      if (result.ok) {
        setImported((s) => new Set(s).add(p.id));
        toast({ message: t("toast.added"), action: { label: t("toast.view"), onClick: () => router.push(`/dashboard/products/${result.productId}`) } });
      } else if (result.error === "already_imported") {
        setImported((s) => new Set(s).add(p.id));
        toast({ message: t("import.errors.already") });
      } else {
        toast({ message: t(`import.errors.${result.error === "plan_limit" ? "limit" : result.error === "unauthorized" ? "unauthorized" : "failed"}`) });
      }
    });
  };
  return { imported, start, pending, busy };
}
