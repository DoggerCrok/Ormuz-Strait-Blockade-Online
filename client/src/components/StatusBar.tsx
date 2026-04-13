import { formatAge } from "@/lib/aisDecoder";

interface Props {
  wsStatus: "connecting" | "connected" | "disconnected";
  aisConnected: boolean;
  demo: boolean;
  source: string;
  lastSync: string | null;
}

export default function StatusBar({ wsStatus, aisConnected, demo, source, lastSync }: Props) {
  const wsColor = wsStatus === "connected" ? "bg-green-500" : wsStatus === "connecting" ? "bg-amber-400" : "bg-red-500";
  const wsLabel = wsStatus === "connected" ? "WS" : wsStatus === "connecting" ? "..." : "OFF";

  const srcLabel = demo ? "ДЕМО" : aisConnected ? "AISStream" : "—";
  const srcColor = demo ? "text-amber-500" : aisConnected ? "text-green-500" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground" data-testid="status-bar">
      {lastSync && (
        <span className="hidden sm:inline" data-testid="text-last-sync">
          {formatAge(lastSync)}
        </span>
      )}
      <span className={`font-medium ${srcColor}`} data-testid="text-source">{srcLabel}</span>
      <span className="flex items-center gap-1">
        <span className={`inline-block w-2 h-2 rounded-full ${wsColor}`} />
        <span>{wsLabel}</span>
      </span>
    </div>
  );
}
