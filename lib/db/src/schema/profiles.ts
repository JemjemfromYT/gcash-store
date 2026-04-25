import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  unlockedHeroes: text("unlocked_heroes").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type InsertProfile = typeof profilesTable.$inferInsert;
