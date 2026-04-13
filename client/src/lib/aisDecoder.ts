export function decodeShipType(code: number | null | undefined): string {
  if (code == null) return "Не указан";
  if (code >= 80 && code <= 89) return "Танкер";
  if (code >= 70 && code <= 79) return "Сухогруз / Контейнер";
  if (code >= 60 && code <= 69) return "Пассажирское";
  if (code === 55) return "Военное";
  if (code >= 35 && code <= 39) return "Военное";
  if (code === 52) return "Буксир";
  if (code === 51) return "SAR";
  if (code >= 50 && code <= 59) return "Спецслужбы";
  if (code >= 40 && code <= 49) return "Высокоскоростное";
  if (code >= 30 && code <= 34) return "Рыболовное";
  if (code === 0) return "Не указан";
  return `Тип ${code}`;
}

export function decodeCargoType(code: number | null | undefined): string {
  if (code == null) return "—";
  const cat = Math.floor(code / 10);
  const cargo = code % 10;
  if (cat === 8) {
    const map: Record<number, string> = { 0: "Танкер", 1: "Нефть", 2: "СПГ/СНГ", 3: "Химия", 4: "Нефтепродукты", 5: "Сырая нефть" };
    return map[cargo] ?? `Танкер (${cargo})`;
  }
  if (cat === 7) {
    const map: Record<number, string> = { 0: "Сухогруз", 1: "Навалочный", 2: "Контейнеры", 3: "Рефрижератор", 4: "Ро-Ро" };
    return map[cargo] ?? `Груз (${cargo})`;
  }
  return decodeShipType(code);
}

export function decodeNavStatus(status: number | null | undefined): string {
  if (status == null) return "—";
  const map: Record<number, string> = {
    0: "На ходу", 1: "На якоре", 2: "Не управляется", 3: "Огранич. маневренность",
    4: "Стеснён осадкой", 5: "Пришвартовано", 6: "На мели", 7: "Рыбная ловля",
    8: "Парус", 15: "Не определён"
  };
  return map[status] ?? `Статус ${status}`;
}

export function formatDirection(dir: string | null | undefined): string {
  if (!dir) return "—";
  if (dir === "inbound") return "← в Персидский залив";
  if (dir === "outbound") return "→ из Персидского залива";
  return "↺ маневрирует";
}

export function formatDirectionShort(dir: string | null | undefined): string {
  if (!dir) return "—";
  if (dir === "inbound") return "← в залив";
  if (dir === "outbound") return "→ из залива";
  return "↺ маневр";
}

export function getShipTypeColor(code: number | null | undefined): string {
  if (code == null) return "#6b7280";
  if (code >= 80 && code <= 89) return "#ef4444";   // tanker: red
  if (code >= 70 && code <= 79) return "#3b82f6";   // cargo: blue
  if (code >= 60 && code <= 69) return "#8b5cf6";   // passenger: purple
  if (code === 55 || (code >= 35 && code <= 39)) return "#6b7280"; // military: gray
  if (code === 52) return "#f59e0b";                  // tug: amber
  if (code >= 50 && code <= 59) return "#10b981";    // special: green
  return "#6b7280";
}

export function getDirectionColor(dir: string | null | undefined): string {
  if (dir === "inbound") return "#3b82f6";
  if (dir === "outbound") return "#ef4444";
  return "#f59e0b";
}

export function formatDraught(draught: number | null | undefined): string {
  if (draught == null || draught === 0) return "—";
  return `${draught.toFixed(1)} м`;
}

export function formatSize(length: number | null | undefined, width: number | null | undefined): string {
  if (!length && !width) return "—";
  if (length && width) return `${length}×${width} м`;
  if (length) return `${length} м`;
  return `${width} м`;
}

export function formatSpeed(sog: number | null | undefined): string {
  if (sog == null) return "—";
  return `${sog.toFixed(1)} уз`;
}

export function formatAge(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}с назад`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}мин назад`;
  const h = Math.floor(m / 60);
  return `${h}ч назад`;
}

export function formatTimestamp(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  });
}
