import { registerTelemetry } from "ai";
import { braintrustAISDKTelemetry, initLogger } from "braintrust";
import { Elysia } from "elysia";
import { imessage } from "./channels/imessage";

initLogger({
  apiKey: process.env.BRAINTRUST_API_KEY,
  projectName: "ned",
});

registerTelemetry(braintrustAISDKTelemetry());

new Elysia()
  .post("/channels/imessage", ({ body, request }) => {
    if (
      request.headers.get("authorization") !==
      process.env.LOOP_MESSAGE_WEBHOOK_HEADER
    ) {
      return new Response("unauthorized", { status: 401 });
    }

    imessage(body);
    return new Response("ok", { status: 200 });
  })
  .listen(process.env.PORT ?? 3000);

console.log(`
▄▄  ▄▄ ▄▄▄▄▄ ▄▄▄▄
███▄██ ██▄▄  ██▀██
██ ▀██ ██▄▄▄ ████▀
\n`);
