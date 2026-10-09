import { eq } from "drizzle-orm";
import { defineSchedule } from "eve/schedules";
import telegram from "../channels/telegram";
import { db } from "../lib/db";
import { schedulesTable } from "../lib/db/schema";

export default defineSchedule({
  cron: "* * * * *",
  run({ to, waitUntil, appAuth }) {
    waitUntil(
      (async () => {
        const schedules = await db().select().from(schedulesTable);

        await Promise.all(
          schedules.map(async (schedule) => {
            const now = Date.now();
            const lastRunAt = schedule.lastRunAt?.getTime() ?? 0;

            if (now - lastRunAt < schedule.minutes * 60_000) {
              return;
            }

            await to(telegram, { chatId: "8590182854" }).send(
              schedule.instructions,
              { auth: appAuth }
            );

            await db()
              .update(schedulesTable)
              .set({ lastRunAt: new Date(now) })
              .where(eq(schedulesTable.id, schedule.id));

            if (!schedule.recurring) {
              await db()
                .delete(schedulesTable)
                .where(eq(schedulesTable.id, schedule.id));
            }
          })
        );
      })()
    );
  },
});
