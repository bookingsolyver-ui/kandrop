import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LegalDoc } from "./legal";

/** A clean, readable text page (headings, spaced paragraphs, lists). The text lives in `legal.ts`. */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const nav = await getTranslations("Marketing.nav");
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <article>
        <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.1] font-normal tracking-[-0.02em] text-balance">{doc.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-2">{doc.intro}</p>
        <div className="mt-10 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="border-b border-line pb-2 text-xl font-bold tracking-tight">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-2">
                {section.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
                {section.list && (
                  <ul className="list-disc space-y-2 pl-5 marker:text-accent">
                    {section.list.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </article>
      <Link href="/" className="mt-14 inline-flex text-sm font-semibold text-ink underline underline-offset-4">{nav("home")}</Link>
    </main>
  );
}
