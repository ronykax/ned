import { tool } from "ai";
import { z } from "zod";

export const readFile = tool({
  description:
    "Read one file from the sandbox as a byte stream. Returns base64-encoded bytes, or null when the file does not exist.",
  execute: async ({ path }, { abortSignal, experimental_sandbox }) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    const stream = await experimental_sandbox.readFile({ abortSignal, path });
    if (!stream) {
      return null;
    }

    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return Buffer.from(bytes).toString("base64");
  },
  inputSchema: z.object({
    path: z.string().describe("Path of the file to read"),
  }),
});
