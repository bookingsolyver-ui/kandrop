"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ListMessage, primaryButton } from "@/components/data/ListStates";
import { useRouter } from "@/i18n/navigation";
import type { AcademyOverview, PublicLesson } from "@/server/modules/academy/schema";
import { completeLesson, getAcademy, type ApiResult } from "./academyApi";
import { CourseOutline } from "./CourseOutline";
import { CheckGlyph } from "./icons";
import { ProgressPanel } from "./ProgressPanel";
import { VideoPlayer } from "./VideoPlayer";

export function AcademyView() {
  const t = useTranslations("Academy");
  const errors = useTranslations("Errors");
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);

  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<ApiResult<AcademyOverview> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [theater, setTheater] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAcademy(controller.signal)
      .then(setResult)
      .catch(() => {
        /* aborted: a newer request replaced it */
      });
    return () => controller.abort();
  }, [reload]);

  const unauthenticated = result && !result.ok && result.code === "unauthenticated";
  useEffect(() => {
    if (unauthenticated) router.replace("/login");
  }, [unauthenticated, router]);

  if (!result) {
    return (
      <div aria-hidden className="space-y-6">
        <div className="h-36 animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none" />
        <div className="h-96 animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none" />
      </div>
    );
  }
  if (!result.ok) {
    return (
      <ListMessage
        title={t("loadError.title")}
        body={errors(result.code)}
        action={
          <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
            {t("loadError.retry")}
          </button>
        }
      />
    );
  }

  const data = result.data;
  const flat = data.modules.flatMap((m, mi) =>
    m.lessons.map((lesson) => ({ ...lesson, moduleId: m.id, moduleNumber: mi + 1 }))
  );
  const selectedId = picked ?? data.currentLessonId;
  const selected = flat.find((l) => l.id === selectedId) ?? flat[0]!;
  const number = flat.indexOf(selected) + 1;
  const next = flat[number] as (PublicLesson & { moduleId: string }) | undefined;
  const finished = data.completed === data.total;

  function select(id: string) {
    setPicked(id);
    setMessage("");
    setActionError(null);
  }

  /** "Continue": the next lesson, brought into view (the first one when the course is done). */
  function goCurrent() {
    select(finished ? flat[0]!.id : data.currentLessonId);
    stage.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  async function complete() {
    setSaving(true);
    setActionError(null);
    const done = await completeLesson(selected.id);
    setSaving(false);
    if (!done.ok) return setActionError(errors(done.code));
    setResult(done);
    const over = done.data.completed === done.data.total;
    setPicked(over ? selected.id : done.data.currentLessonId);
    setMessage(t(over ? "lesson.finished" : "lesson.advanced"));
  }

  const layout = theater ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1";

  return (
    <div className="space-y-6">
      <ProgressPanel data={data} currentNumber={data.completed + 1} onContinue={goCurrent} />

      <div
        ref={stage}
        className="grid scroll-mt-6 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8"
      >
        <div className={`lg:row-start-1 ${theater ? "lg:col-span-2" : "lg:col-start-1"}`}>
          <VideoPlayer
            title={t(`lessons.${selected.id}.title`)}
            number={number}
            total={data.total}
            moduleNumber={selected.moduleNumber}
            theater={theater}
            onToggleTheater={() => setTheater((v) => !v)}
          />
        </div>

        <section aria-labelledby="lesson-title" className="lg:col-start-1 lg:row-start-2">
          <p className="text-[12px] text-ink-muted tabular-nums">
            {t("lesson.meta", { n: number, total: data.total, minutes: selected.minutes })}
          </p>
          <h2
            id="lesson-title"
            className="mt-1 font-serif text-[clamp(1.5rem,3vw,2rem)] leading-tight font-medium tracking-tight"
          >
            {t(`lessons.${selected.id}.title`)}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
            {t(`lessons.${selected.id}.description`)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {selected.state === "completed" ? (
              <p className="inline-flex h-12 items-center gap-2 rounded-md border border-up px-5 text-sm font-medium text-up">
                <CheckGlyph size={16} />
                {t("lesson.done")}
              </p>
            ) : (
              <button
                type="button"
                onClick={complete}
                disabled={saving}
                aria-busy={saving}
                className="h-12 rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-70"
              >
                {saving ? t("lesson.saving") : t("lesson.complete")}
              </button>
            )}
            {next && next.state !== "locked" && (
              <button
                type="button"
                onClick={() => select(next.id)}
                className="h-12 rounded-md border border-field px-5 text-sm font-medium hover:bg-ink/5"
              >
                {t("lesson.next")}
              </button>
            )}
          </div>
          <p role="status" className="mt-3 min-h-5 text-sm text-up">
            {message}
          </p>
          {actionError && (
            <p role="alert" className="mt-1 text-sm text-down">
              {actionError}
            </p>
          )}
        </section>

        <aside className={`lg:col-start-2 ${layout}`}>
          <CourseOutline
            data={data}
            selectedId={selected.id}
            isOpen={(id) => toggled[id] ?? id === selected.moduleId}
            onToggle={(id) =>
              setToggled((prev) => ({ ...prev, [id]: !(prev[id] ?? id === selected.moduleId) }))
            }
            onSelect={select}
          />
        </aside>
      </div>

      {data.example && <p className="text-[13px] leading-relaxed text-ink-muted">{t("sandbox")}</p>}
    </div>
  );
}
