import { tool } from "ai";
import { z } from "zod";

export const spawn = tool({
  description:
    "Spawn a command in the sandbox and wait until it exits. Returns the exit code, stdout, and stderr.",
  execute: async (
    { command, env, workingDirectory },
    { abortSignal, experimental_sandbox }
  ) => {
    if (!experimental_sandbox) {
      throw new Error("Experimental sandbox is not available");
    }

    const proc = await experimental_sandbox.spawn({
      abortSignal,
      command,
      env,
      workingDirectory,
    });
    const [stdout, stderr, result] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.wait(),
    ]);
    return { exitCode: result.exitCode, stderr, stdout };
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
