"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ListMessage, primaryButton } from "@/components/data/ListStates";
import { useRouter } from "@/i18n/navigation";
import type { BillingOverview } from "@/server/modules/billing/schema";
import type { PaidPlan } from "@/shared/billing/schemas";
import { getBilling, type ApiResult } from "./billingApi";
import { CurrentPlan } from "./CurrentPlan";
import { InvoicesTable } from "./InvoicesTable";
import { PlanCards } from "./PlanCards";
import { UpgradeDialog } from "./UpgradeDialog";

export function BillingView() {
  const t = useTranslations("Billing");
  const errors = useTranslations("Errors");
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<ApiResult<BillingOverview> | null>(null);
  const [choosing, setChoosing] = useState<{ plan: PaidPlan; renewing: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getBilling(controller.signal)
      .then(setResult)
      .catch(() => {
        /* aborted: a newer request replaced it */
      });
    return () => controller.abort();
  }, [reload]);

  const unauthenticated = result && !result.ok && result.code === "unauthenticated";
  useEffect(() => {
    if (unauthenticated) router.replace("/login");
  }, [unauthenticated, router]);

  /** After a payment: fresh numbers for the page, and the dialog gets them too. */
  const refresh = useCallback(async () => {
    const fresh = await getBilling();
    setResult(fresh);
    return fresh.ok ? fresh.data : null;
  }, []);

  if (!result) {
    return (
      <div aria-hidden className="space-y-6">
        <div className="h-44 animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none" />
        <div className="h-80 animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none" />
      </div>
    );
  }

  if (!result.ok) {
    const forbidden = result.code === "forbidden";
    return (
      <ListMessage
        title={forbidden ? t("forbidden.title") : t("loadError.title")}
        body={forbidden ? t("forbidden.body") : errors(result.code)}
        action={
          forbidden ? undefined : (
            <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
              {t("loadError.retry")}
            </button>
          )
        }
      />
    );
  }

  const data = result.data;
  return (
    <div className="space-y-8">
      <CurrentPlan data={data} />
      <PlanCards
        plans={data.plans}
        onChoose={(plan) =>
          setChoosing({
            plan,
            renewing: data.plans.find((p) => p.key === plan)?.action === "renew",
          })
        }
      />
      <InvoicesTable invoices={data.invoices} />
      {data.sandbox && <p className="text-[13px] leading-relaxed text-ink-muted">{t("sandbox")}</p>}

      {choosing && (
        <UpgradeDialog
          key={`${choosing.plan}`}
          plan={choosing.plan}
          renewing={choosing.renewing}
          sandbox={data.sandbox}
          onPaid={refresh}
          onClose={() => {
            setChoosing(null);
            setReload((n) => n + 1); // a payment left pending shows up as a pending invoice
          }}
        />
      )}
    </div>
  );
}
