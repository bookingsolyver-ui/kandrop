import type { ReactNode } from "react";

export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-action px-5 text-sm font-semibold text-on-action hover:opacity-90";

/** Placeholder rows while the first page loads (later loads keep the old rows, dimmed). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-4">
          <div className="h-3 w-16 rounded bg-line" />
          <div className="h-3 w-40 rounded bg-line" />
          <div className="ml-auto h-3 w-20 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

/** Empty / no-results / error: what happened, and the one thing to do about it. */
export function ListMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm py-14 text-center">
      <h2 className="font-serif text-[1.375rem] leading-tight font-medium">{title}</h2>
      <p className="mt-2 text-ink-2">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
