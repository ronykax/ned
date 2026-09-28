const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const baseUrl = process.env.BASE_URL;

if (!(appId && token && baseUrl)) {
  console.error(
    "missing DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, or BASE_URL"
  );
  process.exit(1);
}

const res = await fetch(
  `https://discord.com/api/v10/applications/${appId}/commands`,
  {
    body: JSON.stringify([
      {
        description: "ask ned anything",
        name: "ask",
        options: [
          {
            description: "what should ned do?",
            name: "message",
            required: true,
            type: 3,
          },
        ],
        type: 1,
      },
    ]),
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    method: "PUT",
  }
);

const data = await res.json();
console.log(data);

if (!res.ok) {
  process.exit(1);
}

const endpointRes = await fetch(
  `https://discord.com/api/v10/applications/${appId}`,
  {
    body: JSON.stringify({
      interactions_endpoint_url: new URL("/eve/v1/discord", baseUrl).toString(),
    }),
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  }
);

const endpointData = await endpointRes.json();
console.log(endpointData);

if (!endpointRes.ok) {
  process.exit(1);
}
