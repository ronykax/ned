import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
  authToken: process.env.DATABASE_AUTH_TOKEN,
  url: process.env.DATABASE_URL as string,
});

export const db = drizzle({ client });
