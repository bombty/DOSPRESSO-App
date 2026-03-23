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
  DialogDescription,
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
  Info,
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

const INVALID_DEEP_LINKS = ["/sube-ozet", "/sube/employee-dashboard"];

const LEGACY_DEEP_LINK_MAP: Record<string, string> = {
  "/admin?tab=sla": "/hq-destek",
  "/bordro?tab=parametreler": "/bordrom",
  "/crm?tab=feedback": "/crm?channel=misafir",
  "/satinalma?tab=tedarikciler": "/satinalma/tedarikci",
  "/satinalma?tab=siparisler": "/satinalma/siparis",
  "/fabrika?tab=hedefler": "/fabrika/uretim-planlama",
  "/akademi-hq?tab=training": "/akademi-hq",
  "/akademi-hq?tab=certs": "/akademi-hq?tab=certs",
};

function normalizeLegacyDeepLink(link: string): string {
  if (LEGACY_DEEP_LINK_MAP[link]) return LEGACY_DEEP_LINK_MAP[link];
  const adminTabMatch = link.match(/^\/admin\?tab=users/);
  if (adminTabMatch) return "/admin/kullanicilar";
  return link;
}

function getActionDeepLink(action: AgentAction): string | null {
  const meta = action.metadata || {};
  if (meta.targetUserId && (meta.insightType === "score_dropping" || meta.insightType === "low_performance")) {
    return `/personel-detay/${meta.targetUserId}`;
  }
  if (action.deepLink && !INVALID_DEEP_LINKS.includes(action.deepLink)) {
    let fixed = action.deepLink.replace(/^\/personel\/([^/]+)$/, "/personel-detay/$1");
    fixed = normalizeLegacyDeepLink(fixed);
    return fixed;
  }
  return null;
}

function getApproveConsequence(action: AgentAction): string {
  const meta = action.metadata || {};
  const hasTarget = action.targetUserId || meta.targetUserId;
  if (hasTarget && (action.actionType === "alert" || action.actionType === "performance_note")) {
    return "Şube supervisor'ına bildirim gönderilecek, performans görüşmesi görevi oluşturulacak ve Flow Mode'a eklenecek.";
  }
  if (action.actionType === "remind") return "Hedef kullanıcıya hatırlatma bildirimi gönderilecek.";
  if (action.actionType === "alert") return "Hedef kullanıcıya uyarı bildirimi gönderilecek.";
  if (action.actionType === "escalate") return "Konu yükseltilecek ve ilgili kişilere bildirim gönderilecek.";
  if (action.actionType === "suggest_task") return "Görev önerisi olarak kaydedilecek.";
  return "Öneri onaylanmış olarak işaretlenecek.";
}

