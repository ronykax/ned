import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Get the current date and time in a given timezone. Call this whenever the user asks about the current time or date, or you need it to answer. Never guess the time.",
  execute({ timezone }, _ctx) {
    try {
      const time = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: timezone,
      }).format(new Date());

      return { time, timezone };
    } catch (error) {
      throw new RangeError(
        `Invalid timezone "${timezone}". Use an IANA name like "Asia/Kolkata". If unsure, ask the user for their city.`,
        { cause: error }
      );
    }
  },
  inputSchema: z.object({
    timezone: z
      .string()
      .describe(
        'IANA timezone name (e.g. "Asia/Kolkata", "America/New_York", "Asia/Tehran"). If the name is unknown or the call returns an invalid timezone error, ask the user for their city and retry.'
      ),
  }),
});
