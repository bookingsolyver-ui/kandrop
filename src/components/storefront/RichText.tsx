import { CheckCircleIcon } from "./icons";

/**
 * A product description as readable blocks: paragraphs, and lines that start with a bullet or a tick as a benefit list
 * (green check icons instead of plain bullets). Everything is rendered as text nodes (never as HTML), so a description
 * cannot inject markup.
 */
const BULLET = /^\s*(?:[\u2714\u2713\u2705\u2022\u00b7*-])\s+/u;

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0)).filter((b) => b.length > 0);
  return (
    <div className="space-y-6 text-base leading-relaxed text-ink-2">
      {blocks.map((lines, i) => {
        const bullets = lines.filter((l) => BULLET.test(l));
        if (bullets.length === lines.length) {
          return (
            <ul key={i} className="space-y-3">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <CheckCircleIcon width={22} height={22} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{l.replace(BULLET, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="whitespace-pre-line">{lines.join("\n")}</p>;
      })}
    </div>
  );
}
