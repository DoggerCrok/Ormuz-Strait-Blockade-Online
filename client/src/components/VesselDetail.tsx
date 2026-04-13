import type { Vessel } from "@shared/schema";
import {
  decodeShipType, decodeCargoType, decodeNavStatus,
  formatDirection, formatDraught, formatSize, formatSpeed,
  formatAge, formatTimestamp
} from "@/lib/aisDecoder";
import { Button } from "@/components/ui/button";
import { X, Ship } from "lucide-react";
import { getShipTypeColor } from "@/lib/aisDecoder";

interface Props {
  vessel: Vessel;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[11px] text-right font-medium truncate">{value || "—"}</span>
    </div>
  );
}

export default function VesselDetail({ vessel, onClose }: Props) {
  const color = getShipTypeColor(vessel.shipType);
  const dirLabel = vessel.direction === "inbound" ? "← в Персидский залив"
    : vessel.direction === "outbound" ? "→ из Персидского залива" : "↺ маневрирует";
  const dirColor = vessel.direction === "inbound" ? "text-blue-500"
    : vessel.direction === "outbound" ? "text-red-500" : "text-amber-500";

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden" data-testid={`vessel-detail-${vessel.mmsi}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-3 border-b border-border gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{vessel.flagEmoji ?? "🏳"}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">
              {vessel.name || "Без названия"}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">MMSI: {vessel.mmsi}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} data-testid="button-vessel-detail-close">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Type badge + direction */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill={color}>
            <path d="M12 2 L17 20 L12 17 L7 20 Z"/>
          </svg>
          <span className="text-xs font-medium">{decodeShipType(vessel.shipType)}</span>
        </div>
        <span className={`text-xs font-medium ${dirColor}`}>{dirLabel}</span>
      </div>

      {/* Details */}
      <div className="p-3 space-y-0">
        <Row label="Груз/тип AIS" value={decodeCargoType(vessel.cargo)} />
        <Row label="Осадка" value={formatDraught(vessel.draught)} />
        <Row label="Размер (д×ш)" value={formatSize(vessel.length, vessel.width)} />
        <Row label="Скорость" value={formatSpeed(vessel.sog)} />
        <Row label="Курс (COG)" value={vessel.cog != null ? `${vessel.cog.toFixed(1)}°` : null} />
        <Row label="Нав. статус" value={decodeNavStatus(vessel.navStatus)} />
        <Row label="Место назначения" value={vessel.destination} />
        <Row label="Позывной" value={vessel.callsign} />
        <Row label="IMO" value={vessel.imo} />
        <Row label="Флаг (страна)" value={vessel.flag} />
        <Row label="Источник" value={vessel.source === "demo" ? "Демо-данные" : "AISStream"} />
        <Row label="Последнее обновление" value={formatAge(vessel.lastSeen)} />
      </div>

      {/* Position */}
      {vessel.lat != null && vessel.lon != null && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-mono text-muted-foreground">
            {vessel.lat.toFixed(4)}°N, {vessel.lon.toFixed(4)}°E
          </div>
        </div>
      )}
    </div>
  );
}
