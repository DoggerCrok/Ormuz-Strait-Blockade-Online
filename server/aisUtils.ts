// ─── MID (Maritime Identification Digits) → country/flag ─────────────────────
// Prefix table for the main regional countries + global fallback
const MID_TABLE: Record<string, { country: string; code: string; emoji: string }> = {
  // Iran
  "422": { country: "Iran", code: "IR", emoji: "🇮🇷" },
  // Saudi Arabia
  "403": { country: "Saudi Arabia", code: "SA", emoji: "🇸🇦" },
  // UAE
  "470": { country: "UAE", code: "AE", emoji: "🇦🇪" },
  "471": { country: "UAE", code: "AE", emoji: "🇦🇪" },
  // Oman
  "461": { country: "Oman", code: "OM", emoji: "🇴🇲" },
  // Kuwait
  "447": { country: "Kuwait", code: "KW", emoji: "🇰🇼" },
  // Bahrain
  "408": { country: "Bahrain", code: "BH", emoji: "🇧🇭" },
  // Qatar
  "466": { country: "Qatar", code: "QA", emoji: "🇶🇦" },
  // Iraq
  "425": { country: "Iraq", code: "IQ", emoji: "🇮🇶" },
  // Pakistan
  "463": { country: "Pakistan", code: "PK", emoji: "🇵🇰" },
  // India
  "419": { country: "India", code: "IN", emoji: "🇮🇳" },
  // China
  "413": { country: "China", code: "CN", emoji: "🇨🇳" },
  "412": { country: "China", code: "CN", emoji: "🇨🇳" },
  "414": { country: "China", code: "CN", emoji: "🇨🇳" },
  // Russia
  "273": { country: "Russia", code: "RU", emoji: "🇷🇺" },
  // Marshall Islands (popular flag of convenience)
  "538": { country: "Marshall Islands", code: "MH", emoji: "🇲🇭" },
  // Panama (popular flag of convenience)
  "351": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "352": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "353": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "354": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "355": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "356": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  "357": { country: "Panama", code: "PA", emoji: "🇵🇦" },
  // Liberia
  "636": { country: "Liberia", code: "LR", emoji: "🇱🇷" },
  // Bahamas
  "308": { country: "Bahamas", code: "BS", emoji: "🇧🇸" },
  "309": { country: "Bahamas", code: "BS", emoji: "🇧🇸" },
  // Malta
  "215": { country: "Malta", code: "MT", emoji: "🇲🇹" },
  // Singapore
  "563": { country: "Singapore", code: "SG", emoji: "🇸🇬" },
  "564": { country: "Singapore", code: "SG", emoji: "🇸🇬" },
  "565": { country: "Singapore", code: "SG", emoji: "🇸🇬" },
  // Cyprus
  "209": { country: "Cyprus", code: "CY", emoji: "🇨🇾" },
  // Hong Kong
  "477": { country: "Hong Kong", code: "HK", emoji: "🇭🇰" },
  // Greece
  "237": { country: "Greece", code: "GR", emoji: "🇬🇷" },
  "239": { country: "Greece", code: "GR", emoji: "🇬🇷" },
  // Norway
  "257": { country: "Norway", code: "NO", emoji: "🇳🇴" },
  "258": { country: "Norway", code: "NO", emoji: "🇳🇴" },
  "259": { country: "Norway", code: "NO", emoji: "🇳🇴" },
  // United Kingdom
  "232": { country: "United Kingdom", code: "GB", emoji: "🇬🇧" },
  "233": { country: "United Kingdom", code: "GB", emoji: "🇬🇧" },
  "234": { country: "United Kingdom", code: "GB", emoji: "🇬🇧" },
  "235": { country: "United Kingdom", code: "GB", emoji: "🇬🇧" },
  // USA
  "338": { country: "USA", code: "US", emoji: "🇺🇸" },
  "366": { country: "USA", code: "US", emoji: "🇺🇸" },
  "367": { country: "USA", code: "US", emoji: "🇺🇸" },
  "368": { country: "USA", code: "US", emoji: "🇺🇸" },
  "369": { country: "USA", code: "US", emoji: "🇺🇸" },
  // Japan
  "431": { country: "Japan", code: "JP", emoji: "🇯🇵" },
  "432": { country: "Japan", code: "JP", emoji: "🇯🇵" },
  // South Korea
  "440": { country: "South Korea", code: "KR", emoji: "🇰🇷" },
  "441": { country: "South Korea", code: "KR", emoji: "🇰🇷" },
  // Turkey
  "271": { country: "Turkey", code: "TR", emoji: "🇹🇷" },
  // Netherlands
  "244": { country: "Netherlands", code: "NL", emoji: "🇳🇱" },
  "245": { country: "Netherlands", code: "NL", emoji: "🇳🇱" },
  "246": { country: "Netherlands", code: "NL", emoji: "🇳🇱" },
};

