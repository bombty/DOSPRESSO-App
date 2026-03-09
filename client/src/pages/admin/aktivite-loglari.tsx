import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Activity,
  ArrowLeft,
  Search,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Shield,
  Settings,
  Wrench,
  ClipboardCheck,
  Building2,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Database,
  CalendarDays,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface AuditLogEntry {
  id: number;
  eventType: string;
  userId: string | null;
  actorRole: string | null;
  scopeBranchId: number | null;
  action: string;
  resource: string;
  resourceId: string | null;
  targetResource: string | null;
  targetResourceId: string | null;
  before: any;
  after: any;
  details: any;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorName: string | null;
  branchName: string | null;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const EVENT_TYPE_GROUPS: Record<string, { label: string; icon: any; color: string }> = {
  "auth.login_success": { label: "Giriş Başarılı", icon: LogIn, color: "text-green-600 bg-green-500/10" },
  "auth.login_failed": { label: "Giriş Başarısız", icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
  "auth.logout": { label: "Çıkış", icon: LogOut, color: "text-muted-foreground bg-muted" },
  "user.created": { label: "Kullanıcı Oluşturuldu", icon: UserPlus, color: "text-blue-600 bg-blue-500/10" },
  "user.updated": { label: "Kullanıcı Güncellendi", icon: Edit, color: "text-yellow-600 bg-yellow-500/10" },
  "user.deactivated": { label: "Kullanıcı Devre Dışı", icon: UserMinus, color: "text-orange-600 bg-orange-500/10" },
  "user.restored": { label: "Kullanıcı Aktif", icon: UserPlus, color: "text-green-600 bg-green-500/10" },
  "user.deleted": { label: "Kullanıcı Silindi", icon: Trash2, color: "text-red-600 bg-red-500/10" },
  "role.permission_changed": { label: "Yetki Değişikliği", icon: Shield, color: "text-purple-600 bg-purple-500/10" },
  "branch.created": { label: "Şube Oluşturuldu", icon: Building2, color: "text-blue-600 bg-blue-500/10" },
  "branch.updated": { label: "Şube Güncellendi", icon: Edit, color: "text-yellow-600 bg-yellow-500/10" },
  "branch.deleted": { label: "Şube Silindi", icon: Trash2, color: "text-red-600 bg-red-500/10" },
  "task.created": { label: "Görev Oluşturuldu", icon: ClipboardCheck, color: "text-blue-600 bg-blue-500/10" },
  "task.status_changed": { label: "Görev Durumu", icon: ClipboardCheck, color: "text-yellow-600 bg-yellow-500/10" },
  "equipment.created": { label: "Ekipman Oluşturuldu", icon: Wrench, color: "text-blue-600 bg-blue-500/10" },
  "equipment.updated": { label: "Ekipman Güncellendi", icon: Wrench, color: "text-yellow-600 bg-yellow-500/10" },
  "equipment.fault_created": { label: "Arıza Bildirildi", icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
  "equipment.fault_resolved": { label: "Arıza Çözüldü", icon: Wrench, color: "text-green-600 bg-green-500/10" },
  "shift.created": { label: "Vardiya Oluşturuldu", icon: CalendarDays, color: "text-blue-600 bg-blue-500/10" },
  "shift.updated": { label: "Vardiya Güncellendi", icon: CalendarDays, color: "text-yellow-600 bg-yellow-500/10" },
  "shift.deleted": { label: "Vardiya Silindi", icon: Trash2, color: "text-red-600 bg-red-500/10" },
  "settings.changed": { label: "Ayar Değişikliği", icon: Settings, color: "text-purple-600 bg-purple-500/10" },
  "backup.completed": { label: "Yedek Tamamlandı", icon: Database, color: "text-green-600 bg-green-500/10" },
  "backup.failed": { label: "Yedek Başarısız", icon: Database, color: "text-red-600 bg-red-500/10" },
  "backup.manual_triggered": { label: "Manuel Yedek", icon: Database, color: "text-blue-600 bg-blue-500/10" },
  "user.password_changed": { label: "Şifre Değiştirildi", icon: Shield, color: "text-yellow-600 bg-yellow-500/10" },
  "user.password_reset": { label: "Şifre Sıfırlandı", icon: Shield, color: "text-orange-600 bg-orange-500/10" },
  "user.bulk_imported": { label: "Toplu İçe Aktarım", icon: UserPlus, color: "text-blue-600 bg-blue-500/10" },
  "role.changed": { label: "Rol Değişikliği", icon: Shield, color: "text-purple-600 bg-purple-500/10" },
  "permission.granted": { label: "Yetki Verildi", icon: Shield, color: "text-green-600 bg-green-500/10" },
  "permission.revoked": { label: "Yetki Kaldırıldı", icon: Shield, color: "text-red-600 bg-red-500/10" },
  "inventory.adjusted": { label: "Stok Düzeltme", icon: Database, color: "text-yellow-600 bg-yellow-500/10" },
  "inventory.counted": { label: "Sayım Yapıldı", icon: ClipboardCheck, color: "text-blue-600 bg-blue-500/10" },
  "shipment.created": { label: "Sevkiyat Oluşturuldu", icon: ClipboardCheck, color: "text-blue-600 bg-blue-500/10" },
  "shipment.delivered": { label: "Sevkiyat Teslim", icon: ClipboardCheck, color: "text-green-600 bg-green-500/10" },
  "order.approved": { label: "Sipariş Onaylandı", icon: ClipboardCheck, color: "text-green-600 bg-green-500/10" },
  "order.rejected": { label: "Sipariş Reddedildi", icon: AlertTriangle, color: "text-red-600 bg-red-500/10" },
  "order.created": { label: "Sipariş Oluşturuldu", icon: ClipboardCheck, color: "text-blue-600 bg-blue-500/10" },
};

const RESOURCE_OPTIONS = [
  { value: "auth", label: "Kimlik Doğrulama" },
  { value: "users", label: "Kullanıcılar" },
  { value: "branches", label: "Şubeler" },
  { value: "tasks", label: "Görevler" },
  { value: "equipment", label: "Ekipmanlar" },
  { value: "shifts", label: "Vardiyalar" },
  { value: "roles", label: "Roller" },
  { value: "permissions", label: "Yetkiler" },
  { value: "settings", label: "Ayarlar" },
  { value: "backup", label: "Yedekleme" },
  { value: "inventory", label: "Stok/Envanter" },
  { value: "branch_orders", label: "Şube Siparişleri" },
  { value: "shipments", label: "Sevkiyatlar" },
  { value: "factory", label: "Fabrika" },
];

function getEventInfo(eventType: string) {
  return EVENT_TYPE_GROUPS[eventType] || {
    label: eventType,
    icon: Activity,
    color: "text-muted-foreground bg-muted",
  };
}

function formatDetailsShort(log: AuditLogEntry): string {
  const parts: string[] = [];
  if (log.details && typeof log.details === "object") {
    if (log.details.username) parts.push(log.details.username);
    if (log.details.reason) parts.push(log.details.reason);
    if (log.details.action) parts.push(log.details.action);
    if (log.details.settingType) parts.push(log.details.settingType);
  }
  if (log.resourceId) parts.push(`#${log.resourceId}`);
  return parts.join(" - ") || "";
}

export default function AdminAktiviteLoglar() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hqRoles = ["admin", "ceo", "cgo", "muhasebe_ik", "muhasebe", "satinalma", "coach", "marketing", "trainer", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "teknik", "destek", "fabrika", "yatirimci_hq"];
  if (!user?.role || !hqRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (searchTerm) params.set("search", searchTerm);
    if (eventTypeFilter !== "all") params.set("eventType", eventTypeFilter);
    if (resourceFilter !== "all") params.set("resource", resourceFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }, [page, searchTerm, eventTypeFilter, resourceFilter, startDate, endDate]);

  const { data, isLoading, isError, refetch } = useQuery<AuditLogResponse>({
    queryKey: ["/api/admin/audit-logs", page, searchTerm, eventTypeFilter, resourceFilter, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const { data: eventTypes } = useQuery<{ eventType: string; cnt: number }[]>({
    queryKey: ["/api/audit-logs/stats/event-types"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs/stats/event-types");
      if (!res.ok) throw new Error("Failed to fetch event types");
      return res.json();
    },
  });

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (eventTypeFilter !== "all") params.set("eventType", eventTypeFilter);
    if (resourceFilter !== "all") params.set("resource", resourceFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    window.open(`/api/audit-logs/export?${params.toString()}`, "_blank");
  };

  const handleViewDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setEventTypeFilter("all");
    setResourceFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination;
  const hasActiveFilters = searchTerm || eventTypeFilter !== "all" || resourceFilter !== "all" || startDate || endDate;

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Denetim Günlüğü
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem aktivitelerini takip edin
            {pagination && (
              <span className="ml-2">({pagination.total} kayıt)</span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Olay veya kaynak ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
                data-testid="input-search-logs"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]" data-testid="select-event-type">
                <SelectValue placeholder="Olay Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Olaylar</SelectItem>
                {eventTypes?.map(et => (
                  <SelectItem key={et.eventType} value={et.eventType}>
                    {getEventInfo(et.eventType).label} ({et.cnt})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]" data-testid="select-resource">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                {RESOURCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-[140px]"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground text-sm">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-[140px]"
                data-testid="input-end-date"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Temizle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Denetim Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-logs">
                  Henüz kayıt bulunmuyor
                </p>
              ) : (
                logs.map((log) => {
                  const info = getEventInfo(log.eventType);
                  const Icon = info.icon;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover-elevate transition-colors"
                      onClick={() => handleViewDetail(log)}
                      data-testid={`log-item-${log.id}`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${info.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{log.actorName || log.userId || "Sistem"}</span>
                          <Badge variant="outline" className="text-xs">
                            {info.label}
                          </Badge>
                          {log.branchName && (
                            <Badge variant="secondary" className="text-xs">
                              {log.branchName}
                            </Badge>
                          )}
                          {log.actorRole && (
                            <span className="text-xs text-muted-foreground">{log.actorRole}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {log.resource}{log.resourceId ? ` #${log.resourceId}` : ""} - {log.action}
                          {formatDetailsShort(log) && ` | ${formatDetailsShort(log)}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {log.createdAt ? format(new Date(log.createdAt), "dd MMM HH:mm", { locale: tr }) : ""}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-sm text-muted-foreground">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="drawer-audit-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Denetim Kaydı Detayı
            </SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Olay Tipi</label>
                  <p className="font-medium">{selectedLog.eventType}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">İşlem</label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Kullanıcı</label>
                  <p className="font-medium">{selectedLog.actorName || selectedLog.userId || "Sistem"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rol</label>
                  <p className="font-medium">{selectedLog.actorRole || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Kaynak</label>
                  <p className="font-medium">{selectedLog.resource} {selectedLog.resourceId ? `#${selectedLog.resourceId}` : ""}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Şube</label>
                  <p className="font-medium">{selectedLog.branchName || selectedLog.scopeBranchId || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tarih</label>
                  <p className="font-medium">
                    {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), "dd MMM yyyy HH:mm:ss", { locale: tr }) : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">IP Adresi</label>
                  <p className="font-medium">{selectedLog.ipAddress || "-"}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Request ID</label>
                <p className="font-mono text-xs break-all">{selectedLog.requestId || "-"}</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">User Agent</label>
                <p className="text-xs text-muted-foreground break-all">{selectedLog.userAgent || "-"}</p>
              </div>

              {selectedLog.details && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Detaylar</label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40" data-testid="text-detail-json">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.before && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Önceki Durum</label>
                  <pre className="text-xs bg-red-500/5 border border-red-500/20 p-3 rounded-md overflow-x-auto max-h-48" data-testid="text-before-json">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sonraki Durum</label>
                  <pre className="text-xs bg-green-500/5 border border-green-500/20 p-3 rounded-md overflow-x-auto max-h-48" data-testid="text-after-json">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
