import { copy } from "@/waitlist/lib/copy";
import { IconCheck } from "./icons";

/** FR-07 — Para quem é. */
export default function Audience() {
  return (
    <section id="para-quem" className="bg-brand-gray">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          {copy.audience.title}
        </h2>

        <ul className="mt-10 flex flex-col gap-4">
          {copy.audience.items.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-2xl bg-brand-white p-5">
              <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <span className="text-base leading-7 text-brand-black">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
