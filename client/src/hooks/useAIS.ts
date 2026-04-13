import { useEffect, useRef, useState, useCallback } from "react";
import type { Vessel, Crossing, SafeUser } from "@shared/schema";
import { getToken, clearToken } from "@/lib/auth";

export interface AISState {
  vessels: Map<string, Vessel>;
  crossings: Crossing[];
  crossingsCount: number;
  aisConnected: boolean;
  source: "auto" | "aisstream" | "demo";
  demo: boolean;
  lastSync: string | null;
  restrictionsStart: string | null;
  wsStatus: "connecting" | "connected" | "disconnected";
  authRequired: boolean;
  currentUser: SafeUser | null;
}

function getWsBaseUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const proxyBase = "__PORT_5000__";
  if (!proxyBase.startsWith("__")) {
    return `${proto}//${window.location.host}${proxyBase}/ws`;
  }
  return `${proto}//${window.location.host}/ws`;
}

function buildWsUrl() {
  const url = new URL(getWsBaseUrl());
  const token = getToken();
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

export function useAIS() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AISState>({
    vessels: new Map(),
    crossings: [],
    crossingsCount: 0,
    aisConnected: false,
    source: "auto",
    demo: true,
    lastSync: null,
    restrictionsStart: null,
    wsStatus: "connecting",
    authRequired: false,
    currentUser: null,
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setState(s => ({ ...s, wsStatus: "connecting" }));

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setState(s => ({ ...s, wsStatus: "connected" }));
    };

    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);

        if (event === "init") {
          setState(s => {
            const vMap = new Map<string, Vessel>();
            for (const v of (data.vessels as Vessel[])) {
              vMap.set(v.mmsi, v);
            }
            return {
              ...s,
              vessels: vMap,
              crossings: data.crossings as Crossing[],
              crossingsCount: data.crossingsCount as number,
              aisConnected: data.aisConnected as boolean,
              source: data.source as "auto" | "aisstream" | "demo",
              demo: data.demo as boolean,
              lastSync: data.lastSync as string | null,
              restrictionsStart: data.restrictionsStart as string | null,
              wsStatus: "connected",
              authRequired: Boolean((data as { authRequired?: boolean }).authRequired),
              currentUser: ((data as { user?: SafeUser | null }).user ?? null) as SafeUser | null,
            };
          });
        } else if (event === "vessel_update") {
          const vessel = data.vessel as Vessel;
          setState(s => {
            const vMap = new Map(s.vessels);
            vMap.set(vessel.mmsi, vessel);
            return { ...s, vessels: vMap, lastSync: vessel.lastSeen };
          });
        } else if (event === "crossing") {
          const crossing = data.crossing as Crossing;
          setState(s => ({
            ...s,
            crossings: [crossing, ...s.crossings].slice(0, 100),
            crossingsCount: s.crossingsCount + 1,
          }));
        } else if (event === "connection_status") {
          setState(s => ({
            ...s,
            aisConnected: data.aisConnected as boolean,
            source: data.source as "auto" | "aisstream" | "demo",
            demo: data.demo as boolean ?? !data.aisConnected,
          }));
        }
      } catch {}
    };

    ws.onclose = (event) => {
      if (event.code === 1006 && getToken()) {
        clearToken();
      }
      setState(s => ({
        ...s,
        wsStatus: "disconnected",
        currentUser: getToken() ? s.currentUser : null,
      }));
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      setState(s => ({ ...s, wsStatus: "disconnected" }));
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
