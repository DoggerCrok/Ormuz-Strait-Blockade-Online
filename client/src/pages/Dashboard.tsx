import { useState, useMemo, useCallback } from "react";
import { useAIS } from "@/hooks/useAIS";
import type { Vessel } from "@shared/schema";
import MapView from "@/components/MapView";
import KpiPanel from "@/components/KpiPanel";
import FilterSidebar from "@/components/FilterSidebar";
import CrossingsTable from "@/components/CrossingsTable";
import SettingsPanel from "@/components/SettingsPanel";
import StatusBar from "@/components/StatusBar";
import InfoPanel from "@/components/InfoPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, Info, Ship, X, Sun, Moon } from "lucide-react";
import { useState as useThemeState, useEffect } from "react";

export interface VesselFilters {
  shipTypes: Set<string>;   // decoded type labels
  directions: Set<string>;  // "inbound"|"outbound"|"maneuvering"
  flags: Set<string>;       // 2-letter ISO codes
  minDraught: number;
  hasCargo: boolean;
  hasDraught: boolean;
  search: string;
}

const DEFAULT_FILTERS: VesselFilters = {
  shipTypes: new Set(),
  directions: new Set(),
  flags: new Set(),
  minDraught: 0,
  hasCargo: false,
  hasDraught: false,
  search: "",
};

export default function Dashboard() {
  const ais = useAIS();
  const [filters, setFilters] = useState<VesselFilters>(DEFAULT_FILTERS);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<"settings" | "info" | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const [isDark, setIsDark] = useThemeState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(d => !d);
  };

  // Vessels as array
  const allVessels = useMemo(() => Array.from(ais.vessels.values()), [ais.vessels]);

  // Apply filters
  const filteredVessels = useMemo(() => {
    return allVessels.filter((v) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!(v.name?.toLowerCase().includes(q) || v.mmsi.includes(q))) return false;
      }
      const typeLabel = v.shipType != null ? (() => {
        if (v.shipType >= 80 && v.shipType <= 89) return "Танкер";
        if (v.shipType >= 70 && v.shipType <= 79) return "Сухогруз / Контейнер";
        if (v.shipType >= 60 && v.shipType <= 69) return "Пассажирское";
        if (v.shipType === 55 || (v.shipType >= 35 && v.shipType <= 39)) return "Военное";
        if (v.shipType === 52) return "Буксир";
        if (v.shipType === 51) return "SAR";
        if (v.shipType >= 50 && v.shipType <= 59) return "Спецслужбы";
        if (v.shipType >= 40 && v.shipType <= 49) return "Высокоскоростное";
        if (v.shipType >= 30 && v.shipType <= 34) return "Рыболовное";
        return `Тип ${v.shipType}`;
      })() : "Не указан";
      if (filters.shipTypes.size > 0 && !filters.shipTypes.has(typeLabel)) return false;
      if (filters.directions.size > 0 && v.direction) {
        if (!filters.directions.has(v.direction)) return false;
      }
      if (filters.flags.size > 0 && v.flag) {
        if (!filters.flags.has(v.flag)) return false;
      }
      if (filters.hasCargo && (v.cargo == null || v.cargo === 0)) return false;
      if (filters.hasDraught && (v.draught == null || v.draught <= 0)) return false;
      if (filters.minDraught > 0) {
        if (!v.draught || v.draught < filters.minDraught) return false;
      }
      return true;
    });
  }, [allVessels, filters]);

  const selectedVessel = selectedMmsi ? ais.vessels.get(selectedMmsi) ?? null : null;

  const handleVesselSelect = useCallback((mmsi: string | null) => {
    setSelectedMmsi(mmsi);
  }, []);

  const toggleSidePanel = (panel: "settings" | "info") => {
    setSidePanel(prev => prev === panel ? null : panel);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          {/* SVG Logo */}
          <svg aria-label="Hormuz Monitor" viewBox="0 0 32 32" width="24" height="24" fill="none" className="text-primary shrink-0">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 20 Q8 17 12 19 Q16 21 20 17 Q24 13 28 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M16 4 L16 10 M12 7 L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="2" fill="currentColor"/>
          </svg>
          <div className="min-w-0">
            <h1 className="text-xs font-semibold leading-tight tracking-tight truncate">Мониторинг Ормузского пролива</h1>
            <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Ормузский пролив AIS-монитор</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBar
            wsStatus={ais.wsStatus}
            aisConnected={ais.aisConnected}
            demo={ais.demo}
            source={ais.source}
            lastSync={ais.lastSync}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleSidePanel("info")}
            data-testid="button-info-panel"
            aria-label="Справка и источники"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleSidePanel("settings")}
            data-testid="button-settings-panel"
            aria-label="Настройки"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ─── Demo banner ─────────────────────────────────────────────────────── */}
      {ais.demo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs shrink-0">
          <Ship className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">ДЕМОНСТРАЦИОННЫЙ РЕЖИМ</span>
          <span className="text-muted-foreground">— данные синтетические, не являются реальными позициями судов. Введите ключ AISStream в настройках для подключения к реальному потоку.</span>
        </div>
      )}

      {/* ─── KPI panel ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border">
        <KpiPanel
          vessels={allVessels}
          filteredCount={filteredVessels.length}
          crossingsCount={ais.crossingsCount}
          crossings={ais.crossings}
          restrictionsStart={ais.restrictionsStart}
        />
      </div>

      {/* ─── Main content area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        <FilterSidebar
          vessels={allVessels}
          filters={filters}
          onChange={setFilters}
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-3 mt-2 mb-1 shrink-0 w-fit h-8">
              <TabsTrigger value="map" className="text-xs h-6 px-3" data-testid="tab-map">Карта</TabsTrigger>
              <TabsTrigger value="crossings" className="text-xs h-6 px-3" data-testid="tab-crossings">
                Пересечения
                {ais.crossingsCount > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0 leading-5 font-tabular">
                    {ais.crossingsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="flex-1 overflow-hidden m-0 mt-0 p-0">
              <MapView
                vessels={filteredVessels}
                selectedMmsi={selectedMmsi}
                onSelectVessel={handleVesselSelect}
              />
            </TabsContent>

            <TabsContent value="crossings" className="flex-1 overflow-auto m-0 p-3">
              <CrossingsTable
                crossings={ais.crossings}
                count={ais.crossingsCount}
                restrictionsStart={ais.restrictionsStart}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Side panels */}
        {sidePanel === "settings" && (
          <div className="w-80 border-l border-border bg-card flex flex-col overflow-auto shrink-0">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm font-semibold">Настройки</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidePanel(null)} data-testid="button-close-settings">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <SettingsPanel
              currentSource={ais.source}
              onClose={() => setSidePanel(null)}
              currentUser={ais.currentUser}
              authRequired={ais.authRequired}
            />
          </div>
        )}

        {sidePanel === "info" && (
          <div className="w-80 border-l border-border bg-card flex flex-col overflow-auto shrink-0">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="text-sm font-semibold">Справка</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidePanel(null)} data-testid="button-close-info">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <InfoPanel />
          </div>
        )}
      </div>
    </div>
  );
}
