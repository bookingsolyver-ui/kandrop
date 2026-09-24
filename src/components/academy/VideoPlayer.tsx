"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import { ExpandGlyph, PlayGlyph, ShrinkGlyph, TheatreGlyph } from "./icons";

const subscribeFullscreen = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const never = () => () => undefined;

const control =
  "grid size-11 place-items-center rounded-md border border-field bg-page text-ink-2 hover:text-ink";

/**
 * A premium PLACEHOLDER for the video (there are no recordings yet, and it says so). It is a real
 * 16:9 player frame that can be expanded to the full width of the page ("theatre") or taken to
 * full screen; the play button explains that the video is not recorded instead of pretending.
 * When videos exist, the `<video>` goes inside this frame and the controls stay as they are.
 */
export function VideoPlayer({
  title,
  number,
  total,
  moduleNumber,
  theater,
  onToggleTheater,
}: {
  title: string;
  number: number;
  total: number;
  moduleNumber: number;
  theater: boolean;
  onToggleTheater: () => void;
}) {
  const t = useTranslations("Academy.player");
  const frame = useRef<HTMLDivElement>(null);
  const [tried, setTried] = useState(false);
  // Read from the browser, not mirrored into state; on the server there is no full screen.
  const fullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false
  );
  const canFullscreen = useSyncExternalStore(
    never,
    () => document.fullscreenEnabled,
    () => false
  );

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <div>
      <div
        ref={frame}
        role="group"
        aria-label={t("label", { title })}
        className={`relative overflow-hidden border border-line bg-page ${
          fullscreen ? "grid h-screen place-items-center rounded-none" : "aspect-video rounded-lg"
        }`}
      >
        {/* The numeral is decoration: flat, quiet, no gradient. */}
        <p
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center font-serif text-[clamp(6rem,22vw,14rem)] leading-none text-line tabular-nums select-none"
        >
          {String(number).padStart(2, "0")}
        </p>

        <p className="absolute top-4 left-4 rounded-full border border-field bg-page px-3 py-1 text-[12px] font-medium text-ink-2">
          {t("soon")}
        </p>

        <button
          type="button"
          onClick={() => setTried(true)}
          aria-label={t("play")}
          aria-describedby={tried ? "video-note" : undefined}
          className="absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-page/80 text-accent transition-colors hover:bg-accent/10 sm:size-24"
        >
          <span className="translate-x-0.5">
            <PlayGlyph size={30} />
          </span>
        </button>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              {t("module", { n: moduleNumber })} · {number}/{total}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">{title}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!fullscreen && (
              <button
                type="button"
                onClick={onToggleTheater}
                aria-pressed={theater}
                aria-label={t(theater ? "collapse" : "expand")}
                title={t(theater ? "collapse" : "expand")}
                className={`${control} hidden lg:grid`}
              >
                <TheatreGlyph />
              </button>
            )}
            {canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={t(fullscreen ? "exitFullscreen" : "fullscreen")}
                title={t(fullscreen ? "exitFullscreen" : "fullscreen")}
                className={control}
              >
                {fullscreen ? <ShrinkGlyph /> : <ExpandGlyph />}
              </button>
            )}
          </div>
        </div>
      </div>

      <p id="video-note" role="status" className="mt-3 text-[13px] leading-relaxed text-ink-2">
        {tried ? t("unavailable") : ""}
      </p>
    </div>
  );
}
