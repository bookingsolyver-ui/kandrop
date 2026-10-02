import { copy } from "@/waitlist/lib/copy";
import TimelineBlock01 from "@/waitlist/components/ui/timeline-01";

const stepImages = [
  { src: "/waitlist/images/steps/step1-conta.jpg" },
  { src: "/waitlist/images/steps/step2-produtos.jpg" },
  { src: "/waitlist/images/steps/step3-entrega.jpg" },
];

/**
 * FR-05 — Como funciona (3 passos, número em círculo laranja).
 * Os 3 passos são apresentados como uma linha do tempo com scroll:
 * espinha que se desenha, nós que acendem e palco de fotos fixo.
 */
export default function Steps() {
  const s = copy.steps;

  return (
    <TimelineBlock01
      id="como-funciona"
      className="bg-brand-gray"
      badge={s.eyebrow}
      title={s.title}
      description={s.subtitle}
      items={s.items.map((step, i) => ({
        title: step.title,
        description: step.text,
        date: s.outcomes[i],
        image: stepImages[i]?.src,
        imageAlt: s.imageAlts[i],
      }))}
      end={{
        title: "Sem stock, sem importação, sem processo manual.",
        label: copy.nav.cta,
        href: "#formulario",
      }}
    />
  );
}
