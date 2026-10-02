"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { A11y, Autoplay, EffectCoverflow, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

export interface FeaturedProduct {
  key: "watch" | "earbuds" | "projector" | "powerbank" | "clipper" | "mic";
  image: string;
  /** Supplier cost and selling price in Luanda, whole Kwanzas. */
  cost: number;
  price: number;
}

const kz = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} Kz`;

/** The photo, or (until the file is added to public/images/products/) the dark card background with the title on it. */
function Photo({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a plain <img>: the file may not exist yet and must fail quietly
  return <img alt={alt} loading="lazy" decoding="async" src={src} onError={() => setBroken(true)} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

const Chevron = ({ d }: { d: string }) => (
  <svg aria-hidden xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={d} /></svg>
);

/** The 3D coverflow of featured products (Swiper), with the reference's card design, arrows and orange pagination. */
export function FeaturedCarousel({ products }: { products: FeaturedProduct[] }) {
  const t = useTranslations("Marketing.home.catalog");
  return (
    <div className="relative mx-auto w-full max-w-6xl px-4">
      <style>{`
  .kandrop-product-carousel { width: 100%; padding-top: 20px; padding-bottom: 60px !important; }
  .kandrop-product-carousel .swiper-slide { background-position: center; background-size: cover; width: 285px; }
  @media (min-width: 640px) { .kandrop-product-carousel .swiper-slide { width: 320px; } }
  .kandrop-product-carousel .swiper-pagination-bullet { background-color: rgba(255, 255, 255, 0.25) !important; opacity: 1; transition: all 0.3s ease; }
  .kandrop-product-carousel .swiper-pagination-bullet-active { background-color: #FF5A00 !important; width: 24px !important; border-radius: 9999px !important; }
`}</style>
      <div className="relative">
        <Swiper
          className="kandrop-product-carousel"
          modules={[EffectCoverflow, Pagination, Navigation, Autoplay, A11y]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          loop
          coverflowEffect={{ rotate: 0, stretch: 0, depth: 140, modifier: 1.4, slideShadows: false }}
          pagination={{ clickable: true }}
          navigation={{ prevEl: ".kandrop-swiper-prev", nextEl: ".kandrop-swiper-next" }}
          autoplay={{ delay: 3800, disableOnInteraction: true, pauseOnMouseEnter: true }}
          a11y={{ enabled: true }}
        >
          {products.map((p) => {
            const profit = p.price - p.cost;
            const pct = Math.round((profit / p.price) * 100);
            const name = t(`items.${p.key}.name`);
            return (
              <SwiperSlide key={p.key}>
                <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300">
                  <div className="relative h-48 w-full overflow-hidden rounded-xl bg-black/40 sm:h-52">
                    <Photo src={`/images/products/${p.image}`} alt={name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-brand-orange backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                      {t(`items.${p.key}.category`)}
                    </div>
                    <div className="absolute top-3 right-3 rounded-full border border-white/10 bg-black/70 px-2.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md">{t(`items.${p.key}.badge`)}</div>
                    <div className="absolute right-3 bottom-2.5 left-3">
                      <h4 className="text-base font-bold text-white drop-shadow-md">{name}</h4>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between text-xs"><span className="text-white/50">{t("cost")}</span><span className="font-semibold text-white/80">{kz(p.cost)}</span></div>
                    <div className="flex items-center justify-between text-xs"><span className="text-white/50">{t("sale")}</span><span className="font-semibold text-white">{kz(p.price)}</span></div>
                    <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-brand-orange"><span>{t("profit")}</span></div>
                      <div className="text-right"><span className="text-sm font-black text-brand-orange">+{kz(profit)}</span><span className="ml-1 text-[11px] font-semibold text-emerald-400">({pct}%)</span></div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
      <button type="button" aria-label={t("prev")} className="kandrop-swiper-prev absolute top-1/2 -left-2 z-20 flex h-10 w-10 -translate-y-8 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-black focus:outline-none sm:-left-5"><Chevron d="m15 18-6-6 6-6" /></button>
      <button type="button" aria-label={t("next")} className="kandrop-swiper-next absolute top-1/2 -right-2 z-20 flex h-10 w-10 -translate-y-8 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-black focus:outline-none sm:-right-5"><Chevron d="m9 18 6-6-6-6" /></button>
    </div>
  );
}
