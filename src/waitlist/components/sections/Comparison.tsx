import Image from "next/image";
import { copy } from "@/waitlist/lib/copy";
import { Tag, Clock, Boxes, Cpu, Check, X } from "lucide-react";

const ROW_ICONS = [Tag, Clock, Boxes, Cpu];

/**
 * FR-06 — Comparação entre Modelo Tradicional e Kandrop.
 * Design limpo, profissional e de alta conversão:
 * - Em desktop: Tabela unificada de 3 colunas com destaque para a Kandrop.
 * - Em mobile: Tabela unificada de 2 colunas com divisor vertical contínuo,
 *   cabeçalhos no topo sem repetições artificiais e sem ícones clichê de IA.
 */
export default function Comparison() {
  const c = copy.comparison;

  return (
    <section id="comparacao" className="bg-brand-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-6">
        {/* Cabeçalho da secção */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black/50">
            Comparativo Direto
          </p>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
            {c.title}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-brand-black/60 sm:text-base">
            Compara a operação tradicional com a infraestrutura pronta da Kandrop.
          </p>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP: Tabela unificada de 3 colunas (≥ 768px)          */}
        {/* ======================================================== */}
        <div className="mt-12 hidden overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10">
                <th
                  scope="col"
                  className="w-[28%] bg-brand-gray/50 px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-brand-black/50"
                >
                  Fator
                </th>
                <th
                  scope="col"
                  className="w-[36%] border-l border-black/10 bg-brand-gray/50 px-6 py-4.5 text-xs font-bold uppercase tracking-wider text-brand-black/60"
                >
                  {c.columns[1]}
                </th>
                <th
                  scope="col"
                  className="w-[36%] border-l border-brand-orange/20 bg-brand-orange/10 px-6 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative h-6 w-28 sm:h-7 sm:w-32">
                      <Image
                        src="/waitlist/logo-kandrop-full.webp"
                        alt="Kandrop"
                        fill
                        className="object-contain object-left"
                        priority
                      />
                    </div>
                    <span className="rounded-full bg-brand-orange px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-black">
                      Vantagem
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/8">
              {c.rows.map((row, idx) => {
                const Icon = ROW_ICONS[idx] ?? Tag;
                return (
                  <tr key={row[0]} className="transition-colors hover:bg-black/[0.01]">
                    <th scope="row" className="bg-brand-gray/20 px-6 py-5 font-semibold text-brand-black">
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-brand-orange" />
                        {row[0]}
                      </span>
                    </th>
                    <td className="border-l border-black/8 px-6 py-5 text-neutral-600">
                      <span className="flex items-center gap-2.5">
                        <X className="h-4 w-4 shrink-0 text-neutral-400 stroke-[2]" />
                        {row[1]}
                      </span>
                    </td>
                    <td className="border-l border-brand-orange/15 bg-brand-orange/[0.03] px-6 py-5">
                      <span className="flex items-center gap-2.5 font-bold text-brand-black">
                        <Check className="h-4 w-4 shrink-0 stroke-[2.5] text-brand-orange" />
                        {row[2]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ======================================================== */}
        {/* MOBILE: Tabela unificada com divisor vertical (< 768px)  */}
        {/* ======================================================== */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm md:hidden">
          {/* Cabeçalho fixo das duas colunas */}
          <div className="grid grid-cols-2 border-b border-black/10 text-center">
            <div className="border-r border-black/10 bg-brand-gray/60 px-3 py-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {c.columns[1]}
              </span>
            </div>
            <div className="flex items-center justify-center bg-brand-orange/10 px-3 py-3">
              <div className="relative h-5 w-24">
                <Image
                  src="/waitlist/logo-kandrop-full.webp"
                  alt="Kandrop"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Linhas comparativas com divisor vertical contínuo */}
          <div className="divide-y divide-black/8">
            {c.rows.map((row, idx) => {
              const Icon = ROW_ICONS[idx] ?? Tag;
              return (
                <div key={row[0]}>
                  {/* Nome do fator como cabeçalho de secção limpo */}
                  <div className="border-b border-black/6 bg-brand-gray/30 px-4 py-2">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-black/70">
                      <Icon className="h-3.5 w-3.5 text-brand-orange" />
                      {row[0]}
                    </span>
                  </div>

                  {/* Comparação 50 / 50 lado a lado */}
                  <div className="grid grid-cols-2 divide-x divide-black/10">
                    {/* Modelo Tradicional */}
                    <div className="flex items-start gap-2 bg-white p-3.5">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[2] text-neutral-400" />
                      <span className="text-xs font-medium leading-snug text-neutral-600 sm:text-sm">
                        {row[1]}
                      </span>
                    </div>

                    {/* Kandrop (destaque positivo) */}
                    <div className="flex items-start gap-2 bg-brand-orange/[0.04] p-3.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[2.5] text-brand-orange" />
                      <span className="text-xs font-bold leading-snug text-brand-black sm:text-sm">
                        {row[2]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
