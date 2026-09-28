import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db";
import { schedulesTable } from "../lib/db/schema";

export default defineTool({
  description: "Create a one-off or recurring schedule.",
  execute: async ({ recurring, minutes, instructions }, _ctx) => {
    try {
      const existingSchedules = await db.select().from(schedulesTable);

      if (existingSchedules.length >= 10) {
        throw new RangeError(
          "Schedule limit reached (10/10). Call list_schedules, remove one you no longer need, then create this schedule again."
        );
      }

      await db.insert(schedulesTable).values({
        id: crypto.randomUUID(),
        instructions,
        lastRunAt: new Date(),
        minutes,
        recurring,
      });

      return "Ok.";
    } catch (error) {
      throw new Error("Something went wrong.", { cause: error });
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
