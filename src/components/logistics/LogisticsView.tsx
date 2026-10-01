"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Tabs, panelId, tabId } from "@/components/data/Tabs";
import { ListMessage, ListSkeleton, primaryButton } from "@/components/data/ListStates";
import { Pagination } from "@/components/data/Pagination";
import { useRouter } from "@/i18n/navigation";
import type { DeliveryPage, PublicDelivery } from "@/server/modules/logistics/schema";
import type { DeliveryStatus } from "@/shared/logistics/schemas";
import { DeliveriesTable } from "./DeliveriesTable";
import { DeliverySheet } from "./DeliverySheet";
import { getDelivery, listDeliveries, type ApiResult } from "./logisticsApi";
import { ProofDialog } from "./ProofDialog";

const PAGE_SIZE = 10;
type Filter = DeliveryStatus | "all";
const FILTERS: Filter[] = ["in_transit", "delivered", "returned", "all"];
const PREFIX = "deliveries";

/** The deliveries of the store, READ-ONLY: Kandrop dispatches and delivers; the merchant follows. */
export function LogisticsView() {
  const t = useTranslations("Logistics");
  const errors = useTranslations("Errors");
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>("in_transit");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);

  // The tab and the page belong together: changing the tab goes back to page 1.
  const key = `${filter}:${page}:${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    result: ApiResult<DeliveryPage>;
    /** Server clock minus this browser's clock, taken when the answer arrived. */
    offset: number;
  } | null>(null);
  const fetching = loaded?.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    listDeliveries(
      { status: filter === "all" ? undefined : filter, page, pageSize: PAGE_SIZE },
      controller.signal
    )
      .then((result) =>
        setLoaded({
          key,
          result,
          offset: result.ok ? Date.parse(result.data.now) - Date.now() : 0,
        })
      )
      .catch(() => {
        /* aborted: a newer request replaced it */
      });
    return () => controller.abort();
  }, [key, filter, page]);

  const result = loaded?.result;
  const data = result?.ok ? result.data : null;
  const unauthenticated = result && !result.ok && result.code === "unauthenticated";
  useEffect(() => {
    if (unauthenticated) router.replace("/login");
  }, [unauthenticated, router]);

  // Keep time with the server's clock: the bars are worked out from it, second by second.
  const [local, setLocal] = useState(() => Date.now());
  const anyLive = !!data?.items.some((d) => d.status === "in_transit") || openId !== null;
  useEffect(() => {
    if (!anyLive) return;
    const timer = setInterval(() => setLocal(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [anyLive]);
  const now = local + (loaded?.offset ?? 0);

  // A trip that just ended in the browser's clock: ask the server, which moves the order and
  // brings the proof. At most once every few seconds.
  const lastRefresh = useRef(0);
  useEffect(() => {
    const ended = data?.items.some(
      (d) => d.status === "in_transit" && now >= Date.parse(d.createdAt) + d.durationMs
    );
    if (ended && Date.now() - lastRefresh.current > 3000) {
      lastRefresh.current = Date.now();
      setReload((n) => n + 1);
    }
  }, [now, data]);

  // The delivery in the sheet must outlive the list: when its trip ends it leaves "In transit",
  // so it is fetched on its own (and again whenever the list reloads) instead of vanishing.
  const focusId = proofId ?? openId;
  const [detail, setDetail] = useState<PublicDelivery | null>(null);
  useEffect(() => {
    if (!focusId) return;
    const controller = new AbortController();
    getDelivery(focusId, controller.signal)
      .then((result) => result.ok && setDetail(result.data))
      .catch(() => {
        /* aborted */
      });
    return () => controller.abort();
  }, [focusId, reload]);
  const find = (id: string | null) => {
    if (!id) return undefined;
    const candidates = [
      data?.items.find((d) => d.id === id),
      detail?.id === id ? detail : undefined,
    ];
    return candidates.find((d) => d?.proof) ?? candidates.find(Boolean);
  };
  const open = find(openId);
  const proof = find(proofId)?.proof ? find(proofId) : undefined;

  const body = (() => {
    if (!loaded || (!data && fetching)) return <ListSkeleton />;
    if (!result?.ok) {
      return (
        <ListMessage
          title={t("loadError.title")}
          body={errors(result?.code ?? "internal")}
          action={
            <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
              {t("loadError.retry")}
            </button>
          }
        />
      );
    }
    if (result.data.total === 0) {
      return <ListMessage title={t(`empty.${filter}.title`)} body={t(`empty.${filter}.body`)} />;
    }
    return (
      <DeliveriesTable
        items={result.data.items}
        now={now}
        onOpen={(d: PublicDelivery) => setOpenId(d.id)}
        onProof={(d: PublicDelivery) => setProofId(d.id)}
      />
    );
  })();

  return (
    <div className="space-y-6">

      <section
        aria-labelledby="deliveries-title"
        aria-busy={fetching}
        className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
      >
        <header className="pt-4 pb-1">
          <h2
            id="deliveries-title"
            className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("deliveries.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("deliveries.subtitle")}</p>
        </header>
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6">
          <Tabs
            idPrefix={PREFIX}
            label={t("deliveries.filter")}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
            tabs={FILTERS.map((id) => ({
              id,
              label: t(`tabs.${id}`),
              count: data?.counts[id === "all" ? "all" : id],
            }))}
          />
        </div>
        <div
          id={panelId(PREFIX, filter)}
          role="tabpanel"
          aria-labelledby={tabId(PREFIX, filter)}
          className={`transition-opacity motion-reduce:transition-none ${fetching && data ? "opacity-50" : ""}`}
        >
          {body}
        </div>
        {data && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            count={data.items.length}
            total={data.total}
            onPage={setPage}
          />
        )}
      </section>

      <p className="text-[13px] leading-relaxed text-ink-muted">{t("sandbox")}</p>

      {open && (
        <DeliverySheet
          key={`sheet-${open.id}`}
          delivery={open}
          now={now}
          onClose={() => setOpenId(null)}
          onProof={() => setProofId(open.id)}
        />
      )}
      {proof && (
        <ProofDialog key={`proof-${proof.id}`} delivery={proof} onClose={() => setProofId(null)} />
      )}
    </div>
  );
}
