import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export interface QCData {
  pendingCount: number;
  todayTotal: number;
  todayApproved: number;
  todayRejected: number;
  todayConditional?: number;
  passRate: number;
}

export function QCSummary({ data, compact = false }: { data: QCData; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30" data-testid="mc-qc-summary-compact">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium">QC Bekleyen: {data.pendingCount}</span>
        </div>
        <Badge variant="outline" className="text-[9px] h-5">%{data.passRate} onay</Badge>
      </div>
    );
  }

  return (
    <Card data-testid="mc-qc-summary">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Kalite Kontrol
        </CardTitle>
        <Link href="/fabrika/kalite-kontrol">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
            QC Yönetimi <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Kontrol Bekleyen</span>
          <Badge variant={data.pendingCount > 0 ? "destructive" : "outline"} className="text-[10px] h-5">
            {data.pendingCount} lot
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-emerald-600 dark:text-emerald-400">{data.todayApproved} onay</span>
          <span className="text-red-600 dark:text-red-400">{data.todayRejected} red</span>
          {(data.todayConditional ?? 0) > 0 && (
            <span className="text-amber-600 dark:text-amber-400">{data.todayConditional} koşullu</span>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">Geçme Oranı</span>
            <span className={`text-xs font-bold ${data.passRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              %{data.passRate}
            </span>
          </div>
          <Progress value={data.passRate} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
