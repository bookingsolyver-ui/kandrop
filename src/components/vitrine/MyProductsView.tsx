"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, SearchIcon } from "@/components/kai/icons";
import { BrandLink } from "@/components/ui/BrandButton";
import { Link } from "@/i18n/navigation";
import { marginOf, type ImportedProduct } from "@/shared/vitrine/imported";

type Tab = "all" | "active" | "paused" | "out";
type SortKey = "product" | "cost" | "price" | "margin" | "sales" | "status";
const PER_PAGE = [10, 20, 50] as const;
const TABS: Tab[] = ["all", "active", "paused", "out"];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** What the merchant sees as the product's state: "out of stock" wins over active/paused. */
const stateOf = (p: ImportedProduct): "active" | "paused" | "out" => (p.stock === "out" ? "out" : p.status);

const DOT = { active: "bg-emerald-500", paused: "bg-amber-500", out: "bg-[var(--kai-danger)]" } as const;
const PILL = {
  active: "bg-[var(--kai-success-bg)] text-[var(--kai-success)]",
  paused: "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]",
  out: "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]",
} as const;

/** The row's "…" menu: edit price, view the landing page, pause/activate, remove. */
function RowMenu({
  product,
  onEditPrice,
  onToggle,
  onRemove,
}: {
  product: ImportedProduct;
  onEditPrice: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("MyProducts.actions");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item =
    "flex w-full items-center rounded-[var(--r-md)] px-3 py-2 text-left text-[13px] font-medium text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]";
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={t("open", { title: product.title })}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-700)] hover:border-[var(--ink-300)] hover:text-[var(--ink-900)]"
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 w-56 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-1.5 shadow-[var(--sh-md)]"
        >
          <button type="button" role="menuitem" onClick={run(onEditPrice)} className={item}>
            {t("editPrice")}
          </button>
          <Link href="/dashboard/landing-pages" role="menuitem" onClick={() => setOpen(false)} className={item}>
            {t("landing")}
          </Link>
          <button type="button" role="menuitem" onClick={run(onToggle)} className={item}>
            {t(product.status === "active" ? "pause" : "resume")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(onRemove)}
            className={`${item} text-[var(--kai-danger)] hover:text-[var(--kai-danger)]`}
          >
            {t("remove")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline editor for the selling price (Enter saves, Esc cancels). Works in whole Kwanzas. */
function PriceEditor({
  product,
  onSave,
  onCancel,
}: {
  product: ImportedProduct;
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

/** "Os meus produtos": the Vitrine products the merchant sells, with cost, price, margin and state. */
export function MyProductsView({ initial }: { initial: ImportedProduct[] }) {
  const t = useTranslations("MyProducts");
  const f = useFormatters();
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "sales", dir: "desc" });
  const [perPage, setPerPage] = useState<(typeof PER_PAGE)[number]>(10);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ImportedProduct>) =>
    setItems((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((p) => stateOf(p) === "active").length,
      paused: items.filter((p) => stateOf(p) === "paused").length,
      out: items.filter((p) => stateOf(p) === "out").length,
    }),
    [items]
  );
  const avgMargin = items.length
    ? items.reduce((sum, p) => sum + marginOf(p).rate, 0) / items.length
    : 0;

  const rows = useMemo(() => {
    const q = fold(query.trim());
    const list = items.filter(
      (p) => (tab === "all" || stateOf(p) === tab) && (!q || fold(`${p.title} ${p.sku}`).includes(q))
    );
    const value = (p: ImportedProduct): number | string => {
      switch (sort.key) {
        case "product": return fold(p.title);
        case "cost": return p.costPrice;
        case "price": return p.salePrice;
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
        <BrandLink href="/dashboard/vitrine/nacional" size="sm">
          {t("explore")}
        </BrandLink>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {([
          ["active", String(counts.active)],
          ["total", String(counts.all)],
          ["margin", `${Math.round(avgMargin * 100)}%`],
        ] as const).map(([key, value]) => (
          <div key={key} className={`${card} flex items-center gap-3.5 p-4 transition-all hover:-translate-y-px hover:shadow-[var(--sh-md)]`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
              <BoxIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--ink-600)]">{t(`kpi.${key}`)}</p>
              <p className="mono-num text-[22px] leading-tight font-extrabold tracking-tight text-[var(--ink-900)]">{value}</p>
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

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
              <BoxIcon size={26} />
            </span>
            <h2 className="text-lg font-bold text-[var(--ink-900)]">{t("empty.title")}</h2>
            <p className="max-w-md text-sm text-[var(--ink-600)]">{t("empty.body")}</p>
            <BrandLink href="/dashboard/vitrine/nacional" size="md">
              {t("explore")}
            </BrandLink>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr>
                  {th("product")}
                  {th("cost", "right")}
                  {th("price", "right")}
                  {th("margin", "right")}
                  {th("sales", "right")}
                  {th("status")}
                  <th scope="col" className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {slice.map((p) => {
                  const margin = marginOf(p);
                  const state = stateOf(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-200)] text-[var(--ink-300)]">
                            <BoxIcon size={20} />
                          </span>
                          <div className="min-w-0">
                            <p className="line-clamp-2 max-w-md text-sm leading-snug font-semibold text-[var(--ink-900)]">{p.title}</p>
                            <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                              {t(`stock.${p.stock}`)} · {t(`origin.${p.kind}`)} · {p.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(p.costPrice)}</td>
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
                            <span className="block text-[11px] text-[var(--ink-500)]">
                              {t("suggested", { price: f.money(p.suggestedPrice) })}
                            </span>
                          </button>
                        )}
                      </td>
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
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          product={p}
                          onEditPrice={() => setEditing(p.id)}
                          onToggle={() => update(p.id, { status: p.status === "active" ? "paused" : "active" })}
                          onRemove={() => setItems((list) => list.filter((x) => x.id !== p.id))}
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

      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("sample")}</p>
    </div>
  );
}
