import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schedulesTable = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  instructions: text("instructions").notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }).notNull(),
  minutes: integer("minutes").notNull(),
  recurring: integer("recurring", { mode: "boolean" }).notNull(),
});
