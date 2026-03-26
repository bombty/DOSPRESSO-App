import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { avgRating: number | null; totalFeedback: number; recent?: any[]; } | null;
}

export function CustomerFeedbackWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Müşteri Geri Bildirimi" />;
  return (
    <Card data-testid="widget-customer-feedback">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Müşteri Geri Bildirimi</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Ort. Puan" value={data.avgRating !== null ? data.avgRating : "-"} color={data.avgRating !== null && data.avgRating >= 4 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
          <MiniKPI label="Toplam" value={data.totalFeedback} />
        </div>
      </CardContent>
    </Card>
  );
}
