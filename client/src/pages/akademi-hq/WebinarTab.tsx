import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompactKPIStrip, type KPIItem } from "@/components/shared/UnifiedKPI";
import { Plus, Video, Users, Calendar, XCircle, CheckCircle, Eye } from "lucide-react";

interface Webinar {
  id: number;
  title: string;
  description?: string;
  hostName?: string;
  webinarDate: string;
  durationMinutes?: number;
  meetingLink?: string;
  targetRoles?: string[];
  status: string;
  isLive?: boolean;
  maxParticipants?: number;
  createdBy?: string;
  createdAt?: string;
  registrationCount?: number;
}

interface Participant {
  id: number;
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  branchId?: number;
  attended: boolean;
  registeredAt?: string;
}

export function WebinarTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWebinarId, setSelectedWebinarId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [newWebinar, setNewWebinar] = useState({
    title: "", description: "", hostName: "", webinarDate: "",
    durationMinutes: 60, meetingLink: "", maxParticipants: 0,
    targetRoles: [] as string[],
  });

  const { data: webinars = [] } = useQuery<Webinar[]>({
    queryKey: ["/api/v3/academy/webinars/admin/all", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/v3/academy/webinars/admin/all${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/v3/academy/webinars", selectedWebinarId, "participants"],
    queryFn: async () => {
      if (!selectedWebinarId) return [];
      const res = await fetch(`/api/v3/academy/webinars/${selectedWebinarId}/participants`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedWebinarId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/v3/academy/webinars", {
        ...newWebinar,
        maxParticipants: newWebinar.maxParticipants || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Webinar oluşturuldu" });
      setIsCreateOpen(false);
      setNewWebinar({ title: "", description: "", hostName: "", webinarDate: "", durationMinutes: 60, meetingLink: "", maxParticipants: 0, targetRoles: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars/admin/all"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Webinar oluşturulamadı", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/v3/academy/webinars/${id}/cancel`, {});
    },
    onSuccess: () => {
      toast({ title: "Webinar iptal edildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars/admin/all"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/v3/academy/webinars/${id}/complete`, {});
    },
    onSuccess: () => {
      toast({ title: "Webinar tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars/admin/all"] });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ webinarId, userIds, attended }: { webinarId: number; userIds: string[]; attended: boolean }) => {
      return apiRequest("PATCH", `/api/v3/academy/webinars/${webinarId}/attendance`, { userIds, attended });
    },
    onSuccess: () => {
      toast({ title: "Katılım güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars", selectedWebinarId, "participants"] });
    },
  });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'scheduled': return 'Planlandı';
      case 'live': return 'Canlı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal';
      default: return s;
    }
  };

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case 'scheduled': return 'outline';
      case 'live': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const scheduled = webinars.filter(w => w.status === 'scheduled').length;
  const completed = webinars.filter(w => w.status === 'completed').length;
  const totalRegistrations = webinars.reduce((sum, w) => sum + (w.registrationCount || 0), 0);

  const kpiItems: KPIItem[] = [
    { label: "Toplam Webinar", value: webinars.length, icon: <Video className="w-4 h-4" />, testId: "stat-total-webinars" },
    { label: "Planlandı", value: scheduled, icon: <Calendar className="w-4 h-4" />, testId: "stat-scheduled" },
    { label: "Tamamlandı", value: completed, icon: <CheckCircle className="w-4 h-4" />, testId: "stat-completed" },
    { label: "Toplam Kayıt", value: totalRegistrations, icon: <Users className="w-4 h-4" />, testId: "stat-registrations" },
  ];

  const roleOptions = [
    { value: "stajyer", label: "Stajyer" },
    { value: "bar_buddy", label: "Bar Buddy" },
    { value: "barista", label: "Barista" },
    { value: "supervisor_buddy", label: "Supervisor Buddy" },
    { value: "supervisor", label: "Supervisor" },
    { value: "mudur", label: "Müdür" },
  ];

  return (
    <div className="w-full space-y-3">
      <CompactKPIStrip items={kpiItems} desktopColumns={4} testId="webinar-kpi" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {[
            { value: "all", label: "Tümü" },
            { value: "scheduled", label: "Planlandı" },
            { value: "completed", label: "Tamamlandı" },
            { value: "cancelled", label: "İptal" },
          ].map(f => (
            <Button key={f.value} size="sm" variant={statusFilter === f.value ? "default" : "outline"} onClick={() => setStatusFilter(f.value)} data-testid={`filter-webinar-${f.value}`}>
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} data-testid="button-create-webinar">
          <Plus className="w-3 h-3 mr-1" /> Yeni Webinar
        </Button>
      </div>

      {webinars.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-no-webinars">Henüz webinar oluşturulmadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {webinars.map((webinar) => (
            <Card key={webinar.id} data-testid={`webinar-card-${webinar.id}`}>
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm">{webinar.title}</p>
                      <Badge variant={statusVariant(webinar.status)} className="text-xs">{statusLabel(webinar.status)}</Badge>
                    </div>
                    {webinar.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{webinar.description}</p>}
                    <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                      {webinar.hostName && <span>Sunan: {webinar.hostName}</span>}
                      <span>{new Date(webinar.webinarDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {webinar.durationMinutes && <span>{webinar.durationMinutes} dk</span>}
                      <span>{webinar.registrationCount || 0} kayıt{webinar.maxParticipants ? ` / ${webinar.maxParticipants}` : ''}</span>
                    </div>
                    {webinar.targetRoles && webinar.targetRoles.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {webinar.targetRoles?.map(r => (
                          <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setSelectedWebinarId(webinar.id)} title="Katılımcılar" data-testid={`button-participants-${webinar.id}`}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    {webinar.status === 'scheduled' && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => completeMutation.mutate(webinar.id)} title="Tamamla" data-testid={`button-complete-webinar-${webinar.id}`}>
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => cancelMutation.mutate(webinar.id)} title="İptal Et" data-testid={`button-cancel-webinar-${webinar.id}`}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedWebinarId} onOpenChange={(o) => { if (!o) setSelectedWebinarId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5" />
              Katılımcılar ({participants.length})
            </DialogTitle>
          </DialogHeader>
          {participants.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm" data-testid="text-no-participants">Henüz kayıt yok</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ad Soyad</TableHead>
                    <TableHead className="text-xs">Rol</TableHead>
                    <TableHead className="text-xs text-center">Katılım</TableHead>
                    <TableHead className="text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow key={p.id} data-testid={`participant-${p.id}`}>
                      <TableCell className="text-xs font-medium">{p.firstName} {p.lastName}</TableCell>
                      <TableCell className="text-xs">{p.role || '\u2014'}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant={p.attended ? "default" : "outline"} className="text-xs">
                          {p.attended ? "Katıldı" : "Bekleniyor"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Button
                          size="sm"
                          variant={p.attended ? "outline" : "default"}
                          onClick={() => attendanceMutation.mutate({
                            webinarId: selectedWebinarId!,
                            userIds: [p.userId],
                            attended: !p.attended,
                          })}
                          data-testid={`button-toggle-attendance-${p.id}`}
                        >
                          {p.attended ? "Geri Al" : "Katıldı"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yeni Webinar Oluştur</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Başlık</label>
              <Input value={newWebinar.title} onChange={(e) => setNewWebinar(p => ({ ...p, title: e.target.value }))} placeholder="Webinar başlığı" data-testid="input-webinar-title" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama</label>
              <Textarea value={newWebinar.description} onChange={(e) => setNewWebinar(p => ({ ...p, description: e.target.value }))} placeholder="Webinar açıklaması" data-testid="textarea-webinar-description" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Sunan</label>
                <Input value={newWebinar.hostName} onChange={(e) => setNewWebinar(p => ({ ...p, hostName: e.target.value }))} placeholder="Sunan kişi/ekip" data-testid="input-webinar-host" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Süre (dk)</label>
                <Input type="number" value={newWebinar.durationMinutes} onChange={(e) => setNewWebinar(p => ({ ...p, durationMinutes: parseInt(e.target.value) || 60 }))} data-testid="input-webinar-duration" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Tarih ve Saat</label>
                <Input type="datetime-local" value={newWebinar.webinarDate} onChange={(e) => setNewWebinar(p => ({ ...p, webinarDate: e.target.value }))} data-testid="input-webinar-date" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kontenjan (0=sınırsız)</label>
                <Input type="number" value={newWebinar.maxParticipants} onChange={(e) => setNewWebinar(p => ({ ...p, maxParticipants: parseInt(e.target.value) || 0 }))} data-testid="input-webinar-capacity" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Toplantı Linki (isteğe bağlı)</label>
              <Input value={newWebinar.meetingLink} onChange={(e) => setNewWebinar(p => ({ ...p, meetingLink: e.target.value }))} placeholder="https://..." data-testid="input-webinar-link" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hedef Roller (boş = herkes)</label>
              <div className="flex gap-1 flex-wrap">
                {roleOptions.map(r => (
                  <Button
                    key={r.value}
                    size="sm"
                    type="button"
                    variant={newWebinar.targetRoles.includes(r.value) ? "default" : "outline"}
                    onClick={() => {
                      setNewWebinar(p => ({
                        ...p,
                        targetRoles: p.targetRoles.includes(r.value)
                          ? p.targetRoles.filter(v => v !== r.value)
                          : [...p.targetRoles, r.value]
                      }));
                    }}
                    data-testid={`toggle-role-${r.value}`}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newWebinar.title || !newWebinar.webinarDate} className="w-full" data-testid="button-webinar-create">
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
