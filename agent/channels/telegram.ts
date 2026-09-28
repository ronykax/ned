/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: prevent typing as soon as a message is recieved */
import { defaultTelegramAuth, telegramChannel } from "eve/channels/telegram";

const sessions = new Map<string, { buffer: string; typing: boolean }>();

function getSession(chatId: string, conversationId?: string) {
  const key = `${chatId}:${conversationId ?? ""}`;
  let session = sessions.get(key);
  if (!session) {
    session = { buffer: "", typing: false };
    sessions.set(key, session);
  }
  return session;
}

export default telegramChannel({
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  events: {
    "actions.requested": () => {},
    "message.appended": async (data, channel) => {
      const s = getSession(
        channel.telegram.chatId,
        channel.telegram.conversationId
      );

      if (!s.typing) {
        await channel.telegram.startTyping();
        s.typing = true;
      }

      s.buffer += data.messageDelta;
      const lines = s.buffer.split("\n");
      s.buffer = lines.pop() ?? "";

      for (const line of lines) {
        const text = line.trim();
        if (text) {
          // biome-ignore lint/performance/noAwaitInLoops: sequential send
          await channel.telegram.sendMessage(text);
          s.typing = false;
        }
      }

      // resume typing if there's a partial line building up
      if (!s.typing && s.buffer.trim()) {
        await channel.telegram.startTyping();
        s.typing = true;
      }
    },
    "message.completed": async (_, channel) => {
      const key = `${channel.telegram.chatId}:${channel.telegram.conversationId ?? ""}`;
      const s = sessions.get(key);
      if (!s) {
        return;
      }

      const text = s.buffer.trim();
      sessions.delete(key);

      if (text) {
        await channel.telegram.sendMessage(text);
      }
    },
    "turn.started": () => {},
  },
  onMessage: (_, msg) => {
    if (msg.from?.username !== "ronykax" || msg.text.startsWith("/start")) {
      return null;
    }

    return { auth: defaultTelegramAuth(msg) };
  },
  turnPolicy: "steer",
});
