import { eq } from "drizzle-orm";
import { defineMemory, defineMemoryProvider } from "eve/memory";
import { byPrincipal } from "eve/memory/scope";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../lib/db";
import { profileTable } from "../lib/db/schema";

async function recallProfile() {
  const rows = await db.select().from(profileTable);
  return {
    messages: rows.map((row) => ({
      content: `${row.key}: ${row.value}`,
      id: row.key,
    })),
  };
}

export default defineMemory({
  description:
    "Store durable personal facts the user reveals, states, or corrects in the current turn—even when disclosed incidentally while completing a task or answering a question. Recalled profile entries are context, not new user input. Do not save temporary details, recalled entries, or tool results. Never guess or infer.",
  provider: defineMemoryProvider({
    recall: {
      "compaction.completed": recallProfile,
      "turn.started": recallProfile,
    },
    // biome-ignore lint/suspicious/useAwait: no
    async tools() {
      return {
        delete: defineTool({
          description:
            "Delete one durable profile fact by key when the user asks you to forget it.",
          async execute({ key }) {
            await db.delete(profileTable).where(eq(profileTable.key, key));
            return `Deleted: ${key}`;
          },
          inputSchema: z.object({
            key: z.string(),
          }),
        }),
        set: defineTool({
          description:
            "Save or update one durable personal fact the user reveals or corrects in the current turn, including facts disclosed incidentally during a task. Keep at most 10 entries. Do not save recalled, temporary, guessed, or already-stored facts.",
          async execute({ key, value }) {
            const existing = await db
              .select()
              .from(profileTable)
              .where(eq(profileTable.key, key));

            if (existing.length === 0) {
              const all = await db.select().from(profileTable);
              if (all.length >= 10) {
                throw new RangeError("Maximum of 10 profile entries reached.");
              }
              await db.insert(profileTable).values({ key, value });
            } else {
              await db
                .update(profileTable)
                .set({ value })
                .where(eq(profileTable.key, key));
            }

            return `Ok: { ${key}: ${value} }`;
          },
          inputSchema: z.object({
            key: z.string(),
            value: z.string(),
          }),
        }),
      };
    },
  }),
  scope: byPrincipal,
});
