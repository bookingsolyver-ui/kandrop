import { Badge } from "@/waitlist/components/ui/badge";
import {
  Timeline,
  type TimelineEnd,
  type TimelineItem,
} from "@/waitlist/components/ui/timeline-01-utils/timeline";
import { cn } from "@/waitlist/lib/utils";

type TimelineBlock01Props = {
  id?: string;
  badge: string;
  title: string;
  description: string;
  items: TimelineItem[];
  end?: TimelineEnd;
  className?: string;
};

/**
 * Bloco editorial "Timeline 01": cabeçalho com badge + linha do tempo
 * com scroll, tudo dentro de um painel branco sobre o fundo cinzento.
 */
function TimelineBlock01({
  id,
  badge,
  title,
  description,
  items,
  end,
  className,
}: TimelineBlock01Props) {
  return (
    <section id={id} className={cn("relative", className)}>
      {/* Halo laranja ambiente (irmão do conteúdo — nunca ancestral do sticky) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-clip"
      >
        <div className="absolute -top-32 right-[-8%] h-80 w-80 rounded-full bg-brand-orange/25 blur-[110px]" />
        <div className="absolute bottom-0 left-[-10%] h-72 w-72 rounded-full bg-brand-orange/15 blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="rounded-[28px] border border-black/8 bg-brand-white p-5 shadow-[0_45px_100px_-75px_rgba(0,0,0,0.9)] sm:p-8 lg:p-12">
          {/* Cabeçalho */}
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="rounded-full border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-xs font-normal text-brand-orange"
            >
              {badge}
            </Badge>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-black/60 sm:text-base">
              {description}
            </p>
          </div>

          <div className="mt-10 lg:mt-14">
            <Timeline items={items} end={end} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default TimelineBlock01;
