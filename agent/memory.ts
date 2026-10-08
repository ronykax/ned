import supermemory from "@supermemory/eve";
import { defineMemory } from "eve/memory";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description: "Recall and manage durable context.",
  namespace: "ned",
  provider: supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY as string,
  }),
  scope: byPrincipal,
});
