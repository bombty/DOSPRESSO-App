import { Card, CardContent } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { totalChecklists: number; completedToday: number; completionRate: number; } | null;
}

export function ChecklistSummaryWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Checklist Özeti" />;
  return (
    <Card data-testid="widget-checklist-summary">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Checklist Özeti</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI label="Toplam" value={data.totalChecklists} />
          <MiniKPI label="Bugün" value={data.completedToday} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Tamamlanma" value={`%${data.completionRate}`} />
        </div>
      </CardContent>
    </Card>
  );
}
