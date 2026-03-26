import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { totalCompletions: number; avgQuizScore: number | null; } | null;
}

export function TrainingProgressWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Eğitim İlerlemesi" />;
  return (
    <Card data-testid="widget-training-progress">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Eğitim İlerlemesi</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Tamamlanan" value={data.totalCompletions} />
          <MiniKPI label="Ort. Quiz" value={data.avgQuizScore !== null ? data.avgQuizScore : "-"} color={data.avgQuizScore !== null && data.avgQuizScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
        </div>
      </CardContent>
    </Card>
  );
}
