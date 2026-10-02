import "server-only";
import { isDemoStore } from "@/server/modules/store/demo";
import { db, must, rows } from "@/server/db/client";
import { LESSONS } from "@/shared/academy/course";

/**
 * Progress belongs to the *person*, not the store: two people on one store each learn at their own
 * pace. Rows: `academy_profiles` (one per person) and `lesson_progress` (unique on `user_id, lesson_id`).
 */
interface Progress {
  done: Set<string>;
  example: boolean;
}

/** SANDBOX: demo stores start with the first five lessons done, so the screen can be reviewed. */
const DEMO_DONE = 5;

export const academyRepository = {
  async get(userId: string, storeId: string): Promise<Progress> {
    const profile = must(
      "academy_profiles.get",
      await db().from("academy_profiles").select("example").eq("user_id", userId).maybeSingle()
    );
    if (!profile) {
      const demo = await isDemoStore(storeId);
      const now = Date.now();
      must(
        "academy_profiles.create",
        await db()
          .from("academy_profiles")
          .upsert({ user_id: userId, example: demo }, { onConflict: "user_id", ignoreDuplicates: true })
      );
      if (demo) {
        must(
          "lesson_progress.seed",
          await db()
            .from("lesson_progress")
            .upsert(
              LESSONS.slice(0, DEMO_DONE).map((l) => ({
                user_id: userId,
                lesson_id: l.id,
                completed_at: now,
              })),
              { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
            )
        );
      }
    }
    const [row, done] = await Promise.all([
      db().from("academy_profiles").select("example").eq("user_id", userId).maybeSingle(),
      db().from("lesson_progress").select("lesson_id").eq("user_id", userId),
    ]);
    return {
      done: new Set(rows("lesson_progress.get", done).map((r) => String(r.lesson_id))),
      example: Boolean(must("academy_profiles.get", row)?.example),
    };
  },

  /** Idempotent: completing a lesson twice changes nothing. */
  async complete(userId: string, lessonId: string): Promise<void> {
    must(
      "lesson_progress.complete",
      await db()
        .from("lesson_progress")
        .upsert(
          { user_id: userId, lesson_id: lessonId, completed_at: Date.now() },
          { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
        )
    );
  },
};
