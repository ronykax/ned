import { type Duplex, PassThrough, Readable } from "node:stream";
import type {
  Experimental_SandboxProcess,
  Experimental_SandboxSession,
} from "ai";
import Dockerode from "dockerode";

class Sandbox implements Experimental_SandboxSession {
  readonly description = "";
  private readonly container: Dockerode.Container;
  private readonly docker: Dockerode;

  constructor(docker: Dockerode, name: string) {
    this.docker = docker;
    this.container = docker.getContainer(name);
  }

  async readFile({
    abortSignal,
    path,
  }: {
    abortSignal?: AbortSignal;
    path: string;
  }) {
    const probe = await this.open(["sh", "-c", 'test -e "$1"', "sh", path], {
      abortSignal,
    });
    if ((await this.outcome(probe)).exitCode !== 0) {
      return null;
    }

    const proc = await this.open(["cat", "--", path], { abortSignal });
    const stderr = this.collect(proc.stderr).then((bytes) =>
      this.decode(bytes)
    );
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
    return this.collect(stream);
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
    const proc = await this.open(
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
      content: ReadableStream.from([content]),
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
    return this.open(["sh", "-c", command], {
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

  private async open(
    cmd: string[],
    {
      abortSignal,
      env,
      stdin,
      workingDirectory,
    }: {
      abortSignal?: AbortSignal;
      env?: Record<string, string>;
      stdin?: ReadableStream<Uint8Array>;
      workingDirectory?: string;
    }
  ): Promise<Experimental_SandboxProcess> {
    if (abortSignal?.aborted) {
      throw abortSignal.reason ?? new Error("The operation was aborted");
    }

    const marker = `/tmp/.ned-${crypto.randomUUID()}`;
    let aborted = false;
    let exec: Dockerode.Exec | undefined;
    let reason: unknown;
    let stop: Promise<void> | undefined;
    let stream: Duplex | undefined;

    const kill = () => {
      const current = exec;
      if (!current) {
        return Promise.resolve();
      }
      stop ??= this.halt(current, marker, () => {
        stream?.destroy();
      });
      return stop;
    };

    const onAbort = () => {
      aborted = true;
      reason = abortSignal?.reason;
      kill().catch(() => undefined);
    };
    abortSignal?.addEventListener("abort", onAbort, { once: true });

    try {
      exec = await this.container.exec({
        AttachStderr: true,
        AttachStdin: stdin !== undefined,
        AttachStdout: true,
        Cmd: [
          "sh",
          "-c",
          'marker=$1; shift; echo $$ > "$marker"; "$@"; status=$?; rm -f "$marker"; exit $status',
          "sh",
          marker,
          ...cmd,
        ],
        Env: env
          ? Object.entries(env).map(([key, value]) => `${key}=${value}`)
          : undefined,
        Tty: false,
        WorkingDir: workingDirectory,
      });
      if (aborted) {
        throw reason ?? new Error("The operation was aborted");
      }

      stream = await exec.start({
        hijack: true,
        stdin: stdin !== undefined,
      });
      if (aborted) {
        await kill();
        throw reason ?? new Error("The operation was aborted");
      }
    } catch (error) {
      abortSignal?.removeEventListener("abort", onAbort);
      if (aborted) {
        throw reason ?? new Error("The operation was aborted");
      }
      throw error;
    }

    const stdout = new PassThrough();
    const stderr = new PassThrough();
    let settled = false;
    const finished = new Promise<void>((resolve, reject) => {
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        abortSignal?.removeEventListener("abort", onAbort);
        stdout.end();
        stderr.end();
        resolve();
      };
      const fail = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        abortSignal?.removeEventListener("abort", onAbort);
        const failure =
          error instanceof Error ? error : new Error("exec failed");
        stdout.destroy(failure);
        stderr.destroy(failure);
        reject(failure);
      };

      stream?.on("end", finish);
      stream?.on("close", finish);
      stream?.on("error", (error: Error) => {
        if (aborted || stop) {
          finish();
          return;
        }
        fail(error);
      });
    });

    this.docker.modem.demuxStream(stream, stdout, stderr);
    if (stdin) {
      const input = Readable.fromWeb(stdin);
      input.on("error", () => {
        stream?.destroy();
      });
      input.pipe(stream);
    }

    return {
      kill,
      stderr: Readable.toWeb(stderr) as ReadableStream<Uint8Array>,
      stdout: Readable.toWeb(stdout) as ReadableStream<Uint8Array>,
      wait: async () => {
        await finished;
        if (aborted) {
          throw reason ?? new Error("The operation was aborted");
        }

        let inspected = await exec.inspect();
        for (
          let attempt = 0;
          inspected.ExitCode === null && attempt < 10;
          attempt += 1
        ) {
          // biome-ignore lint/performance/noAwaitInLoops: Docker reports the exit code slightly after the stream ends
          await new Promise((resolve) => setTimeout(resolve, 20));
          inspected = await exec.inspect();
        }
        if (inspected.ExitCode === null) {
          throw new Error("exec finished without an exit code");
        }
        return { exitCode: inspected.ExitCode };
      },
    };
  }

  private async halt(
    exec: Dockerode.Exec,
    marker: string,
    destroy: () => void
  ) {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: the pid file appears after the process starts
      await this.signal(marker).catch(() => undefined);
      const info = await exec.inspect();
      if (!info.Running || info.ExitCode !== null) {
        await this.raw(["rm", "-f", marker]).catch(() => undefined);
        destroy();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await this.raw(["rm", "-f", marker]).catch(() => undefined);
    destroy();
  }

  private async signal(marker: string) {
    await this.raw([
      "sh",
      "-c",
      'pid=$(cat "$1" 2>/dev/null) || exit 0; kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true; rm -f "$1"',
      "sh",
      marker,
    ]);
  }

  private async raw(cmd: string[]) {
    const exec = await this.container.exec({
      AttachStderr: true,
      AttachStdout: true,
      Cmd: cmd,
      Tty: false,
    });
    const stream = await exec.start({ hijack: true });
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    this.docker.modem.demuxStream(stream, stdout, stderr);
    stdout.resume();
    stderr.resume();
    await new Promise<void>((resolve) => {
      stream.on("close", () => resolve());
      stream.on("error", () => resolve());
    });
  }

  private async outcome(proc: Experimental_SandboxProcess) {
    const [stdout, stderr, result] = await Promise.all([
      this.collect(proc.stdout),
      this.collect(proc.stderr),
      proc.wait(),
    ]);
    return {
      exitCode: result.exitCode,
      stderr: this.decode(stderr),
      stdout: this.decode(stdout),
    };
  }

  private async collect(stream: ReadableStream<Uint8Array>) {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for await (const chunk of stream) {
      chunks.push(chunk);
      length += chunk.byteLength;
    }

    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  private decode(bytes: Uint8Array, encoding?: string) {
    return new TextDecoder(encoding).decode(bytes);
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

const socketPath = process.env.GLACIER_DOCKER_SOCKET_PATH;

export const sandbox: Experimental_SandboxSession = new Sandbox(
  socketPath ? new Dockerode({ socketPath }) : new Dockerode(),
  process.env.GLACIER_CONTAINER_NAME || "glacier"
);
