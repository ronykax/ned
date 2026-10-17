import { Photon } from "@photon-ai/api";
import type { FilePart, TextPart } from "ai";
import { ned } from "../agent";
import { makeContext } from "../lib/utils";

const instructions = `## iMessage

You are in iMessage, keep messages short and concise.

- Text like a person does: split a reply into separate bubbles where someone would naturally hit send, like a reaction then a point, or one idea then the next. A quick answer can stay one bubble
- Put a blank line between bubbles. Use single line breaks (no blank lines) for lines that belong in one bubble, like a list
- Markdown is not supported. Markup shows up as raw characters
- Write plain text and bare urls

### Reactions

React to the user's messages now and then, like a friend would.

- To react to a message, send <react emoji="love" id="MESSAGE_ID"/> as its own bubble, using a message ID from context. emoji is any emoji or love/like/dislike/laugh/emphasize/question. A plain emoji is sent as a normal text bubble, not a reaction
- Messages like [reacted love to "..."] mean the user put a tapback on one of your messages. Feel free to say something if you want

### Replies

Reply to a specific message when it helps, like when the user seems confused or you want to make clear which message you mean.

To reply to a message, wrap your reply in <reply id="MESSAGE_ID">...</reply>, using a message ID from context`;

const photon = new Photon({
  headers: { Authorization: `Bearer ${process.env.PHOTON_API_KEY}` },
});

async function toFilePart(
  projectId: string,
  attachmentId: string
): Promise<FilePart> {
  const [attachment, blob] = await Promise.all([
    photon.projects.getAttachment({
      path: { attachmentId, id: projectId },
    }),
    photon.projects.downloadAttachment({
      path: { attachmentId, id: projectId },
    }),
  ]);

  return {
    mediaType: attachment.contentType,
    type: "file",
    ...(attachment.filename ? { filename: attachment.filename } : {}),
    data: new Uint8Array(await blob.arrayBuffer()),
  };
}

async function toParts(
  projectId: string,
  content: unknown
): Promise<Array<TextPart | FilePart>> {
  if (!content || typeof content !== "object") {
    return [];
  }

  const { attachmentId, parts, text, type } = content as {
    attachmentId?: string;
    parts?: unknown[];
    text?: string;
    type?: string;
  };

  if (type === "text" && typeof text === "string") {
    return [{ text, type: "text" }];
  }

  if (type === "attachment" && typeof attachmentId === "string") {
    return [await toFilePart(projectId, attachmentId)];
  }

  if (type === "group" && Array.isArray(parts)) {
    return (
      await Promise.all(parts.map((part) => toParts(projectId, part)))
    ).flat();
  }

  return [];
}

// biome-ignore lint/suspicious/noExplicitAny: webhook payload shape is untyped
export async function imessage(body: any) {
  if (body.type === "message.received") {
    const projectId = body.data.projectId as string;
    const message = body.data.object;
    const parts = await toParts(projectId, message.content);

    if (parts.length === 0) {
      return;
    }

    const contextPart = makeContext({
      channel: "imessage",
      from: message.sentBy.handle,
      message_id: message.id,
      "time (UTC)": message.timestamps.receivedAt,
    });

    const result = await ned({
      content: [contextPart, ...parts],
      extraInstructions: instructions,
      sessionId: message.space.id,
    });

    let buffer = "";
    let bubbleIndex = 0;

    const sendBubble = async (text: string) => {
      await photon.projects.sendMessage({
        body: {
          content: { format: "plain", text, type: "text" },
          senderId: message.receivedBy.id,
          spaceId: message.space.id,
        },
        headers: {
          "idempotency-key": `ned-reply:${message.id}:${bubbleIndex}`,
        },
        path: { id: projectId },
      });
      bubbleIndex += 1;
    };

    for await (const delta of result.textStream) {
      const bubbles = (buffer + delta).split("\n\n");
      buffer = bubbles.pop() ?? "";

      for (const bubble of bubbles) {
        if (bubble.trim()) {
          // biome-ignore lint/performance/noAwaitInLoops: send bubbles in order
          await sendBubble(bubble.trim());
        }
      }
    }

    if (buffer.trim()) {
      await sendBubble(buffer.trim());
    }
  }
}
