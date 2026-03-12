import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  Video,
  Plus,
  Edit,
  XCircle,
  CheckCircle,
  ExternalLink,
  UserCheck,
  UserX,
  CalendarDays,
  List,
  Monitor,
} from "lucide-react";
import { isHQRole } from "@shared/schema";

const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
  coach: "Coach",
  trainer: "Eğitmen",
  admin: "Admin",
  kalite_kontrol: "Kalite Kontrol",
  fabrika_personel: "Fabrika Personeli",
  uretim_sorumlusu: "Üretim Sorumlusu",
  depocu: "Depocu",
  ceo: "CEO",
  cgo: "CGO",
};

const ALL_TARGET_ROLES = [
  "stajyer", "bar_buddy", "barista", "supervisor_buddy", "supervisor",
  "mudur", "coach", "trainer", "kalite_kontrol", "fabrika_personel",
  "uretim_sorumlusu", "depocu",
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Planlandı", variant: "default" },
  live: { label: "Canlı", variant: "destructive" },
  completed: { label: "Tamamlandı", variant: "secondary" },
  cancelled: { label: "İptal", variant: "outline" },
};

interface WebinarFormData {
  title: string;
  description: string;
  hostName: string;
  webinarDate: string;
  durationMinutes: number;
  meetingLink: string;
  targetRoles: string[];
  maxParticipants: number | null;
  status: string;
}

