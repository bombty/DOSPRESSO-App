import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { today: { total: number; pending: number; approved: number; rejected: number; passRate: number; } } | null;
}

export function QCStatsWidget({ data }: Props) {
  if (!data?.today) return <EmptyWidget label="Kalite Kontrol" />;
  const t = data.today;
  return (
    <Card data-testid="widget-qc-stats">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Kalite Kontrol</span>
          {t.pending > 0 && <Badge variant="secondary" className="text-[9px] h-4 ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t.pending} bekleyen</Badge>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniKPI label="Toplam" value={t.total} />
          <MiniKPI label="Geçme %" value={`%${t.passRate}`} color={t.passRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
          <MiniKPI label="Onaylı" value={t.approved} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Red" value={t.rejected} color={t.rejected > 0 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
