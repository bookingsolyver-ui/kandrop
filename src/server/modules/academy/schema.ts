import type { LessonId, LessonState, ModuleId } from "@/shared/academy/course";

export interface PublicLesson {
  id: LessonId;
  minutes: number;
  state: LessonState;
}
export interface PublicModule {
  id: ModuleId;
  lessons: PublicLesson[];
}

export interface AcademyOverview {
  modules: PublicModule[];
  completed: number;
  total: number;
  /** Whole percent, 0–100. */
  percent: number;
  /** Planned minutes still to watch. */
  minutesLeft: number;
  /** The lesson to take next; the last one when the course is done. */
  currentLessonId: LessonId;
  /** The starting progress is a sandbox example (a demo store), not the person's own doing. */
  example: boolean;
}
