"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, Modal, Pager, PageHeader, card, fold, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { useCurrentSupplier, useSubmissions } from "@/lib/supplier/store";
import { productsOfSupplier, stockOf, type SubmissionStatus } from "@/shared/supplier/mock";
import { addProductSchema } from "@/shared/supplier/schemas";
import { VITRINE_CATEGORIES } from "@/shared/vitrine/mock";

type Row = { id: string; title: string; sku: string; cost: number; suggested: number; stock: number; status: SubmissionStatus; image?: string };
const TONE = { approved: "success", in_review: "warn", rejected: "danger" } as const;
type Field = "title" | "category" | "description" | "weightKg" | "costPrice" | "suggestedPrice" | "stock";
const EMPTY = { title: "", category: "", description: "", weightKg: "", costPrice: "", suggestedPrice: "", stock: "" };

/** The supplier's own products and the form to propose a new one (it goes to review before the Vitrine). */
export function SupplierProducts() {
  const t = useTranslations("Supplier.products");
  const v = useTranslations("Supplier.validation");
  const cats = useTranslations("Vitrine.cat");
  const f = useFormatters();
  const toast = useToast();
  const { supplier, seeded } = useCurrentSupplier();
  const { items: submissions, create } = useSubmissions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | SubmissionStatus>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [image, setImage] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!supplier) return [];
    const approved: Row[] = seeded
      ? productsOfSupplier(supplier.id).map((p) => ({ id: p.id, title: p.title, sku: p.sku, cost: p.costPrice, suggested: Math.round((p.costPrice * 2.1) / 10_000) * 10_000, stock: stockOf(p.id), status: "approved" as const }))
      : [];
    const submitted: Row[] = submissions.filter((s) => s.supplierId === supplier.id).map((s) => ({ id: s.id, title: s.title, sku: s.sku, cost: s.costPrice, suggested: s.suggestedPrice, stock: s.stock, status: s.status }));
    const q = fold(query.trim());
    return [...submitted, ...approved].filter((r) => (status === "all" || r.status === status) && (!q || fold(`${r.title} ${r.sku}`).includes(q)));
  }, [supplier, seeded, submissions, query, status]);
  const pager = usePager(rows, 10);

  const close = () => { setOpen(false); setForm(EMPTY); setErrors({}); setImage(null); };
  const set = (k: Field) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    if (!supplier) return;
    const parsed = addProductSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const i of parsed.error.issues) {
        const key = i.path[0] as Field;
        if (!next[key]) next[key] = v(i.message as Parameters<typeof v>[0]);
      }
      setErrors(next);
      return;
    }
    const d = parsed.data;
    if (d.suggestedPrice <= d.costPrice) return setErrors({ suggestedPrice: v("suggested_below_cost") });
    create({
      id: `sub_${crypto.randomUUID().slice(0, 8)}`,
      supplierId: supplier.id,
      sku: `SUB${Math.floor(3000 + Math.random() * 6999)}`,
      title: d.title,
      category: d.category,
      description: d.description,
      weightKg: d.weightKg,
      costPrice: d.costPrice * 100,
      suggestedPrice: d.suggestedPrice * 100,
      stock: d.stock,
      createdAt: Date.now(),
      status: "in_review",
    });
    toast({ message: t("toast.submitted") });
    close();
  };

  const input = "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";
  const lbl = "text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase";
  const fieldBox = (k: Field, label: string, node: React.ReactNode) => (
    <label className="block"><span className={lbl}>{label}</span>{node}{errors[k] && <span role="alert" className="mt-1 block text-[12px] text-down">{errors[k]}</span>}</label>
  );

  if (!supplier) return null;
  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<button type="button" onClick={() => setOpen(true)} className={`${BRAND_BUTTON_CLASS} h-11 px-5 text-sm`}>{t("add")}</button>} />

      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")} className={`${input} lg:w-96`} />
          <div role="group" className="flex flex-wrap gap-1.5">
            {(["all", "approved", "in_review", "rejected"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={status === k} onClick={() => { setStatus(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${status === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>{t(`filters.${k}`)}</button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.product")}</th><th className="px-4 py-3">{t("cols.sku")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.cost")}</th><th className="px-4 py-3 text-right">{t("cols.suggested")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.stock")}</th><th className="px-4 py-3">{t("cols.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-200)] text-[var(--ink-300)]"><BoxIcon size={20} /></span>
                      <span className="line-clamp-2 max-w-sm font-semibold text-[var(--ink-900)]">{r.title}</span></div></td>
                    <td className="mono-num px-4 py-3 text-[var(--ink-600)]">{r.sku}</td>
                    <td className="mono-num px-4 py-3 text-right font-bold">{f.money(r.cost)}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(r.suggested)}</td>
                    <td className={`mono-num px-4 py-3 text-right font-extrabold ${r.stock === 0 ? "text-[var(--kai-danger)]" : r.stock < 10 ? "text-[var(--kai-warn)]" : ""}`}>{r.stock}</td>
                    <td className="px-4 py-3"><Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>

      <Modal open={open} onClose={close} title={t("modal.title")}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-4">
          {fieldBox("title", t("modal.name"), <input value={form.title} onChange={set("title")} className={`${input} mt-1.5`} />)}
          {fieldBox("category", t("modal.category"), (
            <select value={form.category} onChange={set("category")} className={`${input} mt-1.5`}>
              <option value="">{t("modal.choose")}</option>
              {VITRINE_CATEGORIES.map((c) => <option key={c} value={c}>{cats(c)}</option>)}
            </select>
          ))}
          {fieldBox("description", t("modal.description"), <textarea value={form.description} onChange={set("description")} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />)}
          <div>
            <span className={lbl}>{t("modal.image")}</span>
            <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-3 text-sm text-[var(--ink-600)]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview
                <img src={image} alt="" className="size-14 rounded-lg object-cover" />
              ) : <span className="grid size-14 place-items-center rounded-lg bg-white text-[var(--ink-300)]"><BoxIcon size={22} /></span>}
              <span>{t("modal.imageHelp")}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) setImage(URL.createObjectURL(file)); }} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fieldBox("weightKg", t("modal.weight"), <input inputMode="decimal" value={form.weightKg} onChange={set("weightKg")} className={`${input} mono-num mt-1.5`} />)}
            {fieldBox("stock", t("modal.stock"), <input inputMode="numeric" value={form.stock} onChange={set("stock")} className={`${input} mono-num mt-1.5`} />)}
            {fieldBox("costPrice", t("modal.cost"), <input inputMode="numeric" value={form.costPrice} onChange={set("costPrice")} className={`${input} mono-num mt-1.5`} />)}
            {fieldBox("suggestedPrice", t("modal.suggested"), <input inputMode="numeric" value={form.suggestedPrice} onChange={set("suggestedPrice")} className={`${input} mono-num mt-1.5`} />)}
          </div>
          <p className="text-[12px] text-[var(--ink-500)]">{t("modal.reviewNote")}</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
            <button type="submit" className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>{t("modal.submit")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
