"use client";

import { useState } from "react";
import { copy } from "@/waitlist/lib/copy";
import { IconChevronDown } from "./icons";

/**
 * FR-08 — FAQ. Acordeão acessível: <button> com aria-expanded,
 * painel com role="region" e aria-labelledby, navegável por teclado.
 */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-brand-gray">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          {copy.faq.title}
        </h2>

        <div className="mt-10 flex flex-col gap-3">
          {copy.faq.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="rounded-2xl bg-brand-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-button-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-base font-semibold text-brand-black">{item.q}</span>
                  <IconChevronDown
                    className={`h-5 w-5 shrink-0 text-brand-orange transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    className="px-5 pb-5"
                  >
                    <p className="text-sm leading-6 text-brand-black/60">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
