import type { ReactNode } from "react";

/** The one container style for every dashboard section: hairline border, no shadow, no gradient. */
export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 sm:p-7">
      <header className="mb-6">
        <h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}
