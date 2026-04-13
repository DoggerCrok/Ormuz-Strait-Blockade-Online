import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type PlanCode = "free" | "pro" | "enterprise";
export type RoleCode = "viewer" | "admin";

// ─── Vessel table ────────────────────────────────────────────────────────────
export const vessels = sqliteTable("vessels", {
  mmsi: text("mmsi").primaryKey(),
  name: text("name"),
  imo: text("imo"),
  callsign: text("callsign"),
  shipType: integer("ship_type"),
  flag: text("flag"),
  flagEmoji: text("flag_emoji"),
  lat: real("lat"),
  lon: real("lon"),
  sog: real("sog"),
  cog: real("cog"),
  heading: real("heading"),
  navStatus: integer("nav_status"),
  draught: real("draught"),
  length: real("length"),
  width: real("width"),
  destination: text("destination"),
  cargo: integer("cargo"),
  lastSeen: text("last_seen"),
  trackJson: text("track_json"),
  direction: text("direction"),
  source: text("source"),
});

export const insertVesselSchema = createInsertSchema(vessels);
export type InsertVessel = z.infer<typeof insertVesselSchema>;
export type Vessel = typeof vessels.$inferSelect;

// ─── Crossings table ─────────────────────────────────────────────────────────
export const crossings = sqliteTable("crossings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mmsi: text("mmsi").notNull(),
  vesselName: text("vessel_name"),
  flag: text("flag"),
  flagEmoji: text("flag_emoji"),
  direction: text("direction").notNull(),
  crossedAt: text("crossed_at").notNull(),
  draught: real("draught"),
  length: real("length"),
  width: real("width"),
  shipType: integer("ship_type"),
  cargo: integer("cargo"),
  source: text("source"),
});

export const insertCrossingSchema = createInsertSchema(crossings).omit({ id: true });
export type InsertCrossing = z.infer<typeof insertCrossingSchema>;
export type Crossing = typeof crossings.$inferSelect;

// ─── Users table ─────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<RoleCode>(),
  plan: text("plan").notNull().$type<PlanCode>(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "passwordHash">;
