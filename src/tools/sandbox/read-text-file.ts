import { tool } from "ai";
import { z } from "zod";

export const readTextFile = tool({
  description:
    "Read one text file from the sandbox. Returns null when the file does not exist. Line ranges are 1-based and inclusive.",
  execute: async (
    { encoding, endLine, path, startLine },
    { abortSignal, experimental_sandbox }
  ) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    return await experimental_sandbox.readTextFile({
      abortSignal,
      encoding,
      endLine,
      path,
      startLine,
    });
  },
  inputSchema: z.object({
    encoding: z
      .string()
      .optional()
      .describe("Text encoding used to decode the file. Defaults to utf-8"),
    endLine: z
      .number()
      .int()
      .optional()
      .describe(
        "1-based inclusive end line. When past the end of the file, the read returns through the end"
      ),
    path: z.string().describe("Path of the file to read"),
    startLine: z
      .number()
      .int()
      .optional()
      .describe("1-based inclusive start line. Defaults to 1"),
  }),
});
