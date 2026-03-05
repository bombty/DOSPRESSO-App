import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Coffee,
  Sparkles,
  Users,
  Clock,
} from "lucide-react";

function StarRating({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-bold">{value}</span>
      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function FeedbackSupervisorWidget() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/dashboard/feedback-summary'],
    refetchInterval: 120000,
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-feedback-supervisor-loading">
        <CardContent className="p-3">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const trendDirection = data.trend && data.trend.length >= 2
    ? (data.trend[data.trend.length - 1]?.avg || 0) > (data.trend[0]?.avg || 0) ? 'up' : (data.trend[data.trend.length - 1]?.avg || 0) < (data.trend[0]?.avg || 0) ? 'down' : 'stable'
    : 'stable';

  return (
    <Card data-testid="widget-feedback-supervisor">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Misafir Geri Bildirimleri
          {data.pendingComplaints > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-auto" data-testid="badge-pending-complaints">
              {data.pendingComplaints} bekleyen
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-muted/50" data-testid="stat-today-avg">
            <p className="text-[10px] text-muted-foreground">Bugün</p>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-lg font-bold">{data.todayAvg || '—'}</span>
              <span className="text-[10px] text-muted-foreground">({data.todayCount})</span>
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/50" data-testid="stat-week-avg">
            <p className="text-[10px] text-muted-foreground">Son 7 Gün</p>
            <div className="flex items-center gap-1">
              {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
              {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              {trendDirection === 'stable' && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-lg font-bold">{data.weekAvg || '—'}</span>
              <span className="text-[10px] text-muted-foreground">({data.weekCount})</span>
            </div>
          </div>
        </div>

        {data.trend && data.trend.length > 0 && (
          <div className="flex items-end gap-0.5 h-8" data-testid="chart-trend-mini">
            {data.trend.map((d: any, i: number) => {
              const height = d.avg > 0 ? Math.max(15, (d.avg / 5) * 100) : 5;
              const color = d.avg >= 4 ? 'bg-green-500' : d.avg >= 3 ? 'bg-yellow-500' : d.avg > 0 ? 'bg-red-500' : 'bg-muted';
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${color}`}
                  style={{ height: `${height}%` }}
                  title={`${d.date}: ${d.avg} (${d.count})`}
                />
              );
            })}
          </div>
        )}

        {data.categoryScores && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1" data-testid="panel-category-scores">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Hizmet</span>
              <StarRating value={data.categoryScores.service} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Temizlik</span>
              <StarRating value={data.categoryScores.cleanliness} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Ürün</span>
              <StarRating value={data.categoryScores.product} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Personel</span>
              <StarRating value={data.categoryScores.staff} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeedbackHQWidget() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/dashboard/feedback-hq-summary'],
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-feedback-hq-loading">
        <CardContent className="p-3">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card data-testid="widget-feedback-hq">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Şube Müşteri Memnuniyeti
          {data.totalSlaBreaches > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-auto" data-testid="badge-sla-breaches">
              <Clock className="w-3 h-3 mr-0.5" />
              {data.totalSlaBreaches} SLA ihlali
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted/50 flex-1 text-center" data-testid="stat-overall-avg">
            <p className="text-[10px] text-muted-foreground">Genel Ortalama</p>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xl font-bold">{data.overallAvg || '—'}</span>
              <span className="text-[10px] text-muted-foreground">/5</span>
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/50 flex-1 text-center" data-testid="stat-total-feedback">
            <p className="text-[10px] text-muted-foreground">Toplam Geri Bildirim</p>
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-xl font-bold">{data.totalFeedbackCount}</span>
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/50 flex-1 text-center" data-testid="stat-branch-count">
            <p className="text-[10px] text-muted-foreground">Aktif Şube</p>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-xl font-bold">{data.totalBranches}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.top3 && data.top3.length > 0 && (
            <div className="space-y-1" data-testid="panel-top-branches">
              <p className="text-[10px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                En Yüksek
              </p>
              {data.top3.map((b: any) => (
                <div key={b.branchId} className="flex items-center justify-between gap-1 p-1 rounded bg-green-500/5" data-testid={`row-top-branch-${b.branchId}`}>
                  <span className="text-[11px] truncate flex-1">{b.branchName}</span>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">{b.avg}</Badge>
                </div>
              ))}
            </div>
          )}

          {data.bottom3 && data.bottom3.length > 0 && (
            <div className="space-y-1" data-testid="panel-bottom-branches">
              <p className="text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                En Düşük
              </p>
              {data.bottom3.map((b: any) => (
                <div key={b.branchId} className="flex items-center justify-between gap-1 p-1 rounded bg-red-500/5" data-testid={`row-bottom-branch-${b.branchId}`}>
                  <span className="text-[11px] truncate flex-1">{b.branchName}</span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">{b.avg}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.allBranches && data.allBranches.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto" data-testid="panel-all-branches">
            <p className="text-[10px] font-medium text-muted-foreground">Tüm Şubeler (Son 30 Gün)</p>
            {data.allBranches.map((b: any) => (
              <div key={b.branchId} className="flex items-center gap-2" data-testid={`row-branch-feedback-${b.branchId}`}>
                <span className="text-[11px] w-24 truncate">{b.branchName}</span>
                <Progress value={(b.avg || 0) * 20} className="flex-1" />
                <span className="text-[10px] font-medium w-6 text-right">{b.avg}</span>
                <span className="text-[10px] text-muted-foreground w-6 text-right">({b.count})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
