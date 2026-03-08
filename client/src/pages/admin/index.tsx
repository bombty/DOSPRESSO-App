import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MessageSquare, 
  Bell, 
  Database,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Mail,
  Image,
  Bot,
  Wrench,
  BookOpen
} from "lucide-react";
import { Link, Redirect } from "wouter";

interface SystemHealth {
  database: "healthy" | "warning" | "error";
  api: "healthy" | "warning" | "error";
  storage: "healthy" | "warning" | "error";
}

interface PendingApproval {
  type: string;
  count: number;
  icon: any;
  link: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: pendingTickets = [] } = useQuery<any[]>({
    queryKey: ["/api/hq-support/tickets"],
    select: (data) => data.filter((t: any) => t.status === "aktif"),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  const systemHealth: SystemHealth = {
    database: "healthy",
    api: "healthy",
    storage: "healthy",
  };

  const quickActions = [
    { icon: Shield, label: "Yetkilendirme", href: "/admin/yetkilendirme", color: "bg-green-500/10" },
    { icon: Users, label: "Kullanıcılar", href: "/admin/kullanicilar", color: "bg-purple-500/10" },
    { icon: Activity, label: "Aktivite Logları", href: "/admin/aktivite-loglari", color: "bg-blue-500/10" },
    { icon: Database, label: "Yedekleme", href: "/admin/yedekleme", color: "bg-orange-500/10" },
    { icon: Mail, label: "E-posta Ayarları", href: "/admin/email-ayarlari", color: "bg-cyan-500/10" },
    { icon: Wrench, label: "Servis Mail Ayarları", href: "/admin/servis-mail", color: "bg-amber-500/10" },
    { icon: Image, label: "Banner Yönetimi", href: "/admin/bannerlar", color: "bg-pink-500/10" },
    { icon: Bot, label: "Yapay Zeka", href: "/admin/yapay-zeka", color: "bg-emerald-500/10" },
    { icon: BookOpen, label: "AI Bilgi Yönetimi", href: "/admin/ai-bilgi-yonetimi", color: "bg-indigo-500/10" },
  ];

  const stats = [
    { label: "Aktif Kullanıcı", value: users.length, icon: Users, trend: "+12%" },
    { label: "Şube Sayısı", value: branches.length, icon: LayoutDashboard, trend: "+2" },
    { label: "Bekleyen Talep", value: pendingTickets.length, icon: MessageSquare, trend: pendingTickets.length > 5 ? "Yüksek" : "Normal" },
  ];

  const getHealthIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getHealthLabel = (status: string) => {
    if (status === "healthy") return "Sağlıklı";
    if (status === "warning") return "Uyarı";
    return "Hata";
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Paneli</h1>
          <p className="text-sm text-muted-foreground">Sistem yönetimi ve izleme</p>
        </div>
        <Badge variant="outline" className="bg-primary/10">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="text-center">
            <CardContent className="p-3">
              <stat.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {stat.trend}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sistem Durumu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Veritabanı</span>
            </div>
            <div className="flex items-center gap-1">
              {getHealthIcon(systemHealth.database)}
              <span className="text-xs">{getHealthLabel(systemHealth.database)}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">API Servisleri</span>
            </div>
            <div className="flex items-center gap-1">
              {getHealthIcon(systemHealth.api)}
              <span className="text-xs">{getHealthLabel(systemHealth.api)}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Object Storage</span>
            </div>
            <div className="flex items-center gap-1">
              {getHealthIcon(systemHealth.storage)}
              <span className="text-xs">{getHealthLabel(systemHealth.storage)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href} data-testid={`link-quick-action-${action.label.toLowerCase().replace(/\s+/g, "-").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")}`}>
                <Button
                  variant="outline"
                  className={`w-full justify-start gap-2 ${action.color}`}
                  data-testid={`button-admin-${action.label.toLowerCase().replace(/\s+/g, "-").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")}`}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingTickets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Bekleyen Talepler
              <Badge variant="destructive" className="ml-auto">
                {pendingTickets.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTickets.slice(0, 5).map((ticket: any) => (
              <Link key={ticket.id} href="/hq-support" data-testid={`link-ticket-${ticket.id}`}>
                <div className="flex items-center justify-between p-2 rounded-lg hover-elevate cursor-pointer">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.branch?.name} - {ticket.category}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            <Link href="/hq-support">
              <Button variant="outline" className="w-full mt-2" data-testid="button-view-all-tickets">
                Tümünü Görüntüle
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
