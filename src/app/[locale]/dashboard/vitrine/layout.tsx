import type { ReactNode } from "react";

/** Shared frame of the two showcase pages: a wide, centred column (the grid needs the room). */
export default function VitrineLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1440px]">{children}</div>;
}
