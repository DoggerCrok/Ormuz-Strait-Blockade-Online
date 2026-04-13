import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Vessel } from "@shared/schema";
import {
  decodeShipType, formatDraught, formatSize, formatSpeed, formatAge,
  getShipTypeColor
} from "@/lib/aisDecoder";
import VesselDetail from "./VesselDetail";

interface Props {
  vessels: Vessel[];
  selectedMmsi: string | null;
  onSelectVessel: (mmsi: string | null) => void;
}

// Hormuz bbox center
const HORMUZ_CENTER: [number, number] = [57.0, 26.3];
const HORMUZ_ZOOM = 7.2;

// Virtual crossing line coordinates for display
const CROSSING_LINE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [56.5, 25.8],
      [56.5, 27.0],
    ],
  },
};

function createShipIcon(color: string, heading: number, size = 16): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;transform:rotate(${heading}deg);transition:transform 0.3s ease`;
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">
    <path d="M12 2 L17 20 L12 17 L7 20 Z"/>
  </svg>`;
  return el;
}

export default function MapView({ vessels, selectedMmsi, onSelectVessel }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new globalThis.Map());
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
          },
        },
        layers: [{
          id: "osm-tiles",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 22,
        }],
      } as any,
      center: HORMUZ_CENTER,
      zoom: HORMUZ_ZOOM,
      minZoom: 4,
      maxZoom: 16,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      // Add crossing line
      map.addSource("crossing-line", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [CROSSING_LINE],
        },
      });
      map.addLayer({
        id: "crossing-line-layer",
        type: "line",
        source: "crossing-line",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [6, 4], "line-opacity": 0.85 },
      });

      // Add bounding box outline for Hormuz zone
      map.addSource("hormuz-bbox", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[
              [54.5, 22.5], [60.0, 22.5], [60.0, 27.5], [54.5, 27.5], [54.5, 22.5]
            ]],
          },
        },
      });
      map.addLayer({
        id: "hormuz-bbox-layer",
        type: "line",
        source: "hormuz-bbox",
        paint: { "line-color": "#3b82f6", "line-width": 1.5, "line-opacity": 0.3, "line-dasharray": [4, 6] },
      });

      setMapLoaded(true);
    });

    map.on("click", (e) => {
      // Deselect if clicking on empty map
      const features = map.queryRenderedFeatures(e.point);
      if (!features.length) {
        onSelectVessel(null);
        setSelectedVessel(null);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when vessels change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const existingMmsis = new Set(markersRef.current.keys());
    const newMmsis = new Set(vessels.map(v => v.mmsi));

    // Remove stale markers
    for (const mmsi of existingMmsis) {
      if (!newMmsis.has(mmsi)) {
        markersRef.current.get(mmsi)?.marker.remove();
        markersRef.current.delete(mmsi);
      }
    }

    // Add/update markers
    for (const vessel of vessels) {
      if (vessel.lat == null || vessel.lon == null) continue;
      const color = getShipTypeColor(vessel.shipType);
      const heading = vessel.heading ?? vessel.cog ?? 0;
      const isSelected = vessel.mmsi === selectedMmsi;
      const size = isSelected ? 20 : 14;

      const existing = markersRef.current.get(vessel.mmsi);
      if (existing) {
        // Update position and rotation
        existing.marker.setLngLat([vessel.lon, vessel.lat]);
        existing.el.style.transform = `rotate(${heading}deg)`;
        existing.el.style.transform += isSelected ? " scale(1.4)" : "";
        const svg = existing.el.querySelector("svg");
        if (svg) svg.setAttribute("fill", isSelected ? "#ffffff" : color);
      } else {
        // Create new marker
        const el = createShipIcon(isSelected ? "#ffffff" : color, heading, size);
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([vessel.lon!, vessel.lat!])
          .addTo(map);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectVessel(vessel.mmsi);
          setSelectedVessel(vessel);
        });

        markersRef.current.set(vessel.mmsi, { marker, el });
      }
    }
  }, [vessels, mapLoaded, selectedMmsi]);

  // Keep selectedVessel in sync
  useEffect(() => {
    if (selectedMmsi) {
      const v = vessels.find(v => v.mmsi === selectedMmsi);
      if (v) setSelectedVessel(v);
    } else {
      setSelectedVessel(null);
    }
  }, [selectedMmsi, vessels]);

  // Fly to selected vessel
  useEffect(() => {
    if (!mapRef.current || !selectedVessel?.lat || !selectedVessel?.lon) return;
    mapRef.current.flyTo({
      center: [selectedVessel.lon, selectedVessel.lat],
      zoom: Math.max(mapRef.current.getZoom(), 10),
      duration: 800,
    });
  }, [selectedVessel?.mmsi]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />

      {/* Map legend */}
      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 text-[10px] space-y-1 shadow-md">
        <div className="font-semibold text-[11px] text-muted-foreground mb-1">Легенда</div>
        {[
          { color: "#ef4444", label: "Танкер" },
          { color: "#3b82f6", label: "Сухогруз/Контейнер" },
          { color: "#8b5cf6", label: "Пассажирское" },
          { color: "#10b981", label: "Спецслужбы" },
          { color: "#f59e0b", label: "Буксир" },
          { color: "#6b7280", label: "Прочее" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill={color}>
              <path d="M12 2 L17 20 L12 17 L7 20 Z"/>
            </svg>
            <span className="text-foreground">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border">
          <span style={{ color: "#f59e0b" }}>- -</span>
          <span className="text-foreground">Линия пересечения (56.5°E)</span>
        </div>
      </div>

      {/* Vessel detail panel */}
      {selectedVessel && (
        <div className="absolute bottom-6 left-3 right-3 sm:right-auto sm:w-80">
          <VesselDetail
            vessel={selectedVessel}
            onClose={() => { onSelectVessel(null); setSelectedVessel(null); }}
          />
        </div>
      )}

      {/* No vessels message */}
      {vessels.length === 0 && mapLoaded && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card/90 border border-border rounded-lg px-6 py-4 text-center shadow-lg">
          <p className="text-sm font-medium">Нет судов в зоне</p>
          <p className="text-xs text-muted-foreground mt-1">Проверьте фильтры или дождитесь обновления</p>
        </div>
      )}
    </div>
  );
}
