import Image from "next/image";
import { Link } from "@/i18n/navigation";

/** The full logo (mark + name); the collapsed rail keeps just the mark. */
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
      className="inline-flex min-h-11 items-center rounded"
    >
      {compact ? (
        <Image src="/brand/k-mark.png" alt="" width={32} height={32} className="size-8" />
      ) : (
        <Image
          src="/logo-kandrop-full.png"
          alt=""
          width={1024}
          height={206}
          priority
          className="h-7 w-auto object-contain"
        />
      )}
    </Link>
  );
}
