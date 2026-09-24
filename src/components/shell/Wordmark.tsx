import { Link } from "@/i18n/navigation";

/** Serif wordmark; the collapsed rail keeps just the initial. */
export function Wordmark({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      aria-label="Kandrop"
      className="inline-flex min-h-11 items-center rounded font-serif text-2xl font-semibold tracking-tight text-ink"
    >
      {compact ? "K" : "Kandrop"}
    </Link>
  );
}
