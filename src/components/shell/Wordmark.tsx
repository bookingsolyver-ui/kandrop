import Image from "next/image";
import { Link } from "@/i18n/navigation";

/** The K mark and the name; the collapsed rail keeps just the mark. */
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
      className="inline-flex min-h-11 items-center gap-2.5 rounded font-serif text-2xl font-semibold tracking-tight text-ink"
    >
      <Image
        src="/brand/k-app.png"
        alt=""
        width={32}
        height={32}
        priority
        className="size-8 shrink-0 rounded-lg"
      />
      {!compact && "Kandrop"}
    </Link>
  );
}
