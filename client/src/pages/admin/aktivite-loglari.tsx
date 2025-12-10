import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  ArrowLeft, 
  Search, 
  User, 
  LogIn, 
  LogOut, 
  Edit, 
  Plus, 
  Trash2,
  Eye,
  Filter
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ActivityLog {
  id: number;
  userId: string;
  userName: string;
  action: string;
  actionType: "login" | "logout" | "create" | "update" | "delete" | "view";
  target: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

const ACTION_ICONS: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: Eye,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/10 text-green-600",
  logout: "bg-gray-500/10 text-gray-600",
  create: "bg-blue-500/10 text-blue-600",
  update: "bg-yellow-500/10 text-yellow-600",
  delete: "bg-red-500/10 text-red-600",
  view: "bg-purple-500/10 text-purple-600",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Giriş",
  logout: "Çıkış",
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  view: "Görüntüleme",
};

const mockLogs: ActivityLog[] = [
  { id: 1, userId: "1", userName: "Admin User", action: "Sisteme giriş yaptı", actionType: "login", target: "system", createdAt: new Date().toISOString() },
  { id: 2, userId: "2", userName: "Ali Erdoğan", action: "Yeni görev oluşturdu", actionType: "create", target: "tasks", targetId: "45", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, userId: "3", userName: "Mehmet Yılmaz", action: "Vardiya planı güncelledi", actionType: "update", target: "shifts", targetId: "12", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, userId: "1", userName: "Admin User", action: "Kullanıcı rolü değiştirdi", actionType: "update", target: "users", targetId: "5", details: "barista → supervisor", createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 5, userId: "4", userName: "Ayşe Kaya", action: "Reçete görüntüledi", actionType: "view", target: "recipes", targetId: "23", createdAt: new Date(Date.now() - 14400000).toISOString() },
];

export default function AdminAktiviteLoglar() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const logs = mockLogs;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || log.actionType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktivite Logları
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem aktivitelerini takip edin
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı veya işlem ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-logs"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40" data-testid="select-filter-type">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="login">Giriş</SelectItem>
            <SelectItem value="logout">Çıkış</SelectItem>
            <SelectItem value="create">Oluşturma</SelectItem>
            <SelectItem value="update">Güncelleme</SelectItem>
            <SelectItem value="delete">Silme</SelectItem>
            <SelectItem value="view">Görüntüleme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Son Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aktivite bulunamadı
                </p>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = ACTION_ICONS[log.actionType] || Activity;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      data-testid={`log-item-${log.id}`}
                    >
                      <div className={`p-2 rounded-lg ${ACTION_COLORS[log.actionType]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{log.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {ACTION_LABELS[log.actionType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{log.action}</p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd MMM HH:mm", { locale: tr })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
