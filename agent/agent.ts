import { defineAgent } from "eve";

export default defineAgent({
  compaction: {
    thresholdPercent: 0.25,
  },
  model: "openai/gpt-5.2",
  reasoning: "xhigh",
});
