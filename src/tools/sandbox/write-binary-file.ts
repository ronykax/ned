import { tool } from "ai";
import { z } from "zod";

export const writeBinaryFile = tool({
  description:
    "Write one file to the sandbox from raw bytes. Creates parent directories and overwrites an existing file. Returns null when the write succeeds.",
  execute: async ({ content, path }, { abortSignal, experimental_sandbox }) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    await experimental_sandbox.writeBinaryFile({
      abortSignal,
      content: new Uint8Array(Buffer.from(content, "base64")),
      path,
    });
  },
  inputSchema: z.object({
    content: z.base64().describe("Base64-encoded bytes to write"),
    path: z.string().describe("Path of the file to write"),
  }),
});
