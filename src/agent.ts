import { gateway, ToolLoopAgent, type UserContent } from "ai";

export async function ned(content: UserContent) {
  const agent = new ToolLoopAgent({
    allowSystemInMessages: true,
    model: "stealth/cat-jam",
    tools: { web_search: gateway.tools.exaSearch() },
  });

  return await agent.generate({
    messages: [{ content, role: "user" }],
  });
}
