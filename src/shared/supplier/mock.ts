import { INVENTORY, MERCHANTS } from "@/shared/admin/mock";
import { ALL_VITRINE_PRODUCTS, type VitrineCategory, type VitrineKind, type VitrineProduct } from "@/shared/vitrine/mock";

/**
 * SAMPLE data of the multi-vendor marketplace: the suppliers, which Vitrine products are theirs, what they
 * sold and the products waiting for approval. Invented and deterministic. The shapes are the contract for
 * the real tables (`suppliers`, `supplier_products`, `supplier_sales`, `supplier_payouts`). Money is minor units.
 */
const kz = (n: number) => n * 100;
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);

export interface Supplier {
  id: string;
  /** Legal name. */
  name: string;
  nif: string;
  kind: VitrineKind;
  province: string;
  municipality: string;
  phone: string;
  email: string;
  rating: number;
  reviews: number;
  /** The year the company joined. */
  since: number;
  description: string;
  /** The brands this supplier's products carry in the Vitrine. */
  brands: string[];
  banner: [string, string];
  status: "active" | "pending_review";
}

export const SUPPLIERS: Supplier[] = [
  { id: "sup_natura", name: "Natura Ango, Lda", nif: "5417012345", kind: "nacional", province: "Luanda", municipality: "Viana", phone: "923 410 556", email: "comercial@naturaango.exemplo.ao", rating: 4.8, reviews: 312, since: 2024, description: "Cosmética e bem-estar feitos em Angola com karité, coco e moringa, entregues de armazém próprio em Viana.", brands: ["Natura Ango"], banner: ["#ff7e2e", "#ff5a00"], status: "active" },
  { id: "sup_planalto", name: "Sabores do Planalto, Lda", nif: "5417098761", kind: "nacional", province: "Huambo", municipality: "Huambo", phone: "924 118 203", email: "vendas@saboresplanalto.exemplo.ao", rating: 4.7, reviews: 188, since: 2024, description: "Café, mel e temperos do planalto central, directamente de produtores locais.", brands: ["Cafés do Amboim", "Mel do Planalto", "Sabores de Angola"], banner: ["#3a3a3a", "#000000"], status: "active" },
  { id: "sup_casaviva", name: "Casa Viva Distribuição, SA", nif: "5417045512", kind: "nacional", province: "Benguela", municipality: "Lobito", phone: "925 334 700", email: "geral@casaviva.exemplo.ao", rating: 4.6, reviews: 254, since: 2024, description: "Utilidades para casa e artesanato, com stock permanente no porto do Lobito.", brands: ["CasaViva", "Artesanato Benguela"], banner: ["#ffa366", "#d94c00"], status: "active" },
  { id: "sup_textil", name: "Têxtil Kianda, SA", nif: "5417077120", kind: "nacional", province: "Luanda", municipality: "Cazenga", phone: "926 802 449", email: "b2b@textilkianda.exemplo.ao", rating: 4.5, reviews: 421, since: 2024, description: "Capulanas, vestuário, calçado e joias artesanais: moda angolana por grosso.", brands: ["Tecidos de Luanda", "Moda Kianda", "Couro Lobito", "Joias Kianda"], banner: ["#000000", "#ff5a00"], status: "active" },
  { id: "sup_sol", name: "SolAngola Energia, Lda", nif: "5417055089", kind: "nacional", province: "Malanje", municipality: "Malanje", phone: "927 590 115", email: "info@solangola.exemplo.ao", rating: 4.4, reviews: 97, since: 2025, description: "Soluções solares portáteis para um país com pouca rede eléctrica.", brands: ["SolAngola"], banner: ["#ffa366", "#3a3a3a"], status: "active" },
  { id: "sup_brinca", name: "Brinca Angola, Lda", nif: "5417066334", kind: "nacional", province: "Luanda", municipality: "Talatona", phone: "928 713 062", email: "ola@brincaangola.exemplo.ao", rating: 4.9, reviews: 176, since: 2025, description: "Brinquedos de madeira e peluches, e acessórios para animais de estimação.", brands: ["Brinca Angola", "Pet Angola"], banner: ["#ff5a00", "#ff7e2e"], status: "active" },
  { id: "sup_global", name: "Global Sourcing Angola, Lda", nif: "5417011876", kind: "internacional", province: "Luanda", municipality: "Luanda", phone: "929 204 318", email: "sourcing@globalsourcing.exemplo.ao", rating: 4.3, reviews: 689, since: 2024, description: "Importação directa de electrónica, relógios, vestuário e saúde, produzida sob encomenda.", brands: ["FlexCare", "TrackFi", "Aurelio", "SoundPeak", "UrbanGo"], banner: ["#000000", "#3a3a3a"], status: "active" },
  { id: "sup_beauty", name: "Beauty Import AO, Lda", nif: "5417033901", kind: "internacional", province: "Luanda", municipality: "Belas", phone: "930 118 476", email: "ola@beautyimport.exemplo.ao", rating: 4.6, reviews: 503, since: 2024, description: "Skincare e cuidado pessoal das melhores marcas coreanas e europeias.", brands: ["Celimax", "DermaPro", "StyleAir", "Lumière"], banner: ["#ff7e2e", "#000000"], status: "active" },
  { id: "sup_kids", name: "Kids & Pets Import, Lda", nif: "5417088245", kind: "internacional", province: "Luanda", municipality: "Kilamba Kiaxi", phone: "931 667 209", email: "geral@kidspets.exemplo.ao", rating: 4.7, reviews: 231, since: 2025, description: "Jogos educativos, carros telecomandados e decoração nórdica para a casa.", brands: ["BrickKids", "SpeedKid", "Mimi", "PetLoop", "Nordic"], banner: ["#ff5a00", "#000000"], status: "active" },
];

