"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, TrendingUp } from "lucide-react";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";

import { cn } from "@/waitlist/lib/utils";

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  image: string;
  costPrice: string;
  sellPrice: string;
  profit: string;
  marginPercent: string;
  tag?: string;
}

interface ProductCarouselProps {
  products: ProductItem[];
  className?: string;
}

export function SkiperProductCarousel({
  products,
  className,
}: ProductCarouselProps) {
  const css = `
  .kandrop-product-carousel {
    width: 100%;
    padding-top: 20px;
    padding-bottom: 60px !important;
  }
  
  .kandrop-product-carousel .swiper-slide {
    background-position: center;
    background-size: cover;
    width: 285px;
  }

  @media (min-width: 640px) {
    .kandrop-product-carousel .swiper-slide {
      width: 320px;
    }
  }

  .kandrop-product-carousel .swiper-pagination-bullet {
    background-color: rgba(255, 255, 255, 0.25) !important;
    opacity: 1;
    transition: all 0.3s ease;
  }

  .kandrop-product-carousel .swiper-pagination-bullet-active {
    background-color: #FF5A00 !important;
    width: 24px !important;
    border-radius: 9999px !important;
  }
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={cn("relative w-full max-w-6xl mx-auto px-4", className)}
    >
      <style>{css}</style>

      <div className="relative">
        <Swiper
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView="auto"
          loop={true}
          autoplay={{
            delay: 2600,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          coverflowEffect={{
            rotate: 25,
            stretch: 0,
            depth: 120,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={{
            clickable: true,
          }}
          navigation={{
            nextEl: ".kandrop-swiper-next",
            prevEl: ".kandrop-swiper-prev",
          }}
          modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
          className="kandrop-product-carousel"
        >
          {products.map((p) => (
            <SwiperSlide key={p.id}>
              <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
                {/* Imagem do Produto */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden rounded-xl bg-black/40">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 280px, 320px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Badges superiores */}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-brand-orange backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />
                    {p.category}
                  </div>

                  {p.tag && (
                    <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md">
                      {p.tag}
                    </div>
                  )}

                  {/* Nome do produto na base da imagem */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h4 className="text-base font-bold text-white drop-shadow-md">
                      {p.name}
                    </h4>
                  </div>
                </div>

                {/* Bloco de Preços e Margem */}
                <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Custo fornecedor:</span>
                    <span className="font-semibold text-white/80">{p.costPrice}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Venda em Luanda:</span>
                    <span className="font-semibold text-white">{p.sellPrice}</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1 text-xs font-bold text-brand-orange">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Teu lucro:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-brand-orange">
                        {p.profit}
                      </span>
                      <span className="ml-1 text-[11px] font-semibold text-emerald-400">
                        ({p.marginPercent})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Botões de navegação estilizados */}
        <button
          type="button"
          aria-label="Produto anterior"
          className="kandrop-swiper-prev absolute -left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-8 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-black focus:outline-none sm:-left-5"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="Próximo produto"
          className="kandrop-swiper-next absolute -right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-8 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-black focus:outline-none sm:-right-5"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

export default SkiperProductCarousel;
