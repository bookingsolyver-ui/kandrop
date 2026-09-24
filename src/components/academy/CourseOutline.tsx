"use client";

import { useTranslations } from "next-intl";
import type { AcademyOverview, PublicLesson } from "@/server/modules/academy/schema";
import { CheckGlyph, ChevronGlyph, LockGlyph, PlayGlyph } from "./icons";

/** Check (done), play (next), lock (waiting): the shape says it, the sr-only word repeats it. */
function StateIcon({ state }: { state: PublicLesson["state"] }) {
  if (state === "completed") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-up bg-up/15 text-up">
        <CheckGlyph size={15} />
      </span>
    );
  }
  if (state === "available") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-on-action">
        <span className="translate-x-px">
          <PlayGlyph size={13} />
        </span>
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-field text-ink-muted">
      <LockGlyph size={14} />
    </span>
  );
}

/**
 * The course as an accordion: modules that open and close, each with its lessons. The module
 * with the selected lesson opens by itself; a locked lesson cannot be opened (and the server
 * refuses it too).
 */
export function CourseOutline({
  data,
  selectedId,
  isOpen,
  onToggle,
  onSelect,
}: {
  data: AcademyOverview;
  selectedId: string;
  isOpen: (moduleId: string) => boolean;
  onToggle: (moduleId: string) => void;
  onSelect: (lessonId: string) => void;
}) {
  const t = useTranslations("Academy");
  /** Lessons before each module, so every lesson shows its number in the whole course. */
  const before = data.modules.map((_, i) =>
    data.modules.slice(0, i).reduce((sum, m) => sum + m.lessons.length, 0)
  );

  return (
    <section aria-labelledby="outline-title" className="rounded-lg border border-line bg-surface">
      <h2
        id="outline-title"
        className="border-b border-line px-5 py-4 font-serif text-[1.25rem] leading-tight font-medium tracking-tight"
      >
        {t("outline.title")}
      </h2>

      <div className="divide-y divide-line">
        {data.modules.map((module, index) => {
          const done = module.lessons.filter((l) => l.state === "completed").length;
          const open = isOpen(module.id);
          const panel = `panel-${module.id}`;
          const title = t(`modules.${module.id}`);
          return (
            <div key={module.id}>
              <h3>
                <button
                  type="button"
                  onClick={() => onToggle(module.id)}
                  aria-expanded={open}
                  aria-controls={panel}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-page"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
                      {t("outline.module", { n: index + 1 })}
                    </span>
                    <span className="mt-0.5 block text-[15px] leading-snug font-medium">
                      {title}
                    </span>
                    <span
                      aria-hidden
                      className="mt-2.5 block h-1 overflow-hidden rounded-full bg-line"
                    >
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${(done / module.lessons.length) * 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 pt-1 text-[13px] text-ink-2 tabular-nums">
                    {t("outline.count", { done, total: module.lessons.length })}
                    <span
                      className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                    >
                      <ChevronGlyph />
                    </span>
                  </span>
                </button>
              </h3>

              <ul id={panel} hidden={!open} className="pb-2">
                {module.lessons.map((lesson, at) => {
                  const position = before[index]! + at + 1;
                  const selected = lesson.id === selectedId;
                  const locked = lesson.state === "locked";
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onSelect(lesson.id)}
                        aria-current={selected ? "true" : undefined}
                        className={`flex w-full items-center gap-3 border-l-2 px-5 py-3 text-left transition-colors motion-reduce:transition-none ${
                          selected ? "border-accent bg-accent/10" : "border-transparent"
                        } ${locked ? "cursor-not-allowed" : "hover:bg-page"}`}
                      >
                        <StateIcon state={lesson.state} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm leading-snug ${
                              locked ? "text-ink-muted" : selected ? "font-semibold" : "font-medium"
                            }`}
                          >
                            <span className="text-ink-muted tabular-nums">{position}. </span>
                            {t(`lessons.${lesson.id}.title`)}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-ink-muted tabular-nums">
                            {t("outline.minutes", { minutes: lesson.minutes })}
                            <span className="sr-only"> · {t(`outline.${lesson.state}`)}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
