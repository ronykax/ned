import { eq } from "drizzle-orm";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db";
import { schedulesTable } from "../lib/db/schema";

export default defineTool({
  description: "Delete a schedule by its ID.",
  execute: async ({ id }) => {
    try {
      await db().delete(schedulesTable).where(eq(schedulesTable.id, id));
      return "ok";
    } catch (error) {
      throw new Error("Something went wrong.", { cause: error });
    }
  },
  inputSchema: z.object({ id: z.string() }),
});
