import { copy } from "@/waitlist/lib/copy";
import {
  IconBank,
  IconBox,
  IconCard,
  IconGear,
  IconTag,
  IconTruck,
} from "./icons";

const iconMap = {
  tag: IconTag,
  truck: IconTruck,
  box: IconBox,
  gear: IconGear,
  card: IconCard,
  bank: IconBank,
} as const;

/** FR-04 — Solução: 5 benefícios (cartões brancos, ícone laranja). */
export default function Benefits() {
  return (
    <section id="solucao" className="bg-brand-gray">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          {copy.benefits.title}
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {copy.benefits.items.map((b) => {
            const Icon = iconMap[b.icon as keyof typeof iconMap];
            return (
              <article key={b.title} className="rounded-2xl bg-brand-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-brand-black">{b.title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-black/60">{b.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
