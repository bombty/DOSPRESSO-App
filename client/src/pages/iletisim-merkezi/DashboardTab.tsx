import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { canSeeAllTickets, getDeptConfig } from "./categoryConfig";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Bot, AlertTriangle, Clock, MessageSquare, TicketCheck, Building2, Users, TrendingUp } from "lucide-react";

interface StaffPerformanceRow {
  userId: string;
  userName: string;
  userRole: string;
  resolvedCount: number;
  avgResolutionHours: number;
  slaComplianceRate: number;
  avgSatisfaction: number;
  openTicketCount: number;
  performanceScore: number;
}

interface BranchHealthRow {
  id: number;
  name: string;
  open_tickets: number;
  sla_breaches: number;
}

interface DashboardStats {
  openTickets: number;
  slaBreaches: number;
  slaRisk: number;
  b2cFeedbackCount: number;
  deptBreakdown: Array<{ department: string; count: string; sla_breached_count: string }>;
  recentTickets: Array<{
    id: number;
    ticket_number: string;
    title: string;
    department: string;
    priority: string;
    status: string;
    sla_breached: boolean;
    created_at: string;
    branch_name: string;
  }>;
  hqTaskStats: Array<{ status: string; count: string }>;
}

interface DashboardTabProps {
  stats: DashboardStats | undefined;
}

