import type { Vessel, Crossing } from "@shared/schema";
import { decodeShipType, formatTimestamp } from "@/lib/aisDecoder";

interface Props {
  vessels: Vessel[];
  filteredCount: number;
  crossingsCount: number;
  crossings: Crossing[];
  restrictionsStart: string | null;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-r border-border last:border-r-0 min-w-0">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium truncate">{label}</span>
      <span className={`text-xl font-semibold tabular-nums leading-tight ${color ?? "text-foreground"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
    </div>
  );
}

export default function KpiPanel({ vessels, filteredCount, crossingsCount, crossings, restrictionsStart }: Props) {
  const inbound = vessels.filter(v => v.direction === "inbound").length;
  const outbound = vessels.filter(v => v.direction === "outbound").length;
  const tankers = vessels.filter(v => v.shipType != null && v.shipType >= 80 && v.shipType <= 89).length;
  const atAnchor = vessels.filter(v => v.navStatus === 1).length;
  const lastCrossing = crossings[0] ?? null;

  const startLabel = restrictionsStart
    ? new Date(restrictionsStart).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })
    : "13.04.2026 14:00 UTC";

  return (
    <div className="flex overflow-x-auto" data-testid="kpi-panel">
      <KpiCard
        label="Всего судов"
        value={vessels.length}
        sub={filteredCount !== vessels.length ? `${filteredCount} с фильтром` : "в зоне пролива"}
      />
      <KpiCard
        label="← в залив"
        value={inbound}
        sub="входящих"
        color="text-blue-500"
      />
      <KpiCard
        label="→ из залива"
        value={outbound}
        sub="выходящих"
        color="text-red-500"
      />
      <KpiCard
        label="Танкеры"
        value={tankers}
        sub={`${atAnchor} на якоре`}
      />
      <KpiCard
        label={`Пересечений с ${startLabel}`}
        value={crossingsCount}
        sub={lastCrossing ? `последнее: ${lastCrossing.flagEmoji ?? ""} ${lastCrossing.vesselName ?? lastCrossing.mmsi}` : "нет данных"}
        color={crossingsCount > 0 ? "text-primary" : "text-foreground"}
      />
    </div>
  );
}
