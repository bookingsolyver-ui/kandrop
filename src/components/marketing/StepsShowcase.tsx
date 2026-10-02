"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";

export interface ShowcaseStep {
  tag: string;
  title: string;
  body: string;
  alt: string;
  image: string;
}

/** How much of the line is lit when step `i` is the current one (the line runs over the three steps and the final check). */
const LINE = ["scale-y-[0.18]", "scale-y-[0.55]", "scale-y-[0.9]"] as const;

/**
 * "Como funciona": the three steps as a timeline. From `lg` the photo of the CURRENT step is pinned on the left (the
 * three photos cross-fade as the reader scrolls); below `lg` each step carries its own photo. Plain Tailwind transitions,
 * no animation library; the observer only decides which step is current.
 */
export function StepsShowcase({ steps }: { steps: ShowcaseStep[] }) {
  const [active, setActive] = useState(0);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(items.current.indexOf(entry.target as HTMLLIElement));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    for (const el of items.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const current = steps[active] ?? steps[0];

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
      <div className="hidden lg:col-span-5 lg:block">
        <div className="lg:sticky lg:top-24">
          <div className="relative aspect-[4/5] max-h-[70vh] w-full overflow-clip rounded-3xl bg-brand-black/5 shadow-[0_35px_90px_-50px_rgba(255,90,0,0.75)] ring-1 ring-black/10">
            {steps.map((s, i) => (
              <Image
                key={s.image}
                src={s.image}
                alt={s.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                aria-hidden={i !== active}
                className={`object-cover transition-all duration-700 ease-out motion-reduce:transition-none ${i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
              />
            ))}
            <div aria-hidden className="absolute inset-x-4 top-4 z-10 flex gap-1.5">
              {steps.map((s, i) => (
                <span key={s.image} className={`h-1 flex-1 rounded-full transition-colors duration-500 motion-reduce:transition-none ${i <= active ? "bg-brand-orange" : "bg-white/35"}`} />
              ))}
            </div>
            {current && (
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pt-20 pb-5">
                <p className="text-[11px] font-bold tracking-[0.18em] text-brand-orange-light uppercase">{current.tag}</p>
                <p className="mt-1 text-lg font-bold text-brand-white">{current.title}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative lg:col-span-7">
        <span aria-hidden className="absolute top-5 bottom-5 left-[19px] w-0.5 rounded-full bg-black/10" />
        <span aria-hidden className={`absolute top-5 bottom-5 left-[19px] w-0.5 origin-top rounded-full bg-gradient-to-b from-brand-orange via-brand-orange to-brand-orange-light shadow-[0_0_14px_rgba(255,90,0,0.55)] transition-transform duration-700 ease-out motion-reduce:transition-none ${LINE[active] ?? LINE[0]}`} />
        <ol className="space-y-10 lg:space-y-0">
          {steps.map((s, i) => (
            <li key={s.image} ref={(el) => { items.current[i] = el; }} className="lg:min-h-[34vh]">
              <div className="flex items-start gap-5">
                <span className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition-all duration-500 motion-reduce:transition-none ${i <= active ? "bg-brand-orange text-brand-black shadow-[0_0_0_6px_rgba(255,90,0,0.15)]" : "bg-brand-white text-brand-black/35 ring-1 ring-black/10"}`}>{`0${i + 1}`}</span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h3 className="text-xl font-bold tracking-tight text-brand-black sm:text-2xl">{s.title}</h3>
                    <span className="shrink-0 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand-orange">{s.tag}</span>
                  </div>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-brand-black/65 sm:text-base">{s.body}</p>
                  <div className="relative mt-5 aspect-[16/10] w-full overflow-clip rounded-2xl ring-1 ring-black/10 lg:hidden">
                    <Image src={s.image} alt={s.alt} fill sizes="(min-width: 640px) 80vw, 100vw" className="object-cover" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="relative mt-6 h-10">
          <span className={`absolute top-0 left-0 z-10 flex size-10 items-center justify-center rounded-full transition-all duration-500 motion-reduce:transition-none ${active === steps.length - 1 ? "bg-brand-orange text-brand-black shadow-[0_0_0_6px_rgba(255,90,0,0.15)]" : "bg-brand-white text-brand-black/35 ring-1 ring-black/10"}`}>
            <CheckIcon size={20} />
          </span>
        </div>
      </div>
    </div>
  );
}
