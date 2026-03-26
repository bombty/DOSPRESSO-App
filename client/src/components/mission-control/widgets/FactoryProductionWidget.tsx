import { Card, CardContent } from "@/components/ui/card";
import { Factory } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: {
    todayProduction: number;
    wasteCount: number;
    wastePercentage: number;
    pendingShipments: number;
  } | null;
}

export function FactoryProductionWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Fabrika Üretim" />;
  return (
    <Card data-testid="widget-factory-production">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Fabrika Üretim</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniKPI label="Bugün Üretim" value={data.todayProduction} />
          <MiniKPI label="Fire" value={data.wasteCount} color={data.wasteCount > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
          <MiniKPI label="Fire %" value={`%${data.wastePercentage}`} color={data.wastePercentage > 5 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"} />
          <MiniKPI label="Bekleyen Sevk" value={data.pendingShipments} />
        </div>
      </CardContent>
    </Card>
  );
}
