import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db";
import { schedulesTable } from "../lib/db/schema";

const SCHEDULE_LIMIT = 20;

export default defineTool({
  description: "Create a one-off or recurring schedule.",
  execute: async ({ recurring, minutes, instructions }, _ctx) => {
    try {
      const existingSchedules = await db.select().from(schedulesTable);

      if (existingSchedules.length >= SCHEDULE_LIMIT) {
        throw new RangeError(
          `Schedule limit reached (${SCHEDULE_LIMIT}/${SCHEDULE_LIMIT}). Call list_schedules, see if there's one that's no longer needed, remove it, and then try again.`
        );
      }

      await db.insert(schedulesTable).values({
        id: crypto.randomUUID(),
        instructions,
        lastRunAt: new Date(),
        minutes,
        recurring,
      });

      return "ok";
    } catch (error) {
      throw new RangeError("Something went wrong.", { cause: error });
    }
  },
  inputSchema: z.object({
    instructions: z
      .string()
      .describe(
        "A clear directive describing what you should do when this schedule fires. Reframe the user's request into a task — never copy their message verbatim."
      ),
    minutes: z
      .number()
      .describe("One-off: minutes from now. Recurring: minutes between runs."),
    recurring: z.boolean(),
  }),
});
