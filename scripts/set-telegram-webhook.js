const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
const baseUrl = process.env.BASE_URL;

if (!(token && secret && baseUrl)) {
  console.error(
    "missing TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN, or BASE_URL"
  );
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  body: JSON.stringify({
    allowed_updates: ["message", "callback_query"],
    secret_token: secret,
    url: new URL("/eve/v1/telegram", baseUrl).toString(),
  }),
  headers: { "Content-Type": "application/json" },
  method: "POST",
});

const data = await res.json();
console.log(data);

if (!data.ok) {
  process.exit(1);
}
