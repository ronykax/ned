import { ned } from "../agent";
import { eachBubble } from "../lib/utils";

const instructions = `## iMessage

You are in iMessage, keep messages short and concise.

- Text like a person does: split a reply into separate bubbles where someone would naturally hit send, like a reaction then a point, or one idea then the next. A quick answer can stay one bubble
- Put a blank line between bubbles. Use single line breaks (no blank lines) for lines that belong in one bubble, like a list
- Markdown is not supported. Markup shows up as raw characters
- Write plain text and bare urls

### Reactions

React to the user's messages now and then, like a friend would.

- To react to a message, send <react emoji="love" id="MESSAGE_ID"/> as its own bubble, using a message ID from context. emoji is any emoji or love/like/dislike/laugh/emphasize/question. A plain emoji is sent as a normal text bubble, not a reaction
- Messages like [reacted love to "..."] mean the user put a tapback on one of your messages. Feel free to say something if you want`;

// biome-ignore lint/suspicious/noExplicitAny: loop message inbound stuff is untyped
export async function imessage(body: any) {
  if (body.channel !== "imessage") {
    return;
  }

  if (body.event === "message_inbound") {
    await fetch("https://a.loopmessage.com/api/v1/message/show-typing/", {
      body: JSON.stringify({
        message_id: body.message_id,
        typing: 60,
      }),
      headers: {
        Authorization: process.env.LOOP_MESSAGE_API_KEY as string,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = await ned({
      content: body.text_markdown,
      extraInstructions: instructions,
      sessionId: body.contact,
    });

    await eachBubble(result.textStream, async (text) => {
      await fetch("https://a.loopmessage.com/api/v1/message/send/", {
        body: JSON.stringify({
          contact: body.contact,
          sender: body.sender,
          text,
        }),
        headers: {
          Authorization: process.env.LOOP_MESSAGE_API_KEY as string,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    });
  }
}
