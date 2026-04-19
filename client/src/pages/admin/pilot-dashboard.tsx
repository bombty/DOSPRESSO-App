import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ListChecks,
  AlertOctagon,
  TestTube2,
  RefreshCw,
  Calendar,
} from "lucide-react";

/**
 * Sprint G — Pilot Day-1 Dashboard (19 Nis 2026 Claude)
 *
 * 4 sayısal eşiği tek ekranda gösterir:
 *   1. Login Success Rate
 *   2. Task Completion
 *   3. Error Rate (5xx)
 *   4. Smoke Test Pass
 *
 * Kullanım: /admin/pilot-dashboard
 * API: GET /api/pilot/day-status?date=YYYY-MM-DD
 */

const PILOT_ROLES = ["admin", "ceo", "cgo", "adminhq"];

interface ThresholdResult {
  label: string;
  pass: boolean;
  note?: string;
}

interface DayStatus {
  date: string;
  pilot_day: { day: number; label: string };
  pilot_branches: number[];
  overall: {
    status: "GO" | "ATTENTION" | "NO_GO";
    message: string;
    passed_thresholds: number;
    total_thresholds: number;
    rule: string;
  };
  thresholds: {
    login_success_rate: ThresholdResult & {
      threshold_pct: number;
      measured_pct: number;
      success_count: number;
      total_attempts: number;
    };
    task_completion: ThresholdResult & {
      threshold_per_branch: number;
      threshold_total: number;
      total_completed: number;
      by_branch: Array<{
        branch_id: number;
        branch_name: string;
        completed_count: number;
        meets_threshold: boolean;
      }>;
    };
    error_rate: ThresholdResult & {
      threshold_pct: number;
      measured_pct: number;
      error_5xx_count: number;
      total_logged_requests: number;
      data_available: boolean;
    };
    smoke_test: ThresholdResult & {
      threshold: string;
      passed: number | null;
      total: number;
      source: string;
    };
  };
  diagnosis: string[];
  generated_at_tr: string;
}

