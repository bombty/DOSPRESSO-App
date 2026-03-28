import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { CompactKPIStrip } from "@/components/shared/UnifiedKPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  ClipboardCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  Package,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { DobodySuggestionList } from "@/components/dobody-suggestion-card";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { Bot } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface BranchSummaryData {
  branch: { id: number; name: string };
  kpis: {
    activeStaff: number;
    totalStaff: number;
    checklistCompletion: number;
    customerAvg: number;
    feedbackCount: number;
    warnings: number;
  };
  teamStatus: Array<{
    id: string;
    name: string;
    role: string;
    checklistStatus: string;
  }>;
  lowStockItems: Array<{
    productName: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
  }>;
  suggestions: Array<{
    id: string;
    message: string;
    actionType: string;
    actionLabel: string;
    priority: string;
    icon: string;
    targetUserId?: string;
    payload?: Record<string, any>;
  }>;
}

function ChecklistStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-blue-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function KPICard({ icon: Icon, label, value, sub, variant = "default" }: {
  icon: any; label: string; value: string | number; sub?: string;
  variant?: "default" | "warning" | "success";
}) {
  const borderClass = variant === "warning" ? "border-orange-500/30" :
    variant === "success" ? "border-green-500/30" : "";
  
  return (
    <Card className={borderClass}>
      <CardContent className="p-2 flex flex-col items-center gap-0.5">
        <Icon className={`h-4 w-4 ${variant === "warning" ? "text-orange-500" : variant === "success" ? "text-green-500" : "text-muted-foreground"}`} />
        <div className="text-base font-bold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground text-center">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const MissionControlSupervisor = lazy(() => import("@/components/mission-control/MissionControlSupervisor"));

export default function SubeOzet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMissionControl, isLoading: modeLoading } = useDashboardMode();
  const branchId = user?.branchId ? Number(user.branchId) : null;
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  if (!modeLoading && isMissionControl) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Yükleniyor...</p></div>}>
        <MissionControlSupervisor />
      </Suspense>
    );
  }

  const { data, isLoading, isError, refetch } = useQuery<BranchSummaryData>({
    queryKey: ["/api/branch-summary", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branch-summary/${branchId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!branchId,
  });

  const quickAction = useMutation({
    mutationFn: async (action: any) => {
      const res = await apiRequest("POST", "/api/quick-action", action);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.details) {
        const d = data.details;
        const time = d.sentAt ? new Date(d.sentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        toast({
          title: "Bildirim Gönderildi",
          description: `${d.recipientName}${d.recipientRole ? ` (${d.recipientRole})` : ""}${d.branch ? ` — ${d.branch}` : ""}${time ? ` • ${time}` : ""}`,
        });
      } else {
        toast({ title: "İşlem tamamlandı", description: data.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/branch-summary", branchId] });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem gerçekleştirilemedi", variant: "destructive" });
    },
  });

  if (!branchId) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Şube bilgisi bulunamadı</CardContent></Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-6xl mx-auto" data-testid="sube-ozet-loading">
        <Skeleton className="h-8 w-2/3" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" /><Skeleton className="h-24" />
          <Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-3 sm:p-4 max-w-6xl mx-auto" data-testid="sube-ozet-error">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Veriler yüklenemedi</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-6xl mx-auto overflow-y-auto h-full" data-testid="sube-ozet-page">
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div data-testid="branch-header">
        <h1 className="text-xl font-bold" data-testid="text-branch-name">{data.branch.name}</h1>
        <p className="text-sm text-muted-foreground">Şube Özeti</p>
      </div>

      <CompactKPIStrip
        items={[
          { label: "Aktif Personel", value: data.kpis.activeStaff, subtitle: `/ ${data.kpis.totalStaff}`, icon: <Users className="h-4 w-4 text-muted-foreground" />, color: "info", testId: "kpi-active-staff" },
          { label: "Checklist", value: `%${data.kpis.checklistCompletion}`, icon: <ClipboardCheck className={`h-4 w-4 ${data.kpis.checklistCompletion < 50 ? "text-orange-500" : data.kpis.checklistCompletion >= 80 ? "text-green-500" : "text-muted-foreground"}`} />, color: data.kpis.checklistCompletion < 50 ? "warning" : data.kpis.checklistCompletion >= 80 ? "success" : "info", testId: "kpi-checklist" },
          { label: "Müşteri Puanı", value: data.kpis.customerAvg || "---", subtitle: data.kpis.feedbackCount > 0 ? `${data.kpis.feedbackCount} değerlendirme` : undefined, icon: <Star className={`h-4 w-4 ${data.kpis.customerAvg > 0 && data.kpis.customerAvg < 3.5 ? "text-orange-500" : "text-muted-foreground"}`} />, color: data.kpis.customerAvg > 0 && data.kpis.customerAvg < 3.5 ? "warning" : "info", testId: "kpi-customer" },
          { label: "Uyarılar", value: data.kpis.warnings, icon: <AlertTriangle className={`h-4 w-4 ${data.kpis.warnings > 0 ? "text-orange-500" : "text-muted-foreground"}`} />, color: data.kpis.warnings > 0 ? "warning" : "muted", testId: "kpi-warnings" },
        ]}
        desktopColumns={2}
        desktopRenderer={
          <div className="grid grid-cols-2 gap-3" data-testid="kpi-grid">
            <KPICard icon={Users} label="Aktif Personel" value={data.kpis.activeStaff} sub={`/ ${data.kpis.totalStaff}`} />
            <KPICard icon={ClipboardCheck} label="Checklist" value={`%${data.kpis.checklistCompletion}`} variant={data.kpis.checklistCompletion < 50 ? "warning" : data.kpis.checklistCompletion >= 80 ? "success" : "default"} />
            <KPICard icon={Star} label="Müşteri Puanı" value={data.kpis.customerAvg || "---"} sub={data.kpis.feedbackCount > 0 ? `${data.kpis.feedbackCount} değerlendirme` : undefined} variant={data.kpis.customerAvg > 0 && data.kpis.customerAvg < 3.5 ? "warning" : "default"} />
            <KPICard icon={AlertTriangle} label="Uyarılar" value={data.kpis.warnings} variant={data.kpis.warnings > 0 ? "warning" : "default"} />
          </div>
        }
      />

      <DobodySuggestionList
        suggestions={data.suggestions || []}
        title="Mr. Dobody Önerileri"
        onAction={(s) => quickAction.mutate({
          actionType: "send_notification",
          targetUserId: s.targetUserId || s.payload?.userIds?.[0],
          title: s.actionLabel,
          message: s.message,
          suggestionId: s.id,
        })}
        isPending={quickAction.isPending}
      />

      {data.teamStatus.length > 0 && (
        <Card data-testid="card-team-status">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ekip Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {data.teamStatus.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md"
                data-testid={`team-member-${member.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChecklistStatusIcon status={member.checklistStatus} />
                  <span className="text-sm truncate">{member.name}</span>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">{member.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.lowStockItems.length > 0 && (
        <Card data-testid="card-low-stock">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              Stok Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {data.lowStockItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-2 rounded-md text-sm"
                data-testid={`stock-item-${i}`}
              >
                <span className="truncate">{item.productName}</span>
                <span className="text-orange-500 font-medium flex-shrink-0">
                  {item.currentStock}/{item.minimumStock} {item.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="pb-4 space-y-2">
        {(user?.role === "supervisor" || user?.role === "supervisor_buddy" || user?.role === "mudur") && (
          <Button variant="outline" className="w-full" onClick={() => setShowAssignDialog(true)} data-testid="btn-assign-task">
            <Bot className="h-4 w-4 mr-2" />
            Ekibe Görev Ata
          </Button>
        )}
        <Link href="/">
          <Button variant="outline" className="w-full" data-testid="btn-detailed-dashboard">
            <ExternalLink className="h-4 w-4 mr-2" />
            Detaylı Dashboard
          </Button>
        </Link>
      </div>

      <QuickTaskModal
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        branchId={branchId}
      />
    </div>
  );
}
