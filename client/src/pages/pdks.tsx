import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Clock, CalendarDays, UserCheck, UserX, Coffee, AlertTriangle, Plus, ChevronLeft, Settings, History } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  defaultShiftStartTime: "Mesai Başlangıç",
  defaultShiftEndTime: "Mesai Bitiş",
  lateToleranceMinutes: "Geç Kalma Toleransı (dk)",
  earlyLeaveToleranceMinutes: "Erken Çıkış Toleransı (dk)",
  defaultBreakMinutes: "Mola Süresi (dk)",
  autoCloseTime: "Otomatik Kapanış Saati",
};

interface AuditEntry {
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null };
}

function AttendanceAuditList({ branchId }: { branchId: number }) {
  const { user } = useAuth();
  const canSeeAudit = user && ['admin', 'ceo', 'cgo', 'muhasebe_ik'].includes(user.role);
  const auditQuery = useQuery<AuditEntry[]>({
    queryKey: ['/api/branches', branchId, 'attendance-audit'],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${branchId}/attendance-audit?limit=50&days=90`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!canSeeAudit,
  });

  if (!canSeeAudit) return null;

  return (
    <Accordion type="single" collapsible className="mt-2" data-testid={`accordion-audit-${branchId}`}>
      <AccordionItem value="history" className="border-0">
        <AccordionTrigger className="text-xs text-muted-foreground py-1" data-testid={`button-toggle-audit-${branchId}`}>
          <span className="flex items-center gap-1"><History className="h-3 w-3" /> Değişiklik Geçmişi (son 90 gün)</span>
        </AccordionTrigger>
        <AccordionContent>
          {auditQuery.isLoading ? (
            <div className="text-xs text-muted-foreground py-1">Yükleniyor...</div>
          ) : !auditQuery.data?.length ? (
            <div className="text-xs text-muted-foreground py-1" data-testid={`text-audit-empty-${branchId}`}>Kayıtlı değişiklik yok.</div>
          ) : (
            <div className="space-y-1 text-xs">
              {auditQuery.data.map(e => (
                <div key={e.id} className="flex items-center gap-2 flex-wrap" data-testid={`row-audit-${e.id}`}>
                  <span className="text-muted-foreground">{new Date(e.changedAt).toLocaleString('tr-TR')}</span>
                  <span className="font-medium">{FIELD_LABELS[e.fieldName] || e.fieldName}:</span>
                  <span className="text-muted-foreground">{e.oldValue ?? '—'} → </span>
                  <span>{e.newValue ?? '—'}</span>
                  <span className="text-muted-foreground">— {[e.changedBy?.firstName, e.changedBy?.lastName].filter(Boolean).join(' ') || 'Bilinmiyor'}</span>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const MONTHS = [
  { value: "1", label: "Ocak" }, { value: "2", label: "Şubat" }, { value: "3", label: "Mart" },
  { value: "4", label: "Nisan" }, { value: "5", label: "Mayıs" }, { value: "6", label: "Haziran" },
  { value: "7", label: "Temmuz" }, { value: "8", label: "Ağustos" }, { value: "9", label: "Eylül" },
  { value: "10", label: "Ekim" }, { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
];

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof UserCheck; description: string }> = {
  worked: {
    label: "Çalıştı",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: UserCheck,
    description: "Personel o gün vardiyaya girdi ve mesaisini tamamladı."
  },
  program_off: {
    label: "İzin (Program)",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Coffee,
    description: "O gün programlı izin günü. Çalışma beklenmiyor."
  },
  kapanish_off: {
    label: "İzin (Kapanış)",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    icon: Coffee,
    description: "Şube/fabrika kapalıydı. Çalışma beklenmiyor."
  },
  // Sprint 15.6 (11 May 2026) Mahmut UX FIX:
  // Eskiden 'no_shift' STATUS_CONFIG'de tanımlı değildi → fallback 'absent' (Eksik) gösteriliyordu
  // Bu nedenle vardiya planlanmamış günler "Devamsızlık" gibi görünüyordu, Mahmut'u yanıltıyordu
  no_shift: {
    label: "Vardiya Yok",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: CalendarDays,
    description: "O gün için planlı vardiya yok (kişi henüz başlamadı, vardiyasız gün, vb)."
  },
  absent: {
    label: "Devamsız ⚠️",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: UserX,
    description: "Vardiya PLANLANMIŞTI ama kişi gelmedi. Yazılı uyarı/tutanak gerekir."
  },
  unpaid_leave: {
    label: "Ücretsiz İzin",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: AlertTriangle,
    description: "Ücretsiz izin günü. Bordrodan düşülür."
  },
  sick_leave: {
    label: "Rapor",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    icon: AlertTriangle,
    description: "Sağlık raporu. Doktor raporu ile belgelenmiş."
  },
  annual_leave: {
    label: "Yıllık İzin",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    icon: CalendarDays,
    description: "Yıllık izin. Kullanılan izin hakkından düşülür."
  },
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  return `${h}s ${m}dk`;
}

interface KioskSetting {
  id: number;
  branchId: number;
  branchName: string;
  defaultShiftStartTime: string | null;
  defaultShiftEndTime: string | null;
  lateToleranceMinutes: number | null;
  earlyLeaveToleranceMinutes: number | null;
  defaultBreakMinutes: number | null;
  autoCloseTime: string | null;
  isKioskEnabled: boolean | null;
}

function KioskToleranceSettings() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<KioskSetting>>({});

  const settingsQuery = useQuery<KioskSetting[]>({
    queryKey: ['/api/pdks/kiosk-settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ branchId, data }: { branchId: number; data: any }) => {
      return apiRequest('PATCH', `/api/pdks/kiosk-settings/${branchId}`, data);
    },
    onSuccess: (_res, vars) => {
      toast({ title: "Ayarlar güncellendi" });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/pdks/kiosk-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/branches', vars.branchId, 'attendance-audit'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Ayarlar güncellenemedi", variant: "destructive" });
    },
  });

  const startEdit = (setting: KioskSetting) => {
    setEditingId(setting.id);
    setEditValues({
      defaultShiftStartTime: setting.defaultShiftStartTime || "08:00",
      defaultShiftEndTime: setting.defaultShiftEndTime || "18:00",
      lateToleranceMinutes: setting.lateToleranceMinutes ?? 15,
      earlyLeaveToleranceMinutes: setting.earlyLeaveToleranceMinutes ?? 15,
      defaultBreakMinutes: setting.defaultBreakMinutes ?? 60,
      autoCloseTime: setting.autoCloseTime || "22:00",
    });
  };

  const saveEdit = (branchId: number) => {
    updateMutation.mutate({ branchId, data: editValues });
  };

  if (settingsQuery.isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Şube, Fabrika ve HQ kiosk tolerans ve mesai saati ayarları</p>
        <p className="text-xs text-muted-foreground">Otomatik kapanış saati şube bazında yapılandırılabilir (Türkiye saati). Scheduler bu değeri kullanarak açık oturumları kapatır.</p>
      </div>
      {settingsQuery.data?.map(setting => (
        <Card key={setting.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">{setting.branchName}</CardTitle>
            {editingId !== setting.id ? (
              <Button size="sm" variant="outline" onClick={() => startEdit(setting)} data-testid={`button-edit-kiosk-${setting.branchId}`}>
                Düzenle
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(setting.branchId)} disabled={updateMutation.isPending} data-testid={`button-save-kiosk-${setting.branchId}`}>
                  Kaydet
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} data-testid={`button-cancel-kiosk-${setting.branchId}`}>
                  İptal
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingId === setting.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Mesai Başlangıç</Label>
                  <Input type="time" value={editValues.defaultShiftStartTime || ""} onChange={e => setEditValues(p => ({ ...p, defaultShiftStartTime: e.target.value }))} data-testid={`input-start-${setting.branchId}`} />
                </div>
                <div>
                  <Label className="text-xs">Mesai Bitiş</Label>
                  <Input type="time" value={editValues.defaultShiftEndTime || ""} onChange={e => setEditValues(p => ({ ...p, defaultShiftEndTime: e.target.value }))} data-testid={`input-end-${setting.branchId}`} />
                </div>
                <div>
                  <Label className="text-xs">Otomatik Kapanış Saati</Label>
                  <Input type="time" value={editValues.autoCloseTime || "22:00"} onChange={e => setEditValues(p => ({ ...p, autoCloseTime: e.target.value }))} data-testid={`input-auto-close-${setting.branchId}`} />
                </div>
                <div>
                  <Label className="text-xs">Geç Kalma Toleransı (dk)</Label>
                  <Input type="number" min={0} max={60} value={editValues.lateToleranceMinutes ?? 15} onChange={e => setEditValues(p => ({ ...p, lateToleranceMinutes: Number(e.target.value) }))} data-testid={`input-late-tolerance-${setting.branchId}`} />
                </div>
                <div>
                  <Label className="text-xs">Erken Çıkış Toleransı (dk)</Label>
                  <Input type="number" min={0} max={60} value={editValues.earlyLeaveToleranceMinutes ?? 15} onChange={e => setEditValues(p => ({ ...p, earlyLeaveToleranceMinutes: Number(e.target.value) }))} data-testid={`input-early-leave-${setting.branchId}`} />
                </div>
                <div>
                  <Label className="text-xs">Mola Süresi (dk)</Label>
                  <Input type="number" min={0} max={120} value={editValues.defaultBreakMinutes ?? 60} onChange={e => setEditValues(p => ({ ...p, defaultBreakMinutes: Number(e.target.value) }))} data-testid={`input-break-${setting.branchId}`} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Mesai: </span><span data-testid={`text-shift-hours-${setting.branchId}`}>{setting.defaultShiftStartTime} — {setting.defaultShiftEndTime}</span></div>
                <div><span className="text-muted-foreground text-xs">Oto. Kapanış: </span><span data-testid={`text-auto-close-${setting.branchId}`}>{setting.autoCloseTime || "22:00"}</span></div>
                <div><span className="text-muted-foreground text-xs">Geç kalma toleransı: </span><span data-testid={`text-late-tolerance-${setting.branchId}`}>{setting.lateToleranceMinutes} dk</span></div>
                <div><span className="text-muted-foreground text-xs">Erken çıkış toleransı: </span><span data-testid={`text-early-leave-${setting.branchId}`}>{setting.earlyLeaveToleranceMinutes} dk</span></div>
                <div><span className="text-muted-foreground text-xs">Mola: </span><span data-testid={`text-break-${setting.branchId}`}>{setting.defaultBreakMinutes} dk</span></div>
              </div>
            )}
            <AttendanceAuditList branchId={setting.branchId} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PdksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);  // Sprint 15.6: Detay popover state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ userId: "", date: "", time: "", type: "giris", reason: "" });

  const canManage = user && ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(user.role);

  const branchesQuery = useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/pdks-payroll/branches'],
  });

  useEffect(() => {
    if (branchesQuery.data?.length && !selectedBranch) {
      if (user?.branchId) {
        setSelectedBranch(String(user.branchId));
      } else {
        setSelectedBranch(String(branchesQuery.data[0].id));
      }
    }
  }, [branchesQuery.data, user]);

  const summaryQuery = useQuery<any[]>({
    queryKey: ['/api/pdks/branch-summary', selectedBranch, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/pdks/branch-summary?branchId=${selectedBranch}&month=${selectedMonth}&year=${selectedYear}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedBranch,
  });

  const userDetailQuery = useQuery<any>({
    queryKey: ['/api/pdks/records', selectedUser, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/pdks/records/${selectedUser}?month=${selectedMonth}&year=${selectedYear}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedUser,
  });

  const manualMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/pdks/manual', { ...data, branchId: Number(selectedBranch) });
    },
    onSuccess: () => {
      toast({ title: "Manuel kayıt eklendi" });
      setManualOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/pdks/branch-summary'] });
      if (selectedUser) queryClient.invalidateQueries({ queryKey: ['/api/pdks/records', selectedUser] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kayıt eklenemedi", variant: "destructive" });
    },
  });

  if (selectedUser && userDetailQuery.data) {
    const detail = userDetailQuery.data;
    const summary = summaryQuery.data?.find((s: any) => s.userId === selectedUser);

    return (
      <div className="p-4 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} data-testid="button-back-to-list">
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-user-detail-title">
            {summary?.userName || 'Personel'} — {MONTHS[Number(selectedMonth) - 1]?.label} {selectedYear}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-3 text-center" title="Bu ay vardiyaya gelip mesaisini tamamladığı gün sayısı">
            <div className="text-xs text-muted-foreground">Çalıştı</div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-worked-days">{detail.workedDays}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center" title="Programlı izin günleri (off)">
            <div className="text-xs text-muted-foreground">İzin</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400" data-testid="text-off-days">{detail.offDays}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center" title="Vardiya planlanmıştı, kişi gelmedi (yazılı tutanak gerekir)">
            <div className="text-xs text-muted-foreground">Devamsız</div>
            <div className={`text-xl font-bold ${detail.absentDays > 0 ? 'text-destructive' : ''}`} data-testid="text-absent-days">{detail.absentDays}{detail.absentDays > 0 && ' ⚠️'}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center" title="Fazla mesai dakikası (haftalık 45h üstü)">
            <div className="text-xs text-muted-foreground">Fazla Mesai</div>
            <div className="text-xl font-bold text-orange-600" data-testid="text-overtime">{detail.totalOvertimeMinutes} dk</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {detail.days?.map((day: any) => {
                const date = new Date(day.date);
                const dayName = DAY_NAMES[date.getDay()];
                const dayNum = date.getDate();
                const cfg = STATUS_CONFIG[day.status] || STATUS_CONFIG.absent;
                const isExpanded = expandedDay === day.date;
                const hasDetail = day.status === 'worked' || day.status === 'absent';

                return (
                  <div key={day.date} data-testid={`row-day-${dayNum}`}>
                    <button
                      onClick={() => hasDetail && setExpandedDay(isExpanded ? null : day.date)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${hasDetail ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'}`}
                      data-testid={`button-day-${dayNum}`}
                    >
                      <div className="w-8 text-sm font-medium text-muted-foreground">{dayNum}</div>
                      <div className="w-10 text-xs text-muted-foreground">{dayName}</div>
                      <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      {day.status === 'worked' && day.records.length > 0 && (
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {day.records?.map((r: any) => r.time).join(' → ')}
                          {day.workedMinutes > 0 && ` (${formatMinutes(day.workedMinutes)})`}
                          {day.overtimeMinutes > 0 && ` • FM: ${day.overtimeMinutes}dk`}
                        </span>
                      )}
                      {hasDetail && (
                        <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? '-rotate-90' : 'rotate-180'}`} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-muted/30 border-t">
                        <div className="text-xs text-muted-foreground mb-2 italic">{cfg.description}</div>
                        {day.status === 'worked' && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Giriş-çıkış:</span>{' '}
                              <span className="font-medium">{day.records?.map((r: any) => `${r.time} (${r.type})`).join(' • ') || '—'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Net çalışma:</span>{' '}
                              <span className="font-medium">{formatMinutes(day.workedMinutes || 0)}</span>
                            </div>
                            {day.overtimeMinutes > 0 && (
                              <div>
                                <span className="text-muted-foreground">Fazla mesai:</span>{' '}
                                <span className="font-medium text-orange-600">{day.overtimeMinutes} dk</span>
                              </div>
                            )}
                            {day.isHoliday && (
                              <div>
                                <span className="text-muted-foreground">Tatil:</span>{' '}
                                <span className="font-medium text-purple-600">{day.holidayName || 'Evet'}</span>
                              </div>
                            )}
                            <div className="col-span-2 mt-1 text-xs text-muted-foreground">
                              💡 Compliance, geç giriş, erken çıkış, mola detayı için sağ üst "Personel Detayı" butonu
                            </div>
                          </div>
                        )}
                        {day.status === 'absent' && (
                          <div className="text-sm">
                            <p className="text-red-600 dark:text-red-400 font-medium">⚠️ Devamsızlık tespit edildi</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Bu gün için vardiya planlanmıştı ancak personel hiç giriş yapmadı.
                              İK tutanak prosedürü uygulanmalı.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const AttendanceContent = () => (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {canManage && (
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-manual-entry">
                <Plus className="h-4 w-4 mr-1" /> Manuel Kayıt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manuel PDKS Kaydı</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Personel</Label>
                  <Select value={manualForm.userId} onValueChange={(v) => setManualForm(p => ({ ...p, userId: v }))}>
                    <SelectTrigger data-testid="select-manual-user"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      {summaryQuery.data?.map((s: any) => (
                        <SelectItem key={s.userId} value={s.userId}>{s.userName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tarih</Label>
                    <Input type="date" value={manualForm.date} onChange={(e) => setManualForm(p => ({ ...p, date: e.target.value }))} data-testid="input-manual-date" />
                  </div>
                  <div>
                    <Label>Saat</Label>
                    <Input type="time" value={manualForm.time} onChange={(e) => setManualForm(p => ({ ...p, time: e.target.value }))} data-testid="input-manual-time" />
                  </div>
                </div>
                <div>
                  <Label>Tür</Label>
                  <Select value={manualForm.type} onValueChange={(v) => setManualForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger data-testid="select-manual-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giris">Giriş</SelectItem>
                      <SelectItem value="cikis">Çıkış</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sebep</Label>
                  <Input value={manualForm.reason} onChange={(e) => setManualForm(p => ({ ...p, reason: e.target.value }))} placeholder="Kiosk arızası vb." data-testid="input-manual-reason" />
                </div>
                <Button className="w-full" onClick={() => manualMutation.mutate(manualForm)} disabled={manualMutation.isPending} data-testid="button-save-manual">
                  {manualMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48" data-testid="select-branch">
            <SelectValue placeholder="Şube seçin" />
          </SelectTrigger>
          <SelectContent>
            {branchesQuery.data?.map(b => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {summaryQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : !summaryQuery.data?.length ? (
            <div className="p-8 text-center text-muted-foreground">Bu dönemde personel bulunamadı</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2.5 font-medium">Personel</th>
                    <th className="text-center p-2.5 font-medium" title="Bu ay vardiyaya gelip mesaisini tamamladığı gün sayısı">Çalıştı</th>
                    <th className="text-center p-2.5 font-medium" title="İzin günleri (program off + kapanış off)">İzin</th>
                    <th className="text-center p-2.5 font-medium" title="Vardiya planlanmıştı, kişi gelmedi (yazılı tutanak gerekir)">Devamsız</th>
                    <th className="text-center p-2.5 font-medium" title="Fazla mesai dakikası (45h üstü)">FM (dk)</th>
                    <th className="text-center p-2.5 font-medium" title="Sağlık raporu günleri">Rapor</th>
                    <th className="text-center p-2.5 font-medium text-xs text-muted-foreground" title="Detay için tıklayın">→</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryQuery.data?.map((s: any) => (
                    <tr
                      key={s.userId}
                      className="border-b hover-elevate cursor-pointer"
                      onClick={() => setSelectedUser(s.userId)}
                      data-testid={`row-user-${s.userId}`}
                    >
                      <td className="p-2.5 font-medium">{s.userName}</td>
                      <td className="text-center p-2.5">
                        <span className={s.workedDays > 0 ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                          {s.workedDays}
                        </span>
                      </td>
                      <td className="text-center p-2.5 text-muted-foreground">{s.offDays}</td>
                      <td className="text-center p-2.5">
                        {s.absentDays > 0 ? (
                          <span className="text-destructive font-bold">{s.absentDays} ⚠️</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center p-2.5">
                        {s.overtimeMinutes > 0 ? (
                          <span className="text-orange-600 font-medium">{s.overtimeMinutes}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center p-2.5">
                        {s.sickLeaveDays > 0 ? (
                          <span className="text-orange-600">{s.sickLeaveDays}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center p-2.5 text-muted-foreground text-xs">→</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold" data-testid="text-pdks-title">PDKS — Devam Takibi</h1>
      {canManage ? (
        <Tabs defaultValue="attendance">
          <TabsList data-testid="tabs-pdks">
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Clock className="h-4 w-4 mr-1" /> Devam
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-kiosk-settings">
              <Settings className="h-4 w-4 mr-1" /> Kiosk Ayarları
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="space-y-4 mt-4">
            <AttendanceContent />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <KioskToleranceSettings />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <AttendanceContent />
        </div>
      )}
    </div>
  );
}
