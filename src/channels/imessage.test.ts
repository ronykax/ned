import { describe, expect, test } from "bun:test";
import { parseBubble } from "./imessage";

const id = "59c55ce8-41d6-43cc-9116-8cfb2e696d7b";

describe("parseBubble", () => {
  test("reads a reaction bubble", () => {
    expect(parseBubble(`+love ${id}`)).toEqual({
      kind: "reaction",
      messageId: id,
      reaction: "love",
    });
  });

  test("reads a reply", () => {
    expect(parseBubble(`>${id} haha yeah that was wild`)).toEqual({
      kind: "message",
      replyToId: id,
      text: "haha yeah that was wild",
    });
  });

  test("reads a message effect", () => {
    expect(parseBubble("!confetti you got the job??")).toEqual({
      effect: "confetti",
      kind: "message",
      text: "you got the job??",
    });
  });

  test("reads a reply with a message effect", () => {
    expect(parseBubble(`>${id} !confetti no way you got it`)).toEqual({
      effect: "confetti",
      kind: "message",
      replyToId: id,
      text: "no way you got it",
    });
  });

  test("leaves text effect tags in the text", () => {
    expect(
      parseBubble(`>${id} !confetti no way you [big]got[/big] it`)
    ).toEqual({
      effect: "confetti",
      kind: "message",
      replyToId: id,
      text: "no way you [big]got[/big] it",
    });
  });

  test("leaves a normal bubble alone", () => {
    expect(parseBubble("that was actually wild")).toEqual({
      kind: "message",
      text: "that was actually wild",
    });
  });
});
