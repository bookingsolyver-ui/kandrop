/**
 * The course, as data. Titles and descriptions are translated (`Academy.modules.<id>` and
 * `Academy.lessons.<id>`); only structure lives here. !! An OUTLINE: no lesson has a video yet —
 * the minutes are planned lengths, and the page says so.
 */
export const COURSE = [
  {
    id: "m1",
    lessons: [
      { id: "m1l1", minutes: 8 },
      { id: "m1l2", minutes: 12 },
      { id: "m1l3", minutes: 10 },
    ],
  },
  {
    id: "m2",
    lessons: [
      { id: "m2l1", minutes: 14 },
      { id: "m2l2", minutes: 11 },
      { id: "m2l3", minutes: 9 },
    ],
  },
  {
    id: "m3",
    lessons: [
      { id: "m3l1", minutes: 10 },
      { id: "m3l2", minutes: 7 },
      { id: "m3l3", minutes: 8 },
    ],
  },
  {
    id: "m4",
    lessons: [
      { id: "m4l1", minutes: 9 },
      { id: "m4l2", minutes: 6 },
    ],
  },
] as const;

/** Literal ids, so a missing translation is a compile error, not a blank on the page. */
export type ModuleId = (typeof COURSE)[number]["id"];
export type LessonId = (typeof COURSE)[number]["lessons"][number]["id"];

/** Every lesson in viewing order; `minutes` is the planned length. */
export const LESSONS: ReadonlyArray<{ id: LessonId; minutes: number }> = COURSE.flatMap((m) => [
  ...m.lessons,
]);

export const LESSON_ID = /^m[1-9]l[1-9]$/;

/**
 * `completed`: watched and marked. `available`: the next one to take (everything before it is
 * done). `locked`: something before it is still to do. Lessons unlock strictly in order.
 */
export type LessonState = "completed" | "available" | "locked";

export function lessonStates(done: ReadonlySet<string>): Map<LessonId, LessonState> {
  const out = new Map<LessonId, LessonState>();
  let open = true; // still walking through finished lessons
  for (const lesson of LESSONS) {
    if (done.has(lesson.id)) out.set(lesson.id, "completed");
    else if (open) {
      out.set(lesson.id, "available");
      open = false;
    } else out.set(lesson.id, "locked");
  }
  return out;
}
