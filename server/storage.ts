import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import * as schema from "../shared/schema";
import type { Vessel, InsertVessel, Crossing, InsertCrossing, User, InsertUser, SafeUser, RoleCode, PlanCode } from "../shared/schema";

const sqlitePath = process.env.SQLITE_PATH?.trim() || "hormuz.db";
const sqlite = new Database(sqlitePath);
export const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS vessels (
    mmsi TEXT PRIMARY KEY,
    name TEXT,
    imo TEXT,
    callsign TEXT,
    ship_type INTEGER,
    flag TEXT,
    flag_emoji TEXT,
    lat REAL,
    lon REAL,
    sog REAL,
    cog REAL,
    heading REAL,
    nav_status INTEGER,
    draught REAL,
    length REAL,
    width REAL,
    destination TEXT,
    cargo INTEGER,
    last_seen TEXT,
    track_json TEXT,
    direction TEXT,
    source TEXT
  );
  CREATE TABLE IF NOT EXISTS crossings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mmsi TEXT NOT NULL,
    vessel_name TEXT,
    flag TEXT,
    flag_emoji TEXT,
    direction TEXT NOT NULL,
    crossed_at TEXT NOT NULL,
    draught REAL,
    length REAL,
    width REAL,
    ship_type INTEGER,
    cargo INTEGER,
    source TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  upsertVessel(v: InsertVessel): Vessel;
  getVessel(mmsi: string): Vessel | undefined;
  getAllVessels(): Vessel[];
  addCrossing(c: InsertCrossing): Crossing;
  getCrossings(limit?: number): Crossing[];
  getCrossingsCount(): number;
  createUser(user: InsertUser): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: string): User | undefined;
  toSafeUser(user: User): SafeUser;
}

export class Storage implements IStorage {
  upsertVessel(v: InsertVessel): Vessel {
    const existing = db.select().from(schema.vessels).where(eq(schema.vessels.mmsi, v.mmsi)).get();
    if (existing) {
      let track: Array<{ lat: number; lon: number; ts: string }> = [];
      try { track = JSON.parse(existing.trackJson || "[]"); } catch { track = []; }
      if (v.lat != null && v.lon != null) {
        track.push({ lat: v.lat, lon: v.lon, ts: v.lastSeen || new Date().toISOString() });
        if (track.length > 30) track = track.slice(-30);
      }
      const updated = { ...existing, ...v, trackJson: JSON.stringify(track) };
      db.update(schema.vessels).set(updated).where(eq(schema.vessels.mmsi, v.mmsi)).run();
      return db.select().from(schema.vessels).where(eq(schema.vessels.mmsi, v.mmsi)).get() as Vessel;
    } else {
      const track = v.lat != null && v.lon != null
        ? JSON.stringify([{ lat: v.lat, lon: v.lon, ts: v.lastSeen || new Date().toISOString() }])
        : "[]";
      const row = { ...v, trackJson: track };
      return db.insert(schema.vessels).values(row).returning().get() as Vessel;
    }
  }

  getVessel(mmsi: string): Vessel | undefined {
    return db.select().from(schema.vessels).where(eq(schema.vessels.mmsi, mmsi)).get();
  }

  getAllVessels(): Vessel[] {
    return db.select().from(schema.vessels).all();
  }

  addCrossing(c: InsertCrossing): Crossing {
    return db.insert(schema.crossings).values(c).returning().get() as Crossing;
  }

  getCrossings(limit = 50): Crossing[] {
    return db.select().from(schema.crossings).orderBy(desc(schema.crossings.crossedAt)).limit(limit).all();
  }

  getCrossingsCount(): number {
    const result = sqlite.prepare("SELECT COUNT(*) as cnt FROM crossings").get() as { cnt: number };
    return result.cnt;
  }

  createUser(user: InsertUser): User {
    return db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as RoleCode,
      plan: user.plan as PlanCode,
      status: user.status,
      createdAt: new Date().toISOString(),
    }).returning().get() as User;
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  }

  getUserById(id: string): User | undefined {
    return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export const storage = new Storage();

function ensureDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;
  if (storage.getUserByEmail(adminEmail.toLowerCase())) return;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(adminPassword, salt, 64).toString("hex");
  storage.createUser({
    email: adminEmail.toLowerCase(),
    passwordHash: `${salt}:${hash}`,
    role: "admin",
    plan: "enterprise",
    status: "active",
  });
}

ensureDefaultAdmin();
