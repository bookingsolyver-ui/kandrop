"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { useApprovedVitrine } from "@/lib/supplier/store";
import { useFavorites, useMyProducts } from "@/lib/vitrine/store";
import { importFromCatalog } from "@/shared/vitrine/imported";
import { FlameIcon, LayersIcon, SearchIcon, ThermometerIcon } from "@/components/kai/icons";
import { VITRINE_CATEGORIES, type VitrineProduct } from "@/shared/vitrine/mock";
import { ProductCard } from "./ProductCard";

type Special = "bestSellers" | "hot" | "kits";
type Selection = "all" | Special | (typeof VITRINE_CATEGORIES)[number];
const PER_PAGE = [10, 20, 50] as const;

/** Lower-cases and strips accents so "cafe" finds "Café". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const SPECIALS: Array<{ key: Special; test: (p: VitrineProduct) => boolean }> = [
  { key: "bestSellers", test: (p) => p.bestSeller },
  { key: "hot", test: (p) => p.hot },
  { key: "kits", test: (p) => p.kit },
];

function matches(p: VitrineProduct, selection: Selection) {
  if (selection === "all") return true;
  const special = SPECIALS.find((s) => s.key === selection);
  return special ? special.test(p) : p.category === selection;
}

/** The numbers shown in the pager: 1 … 4 5 6 … 12, never more than seven slots. */
function pageList(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** The showcase body: campaign chips, category menu, search, the product grid and the pager. */
export function VitrineView({ products: seeded }: { products: VitrineProduct[] }) {
  const t = useTranslations("Vitrine");
  const f = useFormatters();
  const router = useRouter();
  const toast = useToast();
  const favorites = useFavorites();
  const mine = useMyProducts();
  const approved = useApprovedVitrine(seeded[0]?.kind);
  const products = useMemo(() => [...approved, ...seeded], [approved, seeded]);
  const [selection, setSelection] = useState<Selection>("all");
  const [query, setQuery] = useState("");
  const [inStock, setInStock] = useState(true);
  const [newOnly, setNewOnly] = useState(false);
  const [occasion, setOccasion] = useState<"children" | null>(null);
  const [perPage, setPerPage] = useState<(typeof PER_PAGE)[number]>(10);
  const [page, setPage] = useState(1);

  /** "Start selling": imports the product into "My products" (or, if it is there already, goes to it). */
  const start = (p: VitrineProduct) => {
    const open = () => router.push("/dashboard/meus-produtos");
    if (mine.has(p.id)) return open();
    mine.add(importFromCatalog(p));
    toast({ message: t("toast.added"), action: { label: t("toast.view"), onClick: open } });
  };
  /** Any change of what is shown starts again from the first page. */
  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const base = useMemo(
    () => products.filter((p) => (occasion ? p.occasion === occasion : true)),
    [products, occasion]
  );
  const counts = useMemo(() => {
    const all = base.length;
    const specials = Object.fromEntries(SPECIALS.map((s) => [s.key, base.filter(s.test).length]));
    const cats = Object.fromEntries(
      VITRINE_CATEGORIES.map((c) => [c, base.filter((p) => p.category === c).length])
    );
    return { all, ...specials, ...cats } as Record<Selection, number>;
  }, [base]);
  const occasions = useMemo(() => {
    const kinds = [...new Set(products.map((p) => p.occasion).filter((o): o is "children" => !!o))];
    return kinds.map((key) => ({ key, count: products.filter((p) => p.occasion === key).length }));
  }, [products]);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return base.filter(
      (p) =>
        matches(p, selection) &&
        (!inStock || p.inStock) &&
        (!newOnly || p.isNew) &&
        (!q || fold(`${p.title} ${p.brand} ${p.sku}`).includes(q))
    );
  }, [base, selection, inStock, newOnly, query]);

  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const current = Math.min(page, pages);
  const slice = shown.slice((current - 1) * perPage, current * perPage);
  const label = (key: Selection) => t(key === "all" ? "cat.all" : `cat.${key}`);

  const menuItem = (key: Selection, icon?: React.ReactNode) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => change(setSelection)(key)}
        aria-current={selection === key ? "true" : undefined}
        className={`flex w-full items-center justify-between gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[13.5px] transition-all ${
          selection === key
            ? "bg-brand-orange font-bold text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)]"
            : "font-medium text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon}
          <span className="truncate">{label(key)}</span>
        </span>
        <span className={`mono-num shrink-0 text-[12px] ${selection === key ? "text-brand-black/70" : "text-[var(--ink-500)]"}`}>
          {counts[key]}
        </span>
      </button>
    </li>
  );

  const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";

  return (
    <div>
      {occasions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t("occasionsLabel")}>
          {occasions.map(({ key, count }) => (
            <button
              key={key}
              type="button"
              aria-pressed={occasion === key}
              onClick={() => change(setOccasion)(occasion === key ? null : key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                occasion === key
                  ? "border-brand-orange bg-brand-orange text-brand-black"
                  : "border-[var(--ink-300)] bg-white text-[var(--ink-800,var(--ink-700))] hover:bg-[var(--ink-50)]"
              }`}
            >
              {t(`occasions.${key}`)}
              <span className={occasion === key ? "text-brand-black/70" : "text-[var(--ink-500)]"}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_1fr]">
        <aside className={`${card} p-3.5 lg:sticky lg:top-4`}>
          <p className="px-3 pt-1 pb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--ink-500)] uppercase">
            {t("categories")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {menuItem("all")}
            {menuItem("bestSellers", <FlameIcon size={16} />)}
            {menuItem("hot", <ThermometerIcon size={16} />)}
            {menuItem("kits", <LayersIcon size={16} />)}
            {VITRINE_CATEGORIES.map((c) => menuItem(c))}
          </ul>

          <div className="mt-4 border-t border-[var(--ink-200)] pt-4">
            <p className="px-3 pb-2 text-[10.5px] font-bold tracking-[0.08em] text-[var(--ink-500)] uppercase">
              {t("filters")}
            </p>
            {([
              ["inStock", inStock, setInStock],
              ["newIn", newOnly, setNewOnly],
            ] as const).map(([key, value, setter]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2 text-[13.5px] font-medium text-[var(--ink-700)] hover:bg-[var(--ink-100)]">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => change(setter)(e.target.checked)}
                  className="size-4 accent-brand-orange"
                />
                {t(key)}
              </label>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className={`${card} mb-4 p-3.5`}>
            <label className="group relative block">
              <span className="sr-only">{t("searchLabel")}</span>
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-500)] transition-colors group-focus-within:text-primary">
                <SearchIcon size={16} />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => change(setQuery)(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-12 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm text-[var(--ink-900)] shadow-xs outline-none transition-all placeholder:text-[var(--ink-500)]/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </label>
          </div>

          <p className="mb-4 text-[13px] text-[var(--ink-600)]" aria-live="polite">
            {t("count", { count: shown.length })}{" "}
            <span className="font-semibold text-[var(--ink-900)]">{label(selection)}</span>
          </p>

          {slice.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
              <p className="text-[var(--ink-600)]">{t("empty")}</p>
              <button
                type="button"
                onClick={() => {
                  setSelection("all");
                  setQuery("");
                  setInStock(false);
                  setNewOnly(false);
                  setOccasion(null);
                  setPage(1);
                }}
                className="rounded-full border border-[var(--ink-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)]"
              >
                {t("clear")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {slice.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priceLabel={f.money(p.costPrice)}
                  favorite={favorites.has(p.id)}
                  selected={mine.has(p.id)}
                  onToggleFavorite={() => favorites.toggle(p.id)}
                  onStart={() => start(p)}
                />
              ))}
            </div>
          )}

          <nav aria-label={t("pagination")} className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-600)]">
              {t("perPage")}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value) as (typeof PER_PAGE)[number]);
                  setPage(1);
                }}
                className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--ink-900)]"
              >
                {PER_PAGE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 1}
                className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-40"
              >
                {t("prev")}
              </button>
              {pageList(current, pages).map((n, i) =>
                n === "gap" ? (
                  <span key={`g${i}`} aria-hidden className="px-1 text-[var(--ink-500)]">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-label={t("page", { n })}
                    aria-current={n === current ? "page" : undefined}
                    className={`mono-num size-9 rounded-full border text-[13px] font-semibold ${
                      n === current
                        ? "border-brand-orange bg-brand-orange text-brand-black"
                        : "border-[var(--ink-200)] bg-white text-[var(--ink-900)] hover:border-[var(--ink-300)]"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current === pages}
                className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-40"
              >
                {t("next")}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
