import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";
import {
  Megaphone,
  TicketCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface DashboardKpis {
  todayFeedbackCount: number;
  avgRating: number;
  openComplaintsCount: number;
  slaBreachCount: number;
  totalFeedback30d: number;
  negativeCount: number;
  avgServiceRating: number | null;
  avgCleanlinessRating: number | null;
  avgProductRating: number | null;
  avgStaffRating: number | null;
}

interface BranchComparison {
  branchId: number;
  branchName: string;
  avgRating: number;
  feedbackCount: number;
}

interface RecentInteraction {
  id: number;
  branchId: number;
  branchName: string;
  rating: number;
  comment: string | null;
  status: string;
  feedbackType: string | null;
  source: string | null;
  createdAt: string;
}

interface CategoryDistItem {
  category: string;
  count: number;
}

interface DashboardData {
  kpis: DashboardKpis;
  branchComparison: BranchComparison[];
  recentInteractions: RecentInteraction[];
  categoryDistribution: CategoryDistItem[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    new: { label: "Yeni", variant: "default" },
    in_progress: { label: "İşlemde", variant: "secondary" },
    resolved: { label: "Çözüldü", variant: "outline" },
    closed: { label: "Kapatıldı", variant: "outline" },
    awaiting_response: { label: "Yanıt Bekliyor", variant: "destructive" },
  };
  const entry = map[status] || { label: status, variant: "secondary" as const };
  return (
    <Badge variant={entry.variant} data-testid={`badge-status-${status}`}>
      {entry.label}
    </Badge>
  );
}

export default function CRMDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/crm/dashboard-stats"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Dashboard verileri yüklenemedi
      </div>
    );
  }

  const { kpis, recentInteractions } = data;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <CompactKPIStrip
          items={[
            { label: "Açık Ticket / Talepler", value: kpis.openComplaintsCount, subtitle: "Çözüm bekliyor", icon: <TicketCheck className={`h-4 w-4 ${kpis.openComplaintsCount > 0 ? "text-orange-600" : "text-green-600"}`} />, color: kpis.openComplaintsCount > 0 ? "warning" : "success", testId: "kpi-open-tickets" },
            { label: "SLA İhlalleri", value: kpis.slaBreachCount, subtitle: "Süre aşımı", icon: <AlertTriangle className={`h-4 w-4 ${kpis.slaBreachCount > 0 ? "text-red-600" : "text-green-600"}`} />, color: kpis.slaBreachCount > 0 ? "danger" : "success", testId: "kpi-sla-breaches" },
            { label: "Kampanya & Etkileşim", value: kpis.totalFeedback30d, subtitle: "Son 30 gün", icon: <Megaphone className="h-4 w-4 text-blue-600" />, color: "info", testId: "kpi-campaigns" },
          ]}
          desktopColumns={3}
        />

        <Card data-testid="recent-tickets">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Son Ticket / Talepler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentInteractions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz ticket/talep yok</p>
              ) : (
                recentInteractions.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-muted/30 space-y-1"
                    data-testid={`ticket-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {item.branchName}
                        </Badge>
                        <StatusBadge status={item.status} />
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`ticket-date-${item.id}`}>
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
