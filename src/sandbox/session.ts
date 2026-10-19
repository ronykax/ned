import type {
  Experimental_SandboxProcess,
  Experimental_SandboxSession,
} from "ai";
import { DockerodeExec } from "./dockerode";

class Sandbox implements Experimental_SandboxSession {
  readonly description = "";
  private readonly docker: DockerodeExec;

  constructor(docker = new DockerodeExec()) {
    this.docker = docker;
  }

  async readFile({
    abortSignal,
    path,
  }: {
    abortSignal?: AbortSignal;
    path: string;
  }) {
    const probe = await this.docker.open(
      ["sh", "-c", 'test -e "$1"', "sh", path],
      { abortSignal }
    );
    if ((await this.outcome(probe)).exitCode !== 0) {
      return null;
    }

    const proc = await this.docker.open(["cat", "--", path], { abortSignal });
    const stderr = new Response(proc.stderr).text();
    const reader = proc.stdout.getReader();

    return new ReadableStream<Uint8Array>({
      cancel: () => proc.kill(),
      pull: async (controller) => {
        try {
          const next = await reader.read();
          if (!next.done) {
            controller.enqueue(next.value);
            return;
          }

          const [{ exitCode }, errorText] = await Promise.all([
            proc.wait(),
            stderr,
          ]);
          if (exitCode !== 0) {
            controller.error(new Error(errorText || `unable to read ${path}`));
            return;
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async readBinaryFile(options: { abortSignal?: AbortSignal; path: string }) {
    const stream = await this.readFile(options);
    if (!stream) {
      return null;
    }
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async readTextFile({
    abortSignal,
    encoding,
    endLine,
    path,
    startLine,
  }: {
    abortSignal?: AbortSignal;
    encoding?: string;
    endLine?: number;
    path: string;
    startLine?: number;
  }) {
    const bytes = await this.readBinaryFile({ abortSignal, path });
    if (bytes === null) {
      return null;
    }

    const text = this.decode(bytes, encoding);
    if (startLine === undefined && endLine === undefined) {
      return text;
    }
    return this.sliceLines(text, startLine ?? 1, endLine);
  }

  async writeFile({
    abortSignal,
    content,
    path,
  }: {
    abortSignal?: AbortSignal;
    content: ReadableStream<Uint8Array>;
    path: string;
  }) {
    const proc = await this.docker.open(
      [
        "sh",
        "-c",
        'mkdir -p -- "$(dirname -- "$1")" && cat > "$1"',
        "sh",
        path,
      ],
      { abortSignal, stdin: content }
    );
    const result = await this.outcome(proc);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `unable to write ${path}`);
    }
  }

  async writeBinaryFile({
    abortSignal,
    content,
    path,
  }: {
    abortSignal?: AbortSignal;
    content: Uint8Array;
    path: string;
  }) {
    await this.writeFile({
      abortSignal,
      content: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(content);
          controller.close();
        },
      }),
      path,
    });
  }

  async writeTextFile({
    abortSignal,
    content,
    encoding,
    path,
  }: {
    abortSignal?: AbortSignal;
    content: string;
    encoding?: string;
    path: string;
  }) {
    await this.writeBinaryFile({
      abortSignal,
      content: this.encode(content, encoding),
      path,
    });
  }

  spawn({
    abortSignal,
    command,
    env,
    workingDirectory,
  }: {
    abortSignal?: AbortSignal;
    command: string;
    env?: Record<string, string>;
    workingDirectory?: string;
  }) {
    return this.docker.open(["sh", "-c", command], {
      abortSignal,
      env,
      workingDirectory,
    });
  }

  async run(options: {
    abortSignal?: AbortSignal;
    command: string;
    env?: Record<string, string>;
    workingDirectory?: string;
  }) {
    return this.outcome(await this.spawn(options));
  }

  private async outcome(proc: Experimental_SandboxProcess) {
    const [stdout, stderr, result] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.wait(),
    ]);
    return { exitCode: result.exitCode, stderr, stdout };
  }

  private decode(bytes: Uint8Array, encoding?: string) {
    return new TextDecoder(encoding as Bun.Encoding | undefined).decode(bytes);
  }

  private encode(content: string, encoding = "utf-8") {
    if (!Buffer.isEncoding(encoding)) {
      throw new Error(`unsupported encoding ${encoding}`);
    }
    return new Uint8Array(Buffer.from(content, encoding));
  }

  private sliceLines(text: string, startLine: number, endLine?: number) {
    const terminated = text.endsWith("\n");
    const parts = text.split("\n");
    if (terminated) {
      parts.pop();
    }

    const start = Math.max(startLine, 1) - 1;
    const end =
      endLine === undefined ? parts.length : Math.min(endLine, parts.length);
    const selected = parts.slice(start, Math.max(end, 0));
    if (selected.length === 0) {
      return "";
    }

    const body = selected.join("\n");
    if (terminated && end >= parts.length) {
      return `${body}\n`;
    }
    return body;
  }
}

export const sandbox: Experimental_SandboxSession = new Sandbox();