export function getFlagFromMmsi(mmsi: string): { country: string; code: string; emoji: string } {
  // Try 3-digit prefix
  const p3 = mmsi.substring(0, 3);
  if (MID_TABLE[p3]) return MID_TABLE[p3];
  // Try 2-digit prefix for broad fallback
  const p2 = mmsi.substring(0, 2);
  const match = Object.entries(MID_TABLE).find(([k]) => k.startsWith(p2));
  if (match) return match[1];
  return { country: "Unknown", code: "XX", emoji: "🏳" };
}

// ─── Ship type decoding ───────────────────────────────────────────────────────
export function decodeShipType(typeCode: number): string {
  if (typeCode >= 80 && typeCode <= 89) return "Танкер";
  if (typeCode >= 70 && typeCode <= 79) return "Сухогруз";
  if (typeCode >= 60 && typeCode <= 69) return "Пассажирское";
  if (typeCode >= 35 && typeCode <= 39) return "Военное";
  if (typeCode >= 30 && typeCode <= 34) return "Рыболовное";
  if (typeCode === 52) return "Буксир";
  if (typeCode === 51) return "SAR";
  if (typeCode === 55) return "Военное";
  if (typeCode >= 50 && typeCode <= 59) return "Спецслужбы";
  if (typeCode >= 40 && typeCode <= 49) return "Высокоскоростное";
  if (typeCode >= 20 && typeCode <= 29) return "ВКС / Крылья";
  if (typeCode === 0) return "Не указан";
  return `Тип ${typeCode}`;
}

export function decodeCargoType(cargoCode: number): string {
  // First digit is ship category, second is cargo
  const cat = Math.floor(cargoCode / 10);
  const cargo = cargoCode % 10;
  if (cat === 8) {
    const cargos: Record<number, string> = {
      0: "Танкер (общий)",
      1: "Нефть",
      2: "Газ (СПГ)",
      3: "Химия",
      4: "Нефтепродукты",
      5: "Сырая нефть",
    };
    return cargos[cargo] || `Танкер (${cargo})`;
  }
  if (cat === 7) {
    const cargos: Record<number, string> = {
      0: "Сухогруз (общий)",
      1: "Навалочный",
      2: "Контейнеры",
      3: "Рефрижератор",
      4: "Ро-Ро",
    };
    return cargos[cargo] || `Груз (${cargo})`;
  }
  return decodeShipType(cargoCode);
}

export function decodeNavStatus(status: number): string {
  const statuses: Record<number, string> = {
    0: "На ходу",
    1: "На якоре",
    2: "Не управляется",
    3: "Ограниченная маневренность",
    4: "Стеснено осадкой",
    5: "Пришвартовано",
    6: "На мели",
    7: "Занято рыбной ловлей",
    8: "Идёт под парусом",
    15: "Не определён",
  };
  return statuses[status] ?? `Статус ${status}`;
}

// ─── Hormuz strait bounding box ──────────────────────────────────────────────
// Strait of Hormuz + Gulf of Oman approaches
export const HORMUZ_BBOX = {
  minLon: 54.5,
  maxLon: 60.0,
  minLat: 22.5,
  maxLat: 27.5,
};

// Virtual crossing line: roughly 56.5°E longitude (narrows), lat 25.9°N–26.7°N
// We detect crossing when a vessel transitions across lon 56.5 ± 0.3°
export const CROSSING_LON = 56.5;
export const CROSSING_LAT_MIN = 25.8;
export const CROSSING_LAT_MAX = 27.0;

// Start time for crossing counter
export const RESTRICTIONS_START = new Date("2026-04-13T14:00:00Z");

/**
 * Determines direction based on course over ground (COG) in the strait context
 * East (~90°) = outbound (Gulf of Oman → Indian Ocean)
 * West (~270°) = inbound (Indian Ocean → Persian Gulf)
 */
export function deriveDirection(cog: number | null | undefined, lon?: number | null): "inbound" | "outbound" | "maneuvering" {
  if (cog == null) return "maneuvering";
  const normalized = ((cog % 360) + 360) % 360;
  // Inbound: heading generally west 200-340°
  if (normalized >= 200 && normalized <= 340) return "inbound";
  // Outbound: heading generally east 20-160°
  if (normalized >= 20 && normalized <= 160) return "outbound";
  return "maneuvering";
}

/**
 * Check whether a vessel crosses the virtual line.
 * Returns the crossing direction if it crossed, null otherwise.
 */
export function detectCrossing(
  prevLon: number | null,
  newLon: number,
  lat: number,
  newCog: number | null
): "inbound" | "outbound" | null {
  if (prevLon == null) return null;
  if (lat < CROSSING_LAT_MIN || lat > CROSSING_LAT_MAX) return null;
  const wasWest = prevLon < CROSSING_LON;
  const isEast = newLon >= CROSSING_LON;
  const wasEast = prevLon >= CROSSING_LON;
  const isWest = newLon < CROSSING_LON;
  if (wasWest && isEast) return "outbound"; // entered Gulf of Oman
  if (wasEast && isWest) return "inbound";  // entered Persian Gulf
  return null;
}
