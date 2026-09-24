/**
 * The Kandrop mark: the serif wordmark used across the product, with its descriptor. There is no
 * separate logo file; if one is designed, this is the only place to swap it in.
 */
export function KandropLogo({ descriptor }: { descriptor?: string }) {
  return (
    <div>
      <p className="font-serif text-[1.75rem] leading-none font-semibold tracking-tight text-ink">
        Kandrop
      </p>
      {descriptor && (
        <p className="mt-1.5 text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
          {descriptor}
        </p>
      )}
    </div>
  );
}
