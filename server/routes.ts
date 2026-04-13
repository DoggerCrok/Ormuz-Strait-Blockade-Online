import type { Express } from "express";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";
import { getDemoVessels } from "./demoData";
import {
  getFlagFromMmsi,
  decodeShipType,
  decodeCargoType,
  decodeNavStatus,
  deriveDirection,
  detectCrossing,
  HORMUZ_BBOX,
  CROSSING_LON,
  CROSSING_LAT_MIN,
  CROSSING_LAT_MAX,
  RESTRICTIONS_START,
} from "./aisUtils";
import type { InsertVessel, InsertCrossing } from "../shared/schema";
import {
  authOptional,
  monetizationGuard,
  requirePlanFeature,
  installAuthRoutes,
  authenticateWs,
  registerWsConnection,
  unregisterWsConnection,
  AUTH_REQUIRED,
} from "./auth";

// ─── Server-side state ────────────────────────────────────────────────────────
const ENV_AIS_API_KEY = process.env.AISSTREAM_API_KEY?.trim() || process.env.AIS_API_KEY?.trim() || null;
const ENV_AIS_SOURCE = (["auto", "aisstream", "demo"].includes(process.env.AIS_SOURCE || "")
  ? process.env.AIS_SOURCE
  : undefined) as "auto" | "aisstream" | "demo" | undefined;

let aisApiKey: string | null = ENV_AIS_API_KEY;
let aisUpstreamWs: WebSocket | null = null;
let dataSource: "auto" | "aisstream" | "demo" = ENV_AIS_SOURCE || "auto";
let demoIntervalId: ReturnType<typeof setInterval> | null = null;
let aisConnected = false;
let lastSync: string | null = null;

// Track previous vessel positions for crossing detection
const prevPositions = new Map<string, { lon: number; lat: number }>();

// ─── Broadcast to all frontend clients ───────────────────────────────────────
let frontendClients: Set<WebSocket> = new Set();

