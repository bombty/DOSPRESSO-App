import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
  BookOpen,
  Package,
  ClipboardCheck,
  Users,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface AgentAction {
  id: number;
  runId: number | null;
  actionType: string;
  targetUserId: number | null;
  targetRoleScope: string | null;
  branchId: number | null;
  title: string;
  description: string | null;
  deepLink: string | null;
  severity: string;
  status: string;
  approvedByUserId: number | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  expiresAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

interface AgentSummary {
  pending: number;
  today: number;
  critical: number;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  remind: { label: "Hatırlatma", icon: Bell, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  escalate: { label: "Yükseltme", icon: ArrowUpRight, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  report: { label: "Rapor", icon: TrendingUp, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  suggest_task: { label: "Görev Önerisi", icon: ClipboardCheck, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  alert: { label: "Uyarı", icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  checklist_warning: { label: "Checklist", icon: ClipboardCheck, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  training_nudge: { label: "Eğitim", icon: BookOpen, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  stock_alert: { label: "Stok", icon: Package, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  sla_warning: { label: "SLA", icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  performance_note: { label: "Performans", icon: Users, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
};

const SEVERITY_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Düşük", variant: "secondary" },
  med: { label: "Orta", variant: "default" },
  high: { label: "Yüksek", variant: "destructive" },
  critical: { label: "Kritik", variant: "destructive" },
};

function ActionCard({ action, onApprove, onReject }: {
  action: AgentAction;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const config = ACTION_TYPE_CONFIG[action.actionType] || ACTION_TYPE_CONFIG.alert;
  const severityConfig = SEVERITY_CONFIG[action.severity] || SEVERITY_CONFIG.med;
  const Icon = config.icon;
  const isPending = action.status === "pending";

  return (
    <Card className="hover-elevate" data-testid={`card-agent-action-${action.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md ${config.color} shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm" data-testid={`text-action-title-${action.id}`}>
                {action.title}
              </span>
              <Badge variant={severityConfig.variant} className="text-xs">
                {severityConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
            {action.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-action-desc-${action.id}`}>
                {action.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {new Date(action.createdAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {action.deepLink && (
                <Link href={action.deepLink}>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" data-testid={`link-action-deep-${action.id}`}>
                    <ExternalLink className="h-3 w-3" />
                    Detay
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {isPending && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="text-green-600 dark:text-green-400"
                onClick={() => onApprove(action.id)}
                data-testid={`button-approve-${action.id}`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                onClick={() => onReject(action.id)}
                data-testid={`button-reject-${action.id}`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          {action.status === "approved" && (
            <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700 shrink-0">
              Onaylandı
            </Badge>
          )}
          {action.status === "rejected" && (
            <Badge variant="outline" className="text-red-600 border-red-300 dark:text-red-400 dark:border-red-700 shrink-0">
              Reddedildi
            </Badge>
          )}
          {action.status === "expired" && (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              Süresi Doldu
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentActionCenter({ skillFilter }: { skillFilter?: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectActionId, setRejectActionId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showAll, setShowAll] = useState(false);

  const summaryQuery = useQuery<AgentSummary>({
    queryKey: ["/api/agent/actions/summary"],
    refetchInterval: 60000,
  });

  const actionsQuery = useQuery<{ data: AgentAction[]; total: number }>({
    queryKey: ["/api/agent/actions", statusFilter, skillFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (skillFilter && skillFilter !== "all") params.set("skillId", skillFilter);
      params.set("limit", showAll ? "100" : "10");
      const res = await fetch(`/api/agent/actions?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yüklenemedi");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/agent/actions/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions/summary"] });
      toast({ title: "Öneri onaylandı" });
    },
    onError: () => {
      toast({ title: "Onaylama hatası", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiRequest("POST", `/api/agent/actions/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions/summary"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      toast({ title: "Öneri reddedildi" });
    },
    onError: () => {
      toast({ title: "Reddetme hatası", variant: "destructive" });
    },
  });

  const handleReject = (id: number) => {
    setRejectActionId(id);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (rejectActionId !== null) {
      rejectMutation.mutate({ id: rejectActionId, reason: rejectReason });
    }
  };

  const summary = summaryQuery.data;
  const actions = actionsQuery.data?.data || [];
  const total = actionsQuery.data?.total || 0;

  return (
    <div className="space-y-4" data-testid="agent-action-center">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card data-testid="card-agent-pending">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-pending-count">
                {summary?.pending ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Bekleyen Öneri</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-agent-today">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-today-count">
                {summary?.today ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Bugünkü Öneri</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-agent-critical">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-critical-count">
                {summary?.critical ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Kritik Öneri</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Mr. Dobody Önerileri
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              {[
                { value: "pending", label: "Bekleyen" },
                { value: "approved", label: "Onaylanan" },
                { value: "rejected", label: "Reddedilen" },
                { value: "all", label: "Tümü" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={statusFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(f.value)}
                  data-testid={`button-filter-${f.value}`}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {actionsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-actions">
              {statusFilter === "pending"
                ? "Bekleyen öneri yok. Mr. Dobody her şeyin yolunda olduğunu düşünüyor!"
                : "Bu filtreye uygun öneri bulunamadı."}
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={handleReject}
                />
              ))}
              {total > actions.length && !showAll && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAll(true)}
                  data-testid="button-show-all-actions"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Tümünü Göster ({total})
                </Button>
              )}
              {showAll && total > 10 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAll(false)}
                  data-testid="button-show-less-actions"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Daralt
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öneriyi Reddet</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Red nedeni (isteğe bağlı)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            data-testid="input-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "İşleniyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AgentSummaryWidget() {
  const summaryQuery = useQuery<AgentSummary>({
    queryKey: ["/api/agent/actions/summary"],
    refetchInterval: 60000,
  });

  const summary = summaryQuery.data;
  if (!summary || (summary.pending === 0 && summary.critical === 0)) return null;

  return (
    <Card className="hover-elevate" data-testid="widget-agent-summary">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">Mr. Dobody</div>
            <div className="text-xs text-muted-foreground">
              {summary.pending > 0 && `${summary.pending} bekleyen öneri`}
              {summary.pending > 0 && summary.critical > 0 && " · "}
              {summary.critical > 0 && `${summary.critical} kritik`}
            </div>
          </div>
          <Link href="/agent-merkezi">
            <Button variant="outline" size="sm" data-testid="button-go-agent-center">
              Görüntüle
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
