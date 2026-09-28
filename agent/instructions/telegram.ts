import { isChannel } from "eve/channels";
import { defineDynamic, defineInstructions } from "eve/instructions";
import telegram from "../channels/telegram";

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) => {
      if (!isChannel(ctx.channel, telegram)) {
        return null;
      }

      return defineInstructions({
        content: `- 1-2 thoughts per line, no blank lines; each line becomes its own bubble
- This channel sends with no parse_mode, so any markdown or html markup shows as raw characters
- Write for unrendered plain text: prose and bare urls, no markup that only works when rendered`,
      });
    },
  },
});
