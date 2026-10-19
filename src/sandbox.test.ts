import { afterAll, describe, expect, test } from "bun:test";
import { sandbox } from "./sandbox";

const root = `/tmp/ned-sandbox-${crypto.randomUUID()}`;

async function read(stream: ReadableStream<Uint8Array>) {
  let text = "";
  for await (const chunk of stream) {
    text += new TextDecoder().decode(chunk);
  }
  return text;
}

afterAll(async () => {
  await sandbox.run({ command: `rm -rf ${root}` });
});

describe("glacier", () => {
  test("runs a command", async () => {
    const result = await sandbox.run({
      command: "printf out; printf err >&2; exit 3",
    });
    expect(result).toEqual({ exitCode: 3, stderr: "err", stdout: "out" });

    const where = await sandbox.run({
      command: 'pwd; printf %s "$SANDBOX_SENTINEL"',
      env: { SANDBOX_SENTINEL: "present" },
      workingDirectory: "/tmp",
    });
    expect(where).toEqual({
      exitCode: 0,
      stderr: "",
      stdout: "/tmp\npresent",
    });
  });

  test("abort kills a running command", async () => {
    const controller = new AbortController();
    const reason = new Error("stop");
    const proc = await sandbox.spawn({
      abortSignal: controller.signal,
      command: "sleep 30",
    });

    controller.abort(reason);
    await expect(proc.wait()).rejects.toBe(reason);

    const next = await sandbox.run({ command: "printf ok" });
    expect(next).toEqual({ exitCode: 0, stderr: "", stdout: "ok" });
  }, 10_000);

  test("spawn streams output and kill is idempotent", async () => {
    const proc = await sandbox.spawn({
      command: "printf out; printf err >&2; exit 4",
    });
    const [stdout, stderr, result] = await Promise.all([
      read(proc.stdout),
      read(proc.stderr),
      proc.wait(),
    ]);
    expect(stdout).toBe("out");
    expect(stderr).toBe("err");
    expect(result.exitCode).toBe(4);

    const sleeper = await sandbox.spawn({ command: "sleep 30" });
    await sleeper.kill();
    await sleeper.kill();
    expect((await sleeper.wait()).exitCode).not.toBe(0);
  }, 10_000);

  test("reads and writes files", async () => {
    const note = `${root}/nested/note.txt`;
    await sandbox.writeTextFile({
      content: "alpha\nbeta\ngamma\n",
      path: note,
    });
    expect(
      await sandbox.readTextFile({ endLine: 10, path: note, startLine: 2 })
    ).toBe("beta\ngamma\n");
    expect(await sandbox.readTextFile({ path: `${root}/missing` })).toBeNull();

    const bytes = new Uint8Array([0xff, 0xfe, 0x00, 0x61]);
    const binary = `${root}/nested/data.bin`;
    await sandbox.writeBinaryFile({ content: bytes, path: binary });
    expect(await sandbox.readBinaryFile({ path: binary })).toEqual(bytes);
  });
});
