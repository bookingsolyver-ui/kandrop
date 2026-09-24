import type { ReactNode } from "react";

/** Title block + hairline card + the "other" auth link. Server component: pure layout. */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="mb-8">
        <h1 className="font-serif text-[2.25rem] leading-[1.1] font-normal tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-3 text-ink-2">{subtitle}</p>
      </header>

      <section className="rounded-lg border border-line bg-surface p-6 sm:p-8">{children}</section>

      <p className="mt-6 text-center text-sm text-ink-2">{footer}</p>
    </>
  );
}
