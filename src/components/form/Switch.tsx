"use client";

/**
 * On/off switch (`role="switch"`): Space or Enter toggles it, the state is announced, and the
 * hit area is 44 px even though the track is smaller. The state is not carried by colour alone:
 * the knob sits on the right when on.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  busy = false,
  describedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name, e.g. "Turn on Abandoned cart recovery". */
  label: string;
  disabled?: boolean;
  /** A change is being saved: shown, and further clicks are ignored. */
  busy?: boolean;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => !busy && onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center rounded-full disabled:cursor-not-allowed"
    >
      <span
        aria-hidden
        className={`relative h-7 w-12 rounded-full border transition-colors motion-reduce:transition-none ${
          checked ? "border-accent bg-accent" : "border-field bg-page"
        } ${disabled ? "opacity-40" : ""} ${busy ? "opacity-70" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-[1.375rem] rounded-full transition-transform motion-reduce:transition-none ${
            checked ? "translate-x-5 bg-on-action" : "translate-x-0 bg-ink-muted"
          }`}
        />
      </span>
    </button>
  );
}
