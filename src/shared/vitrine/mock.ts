/**
 * SAMPLE catalogue for the showcase (Vitrine). The shape is the contract for the real one: when the
 * products come from Supabase (a `catalog_products` table), only the source of these arrays changes.
 * Prices are Kwanzas in minor units; titles are supplier content, never translated.
 */
export type VitrineKind = "nacional" | "internacional";

export const VITRINE_CATEGORIES = ["beauty", "toys", "fashion", "home", "jewelry", "health", "tech", "pets"] as const;
export type VitrineCategory = (typeof VITRINE_CATEGORIES)[number];

export interface VitrineProduct {
  id: string;
  sku: string;
  kind: VitrineKind;
  title: string;
  brand: string;
  category: VitrineCategory;
  /** Cost price in minor units (Kz × 100). */
  costPrice: number;
  hot: boolean;
  bestSeller: boolean;
  kit: boolean;
  isNew: boolean;
  inStock: boolean;
  /** A seasonal campaign the product belongs to, if any. */
  occasion?: "children";
}

const kz = (n: number) => n * 100;

type Row = [title: string, brand: string, category: VitrineCategory, kzPrice: number, flags: string];

/** `h` hot · `b` best seller · `k` kit · `n` new · `x` out of stock · `c` children's day */
function build(kind: VitrineKind, prefix: string, rows: Row[]): VitrineProduct[] {
  return rows.map(([title, brand, category, price, flags], i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, "0")}`,
    sku: `${prefix.toUpperCase()}${String(1000 + i * 7)}`,
    kind,
    title,
    brand,
    category,
    costPrice: kz(price),
    hot: flags.includes("h"),
    bestSeller: flags.includes("b"),
    kit: flags.includes("k"),
    isNew: flags.includes("n"),
    inStock: !flags.includes("x"),
    occasion: flags.includes("c") ? "children" : undefined,
  }));
}

export const INTERNATIONAL_PRODUCTS: VitrineProduct[] = build("internacional", "int", [
  ["Joelheira de fibra de cobre, compressão respirável para desporto, tamanho L", "FlexCare", "health", 6_900, "hb"],
  ["Rastreador inteligente anti-perda para Android, idosos, crianças e animais", "TrackFi", "tech", 12_100, "hb"],
  ["Relógio masculino quartz ultrafino, resistente à água, com calendário", "Aurelio", "jewelry", 25_200, "hb"],
  ["Creme de olhos com retinol, hidratante e firmador", "Celimax", "beauty", 10_700, "hbn"],
  ["Coleira para animais com capa de silicone refletiva e sino, para AirTag", "PetLoop", "pets", 6_900, "hb"],
  ["Linha skincare com sérum de niacinamida, limpeza, tónico e creme facial", "Celimax", "beauty", 16_100, "hbk"],
  ["Esfoliante facial 2.0 para skincare, pronta entrega", "DermaPro", "beauty", 27_400, "hb"],
  ["Escova alisadora sem fios com iões negativos, modelador 2 em 1", "StyleAir", "beauty", 20_400, "hb"],
  ["Colar feminino com pendente de coração e cruz em zircónio, cor ouro 18K", "Lumière", "jewelry", 5_500, "hb"],
  ["Pulseira feminina dupla com pérola e prata, estilo luxo delicado", "Lumière", "jewelry", 12_900, "hb"],
  ["Gel de massagem corporal para joelhos, ombros e articulações", "FlexCare", "health", 13_800, "hb"],
  ["Creme de cuidado corporal para articulações, uso diário com massagem", "FlexCare", "health", 11_500, "hb"],
  ["Conjunto de blocos de construção magnéticos, 120 peças", "BrickKids", "toys", 14_200, "hnc"],
  ["Carro telecomandado todo-o-terreno com luzes LED", "SpeedKid", "toys", 18_900, "hc"],
  ["Puzzle educativo de madeira com animais, 3 anos+", "BrickKids", "toys", 4_800, "nc"],
  ["Boneca interativa com roupa e acessórios", "Mimi", "toys", 16_400, "hc"],
  ["Candeeiro de mesa em bambu com carregador sem fios", "Nordic", "home", 9_700, "n"],
  ["Organizador de cozinha em aço inox, 3 níveis", "Nordic", "home", 8_300, ""],
  ["Mochila impermeável 25 L com porta USB", "UrbanGo", "fashion", 11_900, "h"],
  ["Ténis urbanos unissexo, sola respirável", "UrbanGo", "fashion", 21_500, "x"],
  ["Auriculares sem fios com cancelamento de ruído", "SoundPeak", "tech", 15_600, "hb"],
  ["Carregador rápido 65 W com 3 portas", "SoundPeak", "tech", 7_400, "b"],
  ["Kit de limpeza facial: escova elétrica + 3 máscaras", "DermaPro", "beauty", 19_900, "kn"],
  ["Kit de joias: colar, pulseira e brincos em prata", "Lumière", "jewelry", 17_300, "k"],
]);

export const NATIONAL_PRODUCTS: VitrineProduct[] = build("nacional", "nac", [
  ["Café moído de Amboim, 500 g", "Cafés do Amboim", "home", 2_800, "hb"],
  ["Mel puro do Huambo, 1 kg", "Mel do Planalto", "home", 4_000, "b"],
  ["Sabonete de karité e óleo de palma, pack de 4", "Natura Ango", "beauty", 3_100, "hbn"],
  ["Óleo de coco virgem para cabelo e corpo, 250 ml", "Natura Ango", "beauty", 3_900, "hb"],
  ["Capulana estampada, 2 m", "Tecidos de Luanda", "fashion", 6_500, "h"],
  ["Vestido de algodão estampado, vários tamanhos", "Moda Kianda", "fashion", 8_500, "b"],
  ["Sandálias de couro artesanais", "Couro Lobito", "fashion", 7_200, "n"],
  ["Cesto de palha tradicional, médio", "Artesanato Benguela", "home", 3_600, ""],
  ["Conjunto de panelas antiaderentes, 5 peças", "CasaViva", "home", 15_900, "hb"],
  ["Candeeiro LED de secretária com carregador", "CasaViva", "tech", 9_800, "b"],
  ["Carregador solar portátil 20 000 mAh", "SolAngola", "tech", 13_400, "hn"],
  ["Lanterna recarregável com painel solar", "SolAngola", "tech", 5_200, "h"],
  ["Colar de contas artesanal", "Artesanato Benguela", "jewelry", 2_400, ""],
  ["Pulseira de prata com pedra natural", "Joias Kianda", "jewelry", 9_900, "n"],
  ["Pomada de babosa para a pele, 100 g", "Natura Ango", "health", 2_700, "b"],
  ["Chá de moringa, 30 saquetas", "Natura Ango", "health", 3_300, "hn"],
  ["Carrinho de madeira para crianças", "Brinca Angola", "toys", 5_900, "c"],
  ["Jogo de tabuleiro Mancala em madeira", "Brinca Angola", "toys", 6_800, "nc"],
  ["Peluche de girafa, 40 cm", "Brinca Angola", "toys", 4_700, "c"],
  ["Coleira ajustável para cães, tamanho M", "Pet Angola", "pets", 3_500, ""],
  ["Kit de beleza natural: sabonete, óleo e manteiga de karité", "Natura Ango", "beauty", 8_900, "kb"],
  ["Kit de cozinha angolana: funge, jindungo e tempero", "Sabores de Angola", "home", 5_400, "k"],
  ["Lenço de cabeça em wax, vários padrões", "Tecidos de Luanda", "fashion", 3_200, "x"],
]);

export const ALL_VITRINE_PRODUCTS: VitrineProduct[] = [...NATIONAL_PRODUCTS, ...INTERNATIONAL_PRODUCTS];
export const findVitrineProduct = (id: string) => ALL_VITRINE_PRODUCTS.find((p) => p.id === id);
