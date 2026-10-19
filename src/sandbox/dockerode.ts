import { type Duplex, PassThrough, Readable } from "node:stream";
import type { Experimental_SandboxProcess } from "ai";
import Dockerode from "dockerode";

export class DockerodeExec {
  private readonly container: Dockerode.Container;
  private readonly docker: Dockerode;

  constructor(name = process.env.GLACIER_CONTAINER_NAME || "glacier") {
    const socketPath = process.env.GLACIER_DOCKER_SOCKET_PATH;
    this.docker = socketPath ? new Dockerode({ socketPath }) : new Dockerode();
    this.container = this.docker.getContainer(name);
  }

  async open(
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
    const kill = [
      "sh",
      "-c",
      'pid=$(cat "$1" 2>/dev/null) || exit 0; kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true; rm -f "$1"',
      "sh",
      marker,
    ];
    for (let attempt = 0; attempt < 25; attempt += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: the pid file appears after the process starts
      await this.raw(kill).catch(() => undefined);
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
}
