import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { pendingLeaves: number; pendingOvertimes: number; } | null;
}

export function LeaveTrackerWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="İzin Takip" />;
  return (
    <Card data-testid="widget-leave-tracker">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">İzin Takip</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="İzin Bekleyen" value={data.pendingLeaves} color={data.pendingLeaves > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
          <MiniKPI label="Mesai Bekleyen" value={data.pendingOvertimes} color={data.pendingOvertimes > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
