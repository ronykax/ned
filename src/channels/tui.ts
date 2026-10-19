import { runAgentTUI } from "@ai-sdk/tui";
import { getAgent } from "../agent";
import { sandbox } from "../sandbox";

await runAgentTUI({
  agent: getAgent(),
  reasoning: "full",
  responseStatistics: "outputTokenCount",
  sandbox,
  title: "Ned",
  tools: "full",
});
