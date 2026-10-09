import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

let instance: ReturnType<typeof drizzle> | undefined;

export function db() {
  instance ??= drizzle({
    client: createClient({
      authToken: process.env.DATABASE_AUTH_TOKEN,
      url: process.env.DATABASE_URL as string,
    }),
  });
  return instance;
}
