import { getFlagFromMmsi, deriveDirection, HORMUZ_BBOX } from "./aisUtils";
import type { InsertVessel } from "../shared/schema";

// Realistic demo vessels for the Strait of Hormuz
const DEMO_VESSELS_SEED: Array<{
  mmsi: string;
  name: string;
  shipType: number;
  cargo: number;
  draught: number;
  length: number;
  width: number;
  destination: string;
  baseLat: number;
  baseLon: number;
  cog: number;  // course
  sog: number;  // speed
  navStatus: number;
}> = [
  // Tankers outbound (Gulf → Ocean)
  { mmsi: "422123456", name: "IRAN SHAHID", shipType: 80, cargo: 81, draught: 18.5, length: 332, width: 58, destination: "SINGAPORE", baseLat: 26.55, baseLon: 56.3, cog: 115, sog: 12.4, navStatus: 0 },
  { mmsi: "538009123", name: "PACIFIC TITAN", shipType: 80, cargo: 85, draught: 14.2, length: 274, width: 48, destination: "FUJAIRAH OT", baseLat: 26.3, baseLon: 56.8, cog: 130, sog: 11.1, navStatus: 0 },
  { mmsi: "636012345", name: "ATLANTIC PRIDE", shipType: 80, cargo: 81, draught: 19.1, length: 330, width: 56, destination: "HOUSTON", baseLat: 26.62, baseLon: 57.1, cog: 108, sog: 13.2, navStatus: 0 },
  { mmsi: "477012345", name: "ORIENT SPIRIT", shipType: 80, cargo: 82, draught: 11.8, length: 240, width: 42, destination: "YOKOHAMA", baseLat: 26.45, baseLon: 57.4, cog: 95, sog: 10.8, navStatus: 0 },
  { mmsi: "351456789", name: "GULF PIONEER", shipType: 80, cargo: 80, draught: 16.3, length: 295, width: 52, destination: "ROTTERDAM", baseLat: 26.7, baseLon: 56.0, cog: 120, sog: 12.0, navStatus: 0 },

  // Tankers inbound (Ocean → Gulf)
  { mmsi: "308901234", name: "MONTE CARLO", shipType: 80, cargo: 80, draught: 5.2, length: 274, width: 48, destination: "ABU DHABI", baseLat: 26.4, baseLon: 57.8, cog: 285, sog: 11.5, navStatus: 0 },
  { mmsi: "215345678", name: "VALLETTA TRADER", shipType: 80, cargo: 83, draught: 4.8, length: 250, width: 44, destination: "BANDAR IMAM KHOMEINI", baseLat: 26.2, baseLon: 57.2, cog: 270, sog: 10.2, navStatus: 0 },
  { mmsi: "563987654", name: "SINGAPORE STAR", shipType: 80, cargo: 82, draught: 6.1, length: 295, width: 52, destination: "RAS LAFFAN", baseLat: 26.55, baseLon: 58.0, cog: 278, sog: 12.8, navStatus: 0 },

  // Gas carriers (LNG/LPG)
  { mmsi: "466123789", name: "AL GHARRAFA", shipType: 80, cargo: 82, draught: 11.2, length: 315, width: 50, destination: "ZEEBRUGGE", baseLat: 26.8, baseLon: 56.6, cog: 110, sog: 18.5, navStatus: 0 },
  { mmsi: "470567890", name: "AL HAMRA", shipType: 80, cargo: 82, draught: 10.8, length: 295, width: 46, destination: "INCHEON", baseLat: 26.35, baseLon: 57.5, cog: 105, sog: 17.2, navStatus: 0 },

  // Bulk carriers / dry cargo
  { mmsi: "440234567", name: "KOREA GALAXY", shipType: 70, cargo: 71, draught: 9.8, length: 225, width: 32, destination: "JEBEL ALI", baseLat: 26.15, baseLon: 56.9, cog: 265, sog: 9.5, navStatus: 0 },
  { mmsi: "431567890", name: "FUJI MARU", shipType: 70, cargo: 71, draught: 8.4, length: 190, width: 30, destination: "SHUWAIKH", baseLat: 26.9, baseLon: 55.8, cog: 118, sog: 8.8, navStatus: 0 },

  // Containers
  { mmsi: "413456789", name: "COSCO HORMUZ", shipType: 70, cargo: 72, draught: 12.5, length: 368, width: 51, destination: "JEBEL ALI", baseLat: 26.55, baseLon: 58.2, cog: 272, sog: 14.5, navStatus: 0 },
  { mmsi: "477345678", name: "HAPAG STRAITS", shipType: 70, cargo: 72, draught: 13.2, length: 340, width: 48, destination: "COLOMBO", baseLat: 26.3, baseLon: 56.4, cog: 125, sog: 15.1, navStatus: 0 },

  // Anchor / maneuvering
  { mmsi: "461987654", name: "OMAN SUPPLIER", shipType: 52, cargo: 50, draught: 5.8, length: 68, width: 14, destination: "KHASAB", baseLat: 26.18, baseLon: 56.25, cog: 0, sog: 0.2, navStatus: 1 },
  { mmsi: "403234567", name: "ARABIAN SEA", shipType: 80, cargo: 81, draught: 17.5, length: 310, width: 54, destination: "JUBAIL", baseLat: 26.6, baseLon: 55.5, cog: 340, sog: 1.1, navStatus: 3 },

  // Warships / patrol (military)
  { mmsi: "338123456", name: "USN PATROL", shipType: 35, cargo: 50, draught: 6.5, length: 155, width: 18, destination: "BAHRAIN", baseLat: 26.85, baseLon: 56.4, cog: 290, sog: 22.0, navStatus: 0 },
  { mmsi: "422789012", name: "IRAN NAVY 1", shipType: 35, cargo: 50, draught: 4.2, length: 94, width: 13, destination: "BANDAR ABBAS", baseLat: 27.1, baseLon: 56.2, cog: 155, sog: 18.5, navStatus: 0 },

  // Small tankers / product
  { mmsi: "470234890", name: "DUBAI GLORY", shipType: 80, cargo: 84, draught: 8.1, length: 183, width: 28, destination: "FUJAIRAH", baseLat: 25.5, baseLon: 57.8, cog: 285, sog: 9.2, navStatus: 0 },
  { mmsi: "408456789", name: "BAHRAIN SPIRIT", shipType: 80, cargo: 81, draught: 9.4, length: 200, width: 32, destination: "SITRA", baseLat: 26.1, baseLon: 56.7, cog: 270, sog: 10.5, navStatus: 0 },
];

