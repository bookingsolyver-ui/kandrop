/**
 * A product description as readable blocks: paragraphs, and lines that start with a bullet (✔ ✓ • - *) as a list.
 * Everything is rendered as text nodes (never as HTML), so a description cannot inject markup.
 */
const BULLET = /^\s*(?:[✔✓✅•·*-])\s+/u;

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0)).filter((b) => b.length > 0);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-ink-2">
      {blocks.map((lines, i) => {
        const bullets = lines.filter((l) => BULLET.test(l));
        if (bullets.length === lines.length) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-action" />
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
