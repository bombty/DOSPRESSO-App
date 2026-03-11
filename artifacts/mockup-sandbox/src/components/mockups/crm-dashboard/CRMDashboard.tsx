import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  BarChart3,
  Coffee,
  Ticket,
  Megaphone,
  Filter,
  CalendarDays,
} from "lucide-react";

const kpiCards = [
  {
    title: "Toplam Geri Bildirim",
    value: "23",
    change: "+12%",
    trend: "up" as const,
    icon: MessageSquare,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    title: "Aktif Talepler",
    value: "3",
    change: "-25%",
    trend: "down" as const,
    icon: Ticket,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    title: "SLA Uyumu",
    value: "%87",
    change: "+5%",
    trend: "up" as const,
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    title: "Ort. Memnuniyet",
    value: "4.2",
    change: "+0.3",
    trend: "up" as const,
    icon: Star,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
];

const recentFeedback = [
  { id: 1, branch: "Kadikoy", rating: 5, type: "feedback", status: "resolved", time: "2 saat once", comment: "Harika kahve, cok temiz mekan" },
  { id: 2, branch: "Besiktas", rating: 2, type: "complaint", status: "new", time: "4 saat once", comment: "Servis cok yavas, 20 dk bekledim" },
  { id: 3, branch: "Uskudar", rating: 4, type: "feedback", status: "resolved", time: "6 saat once", comment: "Latte cok guzeldi" },
  { id: 4, branch: "Sisli", rating: 3, type: "feedback", status: "new", time: "8 saat once", comment: "Ortam guzel ama WiFi yavas" },
  { id: 5, branch: "Bakirkoy", rating: 1, type: "complaint", status: "new", time: "12 saat once", comment: "Siparis yanlis geldi" },
];

const ticketSummary = [
  { label: "Yeni", count: 12, color: "bg-blue-500" },
  { label: "Devam Ediyor", count: 8, color: "bg-amber-500" },
  { label: "Cozuldu", count: 11, color: "bg-emerald-500" },
  { label: "SLA Ihlali", count: 3, color: "bg-red-500" },
];

const branchPerformance = [
  { name: "Kadikoy", score: 94, feedback: 5, trend: "up" as const },
  { name: "Besiktas", score: 87, feedback: 4, trend: "up" as const },
  { name: "Bakirkoy", score: 72, feedback: 3, trend: "down" as const },
  { name: "Uskudar", score: 91, feedback: 4, trend: "up" as const },
  { name: "Sisli", score: 68, feedback: 2, trend: "down" as const },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right text-muted-foreground">{score}</span>
    </div>
  );
}

export function CRMDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">CRM Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Is Iliskileri ve Musteri Yonetimi</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Son 30 Gun
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtre
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title} className="border-0 shadow-none bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${kpi.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">gecen aya gore</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-0 shadow-none bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-foreground">Son Geri Bildirimler</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Tumunu Gor
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentFeedback.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${fb.type === "complaint" ? "bg-red-50 dark:bg-red-950/40" : "bg-blue-50 dark:bg-blue-950/40"}`}>
                      {fb.type === "complaint" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{fb.branch}</span>
                        <RatingStars rating={fb.rating} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{fb.comment}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant={fb.status === "resolved" ? "secondary" : "outline"}
                        className="text-[10px] px-1.5"
                      >
                        {fb.status === "resolved" ? "Cozuldu" : "Yeni"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{fb.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-0 shadow-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground">Talep Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticketSummary.map((t) => (
                  <div key={t.label} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${t.color} shrink-0`} />
                    <span className="text-sm text-muted-foreground flex-1">{t.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{t.count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Toplam</span>
                    <span className="text-sm font-bold text-foreground">34</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground">Sube Performansi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {branchPerformance.map((bp) => (
                  <div key={bp.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-20 shrink-0">
                      <Coffee className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-xs font-medium text-foreground truncate">{bp.name}</span>
                    </div>
                    <ScoreBar score={bp.score} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-none bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ort. Cozum Suresi</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">4.2 <span className="text-xs font-normal text-muted-foreground">saat</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Kampanya Etkisi</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">+18% <span className="text-xs font-normal text-muted-foreground">ziyaretci</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40">
                  <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Aktif Kullanicilar</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">38 <span className="text-xs font-normal text-muted-foreground">/ 245 kayitli</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
