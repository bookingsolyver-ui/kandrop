"use client";

import React from "react";
import { SkiperProductCarousel, type ProductItem } from "@/waitlist/components/ui/skiper-carousel";
import { ArrowRight } from "lucide-react";

const PRODUCTS: ProductItem[] = [
  {
    id: "smartwatch-ultra",
    name: "Smartwatch Ultra 2",
    category: "Tech & Wearables",
    image: "/waitlist/images/products/smartwatch-ultra.jpg",
    costPrice: "4.800 Kz",
    sellPrice: "16.500 Kz",
    profit: "+11.700 Kz",
    marginPercent: "71%",
    tag: "Alta Procura",
  },
  {
    id: "earbuds-pro",
    name: "Fones Sem Fios TWS Pro",
    category: "Áudio & Gadgets",
    image: "/waitlist/images/products/earbuds-pro.jpg",
    costPrice: "2.900 Kz",
    sellPrice: "10.500 Kz",
    profit: "+7.600 Kz",
    marginPercent: "72%",
    tag: "Mais Vendido",
  },
  {
    id: "mini-projector",
    name: "Mini Projetor Smart LED HD",
    category: "Cinema & Casa",
    image: "/waitlist/images/products/mini-projector.jpg",
    costPrice: "26.500 Kz",
    sellPrice: "65.000 Kz",
    profit: "+38.500 Kz",
    marginPercent: "59%",
    tag: "Tendência Viral",
  },
  {
    id: "powerbank-fast",
    name: "Power Bank Rápido 20.000mAh",
    category: "Energia & Acessórios",
    image: "/waitlist/images/products/powerbank-fast.jpg",
    costPrice: "5.800 Kz",
    sellPrice: "19.500 Kz",
    profit: "+13.700 Kz",
    marginPercent: "70%",
    tag: "Essencial Luanda",
  },
  {
    id: "barber-clipper",
    name: "Máquina de Corte Barber Pro",
    category: "Cuidados Pessoais",
    image: "/waitlist/images/products/barber-clipper.jpg",
    costPrice: "3.500 Kz",
    sellPrice: "12.000 Kz",
    profit: "+8.500 Kz",
    marginPercent: "71%",
    tag: "Giro Rápido",
  },
  {
    id: "lavalier-mic",
    name: "Microfone Lapela Duplo Sem Fios",
    category: "Criação de Conteúdo",
    image: "/waitlist/images/products/wireless-mic.jpg",
    costPrice: "3.800 Kz",
    sellPrice: "14.500 Kz",
    profit: "+10.700 Kz",
    marginPercent: "74%",
    tag: "Top Criadores",
  },
];

export default function ProductCatalog() {
  return (
    <section id="catalogo" className="relative overflow-hidden bg-brand-black py-20 sm:py-28">
      {/* Luz ambiente de fundo */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[130px]"
        style={{
          background: "radial-gradient(circle, #FF5A00 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        {/* Cabeçalho da Secção */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
            Catálogo em Destaque
          </p>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-white sm:text-4xl md:text-5xl">
            Produtos de alta procura.{" "}
            <span className="text-gradient-orange">Margens reais</span> para o teu bolso.
          </h2>

          <p className="mt-4 text-base leading-relaxed text-brand-white/70 sm:text-lg">
            Importa estes produtos diretamente para a tua loja com preço de fábrica chinês. O teu cliente em Luanda recebe no dia seguinte e tu ficas com a margem.
          </p>
        </div>

        {/* Carrossel 3D Inverted Perspective */}
        <div className="mt-12">
          <SkiperProductCarousel products={PRODUCTS} />
        </div>

        {/* Rodapé da secção / Micro CTA */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <p className="text-sm text-brand-white/60">
            Mais de <strong className="text-brand-white font-bold">500 produtos físicos</strong> validados para o mercado angolano no dia de abertura.
          </p>
          <a
            href="#formulario"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange transition-colors hover:text-brand-orange/80 hover:underline"
          >
            Garante acesso antecipado
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
