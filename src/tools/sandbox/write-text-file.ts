import { tool } from "ai";
import { z } from "zod";

export const writeTextFile = tool({
  description:
    "Write one text file to the sandbox. Creates parent directories and overwrites an existing file. Returns null when the write succeeds.",
  execute: async (
    { content, encoding, path },
    { abortSignal, experimental_sandbox }
  ) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    await experimental_sandbox.writeTextFile({
      abortSignal,
      content,
      encoding,
      path,
    });
  },
  inputSchema: z.object({
    content: z.string().describe("Text to write"),
    encoding: z
      .string()
      .optional()
      .describe("Text encoding used to encode the string. Defaults to utf-8"),
    path: z.string().describe("Path of the file to write"),
  }),
});
