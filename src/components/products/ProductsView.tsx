"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { ProductPage } from "@/server/modules/products/schema";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  type ProductCategory,
  type ProductSort,
  type ProductStatus,
} from "@/shared/products/schemas";
import { ListMessage, ListSkeleton, primaryButton } from "@/components/data/ListStates";
import { Pagination } from "@/components/data/Pagination";
import { SearchBox } from "@/components/data/SearchBox";
import type { SortState } from "@/components/data/SortableTh";
import { useDebounced } from "@/components/data/useDebounced";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { PlusIcon } from "./icons";
import { listProducts, type ApiResult } from "./productsApi";
import { ProductsTable } from "./ProductsTable";

const PAGE_SIZE = 10;
/** First click on a column sorts the way people expect: names A→Z, money and margin high→low. */
const FIRST_DIRECTION: Record<Exclude<ProductSort, "updated">, "asc" | "desc"> = {
  title: "asc",
  price: "desc",
  margin: "desc",
};

const selectClass =
  "h-11 w-full rounded-md border border-field bg-surface px-3 text-sm text-ink sm:w-auto";

export function ProductsView() {
  const t = useTranslations("Catalog");
  const errors = useTranslations("Errors");
  const router = useRouter();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [sort, setSort] = useState<SortState<ProductSort>>({ by: "updated", dir: "desc" });
  const [reload, setReload] = useState(0);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const search = useDebounced(q.trim(), 250);
  const filtersKey = JSON.stringify([search, category, status, sort]);

  // The page number belongs to one set of filters; changing any filter falls back to page 1
  // without an extra render or request.
  const [pageState, setPageState] = useState({ key: "", n: 1 });
  const page = pageState.key === filtersKey ? pageState.n : 1;
  const goTo = (n: number) => setPageState({ key: filtersKey, n });

  // Each result remembers the request it answers, so "loading" is derived (`loaded.key !== key`)
  // and the previous rows stay on screen, dimmed, while a new page or filter is fetched.
  const requestKey = JSON.stringify([filtersKey, page, reload]);
  const [loaded, setLoaded] = useState<{ key: string; result: ApiResult<ProductPage> } | null>(
    null
  );
  const fetching = loaded?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    listProducts(
      {
        q: search,
        category: category || undefined,
        status: status || undefined,
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
  }, [requestKey, search, category, status, sort, page]);

  useEffect(() => {
    if (loaded && !loaded.result.ok && loaded.result.code === "unauthenticated") {
      router.replace("/login");
    }
  }, [loaded, router]);

  const filtered = q !== "" || category !== "" || status !== "";
  const clearFilters = () => {
    setQ("");
    setCategory("");
    setStatus("");
    setSort({ by: "updated", dir: "desc" });
  };

  const onSort = (column: Exclude<ProductSort, "updated">) =>
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
      return (
        <ListMessage
          title={t("empty.title")}
          body={t("empty.body")}
          action={
            <Link href="/dashboard/products/new" className={primaryButton}>
              <PlusIcon />
              {t("empty.cta")}
            </Link>
          }
        />
      );
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
      <ProductsTable items={result.data.items} sort={sort} onSort={onSort} onDelete={setToDelete} />
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox
          value={q}
          onChange={setQ}
          label={t("search.label")}
          placeholder={t("search.placeholder")}
          clearLabel={t("search.clear")}
        />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label>
            <span className="sr-only">{t("filters.category")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | "")}
              className={selectClass}
            >
              <option value="">{t("filters.allCategories")}</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t("filters.status")}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | "")}
              className={selectClass}
            >
              <option value="">{t("filters.allStatuses")}</option>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section
        aria-busy={fetching}
        className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
      >
        {data && data.total > 0 && (
          <div className="flex items-center justify-between gap-4 border-b border-line py-3 text-sm text-ink-muted">
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

        <div
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
            onPage={goTo}
          />
        )}
      </section>

      <DeleteProductDialog
        product={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          // Deleting the last row of a later page would leave that page empty: step back first.
          if (data && data.items.length === 1 && data.page > 1) goTo(data.page - 1);
          setToDelete(null);
          setReload((n) => n + 1);
        }}
      />
    </div>
  );
}
