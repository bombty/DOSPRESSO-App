import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Factory, UserCheck } from "lucide-react";

export interface StationInfo {
  id: number;
  name: string;
  code?: string;
  status: "active" | "idle" | "maintenance";
  operatorName?: string;
  produced: number;
  target: number;
  waste?: number;
  product?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dotColor: string }> = {
  active: { label: "Aktif", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dotColor: "bg-emerald-500" },
  idle: { label: "Boşta", className: "bg-muted text-muted-foreground", dotColor: "bg-gray-400" },
  maintenance: { label: "Bakım", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dotColor: "bg-amber-500" },
};

export function StationCard({ station }: { station: StationInfo }) {
  const config = STATUS_CONFIG[station.status] || STATUS_CONFIG.idle;
  const pct = station.target > 0 ? Math.min(Math.round((station.produced / station.target) * 100), 100) : 0;

  return (
    <div className="p-2.5 rounded-lg bg-muted/30" data-testid={`station-card-${station.id}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotColor}`} />
          <span className="text-xs font-bold truncate">{station.name}</span>
          {station.code && (
            <Badge variant="outline" className="text-[8px] h-4 px-1">{station.code}</Badge>
          )}
        </div>
        <Badge className={`text-[8px] h-4 px-1.5 border-0 ${config.className}`}>{config.label}</Badge>
      </div>
      {station.product && (
        <p className="text-[10px] text-muted-foreground mb-1">{station.product}</p>
      )}
      {station.operatorName && (
        <div className="flex items-center gap-1 mb-1.5">
          <UserCheck className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{station.operatorName}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium">{station.produced} / {station.target}</span>
        {station.waste != null && station.waste > 0 && (
          <Badge variant="destructive" className="text-[8px] h-4 px-1">{station.waste} fire</Badge>
        )}
      </div>
      {station.target > 0 && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}
