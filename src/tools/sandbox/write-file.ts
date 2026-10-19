import { tool } from "ai";
import { z } from "zod";

export const writeFile = tool({
  description:
    "Write one file to the sandbox from a byte stream. Creates parent directories and overwrites an existing file. Returns null when the write succeeds.",
  execute: async ({ content, path }, { abortSignal, experimental_sandbox }) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    const bytes = new Uint8Array(Buffer.from(content, "base64"));
    await experimental_sandbox.writeFile({
      abortSignal,
      content: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      path,
    });
  },
  inputSchema: z.object({
    content: z.base64().describe("Base64-encoded bytes to write"),
    path: z.string().describe("Path of the file to write"),
  }),
});
