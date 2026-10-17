import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description: "Get the weather in a location",
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
});
