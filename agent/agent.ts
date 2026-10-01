import { defineAgent } from "eve";
import { openai } from "eve/models/openai";

export default defineAgent({
  compaction: {
    thresholdPercent: 0.25,
  },
  model: openai("gpt-6.1-sol"),
  reasoning: "high",
});
