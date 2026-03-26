import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { revenue: number; expenses: number; profit: number; margin: number; } | null;
}

function formatCurrency(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

export function FinancialOverviewWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Finansal Özet" />;
  return (
    <Card data-testid="widget-financial-overview">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Finansal Özet</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniKPI label="Gelir" value={`${formatCurrency(data.revenue)}₺`} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Gider" value={`${formatCurrency(data.expenses)}₺`} color="text-destructive" />
          <MiniKPI label="Net Kar" value={`${formatCurrency(data.profit)}₺`} color={data.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"} />
          <MiniKPI label="Marj" value={`%${data.margin}`} />
        </div>
      </CardContent>
    </Card>
  );
}