function ActionCard({ action, onApprove, onReject, onShowDetail }: {
  action: AgentAction;
  onApprove: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
  onShowDetail: (action: AgentAction) => void;
}) {
  const config = ACTION_TYPE_CONFIG[action.actionType] || ACTION_TYPE_CONFIG.alert;
  const severityConfig = SEVERITY_CONFIG[action.severity] || SEVERITY_CONFIG.med;
  const Icon = config.icon;
  const isPending = action.status === "pending";
  const deepLink = getActionDeepLink(action);

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
              {deepLink ? (
                <Link href={deepLink}>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" data-testid={`link-action-deep-${action.id}`}>
                    <ExternalLink className="h-3 w-3" />
                    Detay
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => onShowDetail(action)}
                  data-testid={`button-action-detail-${action.id}`}
                >
                  <Info className="h-3 w-3" />
                  Detay
                </Button>
              )}
            </div>
          </div>
          {isPending && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="text-green-600 dark:text-green-400"
                onClick={() => onApprove(action)}
                data-testid={`button-approve-${action.id}`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                onClick={() => onReject(action)}
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

function ActionContextSummary({ action }: { action: AgentAction }) {
  const meta = action.metadata || {};
  const details: string[] = [];

  if (meta.targetUserName) details.push(`Personel: ${meta.targetUserName}`);
  if (meta.branchName) details.push(`Şube: ${meta.branchName}`);
  if (meta.score !== undefined) details.push(`Skor: ${meta.score}/100`);
  if (meta.avgRating !== undefined) details.push(`Ortalama Puan: ${Number(meta.avgRating ?? 0).toFixed(1)}`);
  if (meta.lotCount !== undefined) details.push(`Lot Sayısı: ${meta.lotCount}`);
  if (meta.itemCount !== undefined) details.push(`Ürün Sayısı: ${meta.itemCount}`);
  if (meta.slaBreachCount !== undefined) details.push(`SLA İhlali: ${meta.slaBreachCount}`);
  if (meta.rate !== undefined) details.push(`Tamamlama: %${meta.rate}`);
  if (meta.feedbackCount !== undefined) details.push(`Değerlendirme: ${meta.feedbackCount}`);

  if (details.length === 0) return null;

  return (
    <div className="text-sm text-muted-foreground space-y-1 mt-2" data-testid="text-action-context">
      {details.map((d, i) => (
        <div key={i}>{d}</div>
      ))}
    </div>
  );
}

export function AgentActionCenter({ skillFilter }: { skillFilter?: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showAll, setShowAll] = useState(false);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveAction, setApproveAction] = useState<AgentAction | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectAction, setRejectAction] = useState<AgentAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailAction, setDetailAction] = useState<AgentAction | null>(null);

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

  const [approveResult, setApproveResult] = useState<{
    supervisorName?: string;
    taskCreated?: boolean;
    notificationSent?: boolean;
    flowTaskCreated?: boolean;
  } | null>(null);
  const [approveResultDialogOpen, setApproveResultDialogOpen] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/agent/actions/${id}/approve`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions/summary"] });
      setApproveDialogOpen(false);

      if (data.supervisorName && data.taskCreated) {
        setApproveResult(data);
        setApproveResultDialogOpen(true);
      } else {
        toast({ title: "Öneri onaylandı" });
      }
      setApproveAction(null);
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
      const reason = rejectReason;
      setRejectAction(null);
      setRejectReason("");
      toast({ 
        title: "Öneri reddedildi",
        description: reason ? `Neden: ${reason}` : undefined,
      });
    },
    onError: () => {
      toast({ title: "Reddetme hatası", variant: "destructive" });
    },
  });

  const handleApprove = (action: AgentAction) => {
    setApproveAction(action);
    setApproveDialogOpen(true);
  };

  const confirmApprove = () => {
    if (approveAction) {
      approveMutation.mutate(approveAction.id);
    }
  };

  const handleReject = (action: AgentAction) => {
    setRejectAction(action);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (rejectAction) {
      rejectMutation.mutate({ id: rejectAction.id, reason: rejectReason });
    }
  };

  const handleShowDetail = (action: AgentAction) => {
    setDetailAction(action);
    setDetailDialogOpen(true);
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
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onShowDetail={handleShowDetail}
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

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öneriyi Onayla</DialogTitle>
            <DialogDescription>Bu öneriyi onaylamak istediğinize emin misiniz?</DialogDescription>
          </DialogHeader>
          {approveAction && (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted">
                <div className="font-medium text-sm" data-testid="text-approve-title">
                  {approveAction.title}
                </div>
                {approveAction.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {approveAction.description}
                  </p>
                )}
                <ActionContextSummary action={approveAction} />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Onayladığınızda:</span>
                <p className="mt-1">{getApproveConsequence(approveAction)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} data-testid="button-cancel-approve">
              İptal
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "İşleniyor..." : "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öneriyi Reddet</DialogTitle>
            <DialogDescription>Bu öneriyi reddetmek istediğinize emin misiniz?</DialogDescription>
          </DialogHeader>
          {rejectAction && (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted">
                <div className="font-medium text-sm" data-testid="text-reject-title">
                  {rejectAction.title}
                </div>
                {rejectAction.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {rejectAction.description}
                  </p>
                )}
                <ActionContextSummary action={rejectAction} />
              </div>
              <Textarea
                placeholder="Red nedeni (isteğe bağlı)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                data-testid="input-reject-reason"
              />
            </div>
          )}
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

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öneri Detayı</DialogTitle>
            <DialogDescription>Mr. Dobody tarafından oluşturulan öneri bilgileri</DialogDescription>
          </DialogHeader>
          {detailAction && (
            <div className="space-y-3">
              <div>
                <div className="font-medium text-sm" data-testid="text-detail-title">
                  {detailAction.title}
                </div>
                {detailAction.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {detailAction.description}
                  </p>
                )}
              </div>
              <ActionContextSummary action={detailAction} />
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span>
                  {new Date(detailAction.createdAt).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {detailAction.status !== "pending" && (
                  <Badge variant="outline" className="text-xs">
                    {detailAction.status === "approved" ? "Onaylandı" : detailAction.status === "rejected" ? "Reddedildi" : "Süresi Doldu"}
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} data-testid="button-close-detail">
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveResultDialogOpen} onOpenChange={setApproveResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              Öneri Onaylandı
            </DialogTitle>
            <DialogDescription>Onay zinciri tamamlandı</DialogDescription>
          </DialogHeader>
          {approveResult && (
            <div className="space-y-3" data-testid="approve-result-details">
              {approveResult.supervisorName && approveResult.notificationSent && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                  <Bell className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-sm">
                    Supervisor <span className="font-medium">{approveResult.supervisorName}</span>'a bildirim gönderildi.
                  </p>
                </div>
              )}
              {approveResult.taskCreated && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                  <ClipboardCheck className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm">
                    Performans görüşmesi görevi oluşturuldu — 3 gün içinde tamamlanmalı.
                  </p>
                </div>
              )}
              {approveResult.flowTaskCreated && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                  <Zap className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm">
                    Supervisor'ın Flow Mode görev listesine eklendi.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setApproveResultDialogOpen(false)} data-testid="button-close-approve-result">
              Tamam
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
