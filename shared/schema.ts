import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// URL links schema
export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalUrl: text("original_url").notNull(),
  shortCode: text("short_code").notNull().unique(),
  customAlias: text("custom_alias"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  clickCount: integer("click_count").default(0),
});

export const insertLinkSchema = createInsertSchema(links).pick({
  userId: true,
  originalUrl: true,
  customAlias: true,
  expiresAt: true,
}).extend({
  customAlias: z.string().optional(),
  expiresAt: z.string().optional().nullable(),
});

// Click analytics schema
export const clicks = pgTable("clicks", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").notNull().references(() => links.id),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
  referrer: text("referrer"),
  country: text("country"),
});

export const insertClickSchema = createInsertSchema(clicks).pick({
  linkId: true,
  ipAddress: true,
  userAgent: true,
  device: true,
  browser: true,
  os: true,
  referrer: true,
  country: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;

export type InsertClick = z.infer<typeof insertClickSchema>;
export type Click = typeof clicks.$inferSelect;

// Custom types for analytics
export type ClickStat = {
  date: string;
  count: number;
};

export type DeviceStat = {
  device: string;
  count: number;
  percentage: number;
};

export type LinkWithAnalytics = Link & {
  isExpired: boolean;
  isExpiringSoon: boolean;
  clickStats?: ClickStat[];
  deviceStats?: DeviceStat[];
};
