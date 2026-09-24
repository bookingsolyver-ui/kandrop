import { getEnv } from "@/server/config/env";
import { LESSONS } from "@/shared/academy/course";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a `lesson_progress` table
 * (unique on `user_id, lesson_id`, with `completed_at`). Progress belongs to the *person*, not
 * the store: two people on one store each learn at their own pace.
 */
interface Progress {
  done: Set<string>;
  example: boolean;
}
const g = globalThis as unknown as { __kandropAcademy?: Map<string, Progress> };
const db = (g.__kandropAcademy ??= new Map<string, Progress>());

/** SANDBOX: demo stores start with the first five lessons done, so the screen can be reviewed. */
const DEMO_DONE = 5;

export const academyRepository = {
  get(userId: string, storeId: string): Progress {
    let progress = db.get(userId);
    if (!progress) {
      const demo = storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS;
      progress = {
        done: new Set(demo ? LESSONS.slice(0, DEMO_DONE).map((l) => l.id) : []),
        example: demo,
      };
      db.set(userId, progress);
    }
    return progress;
  },
};
