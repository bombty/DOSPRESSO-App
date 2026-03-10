import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface PendingItem {
  id: number;
  branchId: number;
  branchName: string;
  rating: number;
  comment: string | null;
  status: string;
  responseDeadline: string | null;
  slaBreached: boolean;
  createdAt: string;
  slaStatus: "green" | "yellow" | "red";
  hoursRemaining: number | null;
}

interface BranchPerformance {
  branchId: number;
  branchName: string;
  totalFeedback: number;
  breachedCount: number;
  complianceRate: number;
  avgResponseHours: number | null;
}

interface SLAData {
  pendingItems: PendingItem[];
  branchPerformance: BranchPerformance[];
  summary: {
    totalPending: number;
    breached: number;
    warning: number;
    onTrack: number;
  };
}

const SLA_STATUS_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export default function CRMSLATracking() {
  const { data, isLoading, isError, refetch } = useQuery<SLAData>({
    queryKey: ["/api/crm/sla-tracking"],
  });

  if (isLoading) {
    

  return (
      <div className="p-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  const summary = data?.summary;
  const pendingItems = data?.pendingItems || [];
  const branchPerformance = data?.branchPerformance || [];

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4" data-testid="crm-sla-tracking-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-sla-tracking">SLA Takibi</h1>
        <p className="text-sm text-muted-foreground">Geri bildirim yanıt süresi takibi</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="card-summary-total">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold" data-testid="text-total-pending">{summary?.totalPending ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-breached">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">SLA Aşıldı</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-breached">{summary?.breached ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Uyarı</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-warning">{summary?.warning ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-summary-ontrack">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Yolunda</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-ontrack">{summary?.onTrack ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-pending-items">
        <CardHeader>
          <CardTitle className="text-lg">Bekleyen Geri Bildirimler</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-pending">Bekleyen geri bildirim yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Durum</th>
                    <th className="pb-2 font-medium text-muted-foreground">Şube</th>
                    <th className="pb-2 font-medium text-muted-foreground">Puan</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden sm:table-cell">Son Tarih</th>
                    <th className="pb-2 font-medium text-muted-foreground">Kalan Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0" data-testid={`row-pending-${item.id}`}>
                      <td className="py-2.5">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${SLA_STATUS_COLORS[item.slaStatus]}`}
                          data-testid={`indicator-sla-${item.id}`}
                          title={item.slaStatus === "red" ? "Aşıldı" : item.slaStatus === "yellow" ? "Uyarı" : "Yolunda"}
                        />
                      </td>
                      <td className="py-2.5" data-testid={`text-branch-${item.id}`}>{item.branchName}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" data-testid={`badge-rating-${item.id}`}>{item.rating}/5</Badge>
                      </td>
                      <td className="py-2.5 hidden sm:table-cell" data-testid={`text-deadline-${item.id}`}>
                        {item.responseDeadline ? format(new Date(item.responseDeadline), "dd.MM.yyyy HH:mm") : "-"}
                      </td>
                      <td className="py-2.5" data-testid={`text-hours-${item.id}`}>
                        {item.hoursRemaining !== null
                          ? item.hoursRemaining < 0
                            ? <span className="text-destructive font-medium">{Math.abs(item.hoursRemaining ?? 0).toFixed(1)}s aşım</span>
                            : <span>{(item.hoursRemaining ?? 0).toFixed(1)}s</span>
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-branch-performance">
        <CardHeader>
          <CardTitle className="text-lg">Şube SLA Performansı</CardTitle>
        </CardHeader>
        <CardContent>
          {branchPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-performance">Performans verisi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Şube</th>
                    <th className="pb-2 font-medium text-muted-foreground">Toplam</th>
                    <th className="pb-2 font-medium text-muted-foreground">Aşılan</th>
                    <th className="pb-2 font-medium text-muted-foreground">Uyum %</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden sm:table-cell">Ort. Yanıt (saat)</th>
                  </tr>
                </thead>
                <tbody>
                  {branchPerformance.map((bp) => (
                    <tr key={bp.branchId} className="border-b last:border-0" data-testid={`row-branch-perf-${bp.branchId}`}>
                      <td className="py-2.5" data-testid={`text-perf-branch-${bp.branchId}`}>{bp.branchName}</td>
                      <td className="py-2.5" data-testid={`text-perf-total-${bp.branchId}`}>{bp.totalFeedback}</td>
                      <td className="py-2.5" data-testid={`text-perf-breached-${bp.branchId}`}>
                        {bp.breachedCount > 0 ? (
                          <span className="text-destructive font-medium">{bp.breachedCount}</span>
                        ) : (
                          <span>0</span>
                        )}
                      </td>
                      <td className="py-2.5" data-testid={`text-perf-compliance-${bp.branchId}`}>
                        <span className={bp.complianceRate >= 90 ? "text-green-600 dark:text-green-400" : bp.complianceRate >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-destructive"}>
                          %{bp.complianceRate}
                        </span>
                      </td>
                      <td className="py-2.5 hidden sm:table-cell" data-testid={`text-perf-avghours-${bp.branchId}`}>
                        {bp.avgResponseHours !== null ? (bp.avgResponseHours ?? 0).toFixed(1) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}