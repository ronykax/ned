import { runAgentTUI } from "@ai-sdk/tui";
import { getAgent } from "../agent";

await runAgentTUI({
  agent: getAgent(),
  reasoning: "full",
  responseStatistics: "outputTokenCount",
  title: "Ned",
  tools: "full",
});