function todayISO(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export default function PilotDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const { data, isLoading, error, refetch, isFetching } = useQuery<DayStatus>({
    queryKey: ["/api/pilot/day-status", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/pilot/day-status?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Pilot durum raporu alınamadı");
      return res.json();
    },
    enabled: !!user && PILOT_ROLES.includes(user.role),
    refetchInterval: 60_000, // 1 dakikada bir otomatik yenile
  });

  if (authLoading) return <div className="p-6">Yükleniyor...</div>;
  if (!user) return <Redirect to="/login" />;
  if (!PILOT_ROLES.includes(user.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            Bu sayfa için yetkiniz bulunmamaktadır.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Pilot Durum Paneli
          </h1>
          <p className="text-muted-foreground mt-1">
            4 sayısal eşik — 3/4 kuralı ile otomatik GO/NO-GO kararı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="date" className="text-sm">Tarih:</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="icon"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Yükleme */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">Veriler yükleniyor...</CardContent>
        </Card>
      )}

      {/* Hata */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-6 text-red-600">
            Hata: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {/* Overall Status */}
      {data && <OverallStatusCard data={data} />}

      {/* 4 KPI Kart */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ThresholdCard
            icon={<Users className="h-5 w-5" />}
            title="1. Login Success Rate"
            pass={data.thresholds.login_success_rate.pass}
            mainValue={`%${data.thresholds.login_success_rate.measured_pct}`}
            target={`> %${data.thresholds.login_success_rate.threshold_pct}`}
            detail={`${data.thresholds.login_success_rate.success_count}/${data.thresholds.login_success_rate.total_attempts} başarılı`}
            note={data.thresholds.login_success_rate.note}
          />

          <ThresholdCard
            icon={<ListChecks className="h-5 w-5" />}
            title="2. Task Completion"
            pass={data.thresholds.task_completion.pass}
            mainValue={`${data.thresholds.task_completion.total_completed}`}
            target={`> ${data.thresholds.task_completion.threshold_total} toplam (${data.thresholds.task_completion.threshold_per_branch}/şube)`}
            detail={data.thresholds.task_completion.by_branch
              .map((b) => `${b.branch_name}: ${b.completed_count}`)
              .join(" · ")}
          />

          <ThresholdCard
            icon={<AlertOctagon className="h-5 w-5" />}
            title="3. Error Rate (5xx)"
            pass={data.thresholds.error_rate.pass}
            mainValue={
              data.thresholds.error_rate.data_available
                ? `%${data.thresholds.error_rate.measured_pct}`
                : "N/A"
            }
            target={`< %${data.thresholds.error_rate.threshold_pct}`}
            detail={`${data.thresholds.error_rate.error_5xx_count}/${data.thresholds.error_rate.total_logged_requests} hata`}
            note={data.thresholds.error_rate.note}
          />

          <ThresholdCard
            icon={<TestTube2 className="h-5 w-5" />}
            title="4. Smoke Test"
            pass={data.thresholds.smoke_test.pass}
            mainValue={
              data.thresholds.smoke_test.passed !== null
                ? `${data.thresholds.smoke_test.passed}/${data.thresholds.smoke_test.total}`
                : "Manuel"
            }
            target={data.thresholds.smoke_test.threshold}
            detail={data.thresholds.smoke_test.source}
          />
        </div>
      )}

      {/* Otomatik Tanılama */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Otomatik Tanılama</CardTitle>
            <CardDescription>
              4 eşiğin özet yorumu — sorunlu bölgeler için aksiyon önerisi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.diagnosis.map((line, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      {data && (
        <div className="text-xs text-muted-foreground text-right flex items-center justify-end gap-2">
          <Calendar className="h-3 w-3" />
          Oluşturma: {data.generated_at_tr} · {data.pilot_day.label} · Her 60 sn otomatik yenilenir
        </div>
      )}
    </div>
  );
}

/** Büyük overall status kartı */
function OverallStatusCard({ data }: { data: DayStatus }) {
  const cfg = {
    GO: { bg: "border-green-500 bg-green-50 dark:bg-green-950/30", icon: <CheckCircle2 className="h-12 w-12 text-green-600" />, color: "text-green-700 dark:text-green-300" },
    ATTENTION: { bg: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30", icon: <AlertTriangle className="h-12 w-12 text-yellow-600" />, color: "text-yellow-700 dark:text-yellow-300" },
    NO_GO: { bg: "border-red-500 bg-red-50 dark:bg-red-950/30", icon: <XCircle className="h-12 w-12 text-red-600" />, color: "text-red-700 dark:text-red-300" },
  }[data.overall.status];

  return (
    <Card className={`border-2 ${cfg.bg}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {cfg.icon}
          <div className="flex-1">
            <div className={`text-2xl font-bold ${cfg.color}`}>{data.overall.message}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {data.overall.passed_thresholds}/{data.overall.total_thresholds} eşik sağlandı · {data.overall.rule}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tarih: {data.date} · {data.pilot_day.label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tek eşik KPI kartı */
function ThresholdCard({
  icon,
  title,
  pass,
  mainValue,
  target,
  detail,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  pass: boolean;
  mainValue: string;
  target: string;
  detail?: string;
  note?: string;
}) {
  return (
    <Card className={pass ? "border-green-200" : "border-red-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant={pass ? "default" : "destructive"}>
            {pass ? "✓ PASS" : "✗ FAIL"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${pass ? "text-green-600" : "text-red-600"}`}>
            {mainValue}
          </span>
          <span className="text-sm text-muted-foreground">Hedef: {target}</span>
        </div>
        {detail && <div className="text-xs text-muted-foreground mt-2">{detail}</div>}
        {note && <div className="text-xs text-yellow-600 mt-1">ℹ️ {note}</div>}
      </CardContent>
    </Card>
  );
}
