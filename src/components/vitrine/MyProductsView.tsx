"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, CartIcon, HeartIcon, SearchIcon } from "@/components/kai/icons";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import { updateProduct } from "@/components/products/productsApi";
import { ProductLinks } from "@/components/products/ProductLinks";
import { BrandLink } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { Link, useRouter } from "@/i18n/navigation";
import type { MyProductRow } from "@/shared/products/myProducts";
import { marginOf } from "@/shared/vitrine/imported";

type Tab = "all" | "active" | "paused" | "out";
type SortKey = "product" | "price" | "suggested" | "margin" | "sales" | "status";
const PER_PAGE = [10, 20, 50] as const;
const TABS: Tab[] = ["all", "active", "paused", "out"];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** What the merchant sees as the product's state: "out of stock" wins over active/paused. */
const stateOf = (p: MyProductRow): "active" | "paused" | "out" => (p.stock === 0 ? "out" : p.status === "active" ? "active" : "paused");
/** Stock as a level the merchant can read at a glance; `null` = not tracked. */
const levelOf = (p: MyProductRow): "high" | "low" | "out" | null => (p.stock === null ? null : p.stock === 0 ? "out" : p.stock < 10 ? "low" : "high");

const DOT = { active: "bg-emerald-500", paused: "bg-amber-500", out: "bg-[var(--kai-danger)]" } as const;
const PILL = {
  active: "bg-[var(--kai-success-bg)] text-[var(--kai-success)]",
  paused: "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]",
  out: "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]",
} as const;

const ICON = "grid size-9 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-700)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--ink-300)] hover:text-[var(--ink-900)] hover:shadow-[var(--sh-md)] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none active:translate-y-0 disabled:cursor-wait disabled:opacity-50";
const svg = { "aria-hidden": true, width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The row's actions, all in plain sight (no hidden menu): edit the product, pause/activate it, remove it. */
function RowActions({ product, busy, onToggle, onRemove }: { product: MyProductRow; busy: boolean; onToggle: () => void; onRemove: () => void }) {
  const t = useTranslations("MyProducts.actions");
  const active = product.status === "active";
  return (
    <div className="flex items-center justify-end gap-2">
      <Tooltip label={t("edit")}>
        <Link href={`/dashboard/products/${product.id}`} aria-label={`${t("edit")}: ${product.title}`} className={ICON}>
          <svg {...svg}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </Link>
      </Tooltip>
      <Tooltip label={t(active ? "pause" : "resume")}>
        <button type="button" onClick={onToggle} disabled={busy} aria-label={`${t(active ? "pause" : "resume")}: ${product.title}`} className={ICON}>
          {active ? <svg {...svg}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg {...svg}><path d="m7 4 13 8-13 8Z" /></svg>}
        </button>
      </Tooltip>
      <Tooltip label={t("remove")}>
        <button type="button" onClick={onRemove} disabled={busy} aria-label={`${t("remove")}: ${product.title}`} className={`${ICON} hover:!border-[var(--kai-danger)] hover:!text-[var(--kai-danger)]`}>
          <svg {...svg}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
        </button>
      </Tooltip>
    </div>
  );
}

/** Inline editor for the selling price (Enter saves, Esc cancels). Works in whole Kwanzas. */
function PriceEditor({
  product,
  onSave,
  onCancel,
}: {
  product: MyProductRow;
  onSave: (minor: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("MyProducts.edit");
  const f = useFormatters();
  const [value, setValue] = useState(String(Math.round(product.salePrice / 100)));
  const kz = Number(value.replace(/\s/g, "").replace(",", "."));
  const valid = Number.isFinite(kz) && kz > 0;
  const loss = valid ? product.costPrice - kz * 100 : 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(Math.round(kz * 100));
      }}
      className="min-w-[10rem]"
    >
      <label className="sr-only" htmlFor={`price-${product.id}`}>
        {t("label")}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={`price-${product.id}`}
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
          aria-invalid={!valid}
          className="mono-num h-9 w-24 rounded-xl border border-border bg-white px-2.5 text-sm font-semibold outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <button type="submit" disabled={!valid} className="h-9 rounded-full bg-brand-orange px-3 text-[12px] font-bold text-brand-black disabled:opacity-50">
          {t("save")}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3 text-[12px] font-semibold text-[var(--ink-700)]">
          {t("cancel")}
        </button>
      </div>
      {!valid && <p className="mt-1 text-[12px] text-down">{t("invalid")}</p>}
      {valid && loss > 0 && <p className="mt-1 text-[12px] text-down">{t("below", { amount: f.money(loss) })}</p>}
    </form>
  );
}

