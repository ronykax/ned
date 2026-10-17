import { Photon } from "@photon-ai/api";
import type { FilePart, TextPart } from "ai";
import { ned } from "../agent";

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
    const message = body.data.object;
    const projectId = (body.data.projectId ?? message.projectId) as string;
    const parts = await toParts(projectId, message.content);

    if (parts.length === 0) {
      return;
    }

    const result = await ned(message.space.id, parts);

    if (!result.text) {
      return;
    }

    await photon.projects.sendMessage({
      body: {
        content: { format: "plain", text: result.text, type: "text" },
        senderId: message.receivedBy.id,
        spaceId: message.space.id,
      },
      headers: { "idempotency-key": `ned-reply:${message.id}` },
      path: { id: projectId },
    });
  }
}
