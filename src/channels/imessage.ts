import { ned } from "../agent";
import { eachBubble, makeContext } from "../lib/utils";

const instructions = `## iMessage

You are in iMessage, keep messages short and concise.

- Text like a person does: split a reply into separate bubbles where someone would naturally hit send, like a reaction then a point, or one idea then the next. A quick answer can stay one bubble
- Put a blank line between bubbles. Use single line breaks (no blank lines) for lines that belong in one bubble, like a list
- Markdown is not supported. Markup shows up as raw characters
- Write plain text and bare urls

### Reactions

React to the user's messages now and then, like a friend would.

- To react, send a bubble with only a plus sign, the reaction, a space, and the message ID from context. Example: +love 59c55ce8-41d6-43cc-9116-8cfb2e696d7b
- The reaction can be love, like, dislike, laugh, emphasize, question, or any single emoji
- A reaction bubble has nothing else in it

### Replies

Reply to a specific message only when it helps, like when the user sent several messages and you answer an older one.

- To reply, start the bubble with > and the message ID from context, then a space, then your text. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b haha yeah that was wild
- Only the bubble that starts with > is a reply. Other bubbles are sent as normal`;

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
    await useAPI("/message/show-typing/", {
      message_id: body.message_id,
      typing: 60,
    });

    let replyingTo: string | undefined;
    if (body.thread) {
      const res = await useAPI(
        `/message/status/${body.thread.initial_message_id}/`
      );

      if (res.ok) {
        // biome-ignore lint/suspicious/noExplicitAny: no
        replyingTo = ((await res.json()) as any).text;
      }
    }

    const context = makeContext({
      channel: "iMessage",
      "message ID": body.message_id,
      ...(replyingTo && { "replying to": replyingTo }),
    });

    const result = await ned({
      content: [
        { text: context, type: "text" },
        { text: body.text_markdown, type: "text" },
      ],
      extraInstructions: instructions,
      sessionId: body.contact,
    });

    await eachBubble(result.textStream, async (bubble) => {
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

      // biome-ignore lint/performance/useTopLevelRegex: no
      const reply = bubble.match(/^>([\w-]+) ([\s\S]+)$/);
      if (reply) {
        await useAPI("/message/send/", {
          contact: body.contact,
          reply_to_id: reply[1],
          sender: body.sender,
          text: reply[2],
        });
        return;
      }

      await useAPI("/message/send/", {
        contact: body.contact,
        sender: body.sender,
        text: bubble,
      });
    });
  }
}
