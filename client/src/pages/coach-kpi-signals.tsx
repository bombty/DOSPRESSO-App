import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Signal,
  AlertTriangle,
  Thermometer,
  ClipboardCheck,
  UserX,
  Clock,
  Package,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { SIGNAL_CODE_LABELS, SEVERITY_LABELS } from "@/lib/turkish-labels";

interface KpiSignal {
  id: number;
  signalKey: string;
  titleTr: string;
  titleEn: string | null;
  description: string | null;
  threshold: number | null;
  severity: string;
  recommendedPackId: number | null;
  isActive: boolean;
}

const SIGNAL_ICONS: Record<string, any> = {
  high_waste: AlertTriangle,
  cold_chain_violation: Thermometer,
  low_quiz_score: ClipboardCheck,
  high_absence: UserX,
  late_checklist: Clock,
  product_complaint: Package,
  gate_failure: ShieldAlert,
};

const SEVERITY_VARIANTS: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function CoachKpiSignals() {
  const { data: signals, isLoading, isError, refetch } = useQuery<KpiSignal[]>({
    queryKey: ['/api/academy/kpi-signals'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="kpi-signals-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-kpi-signals">
      <div className="flex items-center gap-2">
        <Signal className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">KPI Sinyalleri</h2>
        <Badge variant="secondary">{(signals || []).length} kural</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        KPI sinyalleri, personelin performans göstergelerine göre otomatik eğitim önerileri tetikler.
        Eşik değerleri aşıldığında ilgili çalışana eğitim paketi atanır.
      </p>

      <div className="space-y-3">
      {healthData && (
        <div className="grid grid-cols-3 gap-2 p-1">
          {[
            { label: "Sağlıklı", count: healthData.healthyCount || 0, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
            { label: "Uyarı",   count: healthData.warningCount || 0,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
            { label: "Kritik",  count: healthData.criticalCount || 0, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          ].map(s => (
            <div key={s.label} className="text-center p-2.5 rounded-xl border"
              style={{ background: s.bg, borderColor: `${s.color}30` }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}
        {(signals || []).map(signal => {
          const Icon = SIGNAL_ICONS[signal.signalKey] || AlertTriangle;
          const { data: healthData } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    queryFn: async () => {
      const res = await fetch("/api/agent/branch-health", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });

  return (
            <Card key={signal.id} data-testid={`kpi-signal-${signal.signalKey}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{signal.titleTr}</h3>
                      <Badge variant={SEVERITY_VARIANTS[signal.severity] as any || "outline"}>
                        {SEVERITY_LABELS[signal.severity] || signal.severity}
                      </Badge>
                    </div>
                    {signal.description && (
                      <p className="text-xs text-muted-foreground mt-1">{signal.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {signal.threshold !== null && (
                        <span>Eşik: {signal.threshold}</span>
                      )}
                      <span>Sinyal: {SIGNAL_CODE_LABELS[signal.signalKey] || signal.signalKey}</span>
                      {signal.recommendedPackId && (
                        <Badge variant="outline">Paket #{signal.recommendedPackId}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(signals || []).length === 0 && (
        <Card data-testid="no-signals">
          <CardContent className="p-6 text-center">
            <Signal className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">KPI sinyal kuralı bulunamadı</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
