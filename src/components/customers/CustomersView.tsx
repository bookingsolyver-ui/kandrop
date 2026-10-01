"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { CartIcon, SearchIcon } from "@/components/kai/icons";
import { BrandLink } from "@/components/ui/BrandButton";
import type { CustomerRow } from "@/shared/customers/types";

const PER_PAGE = 20;
const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";
const TH = "px-4 py-3 text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const UsersIcon = () => (
  <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.2 2.5 3.5 5.2" />
  </svg>
);

/** The store's customers, built from its real orders (see `aggregateCustomers`). */
export function CustomersView({ customers }: { customers: CustomerRow[] }) {
  const t = useTranslations("Customers");
  const f = useFormatters();
  const format = useFormatter();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return customers;
    return customers.filter((c) => fold(`${c.name} ${c.phone} ${c.city} ${c.province}`).includes(q));
  }, [customers, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const totalSpent = customers.reduce((sum, c) => sum + c.spent, 0);
  const returning = customers.filter((c) => c.orders > 1).length;

  return (
    <div>
      <div className="mb-4 sm:mb-7">
        <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">{t("title")}</h1>
        <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("subtitle")}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {([
          ["total", f.integer(customers.length)],
          ["returning", f.integer(returning)],
          ["spent", f.money(totalSpent)],
        ] as const).map(([key, value]) => (
          <div key={key} className={`${card} flex flex-col gap-0.5 p-4`}>
            <span className="text-xs text-[var(--ink-600)]">{t(`kpi.${key}`)}</span>
            <span className="mono-num text-[20px] leading-tight font-extrabold tracking-tight text-[var(--ink-900)] sm:text-[22px]">{value}</span>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
              <UsersIcon />
            </span>
            <h2 className="text-lg font-bold text-[var(--ink-900)]">{t("empty.title")}</h2>
            <p className="max-w-md text-sm text-[var(--ink-600)]">{t("empty.body")}</p>
            <BrandLink href="/dashboard/meus-produtos" size="md">
              <CartIcon size={16} />
              {t("empty.cta")}
            </BrandLink>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--ink-200)] p-4">
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
            </div>
            {rows.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty.none")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] border-collapse text-sm">
                  <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                    <tr>
                      <th scope="col" className={`${TH} text-left`}>{t("cols.customer")}</th>
                      <th scope="col" className={`${TH} text-left`}>{t("cols.location")}</th>
                      <th scope="col" className={`${TH} text-right`}>{t("cols.orders")}</th>
                      <th scope="col" className={`${TH} text-right`}>{t("cols.spent")}</th>
                      <th scope="col" className={`${TH} text-right`}>{t("cols.last")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.phone} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]/70">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[var(--ink-900)]">{c.name}</div>
                          <div className="mono-num text-xs text-[var(--ink-600)]">+244 {c.phone}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--ink-700)]">{[c.city, c.province].filter(Boolean).join(", ")}</td>
                        <td className="mono-num px-4 py-3.5 text-right">{f.integer(c.orders)}</td>
                        <td className="mono-num px-4 py-3.5 text-right font-semibold text-[var(--ink-900)]">{f.money(c.spent)}</td>
                        <td className="px-4 py-3.5 text-right text-[var(--ink-600)]">
                          {format.dateTime(new Date(c.lastOrderAt), { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--ink-200)] px-4 py-3 text-sm text-[var(--ink-600)]">
                <span>{t("page", { current, pages })}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-full border border-[var(--ink-200)] px-4 py-1.5 font-semibold disabled:opacity-40">
                    {t("prev")}
                  </button>
                  <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-full border border-[var(--ink-200)] px-4 py-1.5 font-semibold disabled:opacity-40">
                    {t("next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
