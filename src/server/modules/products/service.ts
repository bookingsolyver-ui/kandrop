import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import {
  computeMargin,
  createProductSchema,
  listProductsQuerySchema,
  offerProblem,
  updateProductSchema,
  type ImageRef,
  type ListProductsQuery,
} from "@/shared/products/schemas";
import { planOf } from "@/server/modules/billing/plan";
import { PLANS } from "@/server/modules/plan/limits";
import { newImageId, newProductId, productRepository } from "./repository";
import type { ImageMime, ProductPage, ProductRecord, PublicProduct, StoredImage } from "./schema";

/** Cheap, consistent "not found" for a missing product *or* one that belongs to another store. */
const notFound = () => new ApiError("not_found");
const badImages = () =>
  new ApiError("validation_failed", [{ path: ["images"], message: "images_invalid" }]);

// ── Images ────────────────────────────────────────────────────────────────────────────────

/** The declared type is not trusted: the file's own signature must agree with it. */
function matchesSignature(mime: ImageMime, b: Buffer): boolean {
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/png") return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return (
    b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function decodeImage(dataUrl: string): StoredImage {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw badImages();
  const mime = match[1] as ImageMime;
  const data = Buffer.from(match[2]!, "base64");
  if (data.length === 0 || !matchesSignature(mime, data)) throw badImages();
  return { id: newImageId(), mime, data };
}

/** Rebuilds the image list in the order sent: kept images by id, new ones decoded. */
function resolveImages(current: StoredImage[], refs: ImageRef[]): StoredImage[] {
  const seen = new Set<string>();
  return refs.map((ref) => {
    if ("dataUrl" in ref) return decodeImage(ref.dataUrl);
    const kept = current.find((image) => image.id === ref.id);
    if (!kept || seen.has(kept.id)) throw badImages();
    seen.add(kept.id);
    return kept;
  });
}

// ── Views ─────────────────────────────────────────────────────────────────────────────────

export function toPublic(p: ProductRecord): PublicProduct {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    status: p.status,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    currency: "AOA",
    margin: computeMargin(p.costPrice, p.salePrice),
    images: p.images.map((image) => ({
      id: image.id,
      url: `/api/products/${p.id}/images/${image.id}`,
    })),
    slug: p.slug,
    stock: p.stock,
    compareAtPrice: p.compareAtPrice,
    offerEndsAt: p.offerEndsAt === null ? null : new Date(p.offerEndsAt).toISOString(),
    views: p.views,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

/** Lower-cases and strips accents so "cafe" finds "Café" (Portuguese/French catalogues). */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// ── Operations ────────────────────────────────────────────────────────────────────────────

export async function listProducts(
  auth: Session,
  rawQuery: ListProductsQuery
): Promise<ProductPage> {
  const query = listProductsQuerySchema.parse(rawQuery);
  const all = productRepository.all(auth.storeId);

  const terms = query.q ? fold(query.q).split(/\s+/).filter(Boolean) : [];
  const matching = all.filter((p) => {
    if (query.category && p.category !== query.category) return false;
    if (query.status && p.status !== query.status) return false;
    if (terms.length === 0) return true;
    const haystack = fold(`${p.title} ${p.description}`);
    return terms.every((term) => haystack.includes(term));
  });

  const sign = query.dir === "asc" ? 1 : -1;
  const key = (p: ProductRecord): number | string => {
    if (query.sort === "title") return fold(p.title);
    if (query.sort === "price") return p.salePrice;
    if (query.sort === "margin") return computeMargin(p.costPrice, p.salePrice).rate ?? -Infinity;
    return p.updatedAt;
  };
  matching.sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    const order =
      typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
    return sign * order || a.id.localeCompare(b.id); // stable when values tie
  });

  const start = (query.page - 1) * query.pageSize;
  return {
    items: matching.slice(start, start + query.pageSize).map(toPublic),
    total: matching.length,
    overall: all.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getProduct(auth: Session, id: string): Promise<PublicProduct> {
  const product = productRepository.get(auth.storeId, id);
  if (!product) throw notFound();
  return toPublic(product);
}

/** The offer rules on the whole product; the deadline must be ahead only when it is being set. */
function assertOffer(p: ProductRecord, deadlineChanged: boolean) {
  const problem = offerProblem(p, Date.now(), deadlineChanged);
  if (problem) {
    throw new ApiError("validation_failed", [{ path: [problem.field], message: problem.code }]);
  }
}

export async function createProduct(auth: Session, input: unknown): Promise<PublicProduct> {
  const data = createProductSchema.parse(input);
  // The plan's product limit is real: the sidebar's plan card shows it, so it must hold.
  const limit = PLANS[planOf(auth.storeId)].products;
  if (limit !== null && productRepository.all(auth.storeId).length >= limit) {
    throw new ApiError("plan_limit_reached");
  }
  const now = Date.now();
  const product: ProductRecord = {
    ...data,
    id: newProductId(),
    storeId: auth.storeId,
    images: resolveImages([], data.images),
    slug: "", // assigned by the repository, which knows every slug in use
    views: 0,
    createdAt: now,
    updatedAt: now,
  };
  assertOffer(product, true);
  return toPublic(productRepository.save(product));
}

export async function updateProduct(
  auth: Session,
  id: string,
  input: unknown
): Promise<PublicProduct> {
  const current = productRepository.get(auth.storeId, id);
  if (!current) throw notFound();

  const { images, ...rest } = updateProductSchema.parse(input);
  const next: ProductRecord = {
    ...current,
    ...rest,
    images: images ? resolveImages(current.images, images) : current.images,
    updatedAt: Math.max(Date.now(), current.updatedAt + 1),
  };
  assertOffer(next, next.offerEndsAt !== current.offerEndsAt);
  return toPublic(productRepository.save(next));
}

export async function deleteProduct(auth: Session, id: string): Promise<void> {
  if (!productRepository.delete(auth.storeId, id)) throw notFound();
}

export async function getProductImage(auth: Session, productId: string, imageId: string) {
  const image = productRepository
    .get(auth.storeId, productId)
    ?.images.find((candidate) => candidate.id === imageId);
  if (!image) throw notFound();
  return image;
}