const emptyForm: WebinarFormData = {
  title: "",
  description: "",
  hostName: "",
  webinarDate: "",
  durationMinutes: 60,
  meetingLink: "",
  targetRoles: [],
  maxParticipants: null,
  status: "scheduled",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeLocal(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) > new Date();
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function getMonthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function WebinarCard({
  webinar,
  isHQ,
  onEdit,
  onRegister,
  onUnregister,
  onViewParticipants,
  registerPending,
}: {
  webinar: any;
  isHQ: boolean;
  onEdit: (w: any) => void;
  onRegister: (id: number) => void;
  onUnregister: (id: number) => void;
  onViewParticipants: (w: any) => void;
  registerPending: boolean;
}) {
  const upcoming = isUpcoming(webinar.webinarDate);
  const statusConf = STATUS_CONFIG[webinar.status] || STATUS_CONFIG.scheduled;

  return (
    <Card className="overflow-visible" data-testid={`card-webinar-${webinar.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{webinar.title}</h3>
                <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                {webinar.isLive && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Monitor className="h-3 w-3 mr-1" />
                    CANLI
                  </Badge>
                )}
              </div>
              {webinar.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{webinar.description}</p>
              )}
            </div>
            {isHQ && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(webinar)} data-testid={`button-edit-webinar-${webinar.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(webinar.webinarDate)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(webinar.webinarDate)}
            </div>
            {webinar.durationMinutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {webinar.durationMinutes} dk
              </div>
            )}
            {webinar.hostName && (
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {webinar.hostName}
              </div>
            )}
            {isHQ && webinar.registrationCount !== undefined && (
              <div className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {webinar.registrationCount} kayıt
              </div>
            )}
          </div>

          {webinar.targetRoles && webinar.targetRoles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {webinar.targetRoles.map((r: string) => (
                <Badge key={r} variant="outline" className="text-xs">
                  {ROLE_LABELS[r] || r}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!isHQ && upcoming && webinar.status === "scheduled" && (
              webinar.isRegistered ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUnregister(webinar.id)}
                  disabled={registerPending}
                  data-testid={`button-unregister-${webinar.id}`}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Kayıt İptal
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onRegister(webinar.id)}
                  disabled={registerPending}
                  data-testid={`button-register-${webinar.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Kayıt Ol
                </Button>
              )
            )}
            {webinar.isRegistered && (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Kayıtlı
              </Badge>
            )}
            {webinar.meetingLink && (webinar.isLive || (upcoming && webinar.isRegistered)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(webinar.meetingLink, "_blank")}
                data-testid={`button-join-${webinar.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Katıl
              </Button>
            )}
            {isHQ && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewParticipants(webinar)}
                data-testid={`button-participants-${webinar.id}`}
              >
                <Users className="h-4 w-4 mr-1" />
                Katılımcılar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantsDialog({
  webinar,
  open,
  onClose,
}: {
  webinar: any;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const { data: participants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/v3/academy/webinars", webinar?.id, "participants"],
    queryFn: async () => {
      const r = await fetch(`/api/v3/academy/webinars/${webinar?.id}/participants`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!webinar?.id && open,
  });

  const attendanceMut = useMutation({
    mutationFn: async ({ userIds, attended }: { userIds: string[]; attended: boolean }) => {
      await apiRequest("PATCH", `/api/v3/academy/webinars/${webinar.id}/attendance`, { userIds, attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars", webinar.id, "participants"] });
      toast({ title: "Katılım durumu güncellendi" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {webinar?.title} - Katılımcılar
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : participants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz kayıt yok</p>
        ) : (
          <div className="space-y-2">
            {participants.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                data-testid={`participant-${p.userId}`}
              >
                <div>
                  <span className="font-medium text-sm">{p.firstName} {p.lastName}</span>
                  <Badge variant="outline" className="ml-2 text-xs">{ROLE_LABELS[p.role] || p.role}</Badge>
                </div>
                <Button
                  size="sm"
                  variant={p.attended ? "default" : "outline"}
                  onClick={() => attendanceMut.mutate({ userIds: [p.userId], attended: !p.attended })}
                  disabled={attendanceMut.isPending}
                  data-testid={`button-attendance-${p.userId}`}
                >
                  {p.attended ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1" />Katıldı</>
                  ) : (
                    <><UserX className="h-3.5 w-3.5 mr-1" />Katılmadı</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WebinarFormDialog({
  open,
  onClose,
  editingWebinar,
}: {
  open: boolean;
  onClose: () => void;
  editingWebinar: any | null;
}) {
  const { toast } = useToast();
  const isEditing = !!editingWebinar;

  const [form, setForm] = useState<WebinarFormData>(() => {
    if (editingWebinar) {
      return {
        title: editingWebinar.title || "",
        description: editingWebinar.description || "",
        hostName: editingWebinar.hostName || "",
        webinarDate: editingWebinar.webinarDate ? formatDateTimeLocal(editingWebinar.webinarDate) : "",
        durationMinutes: editingWebinar.durationMinutes || 60,
        meetingLink: editingWebinar.meetingLink || "",
        targetRoles: editingWebinar.targetRoles || [],
        maxParticipants: editingWebinar.maxParticipants || null,
        status: editingWebinar.status || "scheduled",
      };
    }
    return { ...emptyForm };
  });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        await apiRequest("PATCH", `/api/v3/academy/webinars/${editingWebinar.id}`, data);
      } else {
        await apiRequest("POST", "/api/v3/academy/webinars", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      toast({ title: isEditing ? "Webinar güncellendi" : "Webinar oluşturuldu" });
      onClose();
    },
    onError: () => {
      toast({ title: "Hata oluştu", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.title || !form.webinarDate) {
      toast({ title: "Başlık ve tarih zorunlu", variant: "destructive" });
      return;
    }
    createMut.mutate({
      ...form,
      webinarDate: new Date(form.webinarDate).toISOString(),
    });
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {isEditing ? "Webinar Düzenle" : "Yeni Webinar"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Başlık *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Webinar başlığı"
              data-testid="input-webinar-title"
            />
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Webinar açıklaması"
              data-testid="input-webinar-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sunucu</Label>
              <Input
                value={form.hostName}
                onChange={e => setForm(p => ({ ...p, hostName: e.target.value }))}
                placeholder="Sunucu adı"
                data-testid="input-webinar-host"
              />
            </div>
            <div>
              <Label>Süre (dk)</Label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={e => setForm(p => ({ ...p, durationMinutes: parseInt(e.target.value) || 60 }))}
                data-testid="input-webinar-duration"
              />
            </div>
          </div>
          <div>
            <Label>Tarih & Saat *</Label>
            <Input
              type="datetime-local"
              value={form.webinarDate}
              onChange={e => setForm(p => ({ ...p, webinarDate: e.target.value }))}
              data-testid="input-webinar-date"
            />
          </div>
          <div>
            <Label>Toplantı Linki</Label>
            <Input
              value={form.meetingLink}
              onChange={e => setForm(p => ({ ...p, meetingLink: e.target.value }))}
              placeholder="https://zoom.us/..."
              data-testid="input-webinar-link"
            />
          </div>
          <div>
            <Label>Maks. Katılımcı</Label>
            <Input
              type="number"
              value={form.maxParticipants ?? ""}
              onChange={e => setForm(p => ({ ...p, maxParticipants: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Sınırsız"
              data-testid="input-webinar-max"
            />
          </div>
          {isEditing && (
            <div>
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger data-testid="select-webinar-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planlandı</SelectItem>
                  <SelectItem value="live">Canlı</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Hedef Roller (boş = herkes)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_TARGET_ROLES.map(role => (
                <Badge
                  key={role}
                  variant={form.targetRoles.includes(role) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleRole(role)}
                  data-testid={`badge-role-${role}`}
                >
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending} data-testid="button-save-webinar">
            {createMut.isPending ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarView({ webinars }: { webinars: any[] }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  
  const daysInMonth = lastDay.getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startDayOfWeek).fill(null);
  
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const webinarsByDay: Record<number, any[]> = {};
  webinars.forEach(w => {
    const d = new Date(w.webinarDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!webinarsByDay[day]) webinarsByDay[day] = [];
      webinarsByDay[day].push(w);
    }
  });

  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const monthLabel = viewMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <Button size="sm" variant="outline" onClick={() => setViewMonth(new Date(year, month - 1, 1))} data-testid="button-prev-month">
          &lt;
        </Button>
        <h3 className="font-semibold capitalize">{monthLabel}</h3>
        <Button size="sm" variant="outline" onClick={() => setViewMonth(new Date(year, month + 1, 1))} data-testid="button-next-month">
          &gt;
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
        {dayNames.map(d => (
          <div key={d} className="bg-muted p-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const dayWebinars = day ? webinarsByDay[day] || [] : [];
          return (
            <div
              key={i}
              className={`bg-background p-1 min-h-[60px] ${isToday ? "ring-2 ring-primary ring-inset" : ""} ${!day ? "bg-muted/30" : ""}`}
            >
              {day && (
                <>
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>{day}</span>
                  {dayWebinars.map((w: any) => (
                    <div key={w.id} className="mt-0.5">
                      <div className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate" title={w.title}>
                        {formatTime(w.webinarDate)} {w.title}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AcademyWebinars() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userIsHQ = isHQRole(user?.role as any) || user?.role === "admin";
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<any>(null);
  const [participantsWebinar, setParticipantsWebinar] = useState<any>(null);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const staffQuery = useQuery<any[]>({
    queryKey: ["/api/v3/academy/webinars", statusFilter],
    queryFn: async () => {
      const r = await fetch(`/api/v3/academy/webinars?${queryParams.toString()}`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !userIsHQ,
  });

  const adminQuery = useQuery<any[]>({
    queryKey: ["/api/v3/academy/webinars", "admin", statusFilter],
    queryFn: async () => {
      const r = await fetch(`/api/v3/academy/webinars/admin/all?${queryParams.toString()}`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: userIsHQ,
  });

  const webinarsList = userIsHQ ? (adminQuery.data || []) : (staffQuery.data || []);
  const isLoading = userIsHQ ? adminQuery.isLoading : staffQuery.isLoading;

  const registerMut = useMutation({
    mutationFn: async (webinarId: number) => {
      await apiRequest("POST", `/api/v3/academy/webinars/${webinarId}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      toast({ title: "Webinara kayıt olundu" });
    },
    onError: () => {
      toast({ title: "Kayıt olurken hata oluştu", variant: "destructive" });
    },
  });

  const unregisterMut = useMutation({
    mutationFn: async (webinarId: number) => {
      await apiRequest("DELETE", `/api/v3/academy/webinars/${webinarId}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      toast({ title: "Kayıt iptal edildi" });
    },
  });

  const handleEdit = (w: any) => {
    setEditingWebinar(w);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingWebinar(null);
    setFormOpen(true);
  };

  const upcomingWebinars = webinarsList.filter(w => isUpcoming(w.webinarDate) && w.status !== "cancelled");
  const pastWebinars = webinarsList.filter(w => !isUpcoming(w.webinarDate) || w.status === "cancelled" || w.status === "completed");

  const monthGroups: Record<string, any[]> = {};
  upcomingWebinars.forEach(w => {
    const key = getMonthKey(w.webinarDate);
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(w);
  });

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Webinar Takvimi
          </h2>
          <p className="text-sm text-muted-foreground">
            {userIsHQ ? "Webinar oluşturun ve yönetin" : "Yaklaşan webinarları görüntüleyin ve kayıt olun"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              onClick={() => setViewMode("calendar")}
              className="rounded-l-none"
              data-testid="button-view-calendar"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          {userIsHQ && (
            <Button onClick={handleCreate} data-testid="button-create-webinar">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Webinar
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "scheduled", "live", "completed", "cancelled"].map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
            data-testid={`button-filter-${s}`}
          >
            {s === "all" ? "Tümü" : (STATUS_CONFIG[s]?.label || s)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : viewMode === "calendar" ? (
        <CalendarView webinars={webinarsList} />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Yaklaşan ({upcomingWebinars.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Geçmiş ({pastWebinars.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-3">
            {upcomingWebinars.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>Yaklaşan webinar bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(monthGroups).map(([key, items]) => (
                <div key={key}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                    {getMonthLabel(items[0].webinarDate)}
                  </h3>
                  <div className="space-y-2">
                    {items.map((w: any) => (
                      <WebinarCard
                        key={w.id}
                        webinar={w}
                        isHQ={userIsHQ}
                        onEdit={handleEdit}
                        onRegister={(id) => registerMut.mutate(id)}
                        onUnregister={(id) => unregisterMut.mutate(id)}
                        onViewParticipants={(w) => setParticipantsWebinar(w)}
                        registerPending={registerMut.isPending || unregisterMut.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-2 mt-3">
            {pastWebinars.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>Geçmiş webinar bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              pastWebinars.map((w: any) => (
                <WebinarCard
                  key={w.id}
                  webinar={w}
                  isHQ={userIsHQ}
                  onEdit={handleEdit}
                  onRegister={(id) => registerMut.mutate(id)}
                  onUnregister={(id) => unregisterMut.mutate(id)}
                  onViewParticipants={(w) => setParticipantsWebinar(w)}
                  registerPending={registerMut.isPending || unregisterMut.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {formOpen && (
        <WebinarFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingWebinar(null); }}
          editingWebinar={editingWebinar}
        />
      )}

      {participantsWebinar && (
        <ParticipantsDialog
          webinar={participantsWebinar}
          open={!!participantsWebinar}
          onClose={() => setParticipantsWebinar(null)}
        />
      )}
    </div>
  );
}