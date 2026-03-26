import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { averageScore: number; topBranch: string; bottomBranch: string; } | null;
}

export function PerformanceScoreWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Performans Skoru" />;
  return (
    <Card data-testid="widget-performance-score">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Performans Skoru</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI label="Ortalama" value={data.averageScore} color={data.averageScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
          <div className="text-center p-2 rounded-md bg-muted/30">
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">{data.topBranch}</div>
            <div className="text-[10px] text-muted-foreground uppercase">En iyi</div>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/30">
            <div className="text-[10px] text-destructive font-medium truncate">{data.bottomBranch}</div>
            <div className="text-[10px] text-muted-foreground uppercase">En düşük</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
