"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ListMessage, ListSkeleton, primaryButton } from "@/components/data/ListStates";
import { Pagination } from "@/components/data/Pagination";
import { SearchBox } from "@/components/data/SearchBox";
import type { SortState } from "@/components/data/SortableTh";
import { useDebounced } from "@/components/data/useDebounced";
import { useRouter } from "@/i18n/navigation";
import type { OrderPage, PublicOrder } from "@/server/modules/orders/schema";
import type { OrderSort } from "@/shared/orders/schemas";
import { OrderSheet } from "./OrderSheet";
import { listOrders, type ApiResult } from "./ordersApi";
import { OrdersTable } from "./OrdersTable";
import { PANEL_ID, StatusTabs, tabId, type StatusFilter } from "./StatusTabs";

const PAGE_SIZE = 10;
/** First click: newest first, biggest first, names A→Z. */
const FIRST_DIRECTION: Record<OrderSort, "asc" | "desc"> = {
  date: "desc",
  total: "desc",
  customer: "asc",
};

export function OrdersView() {
  const t = useTranslations("Orders");
  const errors = useTranslations("Errors");
  const router = useRouter();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState<OrderSort>>({ by: "date", dir: "desc" });
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<PublicOrder | null>(null);

  const search = useDebounced(q.trim(), 250);
  const filtersKey = JSON.stringify([search, status, sort]);

  // The page belongs to one set of filters; changing any of them falls back to page 1.
  const [pageState, setPageState] = useState({ key: "", n: 1 });
  const page = pageState.key === filtersKey ? pageState.n : 1;
  const goTo = (n: number) => setPageState({ key: filtersKey, n });

  // Each result remembers the request it answers, so "loading" is derived and the previous
  // rows stay on screen, dimmed, while a new tab, page or search is fetched.
  const requestKey = JSON.stringify([filtersKey, page, reload]);
  const [loaded, setLoaded] = useState<{ key: string; result: ApiResult<OrderPage> } | null>(null);
  const fetching = loaded?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    listOrders(
      {
        q: search,
        status: status === "all" ? undefined : status,
        sort: sort.by,
        dir: sort.dir,
        page,
        pageSize: PAGE_SIZE,
      },
      controller.signal
    )
      .then((result) => setLoaded({ key: requestKey, result }))
      .catch(() => {
        /* aborted: a newer request has replaced this one */
      });
    return () => controller.abort();
  }, [requestKey, search, status, sort, page]);

  useEffect(() => {
    if (loaded && !loaded.result.ok && loaded.result.code === "unauthenticated") {
      router.replace("/login");
    }
  }, [loaded, router]);

  const filtered = q !== "" || status !== "all";
  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setSort({ by: "date", dir: "desc" });
  };
  const onSort = (column: OrderSort) =>
    setSort((s) =>
      s.by === column
        ? { by: column, dir: s.dir === "asc" ? "desc" : "asc" }
        : { by: column, dir: FIRST_DIRECTION[column] }
    );

  const result = loaded?.result;
  const data = result?.ok ? result.data : null;

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
    if (result.data.overall === 0) {
      return <ListMessage title={t("empty.title")} body={t("empty.body")} />;
    }
    if (result.data.total === 0) {
      return (
        <ListMessage
          title={t("noResults.title")}
          body={t("noResults.body")}
          action={
            <button type="button" onClick={clearFilters} className={primaryButton}>
              {t("filters.clear")}
            </button>
          }
        />
      );
    }
    return (
      <OrdersTable items={result.data.items} sort={sort} onSort={onSort} onOpen={setSelected} />
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <SearchBox
        value={q}
        onChange={setQ}
        label={t("search.label")}
        placeholder={t("search.placeholder")}
        clearLabel={t("search.clear")}
      />

      <section
        aria-busy={fetching}
        className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
      >
        {/* Counts come from the last answer: they stay put while a new one is on its way. */}
        <StatusTabs value={status} counts={data?.counts} onChange={setStatus} />

        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(status)}
          className={`transition-opacity motion-reduce:transition-none ${fetching && data ? "opacity-50" : ""}`}
        >
          {data && data.total > 0 && (
            <div className="flex items-center justify-between gap-4 py-3 text-sm text-ink-muted">
              <p aria-live="polite">{t("results", { count: data.total })}</p>
              {filtered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 rounded px-1 underline underline-offset-4 hover:text-ink"
                >
                  {t("filters.clear")}
                </button>
              )}
            </div>
          )}
          {body}
        </div>

        {data && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            count={data.items.length}
            total={data.total}
            onPage={goTo}
          />
        )}
      </section>

      {selected && (
        <OrderSheet
          key={selected.id}
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={(order) => {
            setSelected(order);
            setReload((n) => n + 1); // counts and rows change with the status
          }}
        />
      )}
    </div>
  );
}