export default function DashboardTab({ stats }: DashboardTabProps) {
  const { user } = useAuth();
  const showBranchHealth = ["ceo", "cgo"].includes(user?.role ?? "");

  const { data: branchHealth = [] } = useQuery<BranchHealthRow[]>({
    queryKey: ["/api/iletisim/branch-health"],
    enabled: showBranchHealth,
  });

  const showStaffPerformance = canSeeAllTickets(user?.role ?? "");
  const { data: staffPerformance = [] } = useQuery<StaffPerformanceRow[]>({
    queryKey: ["/api/iletisim/staff-performance"],
    enabled: showStaffPerformance,
  });

  if (!stats) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  const { openTickets, slaBreaches, slaRisk, b2cFeedbackCount, deptBreakdown, recentTickets } = stats;

  const dobodyMessage = slaBreaches > 0
    ? `${slaBreaches} ticket SLA süresini aştı. ${deptBreakdown?.[0]?.department ? `${getDeptConfig(deptBreakdown[0].department)?.label} departmanı en yüklü.` : ""} Hemen inceleyin.`
    : openTickets > 0
    ? `${openTickets} açık şube talebi var. Tümü zamanında yanıtlanıyor.`
    : "Aktif SLA ihlali yok. Tüm talepler zamanında yanıtlanıyor.";

  const maxDeptCount = Math.max(...(deptBreakdown?.map((d) => parseInt(d.count)) ?? [1]), 1);

  return (
    <div className="space-y-4" data-testid="dashboard-tab">
      <div className="flex gap-3 p-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" data-testid="dobody-banner">
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Mr. Dobody</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{dobodyMessage}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/50 border-0" data-testid="kpi-open-tickets">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TicketCheck className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Açık Şube Talebi</p>
            </div>
            <p className={cn("text-2xl font-medium", openTickets > 5 ? "text-amber-500" : "text-foreground")} data-testid="text-open-tickets">{openTickets}</p>
            <p className="text-xs text-muted-foreground mt-1">{slaRisk > 0 ? `${slaRisk} SLA riski` : "Tümü zamanında"}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0" data-testid="kpi-sla-breaches">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">SLA İhlali</p>
            </div>
            <p className={cn("text-2xl font-medium", slaBreaches > 0 ? "text-red-500" : "text-foreground")} data-testid="text-sla-breaches">{slaBreaches}</p>
            <p className="text-xs text-muted-foreground mt-1">{slaBreaches > 0 ? "Acil aksiyon gerekiyor" : "İhlal yok"}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0" data-testid="kpi-sla-risk">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">SLA Risk</p>
            </div>
            <p className={cn("text-2xl font-medium", slaRisk > 0 ? "text-amber-500" : "text-foreground")} data-testid="text-sla-risk">{slaRisk}</p>
            <p className="text-xs text-muted-foreground mt-1">2 saat içinde aşılır</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0" data-testid="kpi-feedback">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Müşteri GB</p>
            </div>
            <p className="text-2xl font-medium text-foreground" data-testid="text-feedback-count">{b2cFeedbackCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Son 30 gün</p>
          </CardContent>
        </Card>
      </div>

      {showBranchHealth && branchHealth.length > 0 && (
        <Card data-testid="branch-health-preview">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Şube Sağlık Durumu
            </CardTitle>
            <span className="text-xs text-muted-foreground">{branchHealth.length} şube</span>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {branchHealth.slice(0, 8).map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between text-sm py-1.5"
                data-testid={`branch-health-${branch.id}`}
              >
                <span className="font-medium truncate flex-1 mr-2">{branch.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{branch.open_tickets} açık</span>
                  {Number(branch.sla_breaches) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {branch.sla_breaches} SLA
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showStaffPerformance && staffPerformance.length > 0 && (
        <Card data-testid="staff-performance-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Personel Performansı
            </CardTitle>
            <span className="text-xs text-muted-foreground">Son 30 gün</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border">
              <div className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 pb-2 text-xs text-muted-foreground font-medium">
                <span>Personel</span>
                <span className="text-right">Çözüm</span>
                <span className="text-right">SLA %</span>
                <span className="text-right">Ort. Süre</span>
                <span className="text-right">Skor</span>
              </div>
              {staffPerformance.slice(0, 10).map((staff) => {
                const scoreColor = staff.performanceScore >= 80
                  ? 'text-green-600 dark:text-green-400'
                  : staff.performanceScore >= 60
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400';
                const scoreBg = staff.performanceScore >= 80
                  ? 'bg-green-100 dark:bg-green-950/40'
                  : staff.performanceScore >= 60
                    ? 'bg-amber-100 dark:bg-amber-950/40'
                    : 'bg-red-100 dark:bg-red-950/40';
                return (
                  <div
                    key={staff.userId}
                    className="grid grid-cols-[1fr_60px_60px_60px_70px] gap-2 py-2 items-center"
                    data-testid={`staff-row-${staff.userId}`}
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{staff.userName || '—'}</span>
                      {staff.openTicketCount > 0 && (
                        <span className="text-xs text-muted-foreground">{staff.openTicketCount} açık</span>
                      )}
                    </div>
                    <span className="text-sm text-right font-medium">{staff.resolvedCount}</span>
                    <span className={cn("text-sm text-right", staff.slaComplianceRate < 80 ? 'text-red-500' : 'text-foreground')}>
                      %{staff.slaComplianceRate}
                    </span>
                    <span className="text-sm text-right text-muted-foreground">
                      {staff.avgResolutionHours > 0 ? `${staff.avgResolutionHours}s` : '—'}
                    </span>
                    <div className="flex justify-end">
                      <span className={cn("text-sm font-bold px-2 py-0.5 rounded", scoreColor, scoreBg)} data-testid={`score-${staff.userId}`}>
                        {staff.performanceScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium">Departman Yük Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(deptBreakdown ?? []).map((dept) => {
              const cfg = getDeptConfig(dept.department);
              const count = parseInt(dept.count);
              const breached = parseInt(dept.sla_breached_count ?? "0");
              const pct = maxDeptCount > 0 ? (count / maxDeptCount) * 100 : 0;
              const DeptIcon = cfg?.icon;
              return (
                <div key={dept.department} data-testid={`dept-load-${dept.department}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5">
                      {DeptIcon && <DeptIcon className="h-3.5 w-3.5" />}
                      {cfg?.label ?? dept.department}
                    </span>
                    <span className={cn("text-xs", breached > 0 ? "text-red-500" : "text-muted-foreground")}>
                      {count} açık{breached > 0 ? ` · ${breached} ihlal` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", breached > 0 ? "bg-red-500" : count > 2 ? "bg-amber-500" : "bg-blue-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!deptBreakdown || deptBreakdown.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-3">Açık talep yok</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium">Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {(recentTickets ?? []).slice(0, 6).map((ticket) => {
              const cfg = getDeptConfig(ticket.department);
              return (
                <div key={ticket.id} className="flex items-start gap-2.5 py-2.5" data-testid={`recent-ticket-${ticket.id}`}>
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0",
                    ticket.sla_breached ? "bg-red-500" :
                    ticket.priority === "kritik" ? "bg-red-400" :
                    ticket.priority === "yuksek" ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ticket.branch_name} · {cfg?.label ?? ticket.department} · {
                        formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                      }
                    </p>
                  </div>
                  {ticket.sla_breached && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0">SLA</Badge>
                  )}
                </div>
              );
            })}
            {(!recentTickets || recentTickets.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
