import type { Crossing } from "@shared/schema";
import { decodeShipType, decodeCargoType, formatDraught, formatSize, formatTimestamp } from "@/lib/aisDecoder";
import { Badge } from "@/components/ui/badge";

interface Props {
  crossings: Crossing[];
  count: number;
  restrictionsStart: string | null;
}

export default function CrossingsTable({ crossings, count, restrictionsStart }: Props) {
  const startLabel = restrictionsStart
    ? new Date(restrictionsStart).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short"
      })
    : "13.04.2026 14:00 UTC";

  return (
    <div className="flex flex-col gap-4" data-testid="crossings-table">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold">Пересечения пролива</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Учитываются пересечения виртуальной линии 56.5°E начиная с {startLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          Ограничения введены Ираном с 14:00 UTC 13.04.2026. Транзит к неиранским направлениям пока не сообщался как перекрытый (источник: UKMTO).
        </p>
      </div>

      {/* Counter */}
      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="text-3xl font-bold tabular-nums text-primary">{count}</div>
        <div>
          <div className="text-sm font-medium">пересечений зарегистрировано</div>
          <div className="text-xs text-muted-foreground">с момента введения ограничений</div>
        </div>
      </div>

      {crossings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-30">
            <path d="M12 2 L17 20 L12 17 L7 20 Z"/>
          </svg>
          <p className="text-sm">Пересечений пока нет</p>
          <p className="text-xs mt-1">Данные появятся после 13.04.2026 14:00 UTC</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs" data-testid="crossings-table-inner">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Время (UTC)</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Флаг</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Судно / MMSI</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Направление</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Тип/Груз</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Осадка</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Размер</th>
                <th className="text-left px-3 py-2 text-[11px] text-muted-foreground font-medium">Источник</th>
              </tr>
            </thead>
            <tbody>
              {crossings.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  data-testid={`crossing-row-${c.id}`}
                >
                  <td className="px-3 py-2 font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(c.crossedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-base leading-none">{c.flagEmoji ?? "🏳"}</span>
                    <span className="text-[11px] text-muted-foreground ml-1">{c.flag ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.vesselName || "—"}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{c.mmsi}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {c.direction === "inbound" ? (
                      <Badge variant="secondary" className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">
                        ← в залив
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-red-500/15 text-red-600 dark:text-red-400 border-0">
                        → из залива
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div>{decodeShipType(c.shipType)}</div>
                    <div className="text-[10px] text-muted-foreground">{decodeCargoType(c.cargo)}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatDraught(c.draught)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatSize(c.length, c.width)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] ${c.source === "demo" ? "text-amber-500" : "text-green-500"}`}>
                      {c.source === "demo" ? "ДЕМО" : "Реальные"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
