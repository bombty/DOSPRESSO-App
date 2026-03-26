import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { pending: number; } | null;
}

export function PendingShipmentsWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Bekleyen Sevkiyat" />;
  return (
    <Card data-testid="widget-pending-shipments">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Bekleyen Sevkiyat</span>
        </div>
        <MiniKPI label="Bekleyen" value={data.pending} color={data.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
      </CardContent>
    </Card>
  );
}
