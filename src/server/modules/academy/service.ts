import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { COURSE, LESSONS, LESSON_ID, lessonStates } from "@/shared/academy/course";
import { academyRepository } from "./repository";
import type { AcademyOverview } from "./schema";

function overview(auth: Session): AcademyOverview {
  const progress = academyRepository.get(auth.userId, auth.storeId);
  const states = lessonStates(progress.done);
  const completed = LESSONS.filter((l) => states.get(l.id) === "completed").length;
  const current = LESSONS.find((l) => states.get(l.id) === "available") ?? LESSONS.at(-1)!;

  return {
    modules: COURSE.map((m) => ({
      id: m.id,
      lessons: m.lessons.map((l) => ({ id: l.id, minutes: l.minutes, state: states.get(l.id)! })),
    })),
    completed,
    total: LESSONS.length,
    percent: Math.round((completed / LESSONS.length) * 100),
    minutesLeft: LESSONS.filter((l) => states.get(l.id) !== "completed").reduce(
      (sum, l) => sum + l.minutes,
      0
    ),
    currentLessonId: current.id,
    example: progress.example,
  };
}

export async function getAcademy(auth: Session): Promise<AcademyOverview> {
  return overview(auth);
}

/**
 * Marks a lesson done. Only the lesson that is next (or one already done, which changes nothing)
 * can be marked: the order is enforced here, not just drawn by the page. Idempotent.
 */
export async function completeLesson(auth: Session, id: string): Promise<AcademyOverview> {
  const lesson = LESSON_ID.test(id) ? LESSONS.find((l) => l.id === id) : undefined;
  if (!lesson) throw new ApiError("not_found");
  const progress = academyRepository.get(auth.userId, auth.storeId);
  if (lessonStates(progress.done).get(lesson.id) === "locked") throw new ApiError("lesson_locked");
  progress.done.add(lesson.id);
  return overview(auth);
}
