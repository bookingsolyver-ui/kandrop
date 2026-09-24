"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFields, type FieldErrors } from "@/components/checkout/useFields";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Link, useRouter } from "@/i18n/navigation";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicProduct } from "@/server/modules/products/schema";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  createProductSchema,
  firstProductError,
  offerProblem,
  type ProductCategory,
  type ProductStatus,
  type ProductValidationCode,
  type UpdateProductInput,
} from "@/shared/products/schemas";
import { DeleteProductDialog } from "./DeleteProductDialog";
import { SelectField, TextArea, TextField } from "@/components/form/Fields";
import { ImageUploader, itemsFromProduct, toImageRefs, type ImageItem } from "./ImageUploader";
import { PricingPanel } from "./PricingPanel";
import { createProduct, updateProduct } from "./productsApi";
import { useCurrencySymbol } from "./useCurrencySymbol";

type Field =
  | "title"
  | "description"
  | "category"
  | "status"
  | "costPrice"
  | "salePrice"
  | "stock"
  | "compareAtPrice"
  | "offerEndsAt";
type Values = Record<Field, string>;

const FIELD_ORDER: Field[] = [
  "title",
  "category",
  "status",
  "description",
  "costPrice",
  "salePrice",
  "stock",
  "compareAtPrice",
  "offerEndsAt",
];
/** Images are checked by the uploader itself, so the form validates everything else. */
const formSchema = createProductSchema.omit({ images: true });

/** Whole Kwanzas typed by the merchant → minor units; `undefined` while the field is empty. */
const toMinor = (kwanza: string) => (kwanza === "" ? undefined : Number(kwanza) * 100);
/** Digits only, no leading zeros, and never more digits than the highest allowed price needs. */
const formatKwanza = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 9)
    .replace(/^0+(?=\d)/, "");

/** `2026-09-24T18:30` in the browser's own time zone: what a `datetime-local` input speaks. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function initialValues(product?: PublicProduct): Values {
  return {
    title: product?.title ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    status: product?.status ?? "active",
    costPrice: product ? String(Math.round(product.costPrice / 100)) : "",
    salePrice: product ? String(Math.round(product.salePrice / 100)) : "",
    stock: product?.stock == null ? "" : String(product.stock),
    compareAtPrice: product?.compareAtPrice ? String(Math.round(product.compareAtPrice / 100)) : "",
    offerEndsAt: product?.offerEndsAt ? toLocalInput(product.offerEndsAt) : "",
  };
}

function candidate(values: Values) {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    status: values.status,
    costPrice: toMinor(values.costPrice),
    salePrice: toMinor(values.salePrice),
    stock: values.stock === "" ? null : Number(values.stock),
    compareAtPrice: toMinor(values.compareAtPrice) ?? null,
    // A half-typed date gives NaN, which the schema rejects with `offer_end_invalid`.
    offerEndsAt: values.offerEndsAt === "" ? null : new Date(values.offerEndsAt).getTime(),
  };
}

/** `initial` matters for one rule: a deadline must be in the future only when it is being set. */
function validate(values: Values, initial: Values): FieldErrors<Field, ProductValidationCode> {
  const parsed = formSchema.safeParse(candidate(values));
  if (!parsed.success) {
    return firstProductError(parsed.error.issues) as FieldErrors<Field, ProductValidationCode>;
  }
  const problem = offerProblem(parsed.data, Date.now(), values.offerEndsAt !== initial.offerEndsAt);
  return problem ? { [problem.field]: problem.code } : {};
}

/** Digits only, at most seven (the stock limit is 1 000 000), no leading zeros. */
const formatUnits = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 7)
    .replace(/^0+(?=\d)/, "");

