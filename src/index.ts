import { Elysia } from "elysia";
import { Webhook } from "standardwebhooks";
import { imessage } from "./channels/imessage";

const webhook = new Webhook(
  process.env.PHOTON_WEBHOOK_SIGNING_SECRET as string
);

new Elysia()
  .post("/channels/imessage", async ({ request }) => {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers);

    try {
      const body = webhook.verify(rawBody, headers);
      imessage(body);

      return Response.json("ok", 200);
    } catch {
      return new Response("unauthorized", { status: 401 });
    }
  })
  .listen(process.env.PORT ?? 3000);
