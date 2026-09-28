import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db";
import { schedulesTable } from "../lib/db/schema";

export default defineTool({
  description: "List all schedules.",
  execute: async () => {
    try {
      return await db.select().from(schedulesTable);
    } catch (error) {
      throw new Error("Something went wrong.", { cause: error });
    }
  },
  inputSchema: z.object({}),
});
