import readline from "node:readline";
import type { TextPart } from "ai";

export function clearScreen() {
  if (!process.stdout.isTTY) {
    return;
  }
  const repeatCount = process.stdout.rows - 2;
  const blank = repeatCount > 0 ? "\n".repeat(repeatCount) : "";
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

/** turn key/value entries into a text `TextPart` wrapped in a `<context>` block */
export function makeContext(entries: Record<string, string>): TextPart {
  const lines = Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return { text: `<context>\n${lines}\n</context>`, type: "text" };
}
