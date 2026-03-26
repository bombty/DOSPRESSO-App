import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { pending: number; } | null;
}

export function PendingOrdersWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Bekleyen Siparişler" />;
  return (
    <Card data-testid="widget-pending-orders">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Bekleyen Siparişler</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <MiniKPI label="Bekleyen" value={data.pending} color={data.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} />
        </div>
      </CardContent>
    </Card>
  );
}