export function ProductForm({ product }: { product?: PublicProduct }) {
  const t = useTranslations("Catalog");
  const errors = useTranslations("Errors");
  const f = useFormatters();
  const router = useRouter();
  const currency = useCurrencySymbol();
  const alertRef = useRef<HTMLDivElement>(null);

  const editing = product !== undefined;
  const [saved, setSaved] = useState<PublicProduct | undefined>(product);
  const [images, setImages] = useState<ImageItem[]>(() => itemsFromProduct(product?.images ?? []));
  const [imageError, setImageError] = useState<ProductValidationCode | undefined>();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useFields<Field, ProductValidationCode>(
    initialValues(product),
    (values) => validate(values, initialValues(saved)),
    "pf"
  );

  useEffect(() => {
    if (formError) alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [formError]);

  const message = (field: Field) => {
    const code = form.errorFor(field);
    return code ? t(`validation.${code}`) : undefined;
  };
  const moneyHint = (value: string) =>
    value ? f.money(Number(value) * 100) : t("form.fields.moneyHint");

  /** On edit, send only what changed, so untouched fields (and their cents) are never rewritten. */
  function changes(): UpdateProductInput {
    const base = initialValues(saved);
    const next = candidate(form.values);
    const patch: UpdateProductInput = {};
    if (form.values.title !== base.title) patch.title = next.title;
    if (form.values.description !== base.description) patch.description = next.description;
    if (form.values.category !== base.category) {
      patch.category = form.values.category as ProductCategory;
    }
    if (form.values.status !== base.status) patch.status = form.values.status as ProductStatus;
    if (form.values.costPrice !== base.costPrice) patch.costPrice = next.costPrice;
    if (form.values.salePrice !== base.salePrice) patch.salePrice = next.salePrice;
    if (form.values.stock !== base.stock) patch.stock = next.stock;
    if (form.values.compareAtPrice !== base.compareAtPrice) {
      patch.compareAtPrice = next.compareAtPrice;
    }
    if (form.values.offerEndsAt !== base.offerEndsAt) patch.offerEndsAt = next.offerEndsAt;
    const before = (saved?.images ?? []).map((image) => image.id).join();
    const after = images.map((image) => image.id ?? "new").join();
    if (before !== after || images.some((image) => !image.id)) patch.images = toImageRefs(images);
    return patch;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    setJustSaved(false);
    setImageError(undefined);
    if (!form.attempt(FIELD_ORDER)) return;

    setPending(true);
    const result = editing
      ? await updateProduct(saved!.id, changes())
      : await createProduct({
          ...formSchema.parse(candidate(form.values)),
          images: toImageRefs(images),
        });
    setPending(false);

    if (result.ok) {
      if (!editing) return router.push("/dashboard/products");
      setSaved(result.data);
      setImages(itemsFromProduct(result.data.images)); // new uploads now have ids
      return setJustSaved(true);
    }

    if (result.code === "validation_failed" && Object.keys(result.fieldErrors).length > 0) {
      // Rare (the browser validated first), but the server is the authority.
      const { images: imagesCode, ...fields } = result.fieldErrors;
      if (imagesCode) setImageError(imagesCode);
      return form.setServerErrors(fields as FieldErrors<Field, ProductValidationCode>);
    }
    setFormError(result.code);
  }

  const cost = toMinor(form.values.costPrice) ?? null;
  const price = toMinor(form.values.salePrice) ?? null;

  return (
    // `noValidate`: our own translated messages replace the browser's native bubbles.
    <form onSubmit={onSubmit} noValidate className="pb-28 lg:pb-0">
      {formError && (
        <div
          ref={alertRef}
          role="alert"
          className="mb-6 rounded-md border border-down px-4 py-3 text-sm leading-snug text-down"
        >
          {errors(formError)}
        </div>
      )}

      {/* One grid, source order = phone order: basics → price & margin → images. From lg the
          price panel moves to a sticky right column spanning both rows. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10">
        <section
          aria-labelledby="basics-title"
          className="rounded-lg border border-line bg-surface p-5 sm:p-7 lg:col-start-1"
        >
          <h2
            id="basics-title"
            className="mb-5 font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("form.basics")}
          </h2>
          <div className="space-y-5">
            <TextField
              {...form.bind("title")}
              label={t("form.fields.title")}
              error={message("title")}
              autoComplete="off"
              maxLength={120}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                {...form.bind("category")}
                label={t("form.fields.category")}
                error={message("category")}
              >
                <option value="" disabled>
                  —
                </option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                {...form.bind("status")}
                label={t("form.fields.status")}
                error={message("status")}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextArea
              {...form.bind("description")}
              label={t("form.fields.description")}
              hint={t("form.fields.descriptionHint")}
              error={message("description")}
              maxLength={2000}
            />
          </div>
        </section>

        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <PricingPanel cost={cost} price={price}>
            <TextField
              {...form.bind("costPrice", formatKwanza)}
              label={t("form.fields.cost")}
              hint={moneyHint(form.values.costPrice)}
              error={message("costPrice")}
              suffix={currency}
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="0"
              numeric
            />
            <TextField
              {...form.bind("salePrice", formatKwanza)}
              label={t("form.fields.price")}
              hint={moneyHint(form.values.salePrice)}
              error={message("salePrice")}
              suffix={currency}
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="0"
              numeric
            />
          </PricingPanel>
        </aside>
        <section
          aria-labelledby="offer-title"
          className="rounded-lg border border-line bg-surface p-5 sm:p-7 lg:col-start-1"
        >
          <h2
            id="offer-title"
            className="mb-2 font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("form.offer.title")}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-ink-muted">{t("form.offer.intro")}</p>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                {...form.bind("stock", formatUnits)}
                label={t("form.offer.stock")}
                hint={t("form.offer.stockHint")}
                error={message("stock")}
                inputMode="numeric"
                autoComplete="off"
                maxLength={7}
                placeholder="—"
                numeric
              />
              <TextField
                {...form.bind("compareAtPrice", formatKwanza)}
                label={t("form.offer.regular")}
                hint={
                  form.values.compareAtPrice
                    ? moneyHint(form.values.compareAtPrice)
                    : t("form.offer.regularHint")
                }
                error={message("compareAtPrice")}
                suffix={currency}
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                placeholder="0"
                numeric
              />
            </div>
            <div>
              <TextField
                {...form.bind("offerEndsAt")}
                type="datetime-local"
                label={t("form.offer.ends")}
                hint={t("form.offer.endsHint")}
                error={message("offerEndsAt")}
                suppressHydrationWarning
              />
              {form.values.offerEndsAt && (
                <button
                  type="button"
                  onClick={() => form.bind("offerEndsAt").onChange({ target: { value: "" } })}
                  className="mt-1 min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  {t("form.offer.clear")}
                </button>
              )}
            </div>
          </div>
        </section>
        <section
          aria-labelledby="images-title"
          className="rounded-lg border border-line bg-surface p-5 sm:p-7 lg:col-start-1"
        >
          <h2
            id="images-title"
            className="mb-2 font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("form.images.title")}
          </h2>
          <ImageUploader
            items={images}
            onChange={setImages}
            error={imageError && t(`validation.${imageError}`)}
          />
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Phones: Save is pinned to the bottom (thumb reach), like the checkout's Pay button. */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="mx-auto flex h-14 w-full max-w-md items-center justify-center rounded-md bg-action text-[1.0625rem] font-semibold text-on-action transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-70 lg:h-12 lg:w-auto lg:min-w-48 lg:px-8"
          >
            {pending ? t("form.saving") : t("form.save")}
          </button>
        </div>
        <Link
          href="/dashboard/products"
          className="inline-flex min-h-11 items-center rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {t("form.cancel")}
        </Link>
        {editing &&
          (saved?.status === "active" ? (
            <Link
              href={`/loja/${saved.slug}`}
              target="_blank"
              className="inline-flex min-h-11 items-center rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
            >
              {t("form.publicPage")}
            </Link>
          ) : (
            <span className="text-sm text-ink-muted">{t("form.publicPageHint")}</span>
          ))}
        {editing && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 rounded-md border border-down px-4 text-sm font-medium text-down lg:ml-auto"
          >
            {t("form.delete")}
          </button>
        )}
        <p role="status" className="w-full text-sm text-up">
          {justSaved ? t("form.saved") : ""}
        </p>
      </div>

      {editing && (
        <DeleteProductDialog
          product={confirmDelete ? { id: saved!.id, title: saved!.title } : null}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => router.replace("/dashboard/products")}
        />
      )}
    </form>
  );
}
