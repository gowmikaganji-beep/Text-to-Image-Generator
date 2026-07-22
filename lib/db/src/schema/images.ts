import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  size: text("size").notNull().default("1024x1024"),
  style: text("style"),
  quality: text("quality").default("standard"),
  seed: integer("seed"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  generationTimeMs: integer("generation_time_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertImageSchema = createInsertSchema(imagesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof imagesTable.$inferSelect;
