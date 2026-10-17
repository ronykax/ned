import type { TextPart } from "ai";

/** turn key/value entries into a text `TextPart` wrapped in a `<context>` block */
export function makeContext(entries: Record<string, string>): TextPart {
  const lines = Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return { text: `<context>\n${lines}\n</context>`, type: "text" };
}
