<a href="https://chibeeu.com">
  <img src="ned.png" width="128" height="128">
</a>

<br>
<br>

**ned** is a personal agent.<br>
he's built on the [**eve**](https://eve.dev) framework.

## note

this project is highly customized for my personal needs. if you like how ned works, feel free to clone the repo and let your own coding agent go through the code to copy ned's capabilities.

## setup

- expose `localhost:3000` with `cloudflared`.

- create a `.env` file to define the following variables:
    ```env
    BASE_URL=... # tunnel URL
    CLOUDFLARE_TUNNEL_TOKEN=... # optional

    OPENAI_API_KEY=...

    DATABASE_URL=...
    DATABASE_AUTH_TOKEN=... # optional if local sqlite

    SUPERMEMORY_API_KEY=...

    DISCORD_APPLICATION_ID=...
    DISCORD_BOT_TOKEN=...
    DISCORD_PUBLIC_KEY=...

    TELEGRAM_BOT_USERNAME=...
    TELEGRAM_BOT_TOKEN=...
    TELEGRAM_WEBHOOK_SECRET_TOKEN=...

    PHOTON_API_KEY=...
    PHOTON_PHONE_NUMBER=...
    ```

- run `npm run db:migrate` to apply migrations.

- run `npm run clean` (optional), `npm run build`, and `npm run start` to build and start the agent.

- run `node --env-file=.env scripts/set-telegram-webhook.js` to set the webhook URL.

- run `node --env-file=.env scripts/setup-discord.js` to register an `ask` command and configure the interactions endpoint URL.

## todo

- [x] memory
- [x] dynamic scheduling
- [x] sandbox
- [x] compaction
- [ ] make schedules channel specific

## unusable
- agent-browser
- computer-use