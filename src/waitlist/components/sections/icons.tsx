/**
 * Ícones inline em SVG — sem biblioteca (NFR-02).
 * Usam currentColor; a cor vem do Tailwind (laranja da marca).
 */

type IconProps = { className?: string };

function Base({
  className = "",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconTag({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59c0 .53.21 1.04.59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
      <circle cx="7.5" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconTruck({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M1 5h13v10H1z" />
      <path d="M14 9h4l3 3v3h-7z" />
      <circle cx="5.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </Base>
  );
}

export function IconBox({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Base>
  );
}

export function IconGear({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </Base>
  );
}

export function IconCard({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </Base>
  );
}

export function IconArrowRight({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </Base>
  );
}

export function IconUser({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </Base>
  );
}

export function IconPhone({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9Z" />
    </Base>
  );
}

export function IconChevronDown({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function IconMail({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <rect x="2" y="4.5" width="20" height="15" rx="2" />
      <path d="m2.5 6.5 9.5 7 9.5-7" />
    </Base>
  );
}

export function IconCheck({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="m4 12.5 5 5L20 6.5" />
    </Base>
  );
}

export function IconSpark({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19" />
    </Base>
  );
}

export function IconBank({ className = "" }: IconProps) {
  return (
    <Base className={className}>
      <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" />
    </Base>
  );
}

export function IconInstagram({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