export const supplierById = (id: string) => SUPPLIERS.find((s) => s.id === id);
export const supplierOfBrand = (brand: string) => SUPPLIERS.find((s) => s.brands.includes(brand));
/** The supplier a Vitrine product belongs to (by its brand), or `undefined` for a product without one. */
export const supplierOfProduct = (p: Pick<VitrineProduct, "brand">) => supplierOfBrand(p.brand);
export const productsOfSupplier = (id: string) => {
  const s = supplierById(id);
  return s ? ALL_VITRINE_PRODUCTS.filter((p) => s.brands.includes(p.brand)) : [];
};


// ── Products waiting for approval ────────────────────────────────────────────────────────────

export type SubmissionStatus = "in_review" | "approved" | "rejected";
export interface Submission {
  id: string;
  supplierId: string;
  sku: string;
  title: string;
  category: VitrineCategory;
  description: string;
  weightKg: number;
  costPrice: number;
  suggestedPrice: number;
  stock: number;
  createdAt: number;
  status: SubmissionStatus;
}

type Seed = [supplierId: string, title: string, category: VitrineCategory, cost: number, suggested: number, kg: number, stock: number];
const SEED_ROWS: Seed[] = [
  ["sup_natura", "Óleo de rícino orgânico, 100 ml", "beauty", 2_100, 5_200, 0.15, 240],
  ["sup_textil", "Camisa de capulana masculina, tamanhos M a XXL", "fashion", 6_400, 14_900, 0.4, 90],
  ["sup_global", "Câmara de vigilância Wi-Fi 360° para casa", "tech", 14_800, 33_900, 0.35, 60],
  ["sup_casaviva", "Conjunto de talheres inox, 24 peças", "home", 7_900, 18_500, 1.2, 130],
  ["sup_beauty", "Máscara capilar de queratina, 500 ml", "beauty", 9_300, 21_900, 0.6, 75],
  ["sup_brinca", "Conjunto de instrumentos musicais de madeira", "toys", 5_600, 13_400, 0.8, 110],
];
export const SEED_SUBMISSIONS: Submission[] = SEED_ROWS.map(([supplierId, title, category, cost, suggested, kg, stock], i) => ({
  id: `sub_${String(i + 1).padStart(3, "0")}`,
  supplierId,
  sku: `SUB${2000 + i * 11}`,
  title,
  category,
  description: `${title}. Produto novo submetido pelo fornecedor, a aguardar validação da equipa Kandrop.`,
  weightKg: kg,
  costPrice: kz(cost),
  suggestedPrice: kz(suggested),
  stock,
  createdAt: NOW - (i + 1) * DAY,
  status: "in_review",
}));

/** A submitted product, as a Vitrine product (what the merchants see once it is approved). */
export function submissionToVitrine(s: Submission): VitrineProduct {
  const supplier = supplierById(s.supplierId);
  return {
    id: s.id,
    sku: s.sku,
    kind: supplier?.kind ?? "nacional",
    title: s.title,
    brand: supplier?.brands[0] ?? supplier?.name ?? "—",
    category: s.category,
    costPrice: s.costPrice,
    hot: false,
    bestSeller: false,
    kit: false,
    isNew: true,
    inStock: s.stock > 0,
  };
}

// ── Stock, sales and money of a supplier ─────────────────────────────────────────────────────

export const stockOf = (productId: string) => INVENTORY.find((i) => i.id === productId)?.quantity ?? 0;
export const weeklySalesOf = (productId: string) => INVENTORY.find((i) => i.id === productId)?.weeklySales ?? 0;

export interface SupplierSale {
  id: string;
  at: number;
  orderNumber: number;
  productId: string;
  product: string;
  quantity: number;
  merchant: string;
  /** What the supplier receives: the cost price × quantity. */
  amount: number;
  /** `pending` until the delivery is confirmed and the return window passed; then `available`. */
  status: "pending" | "available";
}

/** Deterministic sales of the last 30 days for every product of the supplier. */
export function salesOfSupplier(supplierId: string): SupplierSale[] {
  const rows: SupplierSale[] = [];
  productsOfSupplier(supplierId).forEach((p, pi) => {
    const count = 3 + ((pi * 5 + supplierId.length) % 6);
    for (let k = 0; k < count; k++) {
      const daysAgo = (pi * 3 + k * 4 + 1) % 30;
      const quantity = 1 + ((pi + k) % 3 === 0 ? 1 : 0);
      rows.push({
        id: `sale_${supplierId}_${pi}_${k}`,
        at: NOW - daysAgo * DAY - ((pi + k) % 9) * 3_600_000,
        orderNumber: 3000 + pi * 17 + k * 3,
        productId: p.id,
        product: p.title,
        quantity,
        merchant: MERCHANTS[(pi + k) % MERCHANTS.length]!.store,
        amount: p.costPrice * quantity,
        status: daysAgo > 4 ? "available" : "pending",
      });
    }
  });
  return rows.sort((a, b) => b.at - a.at);
}

/** Withdrawals already paid out to the supplier (sample). */
export function payoutsOfSupplier(supplierId: string) {
  const base = salesOfSupplier(supplierId).filter((s) => s.status === "available").reduce((sum, s) => sum + s.amount, 0);
  return base > 0
    ? [
        { id: "SUP-PO-003", at: NOW - 9 * DAY, amount: Math.round(base * 0.22), status: "paid" as const },
        { id: "SUP-PO-002", at: NOW - 24 * DAY, amount: Math.round(base * 0.31), status: "paid" as const },
      ]
    : [];
}
