import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, ChevronRight, Clock, AlertCircle, User } from "lucide-react";

interface AssignedTask {
  id: number;
  description: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assigneeName: string;
  branchId: number | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  onay_bekliyor: { label: "Onay Bekliyor", variant: "default" },
  sure_uzatma_talebi: { label: "Süre Talebi", variant: "outline" },
  cevap_bekliyor: { label: "Cevap Bekliyor", variant: "outline" },
  devam_ediyor: { label: "Devam Ediyor", variant: "secondary" },
  beklemede: { label: "Beklemede", variant: "secondary" },
  goruldu: { label: "Görüldü", variant: "secondary" },
  foto_bekleniyor: { label: "Fotoğraf Bekliyor", variant: "outline" },
  incelemede: { label: "İncelemede", variant: "outline" },
  kontrol_bekliyor: { label: "Kontrol Bekliyor", variant: "outline" },
  ek_bilgi_bekleniyor: { label: "Ek Bilgi Bekliyor", variant: "outline" },
};

function getDaysRemaining(dueDate: string | null): { text: string; isOverdue: boolean } {
  if (!dueDate) return { text: "Süresiz", isOverdue: false };
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)} gün gecikmiş`, isOverdue: true };
  if (diffDays === 0) return { text: "Bugün", isOverdue: false };
  if (diffDays === 1) return { text: "Yarın", isOverdue: false };
  return { text: `${diffDays} gün kaldı`, isOverdue: false };
}

export function AtadiklarimWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tasks, isLoading } = useQuery<AssignedTask[]>({
    queryKey: ["/api/tasks/assigned-by-me"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-atadiklarim-loading">
        <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
          <CardTitle className="text-sm font-medium">Atadığım Görevler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const displayTasks = (tasks || []).slice(0, 5);
  const totalCount = tasks?.length || 0;

  if (displayTasks.length === 0) {
    return (
      <Card data-testid="widget-atadiklarim-empty">
        <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Atadığım Görevler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aktif atanmış görev bulunmuyor
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="widget-atadiklarim">
      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          Atadığım Görevler
          <Badge variant="secondary" className="ml-1">{totalCount}</Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/gorevler")}
          data-testid="link-atadiklarim-tumunu-gor"
        >
          Tümünü Gör
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTasks.map((task) => {
          const statusInfo = STATUS_MAP[task.status] || { label: task.status, variant: "secondary" as const };
          const deadline = getDaysRemaining(task.dueDate);
          const isApprovalPending = task.status === "onay_bekliyor";

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                isApprovalPending ? "bg-yellow-500/10 dark:bg-yellow-400/10" : ""
              }`}
              onClick={() => navigate(`/gorev-detay/${task.id}`)}
              data-testid={`task-assigned-${task.id}`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium truncate" title={task.description}>
                  {task.description.length > 40
                    ? task.description.substring(0, 40) + "..."
                    : task.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assigneeName}
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${
                    deadline.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  }`}>
                    {deadline.isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {deadline.text}
                  </span>
                </div>
              </div>
              <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                {statusInfo.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
