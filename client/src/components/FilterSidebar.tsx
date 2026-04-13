import { useMemo } from "react";
import type { Vessel } from "@shared/schema";
import type { VesselFilters } from "@/pages/Dashboard";
import { decodeShipType } from "@/lib/aisDecoder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";

interface Props {
  vessels: Vessel[];
  filters: VesselFilters;
  onChange: (f: VesselFilters) => void;
}

const DIRECTION_OPTIONS = [
  { value: "inbound", label: "← в Персидский залив" },
  { value: "outbound", label: "→ из Персидского залива" },
  { value: "maneuvering", label: "↺ маневрирует" },
];

export default function FilterSidebar({ vessels, filters, onChange }: Props) {
  // Aggregate available ship types
  const availableTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vessels) {
      const label = decodeShipType(v.shipType);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [vessels]);

  // Available flags
  const availableFlags = useMemo(() => {
    const counts = new Map<string, { emoji: string; count: number }>();
    for (const v of vessels) {
      if (!v.flag) continue;
      const existing = counts.get(v.flag);
      counts.set(v.flag, { emoji: v.flagEmoji ?? "🏳", count: (existing?.count ?? 0) + 1 });
    }
    return Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
  }, [vessels]);

  const hasFilters = filters.shipTypes.size > 0 || filters.directions.size > 0 || filters.flags.size > 0 || filters.minDraught > 0 || filters.hasCargo || filters.hasDraught || filters.search;

  const toggleSet = (field: "shipTypes" | "directions" | "flags", value: string) => {
    const newSet = new Set(filters[field] as Set<string>);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    onChange({ ...filters, [field]: newSet });
  };

  const clearAll = () => onChange({
    shipTypes: new Set(), directions: new Set(), flags: new Set(), minDraught: 0, hasCargo: false, hasDraught: false, search: ""
  });

  return (
    <aside className="w-48 shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col hidden md:flex">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-card z-10">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Фильтры</span>
        {hasFilters && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearAll} data-testid="button-clear-filters">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* Search */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Поиск</Label>
          <Input
            placeholder="Название / MMSI"
            className="h-7 text-xs"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            data-testid="input-vessel-search"
          />
        </div>

        <Separator />

        {/* Direction */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-2 block">Направление</Label>
          <div className="flex flex-col gap-1.5">
            {DIRECTION_OPTIONS.map(opt => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`dir-${opt.value}`}
                  checked={filters.directions.has(opt.value)}
                  onCheckedChange={() => toggleSet("directions", opt.value)}
                  data-testid={`checkbox-dir-${opt.value}`}
                />
                <Label htmlFor={`dir-${opt.value}`} className="text-[11px] cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ship type */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-2 block">Тип судна</Label>
          <div className="flex flex-col gap-1.5">
            {availableTypes.slice(0, 8).map(([label, count]) => (
              <div key={label} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${label}`}
                  checked={filters.shipTypes.has(label)}
                  onCheckedChange={() => toggleSet("shipTypes", label)}
                  data-testid={`checkbox-type-${label}`}
                />
                <Label htmlFor={`type-${label}`} className="text-[11px] cursor-pointer flex-1 truncate">{label}</Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Flag */}
        {availableFlags.length > 0 && (
          <div>
            <Label className="text-[11px] text-muted-foreground mb-2 block">Флаг</Label>
            <div className="flex flex-col gap-1.5">
              {availableFlags.map(([code, { emoji, count }]) => (
                <div key={code} className="flex items-center gap-2">
                  <Checkbox
                    id={`flag-${code}`}
                    checked={filters.flags.has(code)}
                    onCheckedChange={() => toggleSet("flags", code)}
                    data-testid={`checkbox-flag-${code}`}
                  />
                  <Label htmlFor={`flag-${code}`} className="text-[11px] cursor-pointer flex-1">
                    <span className="mr-1">{emoji}</span>{code}
                  </Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Presence filters */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-2 block">Данные</Label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-cargo"
                checked={filters.hasCargo}
                onCheckedChange={(checked) => onChange({ ...filters, hasCargo: checked === true })}
                data-testid="checkbox-has-cargo"
              />
              <Label htmlFor="has-cargo" className="text-[11px] cursor-pointer">Только с грузом</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-draught"
                checked={filters.hasDraught}
                onCheckedChange={(checked) => onChange({ ...filters, hasDraught: checked === true })}
                data-testid="checkbox-has-draught"
              />
              <Label htmlFor="has-draught" className="text-[11px] cursor-pointer">Только с осадкой</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Min draught */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-2 block">
            Мин. осадка: {filters.minDraught > 0 ? `${filters.minDraught} м` : "нет"}
          </Label>
          <Slider
            min={0}
            max={25}
            step={0.5}
            value={[filters.minDraught]}
            onValueChange={([val]) => onChange({ ...filters, minDraught: val })}
            data-testid="slider-min-draught"
            className="py-1"
          />
        </div>
      </div>
    </aside>
  );
}