// In-memory vessel states with positions
const vesselStates = new Map<string, {
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  seed: typeof DEMO_VESSELS_SEED[number];
}>();

// Initialize states
for (const v of DEMO_VESSELS_SEED) {
  vesselStates.set(v.mmsi, { lat: v.baseLat, lon: v.baseLon, cog: v.cog, sog: v.sog, seed: v });
}

// Move vessels realistically
function updatePositions() {
  for (const [mmsi, state] of vesselStates.entries()) {
    const { sog, cog, seed } = state;
    if (sog < 0.5) continue;

    // Convert knots to degrees per tick
    // Real: 1 knot = 0.514444 m/s, 1 degree = ~111320m
    // Simulated tick = 5 min for realistic movement in demo
    const speedDeg = (sog * 0.514444) / 111320; // degrees per second
    const dt = 300; // simulate 5 minutes per tick for visible movement
    const dx = speedDeg * dt * Math.sin((cog * Math.PI) / 180);
    const dy = speedDeg * dt * Math.cos((cog * Math.PI) / 180);

    let newLon = state.lon + dx;
    let newLat = state.lat + dy;
    let newCog = state.cog + (Math.random() - 0.5) * 2; // slight course variation

    // Wrap back to bounding box
    const bbox = HORMUZ_BBOX;
    if (newLon > bbox.maxLon) { newLon = bbox.minLon + 0.5; newCog = seed.cog; }
    if (newLon < bbox.minLon) { newLon = bbox.maxLon - 0.5; newCog = seed.cog; }
    if (newLat > bbox.maxLat) { newLat = bbox.minLat + 0.5; newCog = ((newCog + 180) % 360); }
    if (newLat < bbox.minLat) { newLat = bbox.maxLat - 0.5; newCog = ((newCog + 180) % 360); }

    vesselStates.set(mmsi, { ...state, lat: newLat, lon: newLon, cog: newCog % 360 });
  }
}

export function getDemoVessels(): InsertVessel[] {
  updatePositions();
  const now = new Date().toISOString();
  const result: InsertVessel[] = [];

  for (const [mmsi, state] of vesselStates.entries()) {
    const { lat, lon, cog, sog, seed } = state;
    const flag = getFlagFromMmsi(mmsi);
    result.push({
      mmsi,
      name: seed.name,
      shipType: seed.shipType,
      cargo: seed.cargo,
      draught: seed.draught,
      length: seed.length,
      width: seed.width,
      destination: seed.destination,
      lat,
      lon,
      cog,
      sog,
      heading: cog,
      navStatus: seed.navStatus,
      flag: flag.code,
      flagEmoji: flag.emoji,
      lastSeen: now,
      trackJson: "[]",
      direction: deriveDirection(cog, lon),
      source: "demo",
      imo: null,
      callsign: null,
    });
  }
  return result;
}

export function getDemoVesselCount(): number {
  return DEMO_VESSELS_SEED.length;
}
