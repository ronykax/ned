import type { TextPart } from "ai";

/** turn key/value entries into a text `TextPart` wrapped in a `<context>` block */
export function makeContext(entries: Record<string, string>): TextPart {
  const lines = Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return { text: `<context>\n${lines}\n</context>`, type: "text" };
}

/** split a text stream into bubbles on blank lines and call `onBubble` for each */
export async function eachBubble(
  textStream: AsyncIterable<string>,
  onBubble: (bubble: string) => Promise<void> | void
) {
  let buffer = "";

  for await (const delta of textStream) {
    const parts = `${buffer}${delta}`.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const bubble = part.trim();
      if (bubble) {
        // biome-ignore lint/performance/noAwaitInLoops: send bubbles in order
        await onBubble(bubble);
      }
    }
  }

  const rest = buffer.trim();
  if (rest) {
    await onBubble(rest);
  }
}
