import { tool } from "ai";
import { z } from "zod";

export const readBinaryFile = tool({
  description:
    "Read one file from the sandbox as raw bytes. Returns base64-encoded bytes, or null when the file does not exist.",
  execute: async ({ path }, { abortSignal, experimental_sandbox }) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    const bytes = await experimental_sandbox.readBinaryFile({
      abortSignal,
      path,
    });
    if (bytes === null) {
      return null;
    }
    return Buffer.from(bytes).toString("base64");
  },
  inputSchema: z.object({
    path: z.string().describe("Path of the file to read"),
  }),
});
