import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { pending: number; completedToday: number; overdue: number; } | null;
}

export function TodaysTasksDynamicWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Bugünkü Görevler" />;
  return (
    <Card data-testid="widget-todays-tasks-dynamic">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Bugünkü Görevler</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI label="Bekleyen" value={data.pending} color={data.pending > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
          <MiniKPI label="Tamamlanan" value={data.completedToday} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Geciken" value={data.overdue} color={data.overdue > 0 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
