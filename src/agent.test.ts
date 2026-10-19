import { describe, expect, test } from "bun:test";
import type { ModelMessage } from "ai";
import { openSession } from "./agent";

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function whenAborted(signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

async function collect(stream: AsyncIterable<string>) {
  let text = "";
  for await (const chunk of stream) {
    text += chunk;
  }
  return text;
}

function label(message: ModelMessage) {
  return typeof message.content === "string"
    ? `${message.role}:${message.content}`
    : message.role;
}

describe("steering", () => {
  test("interrupts a generation that has not answered yet", async () => {
    const started = deferred();
    const seen: string[][] = [];
    let call = 0;

    const session = openSession((_session, attempt) => {
      call += 1;
      const folded = attempt.fold().map(label);
      seen.push([...attempt.messages.map(label), ...folded]);

      if (call === 1) {
        return Promise.resolve({
          fullStream: (async function* stream() {
            yield { type: "start-step" };
            yield { text: "checking", type: "reasoning-delta" };
            started.resolve();
            await whenAborted(attempt.abortSignal);
          })(),
        });
      }

      return Promise.resolve({
        fullStream: (function* stream() {
          yield { type: "start-step" };
          yield { text: "both", type: "text-delta" };
          attempt.onStepEnd([{ content: "both", role: "assistant" }]);
        })(),
      });
    });

    const first = session.send("one");
    const firstText = collect(first.textStream);
    await started.promise;
    const second = session.send("two");

    expect(await firstText).toBe("both");
    expect(await collect(second.textStream)).toBe("");
    expect(seen[0]).toEqual(["user:one"]);
    expect(seen[1]).toEqual(["user:one", "user:two"]);
    expect(call).toBe(2);
  });

  test("waits for the turn to finish once answer text has started", async () => {
    const release = deferred();
    const sawAnswer = deferred();
    const seen: string[][] = [];
    let call = 0;

    const session = openSession((_session, attempt) => {
      call += 1;
      seen.push(attempt.messages.map(label));

      if (call === 1) {
        return Promise.resolve({
          fullStream: (async function* stream() {
            yield { type: "start-step" };
            yield { text: "one", type: "text-delta" };
            sawAnswer.resolve();
            await release.promise;
            attempt.onStepEnd([{ content: "one", role: "assistant" }]);
          })(),
        });
      }

      return Promise.resolve({
        fullStream: (function* stream() {
          yield { text: "two", type: "text-delta" };
        })(),
      });
    });

    const first = session.send("a");
    const firstText = collect(first.textStream);

    await sawAnswer.promise;
    const second = session.send("b");
    release.resolve();

    expect(await firstText).toBe("one");
    expect(await collect(second.textStream)).toBe("two");
    expect(seen[1]).toEqual(["user:a", "assistant:one", "user:b"]);
    expect(call).toBe(2);
  });

  test("lets a running tool finish and applies the message at the next step", async () => {
    const toolStarted = deferred();
    const arrived = deferred();
    let abortedDuringTool = false;
    const foldedAfterTool: string[] = [];
    const seen: string[][] = [];
    let call = 0;

    const session = openSession((_session, attempt) => {
      call += 1;
      seen.push(attempt.messages.map(label));

      if (call > 1) {
        return Promise.resolve({
          fullStream: (function* stream() {
            yield { text: "later", type: "text-delta" };
          })(),
        });
      }

      return Promise.resolve({
        fullStream: (async function* stream() {
          yield { type: "start-step" };
          attempt.onToolExecutionStart();
          attempt.abortSignal.addEventListener("abort", () => {
            abortedDuringTool = true;
          });
          toolStarted.resolve();
          await arrived.promise;
          attempt.onStepEnd([{ content: "sunny", role: "assistant" }]);
          foldedAfterTool.push(...attempt.fold().map(label));
          attempt.onToolExecutionEnd();
          yield { type: "start-step" };
          yield { text: "done", type: "text-delta" };
          attempt.onStepEnd([{ content: "done", role: "assistant" }]);
        })(),
      });
    });

    const first = session.send("weather");
    const firstText = collect(first.textStream);
    await toolStarted.promise;
    const second = session.send("nyc");
    const secondText = collect(second.textStream);
    arrived.resolve();

    expect(await firstText).toBe("done");
    expect(await secondText).toBe("");
    expect(abortedDuringTool).toBe(false);
    expect(foldedAfterTool).toEqual(["user:nyc"]);

    const third = session.send("again");
    expect(await collect(third.textStream)).toBe("later");
    expect(seen[1]).toEqual([
      "user:weather",
      "assistant:sunny",
      "user:nyc",
      "assistant:done",
      "user:again",
    ]);
  });
});