function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data });
  for (const client of frontendClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ─── Process an AIS position update ──────────────────────────────────────────
function processVesselPosition(mmsi: string, lat: number, lon: number, cog: number | null, sog: number | null, heading: number | null, navStatus: number | null, source: string) {
  // Bounding box check
  if (lon < HORMUZ_BBOX.minLon || lon > HORMUZ_BBOX.maxLon || lat < HORMUZ_BBOX.minLat || lat > HORMUZ_BBOX.maxLat) return;

  const existing = storage.getVessel(mmsi);
  const flag = getFlagFromMmsi(mmsi);
  const direction = deriveDirection(cog, lon);
  const now = new Date().toISOString();

  const update: InsertVessel = {
    mmsi,
    lat, lon, cog, sog, heading, navStatus,
    flag: flag.code,
    flagEmoji: flag.emoji,
    direction,
    lastSeen: now,
    source,
    trackJson: "[]",
    name: existing?.name ?? null,
    imo: existing?.imo ?? null,
    callsign: existing?.callsign ?? null,
    shipType: existing?.shipType ?? null,
    cargo: existing?.cargo ?? null,
    draught: existing?.draught ?? null,
    length: existing?.length ?? null,
    width: existing?.width ?? null,
    destination: existing?.destination ?? null,
  };

  const prev = prevPositions.get(mmsi);
  storage.upsertVessel(update);
  const vessel = storage.getVessel(mmsi)!;
  lastSync = now;

  // Crossing detection (only after restrictions start)
  if (new Date() >= RESTRICTIONS_START && prev) {
    const crossDir = detectCrossing(prev.lon, lon, lat, cog);
    if (crossDir) {
      const crossing: InsertCrossing = {
        mmsi,
        vesselName: vessel.name,
        flag: vessel.flag,
        flagEmoji: vessel.flagEmoji,
        direction: crossDir,
        crossedAt: now,
        draught: vessel.draught,
        length: vessel.length,
        width: vessel.width,
        shipType: vessel.shipType,
        cargo: vessel.cargo,
        source,
      };
      const saved = storage.addCrossing(crossing);
      broadcast("crossing", { crossing: saved });
    }
  }

  prevPositions.set(mmsi, { lon, lat });
  broadcast("vessel_update", { vessel });
}

// ─── Process AIS static data ──────────────────────────────────────────────────
function processStaticData(mmsi: string, data: Record<string, unknown>) {
  const existing = storage.getVessel(mmsi) ?? {} as any;
  const flag = getFlagFromMmsi(mmsi);
  const now = new Date().toISOString();

  const update: InsertVessel = {
    mmsi,
    name: (data.Name as string | undefined) || (data.ShipName as string | undefined) || existing.name || null,
    imo: (data.ImoNumber as string | undefined) || existing.imo || null,
    callsign: (data.CallSign as string | undefined) || existing.callsign || null,
    shipType: (data.ShipType as number | undefined) ?? (data.TypeOfShipAndCargoType as number | undefined) ?? existing.shipType ?? null,
    cargo: (data.TypeOfShipAndCargoType as number | undefined) ?? existing.cargo ?? null,
    draught: (data.Draught as number | undefined) ?? existing.draught ?? null,
    length: (data.DimensionToBow as number | undefined) != null && (data.DimensionToStern as number | undefined) != null
      ? ((data.DimensionToBow as number) + (data.DimensionToStern as number))
      : existing.length ?? null,
    width: (data.DimensionToPort as number | undefined) != null && (data.DimensionToStarboard as number | undefined) != null
      ? ((data.DimensionToPort as number) + (data.DimensionToStarboard as number))
      : existing.width ?? null,
    destination: (data.Destination as string | undefined) || existing.destination || null,
    flag: flag.code,
    flagEmoji: flag.emoji,
    lat: existing.lat ?? null,
    lon: existing.lon ?? null,
    sog: existing.sog ?? null,
    cog: existing.cog ?? null,
    heading: existing.heading ?? null,
    navStatus: existing.navStatus ?? null,
    direction: existing.direction ?? null,
    lastSeen: existing.lastSeen || now,
    trackJson: "[]",
    source: existing.source || "aisstream",
  };

  storage.upsertVessel(update);
  const vessel = storage.getVessel(mmsi)!;
  broadcast("vessel_update", { vessel });
}

// ─── Connect to AISStream ─────────────────────────────────────────────────────
function connectAISStream(apiKey: string) {
  if (aisUpstreamWs) {
    aisUpstreamWs.terminate();
    aisUpstreamWs = null;
  }
  aisConnected = false;
  broadcast("connection_status", { aisConnected: false, source: "aisstream" });

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
  aisUpstreamWs = ws;

  ws.on("open", () => {
    const sub = {
      Apikey: apiKey,
      BoundingBoxes: [[
        [HORMUZ_BBOX.minLat, HORMUZ_BBOX.minLon],
        [HORMUZ_BBOX.maxLat, HORMUZ_BBOX.maxLon],
      ]],
      FilterMessageTypes: [
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
        "ShipStaticData",
        "StaticDataReport",
      ],
    };
    ws.send(JSON.stringify(sub));
    aisConnected = true;
    broadcast("connection_status", { aisConnected: true, source: "aisstream" });
    stopDemo();
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const mmsi = String(msg.MetaData?.MMSI || "");
      if (!mmsi) return;

      const msgType: string = msg.MessageType || "";
      const payload = msg.Message?.[msgType];
      if (!payload) return;

      if (["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"].includes(msgType)) {
        processVesselPosition(
          mmsi,
          msg.MetaData?.latitude ?? payload.Latitude,
          msg.MetaData?.longitude ?? payload.Longitude,
          payload.Cog ?? null,
          payload.Sog ?? null,
          payload.TrueHeading ?? null,
          payload.NavigationalStatus ?? null,
          "aisstream"
        );
      } else if (["ShipStaticData", "StaticDataReport"].includes(msgType)) {
        processStaticData(mmsi, payload);
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  ws.on("close", () => {
    aisConnected = false;
    broadcast("connection_status", { aisConnected: false, source: "aisstream" });
    // Reconnect after 10s if key still set
    setTimeout(() => {
      if (aisApiKey && (dataSource === "auto" || dataSource === "aisstream")) {
        connectAISStream(apiKey);
      }
    }, 10000);
  });

  ws.on("error", (err) => {
    console.error("[AISStream] Error:", err.message);
    aisConnected = false;
    broadcast("connection_status", { aisConnected: false, source: "aisstream", error: err.message });
  });
}

// ─── Demo data loop ───────────────────────────────────────────────────────────
function startDemo() {
  if (demoIntervalId) return;
  broadcast("connection_status", { aisConnected: false, source: "demo", demo: true });

  const tick = () => {
    const vessels = getDemoVessels();
    for (const v of vessels) {
      if (v.lat == null || v.lon == null) continue;

      const prev = prevPositions.get(v.mmsi);
      storage.upsertVessel(v);
      const vessel = storage.getVessel(v.mmsi)!;
      const now = new Date().toISOString();
      lastSync = now;

      // Crossing detection for demo
      if (new Date() >= RESTRICTIONS_START && prev) {
        const crossDir = detectCrossing(prev.lon, v.lon!, v.lat!, v.cog ?? null);
        if (crossDir) {
          const crossing: InsertCrossing = {
            mmsi: v.mmsi,
            vesselName: vessel.name,
            flag: vessel.flag,
            flagEmoji: vessel.flagEmoji,
            direction: crossDir,
            crossedAt: now,
            draught: vessel.draught,
            length: vessel.length,
            width: vessel.width,
            shipType: vessel.shipType,
            cargo: vessel.cargo,
            source: "demo",
          };
          const saved = storage.addCrossing(crossing);
          broadcast("crossing", { crossing: saved });
        }
      }

      prevPositions.set(v.mmsi, { lon: v.lon!, lat: v.lat! });
      broadcast("vessel_update", { vessel });
    }
  };

  tick();
  demoIntervalId = setInterval(tick, 5000);
}

function stopDemo() {
  if (demoIntervalId) {
    clearInterval(demoIntervalId);
    demoIntervalId = null;
  }
}

export async function registerRoutes(httpServer: Server, app: Express) {
  app.use("/api", authOptional, monetizationGuard);
  installAuthRoutes(app);

  // ─── WebSocket server for frontend clients ─────────────────────────────────
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (pathname !== "/ws") return;

    const auth = authenticateWs(req);
    if (!auth.ok) {
      socket.write(`HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n${JSON.stringify({ message: auth.message })}`);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      (ws as WebSocket & { authUser?: typeof auth.user; clientKey?: string | null }).authUser = auth.user;
      (ws as WebSocket & { authUser?: typeof auth.user; clientKey?: string | null }).clientKey = auth.clientKey;
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket & { authUser?: any; clientKey?: string | null }) => {
    registerWsConnection(ws.clientKey || null);
    frontendClients.add(ws);
    // Send initial state
    ws.send(JSON.stringify({
      event: "init",
      data: {
        vessels: storage.getAllVessels(),
        crossingsCount: storage.getCrossingsCount(),
        crossings: storage.getCrossings(50),
        aisConnected,
        source: dataSource,
        demo: !aisConnected,
        lastSync,
        restrictionsStart: RESTRICTIONS_START.toISOString(),
        authRequired: AUTH_REQUIRED,
        user: ws.authUser ? storage.toSafeUser(ws.authUser) : null,
      }
    }));
    ws.send(JSON.stringify({
      event: "connection_status",
      data: { aisConnected, source: dataSource, demo: dataSource === "demo" || !aisConnected }
    }));

    const cleanup = () => {
      frontendClients.delete(ws);
      unregisterWsConnection(ws.clientKey || null);
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  // ─── REST API ──────────────────────────────────────────────────────────────
  // Get all vessels
  app.get("/api/vessels", (req, res) => {
    res.json(storage.getAllVessels());
  });

  // Get crossings
  app.get("/api/crossings", (req, res) => {
    const limit = parseInt(String(req.query.limit ?? "50"));
    res.json({
      count: storage.getCrossingsCount(),
      items: storage.getCrossings(limit),
    });
  });

  // Get status
  app.get("/api/status", (req, res) => {
    res.json({
      aisConnected,
      hasKey: !!aisApiKey,
      source: dataSource,
      demo: dataSource === "demo" || !aisConnected,
      lastSync,
      restrictionsStart: RESTRICTIONS_START.toISOString(),
    });
  });

  // Set API key (stored in memory only)
  app.post("/api/settings/apikey", requirePlanFeature("settingsWrite"), (req, res) => {
    const { key } = req.body;
    if (!key || typeof key !== "string" || !key.trim()) {
      aisApiKey = null;
      if (aisUpstreamWs) { aisUpstreamWs.terminate(); aisUpstreamWs = null; }
      aisConnected = false;
      if (dataSource === "auto" || dataSource === "aisstream") startDemo();
      return res.json({ ok: true, message: "Ключ очищен, переключено на демо" });
    }
    aisApiKey = key.trim();
    if (dataSource === "auto" || dataSource === "aisstream") {
      stopDemo();
      connectAISStream(aisApiKey);
    }
    res.json({ ok: true, message: "Ключ сохранён, подключаемся к AISStream..." });
  });

  // Set source mode
  app.post("/api/settings/source", requirePlanFeature("settingsWrite"), (req, res) => {
    const { source } = req.body;
    if (!["auto", "aisstream", "demo"].includes(source)) {
      return res.status(400).json({ error: "Неверный источник" });
    }
    dataSource = source as "auto" | "aisstream" | "demo";
    if (dataSource === "demo") {
      if (aisUpstreamWs) { aisUpstreamWs.terminate(); aisUpstreamWs = null; aisConnected = false; }
      startDemo();
    } else if (dataSource === "aisstream") {
      stopDemo();
      if (aisApiKey) connectAISStream(aisApiKey);
      else res.json({ ok: true, message: "Введите API ключ для подключения к AISStream" });
      return res.json({ ok: true });
    } else {
      // auto: use aisstream if key available, else demo
      if (aisApiKey) { stopDemo(); connectAISStream(aisApiKey); }
      else startDemo();
    }
    res.json({ ok: true });
  });

  // Decode utilities exposed to frontend
  app.get("/api/decode/shiptype/:code", (req, res) => {
    res.json({ label: decodeShipType(parseInt(req.params.code)) });
  });

  app.get("/api/auth/config", (_req, res) => {
    res.json({ requireAuth: AUTH_REQUIRED });
  });

  // ─── Bootstrap: start from env-backed source if available ─────────────────
  if (dataSource === "demo") {
    startDemo();
  } else if (aisApiKey) {
    stopDemo();
    connectAISStream(aisApiKey);
  } else {
    startDemo();
  }
}
