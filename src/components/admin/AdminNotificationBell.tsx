"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";

interface Item { id: string; title: string; message: string; type: string; link: string | null; read: boolean; createdAt: number }
interface Page { items: Item[]; unread: number; nextCursor: number | null }

const POLL_MS = 15_000;
const PAGE = 10;

/** The administrators' notification centre: a bell with the unread count, refreshed every few seconds while the tab is visible. */
export function AdminNotificationBell() {
  const t = useTranslations("Admin.bell");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const read = async (before?: number): Promise<Page | null> => {
    try {
      const res = await fetch(`/api/admin/notifications?limit=${PAGE}${before ? `&before=${before}` : ""}`, { cache: "no-store" });
      return res.ok ? ((await res.json()) as { data: Page }).data : null;
    } catch {
      return null;
    }
  };

  const refresh = useCallback(async () => {
    const page = await read();
    if (!page) return;
    // The newest page replaces the head of the list; older pages already loaded stay below it.
    setItems((prev) => [...page.items, ...prev.filter((p) => !page.items.some((n) => n.id === p.id) && p.createdAt < (page.items[page.items.length - 1]?.createdAt ?? Infinity))]);
    setUnread(page.unread);
    // Only the very first load sets where "see more" starts; later refreshes must not move it.
    if (first.current) { first.current = false; setCursor(page.nextCursor); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const call = (method: "PATCH" | "DELETE", body: unknown) => fetch("/api/admin/notifications", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await call("PATCH", { all: true });
  };
  const open1 = async (n: Item) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void call("PATCH", { ids: [n.id] });
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };
  const clear = async (body: { ids: string[] } | { onlyRead: true } | { all: true }) => {
    if ("ids" in body) setItems((prev) => prev.filter((n) => !body.ids.includes(n.id)));
    else if ("onlyRead" in body) setItems((prev) => prev.filter((n) => !n.read));
    else { setItems([]); setUnread(0); setCursor(null); }
    await call("DELETE", body);
    void refresh();
  };
  const more = async () => {
    if (cursor === null) return;
    const page = await read(cursor);
    if (!page) return;
    setItems((prev) => [...prev, ...page.items.filter((n) => !prev.some((p) => p.id === n.id))]);
    setCursor(page.nextCursor);
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={unread > 0 ? t("labelUnread", { count: unread }) : t("label")} aria-expanded={open} aria-haspopup="true" className="relative grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-800,var(--ink-900))] hover:border-[var(--ink-300)]">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--kai-orange)] px-1 text-[11px] leading-5 font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div role="region" aria-label={t("label")} className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-white shadow-[var(--sh-md)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--ink-200)] px-4 py-3">
            <p className="text-[14px] font-bold">{t("title")}</p>
            <div className="flex gap-3 text-[12px] font-semibold text-[var(--ink-600)]">
              <button type="button" onClick={markAll} disabled={unread === 0} className="hover:text-[var(--ink-900)] disabled:opacity-40">{t("markAll")}</button>
              <button type="button" onClick={() => clear({ onlyRead: true })} disabled={!items.some((n) => n.read)} className="hover:text-[var(--ink-900)] disabled:opacity-40">{t("clearRead")}</button>
              <button type="button" onClick={() => clear({ all: true })} disabled={items.length === 0} className="hover:text-[var(--kai-danger)] disabled:opacity-40">{t("clearAll")}</button>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[var(--ink-600)]">{loaded ? t("empty") : t("loading")}</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-[var(--ink-100)] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-2 px-4 py-3 ${n.read ? "" : "bg-[var(--kai-orange-50)]"}`}>
                  <button type="button" onClick={() => open1(n)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      {!n.read && <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--kai-orange)]" />}
                      <span className="truncate text-[13px] font-bold text-[var(--ink-900)]">{n.title}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-[var(--ink-700)]">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-[var(--ink-500)]">{format.relativeTime(n.createdAt)}</span>
                  </button>
                  <button type="button" onClick={() => clear({ ids: [n.id] })} aria-label={t("remove")} className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--ink-500)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]">
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cursor !== null && <button type="button" onClick={more} className="w-full border-t border-[var(--ink-200)] px-4 py-3 text-[13px] font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">{t("more")}</button>}
        </div>
      )}
    </div>
  );
}