/**
 * "Os meus produtos": the merchant's real products (Supabase), with cost, price, margin, state and, in the Links
 * column, the buttons to see and to share the public sales page. Creating, pricing, pausing and removing a product
 * stay with the merchant; moving an order does not (that is Kandrop's).
 */
export function MyProductsView({ products }: { products: MyProductRow[] }) {
  const t = useTranslations("MyProducts");
  const f = useFormatters();
  const router = useRouter();
  const toast = useToast();
  const items = products;
  const ready = true;
  const [busy, setBusy] = useState<string | null>(null);

  /** Runs one change through the API, then reloads the table from the server. */
  async function change(id: string, run: () => Promise<{ ok: boolean }>) {
    setBusy(id);
    try {
      const result = await run();
      if (!result.ok) return toast({ message: t("saveFailed") });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  const update = (id: string, patch: { salePrice?: number; status?: "active" | "draft" }) => change(id, () => updateProduct(id, patch));
  const [toDelete, setToDelete] = useState<MyProductRow | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "sales", dir: "desc" });
  const [perPage, setPerPage] = useState<(typeof PER_PAGE)[number]>(10);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((p) => stateOf(p) === "active").length,
      paused: items.filter((p) => stateOf(p) === "paused").length,
      out: items.filter((p) => stateOf(p) === "out").length,
    }),
    [items]
  );

  const rows = useMemo(() => {
    const q = fold(query.trim());
    const list = items.filter(
      (p) => (tab === "all" || stateOf(p) === tab) && (!q || fold(`${p.title} ${p.slug}`).includes(q))
    );
    const value = (p: MyProductRow): number | string => {
      switch (sort.key) {
        case "product": return fold(p.title);
        case "price": return p.salePrice;
        case "suggested": return p.suggestedPrice;
        case "margin": return marginOf(p).amount;
        case "sales": return p.salesMonth;
        case "status": return stateOf(p);
      }
    };
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      return sign * (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number));
    });
  }, [items, tab, query, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const from = rows.length === 0 ? 0 : (current - 1) * perPage + 1;
  const slice = rows.slice((current - 1) * perPage, current * perPage);

  const sortBy = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(1);
  };
  const th = (key: SortKey, align: "left" | "right" = "left") => (
    <th
      scope="col"
      aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => sortBy(key)}
        aria-label={t("sort", { col: t(`cols.${key}`) })}
        className="inline-flex items-center gap-1 uppercase hover:text-[var(--ink-900)]"
      >
        {t(`cols.${key}`)}
        <span aria-hidden className={sort.key === key ? "text-[var(--kai-orange-600)]" : "text-[var(--ink-300)]"}>
          {sort.key === key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );

  const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-7 sm:gap-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">{t("title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/meus-produtos/favoritos"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]"
          >
            <HeartIcon size={16} />
            {t("favorites")}
          </Link>
          <BrandLink href="/dashboard/vitrine/nacional" size="sm">
            <CartIcon size={16} />
            {t("explore")}
          </BrandLink>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        {([
          ["active", counts.active],
          ["total", counts.all],
        ] as const).map(([key, value]) => (
          <div key={key} className={`${card} flex items-center gap-2.5 p-3 transition-all hover:-translate-y-px hover:shadow-[var(--sh-md)] sm:gap-3.5 sm:p-4`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
              {key === "active" ? <BoxIcon size={18} /> : <CartIcon size={18} />}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10.5px] text-[var(--ink-600)] sm:text-xs">{t(`kpi.${key}`)}</span>
              <span className="mono-num text-[16px] leading-tight font-extrabold tracking-tight text-[var(--ink-900)] sm:text-[22px]">{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="group relative block lg:w-96">
            <span className="sr-only">{t("searchLabel")}</span>
            <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-500)] transition-colors group-focus-within:text-primary">
              <SearchIcon size={16} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("search")}
              className="h-11 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm text-[var(--ink-900)] shadow-xs outline-none transition-all placeholder:text-[var(--ink-500)]/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </label>
          <div role="tablist" aria-label={t("tabsLabel")} className="flex flex-wrap gap-1.5">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all ${
                  tab === key
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
                }`}
              >
                {t(`tabs.${key}`)} ({counts[key]})
              </button>
            ))}
          </div>
        </div>

        {!ready ? (
          <div className="h-64" aria-hidden />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
              <BoxIcon size={26} />
            </span>
            <h2 className="text-lg font-bold text-[var(--ink-900)]">{t("empty.title")}</h2>
            <p className="max-w-md text-sm text-[var(--ink-600)]">{t("empty.body")}</p>
            <BrandLink href="/dashboard/vitrine/nacional" size="md">
              <CartIcon size={16} />
              {t("explore")}
            </BrandLink>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[66rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr>
                  {th("product")}
                  {th("price", "right")}
                  {th("suggested", "right")}
                  {th("margin", "right")}
                  {th("sales", "right")}
                  {th("status")}
                  <th scope="col" className="px-4 py-3 text-center text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                    {t("cols.links")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">{t("cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((p) => {
                  const margin = marginOf(p);
                  const state = stateOf(p);
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 transition-colors duration-150 last:border-b-0 hover:bg-[var(--ink-50)]/70 ${busy === p.id ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element -- the merchant's own, access-checked image route
                            <img src={p.cover} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl border border-[var(--ink-100)] object-cover" />
                          ) : (
                            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-200)] text-[var(--ink-300)]">
                              <BoxIcon size={20} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 max-w-md text-sm leading-snug font-semibold text-[var(--ink-900)]">{p.title}</p>
                            <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                              {[levelOf(p) && t(`stock.${levelOf(p)!}`), t(`origin.${p.origin}`), t("costLine", { price: f.money(p.costPrice) })].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing === p.id ? (
                          <div className="flex justify-end">
                            <PriceEditor
                              product={p}
                              onSave={(minor) => {
                                update(p.id, { salePrice: minor });
                                setEditing(null);
                              }}
                              onCancel={() => setEditing(null)}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(p.id)}
                            title={t("actions.editPrice")}
                            className="rounded-lg px-2 py-1 text-right hover:bg-[var(--ink-100)]"
                          >
                            <span className="mono-num block font-extrabold text-[var(--ink-900)]">{f.money(p.salePrice)}</span>
                          </button>
                        )}
                      </td>
                      <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(p.suggestedPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`mono-num block font-bold ${margin.amount < 0 ? "text-down" : "text-[var(--kai-success)]"}`}>
                          {f.money(margin.amount)}
                        </span>
                        <span className="block text-[11px] text-[var(--ink-500)]">{Math.round(margin.rate * 100)}%</span>
                      </td>
                      <td className="mono-num px-4 py-3 text-right font-semibold text-[var(--ink-900)]">{p.salesMonth}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${PILL[state]}`}>
                          <span aria-hidden className={`size-1.5 rounded-full ${DOT[state]}`} />
                          {t(`status.${state}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProductLinks product={p} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          product={p}
                          busy={busy === p.id}
                          onToggle={() => update(p.id, { status: p.status === "active" ? "draft" : "active" })}
                          onRemove={() => setToDelete(p)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ink-200)] px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--ink-600)]">
              <span>
                {t("showing", { from, to: from + slice.length - 1, total: rows.length })}
              </span>
              <label className="flex items-center gap-2">
                {t("perPage")}
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value) as (typeof PER_PAGE)[number]);
                    setPage(1);
                  }}
                  className="h-8 rounded-full border border-[var(--ink-200)] bg-white px-2.5 text-[13px] font-medium text-[var(--ink-900)]"
                >
                  {PER_PAGE.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <nav aria-label={t("pagination")} className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} className="h-8 rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)] disabled:cursor-not-allowed disabled:opacity-40">
                {t("prev")}
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-label={t("page", { n })}
                  aria-current={n === current ? "page" : undefined}
                  className={`mono-num size-8 rounded-full border text-[13px] font-semibold ${
                    n === current ? "border-brand-orange bg-brand-orange text-brand-black" : "border-[var(--ink-200)] bg-white text-[var(--ink-900)] hover:border-[var(--ink-300)]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} className="h-8 rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)] disabled:cursor-not-allowed disabled:opacity-40">
                {t("next")}
              </button>
            </nav>
          </div>
        )}
      </div>

      <DeleteProductDialog
        product={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          setToDelete(null);
          router.refresh();
        }}
      />
    </div>
  );
}
