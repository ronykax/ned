import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    authToken: process.env.DATABASE_AUTH_TOKEN,
    url: process.env.DATABASE_URL as string,
  },
  dialect: "turso",
  schema: "agent/lib/db/schema.ts",
});
