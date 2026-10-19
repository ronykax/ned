import { tool } from "ai";
import { z } from "zod";

export const run = tool({
  description:
    "Run a command in the sandbox. Returns the exit code, stdout, and stderr.",
  execute: async (
    { command, env, workingDirectory },
    { abortSignal, experimental_sandbox }
  ) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    return await experimental_sandbox.run({
      abortSignal,
      command,
      env,
      workingDirectory,
    });
  },
  inputSchema: z.object({
    command: z.string().describe("Command to execute in the sandbox"),
    env: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Environment variables for this command. Merged with the sandbox environment; these values take precedence"
      ),
    workingDirectory: z
      .string()
      .optional()
      .describe("Working directory to execute the command in"),
  }),
});
