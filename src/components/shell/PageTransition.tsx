import { ViewTransition, type ReactNode } from "react";

/**
 * Wrap a page's content: on navigation it fades in (160 ms, see `globals.css`). It belongs in
 * each `page.tsx`, not in the layout — layouts persist across navigations, so enter/exit would
 * never fire there. `default="none"` keeps it from animating on unrelated updates.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" default="none">
      {children}
    </ViewTransition>
  );
}
