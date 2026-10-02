import { copy } from "@/waitlist/lib/copy";

/** FR-03 — O problema (fundo preto). */
export default function Problem() {
  return (
    <section id="problema" className="bg-brand-black">
      <div className="mx-auto w-full max-w-3xl px-6 pb-20 pt-6 sm:pb-28 sm:pt-8">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-white sm:text-4xl">
          {copy.problem.title}
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-7 text-brand-white/70 sm:text-lg">
          {copy.problem.body}
        </p>
      </div>
    </section>
  );
}
