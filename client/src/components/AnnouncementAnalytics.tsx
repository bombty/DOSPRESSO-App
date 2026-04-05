import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Users,
  Eye,
  EyeOff,
  Building2,
  Clock,
  Bell,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

type AnalyticsData = {
  announcement: {
    id: number;
    title: string;
    category: string;
    publishedAt: string;
    requiresAcknowledgment: boolean;
  };
  summary: {
    totalTarget: number;
    totalRead: number;
    readRate: number;
    unreadCount: number;
  };
  roleBreakdown: { role: string; total: number; read: number; rate: number }[];
  branchBreakdown: { branchId: number; branchName: string; total: number; read: number; rate: number }[];
  hourlyDistribution: Record<number, number>;
  unreadUsers: { id: string; name: string; role: string; branchId: number | null }[];
};

const ROLE_LABELS: Record<string, string> = {
  barista: "Barista", bar_buddy: "BarBuddy", stajyer: "Stajyer",
  supervisor: "Supervisor", mudur: "Müdür", coach: "Coach",
  trainer: "Trainer", admin: "Admin", ceo: "CEO", cgo: "CGO",
  muhasebe: "Muhasebe", satinalma: "Satınalma", teknik: "Teknik",
  marketing: "Marketing", destek: "Destek",
};

interface AnnouncementAnalyticsProps {
  announcementId: number | null;
  open: boolean;
  onClose: () => void;
}

export function AnnouncementAnalytics({ announcementId, open, onClose }: AnnouncementAnalyticsProps) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/announcements", announcementId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${announcementId}/analytics`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Analitik yüklenemedi");
      return res.json();
    },
    enabled: !!announcementId && open,
  });

  const maxHourly = data ? Math.max(...Object.values(data.hourlyDistribution), 1) : 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden" data-testid="dialog-analytics">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Duyuru Analitik
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-4 pt-0 space-y-4">
              {/* Başlık */}
              <p className="text-sm text-muted-foreground line-clamp-1">{data.announcement.title}</p>

              {/* Özet Kartlar */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{data.summary.totalTarget}</p>
                  <p className="text-[10px] text-muted-foreground">Hedef</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-green-600" />
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">{data.summary.totalRead}</p>
                  <p className="text-[10px] text-muted-foreground">Okuyan</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                  <EyeOff className="h-4 w-4 mx-auto mb-1 text-red-600" />
                  <p className="text-lg font-semibold text-red-700 dark:text-red-400">{data.summary.unreadCount}</p>
                  <p className="text-[10px] text-muted-foreground">Okumayan</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${data.summary.readRate >= 80 ? "bg-green-50 dark:bg-green-950/30" : data.summary.readRate >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                  <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">%{data.summary.readRate}</p>
                  <p className="text-[10px] text-muted-foreground">Oran</p>
                </div>
              </div>

              <Separator />

              {/* Rol Bazlı */}
              <div>
                <p className="text-sm font-medium mb-2">Rol bazlı okuma oranları</p>
                <div className="space-y-1.5">
                  {data.roleBreakdown.sort((a, b) => a.rate - b.rate).map((r) => (
                    <div key={r.role} className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-muted-foreground w-20 truncate">
                        {ROLE_LABELS[r.role] || r.role}
                      </span>
                      <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${r.rate >= 80 ? "bg-green-500" : r.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${r.rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-16 text-right">
                        {r.read}/{r.total} (%{r.rate})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Şube Bazlı */}
              {data.branchBreakdown.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Şube bazlı okuma oranları</p>
                  <div className="space-y-1.5">
                    {data.branchBreakdown.map((b) => (
                      <div key={b.branchId} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground w-28 truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {b.branchName}
                        </span>
                        <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.rate >= 80 ? "bg-green-500" : b.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${b.rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-16 text-right">
                          {b.read}/{b.total} (%{b.rate})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Saatlik Dağılım */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Okuma zamanı dağılımı
                </p>
                <div className="flex items-end gap-px h-16">
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = data.hourlyDistribution[h] || 0;
                    const height = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-400 dark:bg-blue-600 rounded-t-sm transition-all min-h-[1px]"
                          style={{ height: `${Math.max(height, count > 0 ? 8 : 1)}%` }}
                          title={`${h}:00 — ${count} okuma`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">00</span>
                  <span className="text-[9px] text-muted-foreground">06</span>
                  <span className="text-[9px] text-muted-foreground">12</span>
                  <span className="text-[9px] text-muted-foreground">18</span>
                  <span className="text-[9px] text-muted-foreground">23</span>
                </div>
              </div>

              <Separator />

              {/* Okumayanlar */}
              {data.unreadUsers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      Henüz okumayan ({data.unreadUsers.length})
                    </p>
                    <Button variant="outline" size="sm" className="h-7 text-xs" data-testid="button-send-reminder">
                      <Bell className="h-3 w-3 mr-1" />
                      Hatırlatma Gönder
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.unreadUsers.slice(0, 20).map((u) => (
                      <Badge key={u.id} variant="outline" className="text-xs">
                        {u.name || "—"} ({ROLE_LABELS[u.role] || u.role})
                      </Badge>
                    ))}
                    {data.unreadUsers.length > 20 && (
                      <Badge variant="secondary" className="text-xs">
                        +{data.unreadUsers.length - 20} kişi daha
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Analitik veriler yüklenemedi
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
