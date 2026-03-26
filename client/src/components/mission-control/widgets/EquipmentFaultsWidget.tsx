import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { open: number; critical: number; } | null;
}

export function EquipmentFaultsWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Ekipman Arızaları" />;
  return (
    <Card data-testid="widget-equipment-faults">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Ekipman Arızaları</span>
          {data.critical > 0 && <Badge variant="destructive" className="text-[9px] h-4 ml-auto">{data.critical} kritik</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Açık Arıza" value={data.open} color={data.open > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
          <MiniKPI label="Kritik" value={data.critical} color={data.critical > 0 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
