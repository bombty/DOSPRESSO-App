import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { needsRepair: number; total: number; } | null;
}

export function EquipmentMaintenanceWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Ekipman Bakım" />;
  return (
    <Card data-testid="widget-equipment-maintenance">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Ekipman Bakım</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Bakım Gereken" value={data.needsRepair} color={data.needsRepair > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
          <MiniKPI label="Toplam Ekipman" value={data.total} />
        </div>
      </CardContent>
    </Card>
  );
}
