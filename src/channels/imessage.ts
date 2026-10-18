import { ned } from "../agent";
import { eachBubble, makeContext } from "../lib/utils";

const instructions = `## CHANNEL

You are in iMessage, keep messages short and concise.

- Text like a person does: split a reply into separate bubbles where someone would naturally hit send, like a reaction then a point, or one idea then the next. A quick answer can stay one bubble
- Put a blank line between bubbles. Use single line breaks (no blank lines) for lines that belong in one bubble, like a list
- A few inline styles render. The markers touch the words. One asterisk is bold: *bold*. One underscore is italic: _italic_. Two underscores are underline: __underline__. One tilde is strikethrough: ~strike~. Example: that was *actually* wild
- Two asterisks, two tildes, headings, \`code\`, and [label](url) show up as raw characters. A link is a bare url. A list is plain lines. A line starting with * is not a bullet
- Bracket tags are the text effects under Effects. They render in the sentence

### Reactions

React to the user's messages now and then, like a friend would.

- To react, send a bubble with only a plus sign, the reaction, a space, and the message ID from context. Example: +love 59c55ce8-41d6-43cc-9116-8cfb2e696d7b
- The reaction can be love, like, dislike, laugh, emphasize, question, or any single emoji
- A reaction bubble has nothing else in it

### Replies

Reply to a specific message only when it helps, like when the user sent several messages and you answer an older one.

- To reply, start the bubble with > and the message ID from context, then a space, then your text. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b haha yeah that was wild
- > is only this prefix. It is not a quote
- Only the bubble that starts with > is a reply. Other bubbles are sent as normal

### Effects

Message effects and text effects are different. Use a message effect for a real moment, like good news, a win, or a big joke. Most replies have none. Use a text effect now and then on a word or short phrase, to stress it or add tone.

- A message effect starts the bubble with ! and the name, then a space, then the text. Example: !confetti you got the job??
- Bubble effects: slam, loud, gentle, invisibleInk
- Screen effects: echo, spotlight, balloons, confetti, love, lasers, fireworks, shootingStar, celebration
- Use invisibleInk for spoilers or surprises
- One message effect in a reply
- A text effect stays in the sentence. Wrap the words and close the tag. Example: that was [shake]so[/shake] bad
- Tag names: big, small, shake, nod, explode, ripple, bloom, jitter
- Those tags render as animations. ! is only for a message effect, so !shake is wrong

### Combining

- A reply can have a message effect. Put the reply first, then the effect. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b !confetti no way you got it
- Text effect tags and inline styles stay in the text. If the bubble also has a reply or a message effect, those prefixes still come first. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b !confetti no way you [big]got[/big] it
- A reaction is always its own bubble with nothing else
- To react and also say something, send the reaction bubble, then a normal bubble`;

const useAPI = (url: string, body?: object) =>
  fetch(`https://a.loopmessage.com/api/v1${url}`, {
    body: body && JSON.stringify(body),
    headers: {
      Authorization: process.env.LOOP_MESSAGE_API_KEY as string,
      "Content-Type": "application/json",
    },
    method: body ? "POST" : "GET",
  });

// biome-ignore lint/suspicious/noExplicitAny: loop message inbound stuff is untyped
export async function imessage(body: any) {
  if (body.channel !== "imessage") {
    return;
  }

  if (body.event === "message_inbound") {
    // console.log("\nBODY", JSON.stringify(body, null, 2), "\n");

    await useAPI("/message/show-typing/", {
      message_id: body.message_id,
      typing: 60,
    });

    let replyingTo: string | undefined;
    let replyingToHandle: string | undefined;

    if (body.thread) {
      const res = await useAPI(
        `/message/status/${body.thread.initial_message_id}/`
      );

      if (res.ok) {
        // biome-ignore lint/suspicious/noExplicitAny: no
        const { text, contact } = (await res.json()) as any;
        replyingToHandle = contact;

        const limit = 80;
        replyingTo = text.length > limit ? `${text.slice(0, limit)}...` : text;
      }
    }

    const context = makeContext({
      channel: "iMessage",
      handle: body.contact,
      "message ID": body.message_id,

      // reply context
      ...(replyingToHandle && { "replying to handle": replyingToHandle }),
      ...(replyingTo && { "replying to": replyingTo }),

      // message effect
      ...(body.effect && { effect: body.effect }),
    });

    const result = await ned({
      content: [
        { text: context, type: "text" },
        ...(body.text_markdown
          ? [{ text: body.text_markdown, type: "text" as const }]
          : []),
      ],
      extraInstructions: instructions,
      sessionId: body.contact,
    });

    await eachBubble(result.textStream, async (bubble) => {
      if (!bubble) {
        return;
      }

      // biome-ignore lint/performance/useTopLevelRegex: no
      const react = bubble.match(/^\+(\S+) ([\w-]+)$/);
      if (react) {
        await useAPI("/message/send/", {
          contact: body.contact,
          message_id: react[2],
          reaction: react[1],
          sender: body.sender,
        });
        return;
      }

      let text = bubble;
      let reply_to_id: string | undefined;
      let effect: string | undefined;

      // biome-ignore lint/performance/useTopLevelRegex: no
      const [, replyId, replyText] = text.match(/^>([\w-]+) ([\s\S]+)$/) ?? [];
      if (replyId && replyText) {
        reply_to_id = replyId;
        text = replyText;
      }

      // biome-ignore lint/performance/useTopLevelRegex: no
      const [, fxName, fxText] = text.match(/^!(\w+) ([\s\S]+)$/) ?? [];
      if (fxName && fxText) {
        effect = fxName;
        text = fxText;
      }

      await useAPI("/message/send/", {
        contact: body.contact,
        effect,
        reply_to_id,
        sender: body.sender,
        text,
      });
    });
  }
}
