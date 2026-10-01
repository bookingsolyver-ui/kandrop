"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { saveProductAction, deleteProductAction, type ActionResult } from "@/app/[locale]/fornecedor/(portal)/actions";
import { Badge, Modal, Pager, fold, usePager } from "@/components/admin/ui";
import { EmptyState, SupplierPageHeader, inputClass, labelClass, panel, th } from "./ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { productInputSchema } from "@/shared/supplier/schemas";
import { VITRINE_CATEGORIES } from "@/shared/vitrine/types";

/** What the server sends: no image bytes, only whether there is one. */
export interface ProductRow {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Minor units. */
  costPrice: number;
  stock: number;
  status: "in_review" | "approved" | "rejected";
  hasImage: boolean;
  updatedAt: number;
}

const TONE = { approved: "success", in_review: "warn", rejected: "danger" } as const;
type Field = "name" | "description" | "category" | "costPrice" | "stock" | "image";
const EMPTY = { id: "", name: "", description: "", category: "", costPrice: "", stock: "" };
const MAX_BYTES = 2 * 1024 * 1024;

/** The supplier's catalogue: list, add, edit and remove. The server is the gate; this form only gives early feedback. */
export function SupplierProducts({ products }: { products: ProductRow[] }) {
  const t = useTranslations("Supplier.products");
  const v = useTranslations("Supplier.validation");
  const cats = useTranslations("Vitrine.cat");
  const f = useFormatters();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProductRow["status"]>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return products.filter((p) => (status === "all" || p.status === status) && (!q || fold(`${p.name} ${p.category}`).includes(q)));
  }, [products, query, status]);
  const pager = usePager(rows, 10);

  const close = () => { setOpen(false); setForm(EMPTY); setErrors({}); setPreview(null); setFormError(null); if (file.current) file.current.value = ""; };
  const edit = (p: ProductRow) => {
    setForm({ id: p.id, name: p.name, description: p.description, category: p.category, costPrice: String(p.costPrice / 100), stock: String(p.stock) });
    setPreview(p.hasImage ? `/api/supplier/products/${p.id}/image?v=${p.updatedAt}` : null);
    setOpen(true);
  };
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const translate = (code: string) => v(code as Parameters<typeof v>[0]);
  const failure = (r: Extract<ActionResult, { ok: false }>) => {
    if (r.error === "validation") {
      const next: Partial<Record<Field, string>> = {};
      for (const [k, code] of Object.entries(r.fields)) next[k as Field] = translate(code);
      setErrors(next);
    } else setFormError(t(r.error === "unauthorized" ? "errors.unauthorized" : r.error === "not_found" ? "errors.notFound" : "errors.generic"));
  };

  const submit = () => {
    setFormError(null);
    const parsed = productInputSchema.safeParse({ ...form, id: form.id || undefined });
    const chosen = file.current?.files?.[0];
    const next: Partial<Record<Field, string>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) { const k = i.path[0] as Field; if (!next[k]) next[k] = translate(i.message); }
    if (chosen && chosen.size > MAX_BYTES) next.image = translate("image_too_large");
    if (Object.keys(next).length) return setErrors(next);
    setErrors({});

    const data = new FormData();
    for (const [k, val] of Object.entries(form)) if (val !== "") data.set(k, val);
    if (chosen) data.set("image", chosen);
    startTransition(async () => {
      const result = await saveProductAction(data);
      if (!result.ok) return failure(result);
      toast({ message: t(form.id ? "toast.updated" : "toast.submitted") });
      close();
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const result = await deleteProductAction(id);
      setToDelete(null);
      if (!result.ok) return toast({ message: t("errors.generic") });
      toast({ message: t("toast.deleted") });
      router.refresh();
    });
  };

  const input = inputClass;
  const lbl = labelClass;
  const box = (k: Field, label: string, node: React.ReactNode) => (
    <label className="block"><span className={lbl}>{label}</span>{node}{errors[k] && <span role="alert" className="mt-1 block text-[12px] text-down">{errors[k]}</span>}</label>
  );

  return (
    <div>
      <SupplierPageHeader title={t("title")} subtitle={t("subtitle")} actions={<button type="button" onClick={() => setOpen(true)} className={`${BRAND_BUTTON_CLASS} h-11 px-5 text-sm`}>{t("add")}</button>} />

      <div className={`${panel} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[var(--ink-200)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")} className={`${input} lg:w-96`} />
          <div role="group" className="flex flex-wrap gap-1.5">
            {(["all", "approved", "in_review", "rejected"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={status === k} onClick={() => { setStatus(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${status === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>{t(`filters.${k}`)}</button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <EmptyState>{t("empty")}</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
                <tr className="text-left">
                  <th className={`${th}`}>{t("cols.product")}</th>
                  <th className={`${th} text-right`}>{t("cols.cost")}</th>
                  <th className={`${th} text-right`}>{t("cols.stock")}</th><th className={`${th}`}>{t("cols.status")}</th>
                  <th className={`${th} text-right`}>{t("cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--ink-100)] transition-colors last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-5 py-4"><div className="flex items-center gap-3">
                      {p.hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a private, per-supplier image route
                        <img src={`/api/supplier/products/${p.id}/image?v=${p.updatedAt}`} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-200)] text-[var(--ink-300)]"><BoxIcon size={20} /></span>
                      )}
                      <span><span className="line-clamp-2 max-w-sm font-semibold text-[var(--ink-900)]">{p.name}</span><span className="text-[12px] text-[var(--ink-500)]">{VITRINE_CATEGORIES.includes(p.category as never) ? cats(p.category as never) : p.category}</span></span></div></td>
                    <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.costPrice)}</td>
                    <td className={`mono-num px-4 py-3 text-right font-extrabold ${p.stock === 0 ? "text-[var(--kai-danger)]" : p.stock < 10 ? "text-[var(--kai-warn)]" : ""}`}>{p.stock}</td>
                    <td className="px-5 py-4"><Badge tone={TONE[p.status]}>{t(`status.${p.status}`)}</Badge></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => edit(p)} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[13px] font-semibold hover:border-[var(--ink-300)]">{t("edit")}</button>
                        <button type="button" onClick={() => setToDelete(p)} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[13px] font-semibold text-[var(--kai-danger)] hover:border-[var(--kai-danger)]">{t("delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </div>

      <Modal open={open} onClose={close} title={t(form.id ? "modal.titleEdit" : "modal.title")}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="space-y-5">
          {formError && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{formError}</div>}
          {box("name", t("modal.name"), <input value={form.name} onChange={set("name")} maxLength={140} className={`${input} mt-1.5`} />)}
          {box("category", t("modal.category"), (
            <select value={form.category} onChange={set("category")} className={`${input} mt-1.5`}>
              <option value="">{t("modal.choose")}</option>
              {VITRINE_CATEGORIES.map((c) => <option key={c} value={c}>{cats(c)}</option>)}
            </select>
          ))}
          {box("description", t("modal.description"), <textarea value={form.description} onChange={set("description")} rows={3} maxLength={1500} className="mt-1.5 w-full rounded-xl border border-[var(--ink-200)] bg-white p-3.5 text-sm shadow-xs outline-none transition hover:border-[var(--ink-300)] focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15" />)}
          {box("image", t("modal.image"), (
            <span className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-3 text-sm text-[var(--ink-600)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob: or private-route preview
                <img src={preview} alt="" className="size-14 rounded-lg object-cover" />
              ) : <span className="grid size-14 place-items-center rounded-lg bg-white text-[var(--ink-300)]"><BoxIcon size={22} /></span>}
              <span>{t("modal.imageHelp")}</span>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const chosen = e.target.files?.[0]; if (chosen) setPreview(URL.createObjectURL(chosen)); }} />
            </span>
          ))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {box("costPrice", t("modal.cost"), <input inputMode="numeric" value={form.costPrice} onChange={set("costPrice")} className={`${input} mono-num mt-1.5`} />)}
            {box("stock", t("modal.stock"), <input inputMode="numeric" value={form.stock} onChange={set("stock")} className={`${input} mono-num mt-1.5`} />)}
          </div>
          <p className="text-[12px] text-[var(--ink-500)]">{t("modal.reviewNote")}</p>
          <div className="flex justify-end gap-3 border-t border-[var(--ink-100)] pt-5">
            <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
            <button type="submit" disabled={pending} className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>{pending ? t("modal.saving") : t(form.id ? "modal.save" : "modal.submit")}</button>
          </div>
        </form>
      </Modal>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title={t("deleteTitle")}>
        <p className="text-sm text-[var(--ink-600)]">{t("deleteBody", { name: toDelete?.name ?? "" })}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setToDelete(null)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
          <button type="button" onClick={confirmDelete} disabled={pending} className="inline-flex h-10 items-center rounded-full bg-[var(--kai-danger)] px-5 text-sm font-semibold text-white disabled:opacity-60">{t("delete")}</button>
        </div>
      </Modal>
    </div>
  );
}
