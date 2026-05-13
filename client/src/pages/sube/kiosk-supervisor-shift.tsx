// ═══════════════════════════════════════════════════════════════════
// Sprint 15.1 (S15.1) — Kiosk Vardiya Planlama — TAM IMPLEMENTASYON
// ═══════════════════════════════════════════════════════════════════
// Aslan'ın 11 May talebi: kiosk üzerinde supervisor PIN ile 1-2 haftalık
// vardiya planlama. Bu dosya tam fonksiyonel implementasyon.
//
// Özellikler:
//   - Role check (supervisor/supervisor_buddy/mudur)
//   - 1-2 haftalık takvim grid (touch-optimize, 56px+ butonlar)
//   - Drag-drop ile vardiya oluşturma (@dnd-kit/core + PointerSensor)
//   - 3 şablon: Sabah (09-17), Akşam (14-22), Gece (22-06)
//   - AI öneri butonu (POST /api/shifts/ai-generate + /ai-apply)
//   - Vardiya tıklanınca düzenle/sil modal
//   - Optimistic update + toast bildirimleri
//
// Backend endpoint'ler (mevcut, yeni gereksiz):
//   - GET /api/shifts?branchId=&startDate=&endDate=  (mevcut vardiyaları çek)
//   - POST /api/shifts  (yeni vardiya oluştur)
//   - DELETE /api/shifts/:id  (sil)
//   - POST /api/shifts/ai-generate  (AI öneri üret)
//   - POST /api/shifts/ai-apply  (AI önerisini uygula)
//   - GET /api/branches/:branchId/kiosk/staff  (şube personel havuzu)
//
// REFERANS: docs/SPRINT-15-1-PLAN-KIOSK-VARDIYA.md (466 satır plan)
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
// Sprint 52.1 hotfix (Aslan 13 May 2026): 409 mevcut vardiya onay dialogu
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Users,
  AlertTriangle,
  Trash2,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const SUPERVISOR_ROLES = ["supervisor", "supervisor_buddy", "mudur"];

// Aslan 11 May 2026 HOTFIX: Kiosk auth header helper
// Bug: AI öneri "Yetkiniz yok" hatası — kiosk üzerinden web session yok
// Fix: x-kiosk-token header'ı her API call'a ekle
// Sprint 19+ (12 May): Token yoksa konsola uyarı (debug için)
function kioskHeaders(extra: Record<string, string> = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("kiosk-token") || "" : "";
  if (!token && typeof window !== "undefined") {
    console.warn("[KIOSK AUTH] kiosk-token localStorage'da YOK! Tekrar PIN ile giriş yapın.");
  }
  return {
    "Content-Type": "application/json",
    "x-kiosk-token": token,
    ...extra,
  };
}

// Sprint 19.1 (Aslan 12 May UX): Cafe sistemine uygun varsayılan şablonlar
// SADECE FALLBACK olarak kullanılır. Sprint 20: Gerçek şablonlar branch.shiftTemplates'ten geldi.
// HQ admin /api/branches/:id/shift-templates ile günceller, kiosk burdan çeker.
const DEFAULT_SHIFT_TEMPLATES = [
  { id: "morning", label: "Sabah Açılış", time: "08:00-17:00", startTime: "08:00", endTime: "17:00", shiftType: "morning", color: "bg-yellow-500" },
  { id: "mid", label: "Öğle", time: "11:00-20:00", startTime: "11:00", endTime: "20:00", shiftType: "morning", color: "bg-blue-500" },
  { id: "evening", label: "Akşam Kapanış", time: "14:00-22:00", startTime: "14:00", endTime: "22:00", shiftType: "evening", color: "bg-pink-500" },
];

// Sprint 20: Renk kod sözlüğü (DB'de "yellow" → Tailwind class)
const COLOR_MAP: Record<string, string> = {
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  indigo: "bg-indigo-500",
};

// Sprint 26 (Aslan 12 May 21:50): 3 katman zaman dilimi (4 yerine 3)
// - Sabah    (≤ 11:00):       Sarı tonları
// - Aracı    (11:00-15:00):   Mavi tonları
// - Kapanış  (≥ 15:00 / gece): Pembe tonları
function getShiftBgClass(startTime?: string | null): string {
  if (!startTime) return "bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40";
  const hour = parseInt(startTime.split(":")[0] || "0", 10);
  // SABAH (≤11) — sarı pastel
  if (hour < 11) {
    return "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-l-4 border-yellow-400";
  }
  // ARACI (11-15) — açık mavi pastel
  if (hour < 15) {
    return "bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 border-l-4 border-sky-400";
  }
  // KAPANIS (15+ veya 0-5) — pembe pastel
  return "bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 border-l-4 border-pink-400";
}

// Sprint 26: 3 zaman dilimi etiketi
function getShiftPeriodLabel(startTime?: string | null): string {
  if (!startTime) return "—";
  const hour = parseInt(startTime.split(":")[0] || "0", 10);
  if (hour < 11) return "🌅 Sabah";
  if (hour < 15) return "☀️ Aracı";
  return "🌙 Kapanış";
}

interface ShiftTemplate {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  color: string;
  time?: string;
  isActive?: boolean;
}

interface DragData {
  type: "staff" | "template" | "shift";
  staff?: any;
  shift?: any;
  template?: ShiftTemplate;
  pendingShift?: { startTime: string; endTime: string; shiftType: string };
}

export default function KioskSupervisorShift() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ staffId: string; date: string; staffName: string } | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<any | null>(null);
  // Sprint 19.4: Vardiya kartından görev/mesaj bırakma
  const [shiftTaskText, setShiftTaskText] = useState("");
  const [shiftTaskPriority, setShiftTaskPriority] = useState("orta");
  // Sprint 25: Manuel saat değişikliği state
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  // Sprint 26 (Aslan 12 May 21:50): Saat editör collapsible — auto-open bug fix
  const [editTimeOpen, setEditTimeOpen] = useState(false);
  // Sprint 28 (Aslan 12 May 22:26): Mola editör + state
  const [editBreakStart, setEditBreakStart] = useState("");
  const [editBreakEnd, setEditBreakEnd] = useState("");
  const [editBreakOpen, setEditBreakOpen] = useState(false);

  // Modal açıldığında mevcut saatleri yükle
  useEffect(() => {
    if (shiftToDelete) {
      setEditShiftStart(shiftToDelete.startTime?.slice(0, 5) || "");
      setEditShiftEnd(shiftToDelete.endTime?.slice(0, 5) || "");
      setEditBreakStart(shiftToDelete.breakStartTime?.slice(0, 5) || "");
      setEditBreakEnd(shiftToDelete.breakEndTime?.slice(0, 5) || "");
      setEditTimeOpen(false);
      setEditBreakOpen(false);
    } else {
      setEditShiftStart("");
      setEditShiftEnd("");
      setEditBreakStart("");
      setEditBreakEnd("");
      setEditTimeOpen(false);
      setEditBreakOpen(false);
    }
  }, [shiftToDelete]);

  // Sprint 19.3 (Aslan 12 May): Özel saat aralığı input state
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  // Sprint 19.2: Aktif hafta tab (0=Hafta 1, 1=Hafta 2) — weekAnalysis için
  const [currentWeekTab, setCurrentWeekTab] = useState<0 | 1>(0);
  const [aiPreview, setAiPreview] = useState<any | null>(null);
  // Sprint 52.1 hotfix (Aslan 13 May 2026): 409 mevcut vardiya onay state
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ existingCount: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px hareket sonrası drag başlasın (touch yanlış başlatma önle)
      },
    })
  );

  // Kiosk auth
  const kioskUserRaw = typeof window !== "undefined" ? localStorage.getItem("kiosk-user") : null;
  const kioskUser = kioskUserRaw ? JSON.parse(kioskUserRaw) : null;

  // Yetki kontrolü
  if (!kioskUser) {
    return (
      <FallbackPage
        title="Kiosk oturumu yok"
        description="Bu sayfaya erişmek için önce kiosk'a giriş yapmanız gerekir."
        onBack={() => setLocation("/sube/kiosk")}
      />
    );
  }
  if (!SUPERVISOR_ROLES.includes(kioskUser.role)) {
    return (
      <FallbackPage
        title="Yetkisiz erişim"
        description={`Vardiya planlama sadece Müdür ve Supervisor rolleri için. Mevcut rol: ${kioskUser.role}`}
        onBack={() => setLocation("/sube/kiosk")}
      />
    );
  }

  // Hafta hesaplamaları (2 hafta)
  const week1Start = currentWeekStart;
  const week2Start = addWeeks(week1Start, 1);
  const week1Days = Array.from({ length: 7 }, (_, i) => addDays(week1Start, i));
  const week2Days = Array.from({ length: 7 }, (_, i) => addDays(week2Start, i));
  const startStr = format(week1Start, "yyyy-MM-dd");
  // Sprint 31 (Aslan 12 May 23:24): AI Öneri seçili haftayı gönderir
  // BUG: AI Öneri her zaman week1Start kullanıyordu → Hafta 2'de tıklayınca plan Hafta 1'e gidiyordu
  const activeWeekStartStr = format(currentWeekTab === 0 ? week1Start : week2Start, "yyyy-MM-dd");
  const endStr = format(addDays(week2Start, 6), "yyyy-MM-dd");

  // Veri çekme
  // Aslan 11 May 2026 HOTFIX-4: Query param + response shape mismatch
  // Bug 1: Backend `dateFrom/dateTo` bekliyor, frontend `startDate/endDate` gönderiyordu
  // Bug 2: Backend direkt array dönüyor, frontend `data.shifts` arıyordu
  const shiftsQuery = useQuery<any>({
    queryKey: ["/api/shifts", kioskUser.branchId, startStr, endStr],
    queryFn: async () => {
      const res = await fetch(
        `/api/shifts?branchId=${kioskUser.branchId}&dateFrom=${startStr}&dateTo=${endStr}`,
        { credentials: "include", headers: kioskHeaders() }
      );
      if (!res.ok) return { shifts: [] };
      const data = await res.json();
      // Backend ya {shifts:[...]} (paginated) ya direkt [...] (default) dönüyor → her ikisini de kabul et
      const arr = Array.isArray(data) ? data : (data?.data || data?.shifts || []);
      return { shifts: arr };
    },
    enabled: !!kioskUser.branchId,
  });

  const staffQuery = useQuery<any>({
    queryKey: ["/api/branches", kioskUser.branchId, "kiosk-staff"],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${kioskUser.branchId}/kiosk/staff`, {
        credentials: "include",
        headers: kioskHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!kioskUser.branchId,
  });

  // Sprint 20 (Aslan 12 May): Şube bilgisi (openingHours, closingHours, shiftTemplates)
  // Single source of truth — kiosk şift planlama bu endpoint'ten çeker
  const branchInfoQuery = useQuery<any>({
    queryKey: ["/api/branches", kioskUser.branchId, "kiosk-info"],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${kioskUser.branchId}/kiosk/info`, {
        credentials: "include",
        headers: kioskHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!kioskUser.branchId,
  });

  // Sprint 20: Dinamik vardiya şablonları (branch.shiftTemplates'ten)
  const SHIFT_TEMPLATES: ShiftTemplate[] = useMemo(() => {
    const dbTemplates = branchInfoQuery.data?.shiftTemplates;
    if (Array.isArray(dbTemplates) && dbTemplates.length > 0) {
      return dbTemplates
        .filter((t: any) => t.isActive !== false)
        .map((t: any) => ({
          id: t.id,
          label: t.label,
          startTime: t.startTime,
          endTime: t.endTime,
          shiftType: t.shiftType || (parseInt(t.startTime.split(":")[0]) < 14 ? "morning" : "evening"),
          color: COLOR_MAP[t.color] || t.color || "bg-blue-500",
          time: `${t.startTime}-${t.endTime}`,
          isActive: true,
        }));
    }
    return DEFAULT_SHIFT_TEMPLATES;
  }, [branchInfoQuery.data]);

  // Şube saatleri (custom time validation için)
  const branchOpeningHours: string = (branchInfoQuery.data?.openingHours || "08:00").toString().slice(0, 5);
  const branchClosingHours: string = (branchInfoQuery.data?.closingHours || "22:00").toString().slice(0, 5);

  // Vardiya oluştur
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: kioskHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Vardiya oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "✅ Vardiya oluşturuldu", description: "Plan güncellendi." });
      setPendingDrop(null);
    },
    onError: (err: any) => {
      toast({
        title: "❌ Hata",
        description: err.message || "Bir sorun oluştu",
        variant: "destructive",
      });
      setPendingDrop(null);
    },
  });

  // Vardiya sil
  const deleteMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "DELETE",
        credentials: "include",
        headers: kioskHeaders(),
      });
      if (!res.ok) throw new Error("Silinemedi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "🗑️ Vardiya silindi" });
      setShiftToDelete(null);
    },
    onError: () => {
      toast({ title: "Silme hatası", variant: "destructive" });
      setShiftToDelete(null);
    },
  });

  // Sprint 19.3 (Aslan 12 May): Vardiya tarihi/saati güncelle (drag-drop ile başka güne taşıma)
  const updateShiftMutation = useMutation({
    mutationFn: async ({ shiftId, updates }: { shiftId: number; updates: any }) => {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "PATCH",
        credentials: "include",
        headers: kioskHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Vardiya güncellenemedi");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Sprint 27 HOTFIX: Cache temizle + modal kapat ki güncel veri görünsün
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
      // Saat veya mola güncellemesi ise modalı kapat
      const isTimeUpdate = variables?.updates?.startTime || variables?.updates?.endTime;
      const isBreakUpdate = variables?.updates?.breakStartTime || variables?.updates?.breakEndTime;
      if (isTimeUpdate || isBreakUpdate) {
        setShiftToDelete(null);
        setEditTimeOpen(false);
        setEditBreakOpen(false);
        toast({
          title: isBreakUpdate ? "☕ Mola güncellendi" : "✅ Saat güncellendi",
          description: "Plan yenilendi."
        });
      } else {
        toast({ title: "✅ Vardiya taşındı", description: "Plan güncellendi." });
      }
    },
    onError: (err: any) => {
      toast({
        title: "❌ Güncelleme hatası",
        description: err.message || "Bir sorun oluştu",
        variant: "destructive",
      });
    },
  });

  // Sprint 19.4 (Aslan 12 May): Vardiya kartından görev/mesaj oluştur
  const shiftTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/branches/${kioskUser.branchId}/kiosk/shift-task`, {
        method: "POST",
        credentials: "include",
        headers: kioskHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Görev oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "📩 Görev/Mesaj gönderildi",
        description: "Personel kioska giriş yaptığında görür.",
      });
      setShiftTaskText("");
      setShiftTaskPriority("orta");
      setShiftToDelete(null);
    },
    onError: (err: any) => {
      toast({
        title: "❌ Hata",
        description: err.message || "Bir sorun oluştu",
        variant: "destructive",
      });
    },
  });

  // AI öneri (POST /api/shifts/ai-generate → preview, sonra /ai-apply)
  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shifts/ai-generate", {
        method: "POST",
        headers: kioskHeaders(),
        credentials: "include",
        body: JSON.stringify({
          branchId: kioskUser.branchId,
          // Sprint 31: Seçili haftayı gönder (Hafta 1 / Hafta 2)
          weekStartDate: activeWeekStartStr,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "AI öneri başarısız");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAiPreview(data);
      // Aslan 11 May 2026 HOTFIX-3: Backend 'plan' döndürüyor, 'shifts' değil
      const planCount = data?.plan?.length || 0;
      toast({ 
        title: planCount > 0 ? "💡 AI önerisi hazır" : "ℹ️ AI: vardiya üretilemedi", 
        description: planCount > 0 
          ? `${planCount} vardiya önerildi (${data.staffCount || 0} personel)` 
          : `${data.staffCount || 0} personel için plan üretilemedi (izinli/şube saati problemi?)` 
      });
    },
    onError: (err: any) => {
      toast({
        title: "AI hatası",
        description: err.message || "Bir sorun oluştu",
        variant: "destructive",
      });
    },
  });

  const aiApplyMutation = useMutation({
    // Sprint 52.1 hotfix (Aslan 13 May 2026): confirmOverwrite parametre al
    // İlk denemede false → 409 alırsak modal → onayla → true ile retry
    mutationFn: async (confirmOverwrite: boolean = false) => {
      // Aslan 11 May 2026 HOTFIX-3: Backend 'plan' field bekliyor + weekStartDate gerekli
      if (!aiPreview?.plan?.length) throw new Error("Öneri yok");
      const res = await fetch("/api/shifts/ai-apply", {
        method: "POST",
        headers: kioskHeaders(),
        credentials: "include",
        body: JSON.stringify({
          branchId: kioskUser.branchId,
          plan: aiPreview.plan,
          // Sprint 31: Seçili haftayı gönder
          weekStartDate: activeWeekStartStr,
          confirmOverwrite,
        }),
      });
      if (res.status === 409) {
        // Sprint 52.1: Mevcut vardiya var, modal göster
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(data.message || "Onay gerekli");
        err.code = "EXISTING_SHIFTS_CONFIRM_REQUIRED";
        err.existingCount = data.existingCount || 0;
        throw err;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Uygulanamadı");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ 
        title: "✅ AI önerisi uygulandı", 
        description: `${data?.created || 0} vardiya kaydedildi.` 
      });
      setAiPreview(null);
      setOverwriteConfirm(null);
    },
    onError: (err: any) => {
      // Sprint 52.1: 409 ise modal göster, toast verme
      if (err?.code === "EXISTING_SHIFTS_CONFIRM_REQUIRED") {
        setOverwriteConfirm({ existingCount: err.existingCount || 0 });
        return;
      }
      toast({ 
        title: "Uygulama hatası", 
        description: err.message || "Bilinmeyen hata",
        variant: "destructive" 
      });
    },
  });

  // Drag handlers
  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData;
    if (data) setActiveDragData(data);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragData(null);
    if (!e.over) return;

    const dragData = e.active.data.current as DragData;
    const overData = e.over.data.current as { date: string } | undefined;
    if (!overData?.date) return;

    if (dragData.type === "staff" && dragData.staff) {
      // Personel sürüklendi → şablon seçim modalı aç
      const staff = dragData.staff;
      setPendingDrop({
        staffId: staff.id,
        date: overData.date,
        staffName: `${staff.firstName} ${staff.lastName}`,
      });
    }

    // Sprint 19.3 (Aslan 12 May): Vardiya sürüklendi → başka güne taşı
    if (dragData.type === "shift" && dragData.shift) {
      const shift = dragData.shift;
      const newDate = overData.date;
      if (shift.shiftDate === newDate) return; // Aynı güne bırakıldı, no-op
      updateShiftMutation.mutate({
        shiftId: shift.id,
        updates: { shiftDate: newDate },
      });
    }

    if (dragData.type === "template" && dragData.template && dragData.pendingShift) {
      toast({
        title: "Şablon kullanımı",
        description: "Önce personeli güne sürükleyin, sonra düzenleyin.",
      });
    }
  };

  // Sprint 19.5 (Aslan 12 May): Şablon seçimi sonrası 'Tüm hafta aynı saat?' state
  const [weekFillPending, setWeekFillPending] = useState<{
    template: ShiftTemplate;
    staffId: string;
    staffName: string;
    startDate: string;
  } | null>(null);

  // Şablon ile vardiya oluştur (pendingDrop modal'dan tetiklenir)
  const confirmShiftCreate = (template: ShiftTemplate) => {
    if (!pendingDrop) return;
    const drop = pendingDrop;
    createMutation.mutate({
      branchId: kioskUser.branchId,
      assignedToId: drop.staffId,
      shiftDate: drop.date,
      startTime: template.startTime,
      endTime: template.endTime,
      shiftType: template.shiftType,
      status: "scheduled",
    });
    // Sprint 19.5: İlk vardiya oluşturulduktan sonra 'Tüm hafta aynı?' sor
    setWeekFillPending({
      template,
      staffId: drop.staffId,
      staffName: drop.staffName,
      startDate: drop.date,
    });
  };

  // Sprint 19.5: Tüm haftayı doldur (6 gün, aynı şablon)
  const fillRestOfWeek = async () => {
    if (!weekFillPending) return;
    const { template, staffId, startDate } = weekFillPending;
    // Aynı haftadaki diğer günleri bul (startDate dahil değil, 5 gün daha)
    const start = new Date(startDate);
    const dayOfWeek = (start.getDay() + 6) % 7; // 0=Pzt
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - dayOfWeek);
    // 6 gün çalışma (Pzt-Cmt veya başlangıç gününe göre)
    const promises: Promise<any>[] = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      const dayStr = format(dayDate, "yyyy-MM-dd");
      if (dayStr === startDate) continue; // Zaten oluşturuldu
      // Önce o gün için bu personelin shift'i var mı kontrol
      const existing = (shiftsQuery.data?.shifts || []).find(
        (s: any) => s.assignedToId === staffId && s.shiftDate === dayStr
      );
      if (existing) continue;
      // İlk 6 günü doldur, Pazar off
      if (d === 6) continue;
      promises.push(
        fetch("/api/shifts", {
          method: "POST",
          credentials: "include",
          headers: kioskHeaders(),
          body: JSON.stringify({
            branchId: kioskUser.branchId,
            assignedToId: staffId,
            shiftDate: dayStr,
            startTime: template.startTime,
            endTime: template.endTime,
            shiftType: template.shiftType,
            status: "scheduled",
          }),
        })
      );
    }
    const results = await Promise.allSettled(promises);
    // Sprint 19.5 HOTFIX (Aslan 12 May 09:57): response.ok kontrol et
    // Promise fulfilled olsa bile HTTP 401/403/400 dönmüş olabilir
    let okCount = 0;
    let failedCount = 0;
    let firstError = "";
    for (const r of results) {
      if (r.status === "fulfilled") {
        const res = r.value as Response;
        if (res.ok) {
          okCount++;
        } else {
          failedCount++;
          if (!firstError) {
            try {
              const errData = await res.json();
              firstError = errData.message || `HTTP ${res.status}`;
            } catch {
              firstError = `HTTP ${res.status}`;
            }
          }
        }
      } else {
        failedCount++;
        if (!firstError) firstError = "Network hatası";
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    if (okCount > 0 && failedCount === 0) {
      toast({
        title: "📅 Hafta dolduruldu",
        description: `${okCount} ek vardiya oluşturuldu (Pazar off)`,
      });
    } else if (okCount > 0 && failedCount > 0) {
      toast({
        title: `⚠️ Kısmi başarı: ${okCount} oluşturuldu, ${failedCount} hata`,
        description: firstError + ". Sayfayı yenileyin veya yeniden PIN ile giriş yapın.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "❌ Hafta doldurulamadı",
        description: firstError || "Bilinmeyen hata. KIOSK'TAN ÇIKIP TEKRAR PIN İLE GİRİŞ YAPIN (token yenilenir).",
        variant: "destructive",
      });
    }
    setWeekFillPending(null);
  };

  // Shifts data flatten
  // Sprint 19.1: Personel ID → ad lookup (vardiya kartında isim göstermek için)
  const staffLookup = useMemo(() => {
    const map: Record<string, any> = {};
    (staffQuery.data || []).forEach((s: any) => {
      if (s?.id) map[s.id] = s;
    });
    return map;
  }, [staffQuery.data]);

  // Sprint 29 + 30 HOTFIX (Aslan 12 May 23:05): useEffect'ler staffLookup'tan SONRA olmalı
  // ESKİ: useEffect line 189'daydı, staffLookup line 713'teydi → TDZ hatası
  // "Cannot access 'staffLookup' before initialization"
  // YENİ: Hooks order düzeltildi (staffLookup → useEffect)

  // FT için başlangıç değişince bitiş +8.5h otomatik (PT manuel)
  useEffect(() => {
    if (!shiftToDelete || !editShiftStart || !editTimeOpen) return;
    const staff = shiftToDelete.assignedToId ? staffLookup[shiftToDelete.assignedToId] : null;
    if (!staff) return;
    const isFT = staff.employmentType !== "parttime" && staff.employmentType !== "yari_zamanli";
    if (!isFT) return;
    const originalStart = shiftToDelete.startTime?.slice(0, 5) || "";
    if (editShiftStart === originalStart) return;
    const [h, m] = editShiftStart.split(":").map(Number);
    const totalMin = h * 60 + (m || 0) + 510; // +8.5h
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    const newEnd = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
    setEditShiftEnd(newEnd);
  }, [editShiftStart, shiftToDelete, staffLookup, editTimeOpen]);

  // Mola başlangıç değişince otomatik bitiş = +60 dk
  useEffect(() => {
    if (!editBreakStart || !editBreakOpen) return;
    const originalStart = shiftToDelete?.breakStartTime?.slice(0, 5) || "";
    if (editBreakStart === originalStart) return;
    const [h, m] = editBreakStart.split(":").map(Number);
    const totalMin = h * 60 + (m || 0) + 60;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    const newEnd = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
    setEditBreakEnd(newEnd);
  }, [editBreakStart, shiftToDelete, editBreakOpen]);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (shiftsQuery.data?.shifts || []).forEach((s: any) => {
      const d = s.shiftDate;
      if (!map[d]) map[d] = [];
      map[d].push(s);
    });
    return map;
  }, [shiftsQuery.data]);

  const totalShifts = (shiftsQuery.data?.shifts || []).length;

  // Sprint 19.2 (Aslan 12 May): Haftalık saat ve off analizi
  // Aktif hafta (Hafta 1 veya Hafta 2) içinde her personel için:
  //   - kaç saat planlandı
  //   - hangi günler off
  //   - 45h altında mı (FT için)
  const weekAnalysis = useMemo(() => {
    const activeWeekDays = currentWeekTab === 0 ? week1Days : week2Days;
    const activeWeekStr = activeWeekDays.map((d) => format(d, "yyyy-MM-dd"));
    const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    const perStaff: Record<string, { hours: number; daysWorked: string[]; offDays: string[] }> = {};
    (staffQuery.data || []).forEach((s: any) => {
      perStaff[s.id] = { hours: 0, daysWorked: [], offDays: [] };
    });

    activeWeekStr.forEach((dateStr, idx) => {
      const dayShifts = shiftsByDate[dateStr] || [];
      const workingIds = new Set(dayShifts.map((sh: any) => sh.assignedToId).filter(Boolean));
      dayShifts.forEach((sh: any) => {
        if (!sh.assignedToId || !perStaff[sh.assignedToId]) return;
        const startMin = parseInt((sh.startTime || "0").split(":")[0]) * 60 + parseInt((sh.startTime || "0").split(":")[1] || "0");
        const endMin = parseInt((sh.endTime || "0").split(":")[0]) * 60 + parseInt((sh.endTime || "0").split(":")[1] || "0");
        const grossMin = endMin - startMin;
        // Net work = gross - 60dk mola (İş K. m.68)
        const netHours = Math.max(0, (grossMin - 60) / 60);
        perStaff[sh.assignedToId].hours += netHours;
        perStaff[sh.assignedToId].daysWorked.push(dayLabels[idx]);
      });
      // Çalışmayan kişiler bu gün için off
      (staffQuery.data || []).forEach((s: any) => {
        if (!workingIds.has(s.id) && perStaff[s.id]) {
          perStaff[s.id].offDays.push(dayLabels[idx]);
        }
      });
    });

    // Uyarılar — Sprint 19.6+19.7 (Aslan 12 May)
    const warnings: string[] = [];
    const overtimeCandidates: Array<{ userId: string; name: string; hours: number; daysWorked: number; reason: string }> = [];
    (staffQuery.data || []).forEach((s: any) => {
      const isFT = s.employmentType !== "parttime" && s.employmentType !== "yari_zamanli";
      const target = isFT ? 45 : 30;
      const data = perStaff[s.id];
      if (!data) return;
      const name = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.username;
      const daysWorkedCount = data.daysWorked.length;

      // Eksik plan uyarısı (FT için 45h altı)
      if (isFT && data.hours > 0 && data.hours < target - 0.5) {
        warnings.push(`⚠️ ${name} (FT): ${data.hours.toFixed(1)}h planlandı (hedef 45h)`);
      }

      // PT için saat uyarısı (Sprint 19.7)
      if (!isFT && data.hours > target) {
        warnings.push(`⚠️ ${name} (PT): ${data.hours.toFixed(1)}h planlandı (PT hedef ${target}h üstü)`);
      }

      // Sprint 19.6: Mesai onayı gerektiren durumlar
      // 1) 7 gün çalışma (haftalık izin yok)
      if (daysWorkedCount >= 7) {
        warnings.push(`🔴 ${name}: 7 gün çalışma planlandı — MESAİ ONAY GEREKLİ`);
        overtimeCandidates.push({
          userId: s.id,
          name,
          hours: data.hours,
          daysWorked: daysWorkedCount,
          reason: `7 gün arka arkaya çalışma (haftalık izin yok)`,
        });
      }
      // 2) FT 45h üstü veya PT 30h üstü (7+ saat aşım)
      else if (data.hours > target + 7) {
        warnings.push(`🔴 ${name}: ${data.hours.toFixed(1)}h planlandı — MESAİ ONAY GEREKLİ`);
        overtimeCandidates.push({
          userId: s.id,
          name,
          hours: data.hours,
          daysWorked: daysWorkedCount,
          reason: `${data.hours.toFixed(1)}h haftalık planlama (${isFT ? 'FT' : 'PT'} hedef ${target}h)`,
        });
      }
    });

    return { perStaff, warnings, overtimeCandidates };
  }, [shiftsByDate, staffQuery.data, week1Days, week2Days, currentWeekTab]);

  // Sprint 19.2: Tüm haftayı silme mutation (test için, yeniden tasarlamak)
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const ids = (shiftsQuery.data?.shifts || []).map((s: any) => s.id);
      const results = await Promise.allSettled(
        ids.map((id: number) =>
          fetch(`/api/shifts/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: kioskHeaders(),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { deleted: ids.length - failed, failed, total: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "🗑️ Tüm vardiyalar silindi",
        description: `${data.deleted}/${data.total} vardiya silindi${data.failed ? ` (${data.failed} hata)` : ""}`,
      });
    },
    onError: () => {
      toast({ title: "❌ Silme hatası", variant: "destructive" });
    },
  });
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  // Sprint 19.6 (Aslan 12 May): Mesai onay talebi state
  const [overtimeReasonOpen, setOvertimeReasonOpen] = useState<null | {
    userId: string;
    name: string;
    hours: number;
    daysWorked: number;
    reason: string;
  }>(null);
  const [overtimeReasonText, setOvertimeReasonText] = useState("");

  // Sprint 19.6: Mesai onay talebi mutation
  const overtimeRequestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/branches/${kioskUser.branchId}/kiosk/overtime-request`, {
        method: "POST",
        credentials: "include",
        headers: kioskHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Talep oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "📋 Mesai Talebi Oluşturuldu",
        description: "Müdür/HR onayı bekliyor. Şu an plana eklenmedi, onay sonrası aktifleşir.",
      });
      setOvertimeReasonOpen(null);
      setOvertimeReasonText("");
    },
    onError: (err: any) => {
      toast({ title: "❌ Hata", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Button onClick={() => setLocation("/sube/kiosk")} size="lg" variant="outline">
          <ChevronLeft className="mr-2 h-5 w-5" /> Kiosk'a Dön
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center justify-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            Vardiya Planla
          </h1>
          <p className="text-sm text-muted-foreground">
            {kioskUser.firstName} {kioskUser.lastName} · {kioskUser.role} · {totalShifts} vardiya
          </p>
        </div>
        <Button
          size="lg"
          variant="default"
          onClick={() => aiGenerateMutation.mutate()}
          disabled={aiGenerateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {aiGenerateMutation.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5" />
          )}
          AI Öneri
        </Button>
      </header>

      {/* Hafta seçici */}
      <div className="flex items-center justify-between mb-4 gap-2 bg-muted/30 rounded-lg p-2">
        <Button size="lg" variant="ghost" onClick={() => setCurrentWeekStart((d) => addWeeks(d, -1))}>
          <ChevronLeft className="mr-1 h-5 w-5" /> Önceki
        </Button>
        <div className="text-center text-sm font-medium">
          {format(week1Start, "d MMM", { locale: tr })} - {format(addDays(week2Start, 6), "d MMM yyyy", { locale: tr })}
        </div>
        <Button size="lg" variant="ghost" onClick={() => setCurrentWeekStart((d) => addWeeks(d, 1))}>
          Sonraki <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Sprint 19.2 (Aslan 12 May): Haftalık saat uyarıları + tümünü sil */}
        {totalShifts > 0 && (
          <div className="mb-4 space-y-2">
            {weekAnalysis.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="text-sm font-medium mb-1 text-amber-700 dark:text-amber-300">
                  ⚠️ Planlama Uyarıları ({weekAnalysis.warnings.length})
                </div>
                <ul className="text-xs space-y-1 text-amber-700 dark:text-amber-200">
                  {weekAnalysis.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => setDeleteAllConfirmOpen(true)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                data-testid="btn-delete-all-shifts"
              >
                🗑️ Tüm Vardiyaları Sil ({totalShifts})
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="week1" className="w-full" onValueChange={(v) => setCurrentWeekTab(v === "week1" ? 0 : 1)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week1" className="text-base py-3">
              Hafta 1 ({format(week1Start, "d MMM", { locale: tr })})
            </TabsTrigger>
            <TabsTrigger value="week2" className="text-base py-3">
              Hafta 2 ({format(week2Start, "d MMM", { locale: tr })})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week1" className="mt-4">
            <WeekGrid days={week1Days} shiftsByDate={shiftsByDate} onShiftClick={setShiftToDelete} staffLookup={staffLookup} />
          </TabsContent>

          <TabsContent value="week2" className="mt-4">
            <WeekGrid days={week2Days} shiftsByDate={shiftsByDate} onShiftClick={setShiftToDelete} staffLookup={staffLookup} />
          </TabsContent>
        </Tabs>

        {/* Personel havuzu (draggable) */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Personel Havuzu ({staffQuery.data?.length || 0} kişi)
            </CardTitle>
            <CardDescription className="text-xs">
              Personeli sürükleyip güne bırakın — şablon seçim modalı açılır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {staffQuery.data?.map((s: any) => (
                <DraggableStaff key={s.id} staff={s} analysis={weekAnalysis.perStaff[s.id]} />
              ))}
              {(!staffQuery.data || staffQuery.data.length === 0) && (
                <p className="text-sm text-muted-foreground">Personel listesi yükleniyor...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <DragOverlay>
          {activeDragData?.type === "staff" && activeDragData.staff && (
            <Badge className="px-4 py-2 text-base bg-blue-600 text-white shadow-lg cursor-grabbing">
              👤 {activeDragData.staff.firstName} {activeDragData.staff.lastName}
            </Badge>
          )}
          {activeDragData?.type === "shift" && activeDragData.shift && (
            <Badge className="px-4 py-2 text-base bg-purple-600 text-white shadow-lg cursor-grabbing">
              📅 {activeDragData.shift.startTime?.slice(0, 5)}-{activeDragData.shift.endTime?.slice(0, 5)} → Taşı
            </Badge>
          )}
        </DragOverlay>
      </DndContext>

      {/* Şablon Seçim Modal — Personel günü bırakınca */}
      <Dialog open={!!pendingDrop} onOpenChange={(open) => {
        if (!open) {
          setPendingDrop(null);
          setCustomStartTime("");
          setCustomEndTime("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vardiya Şablonu Seç</DialogTitle>
            <DialogDescription>
              <strong>{pendingDrop?.staffName}</strong> için{" "}
              <strong>{pendingDrop?.date && format(new Date(pendingDrop.date), "d MMMM, EEEE", { locale: tr })}</strong> vardiyası
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {SHIFT_TEMPLATES.map((t) => (
              <Button
                key={t.id}
                onClick={() => confirmShiftCreate(t)}
                disabled={createMutation.isPending}
                className="justify-start h-auto py-4"
                variant="outline"
              >
                <div className={`w-3 h-3 rounded-full ${t.color} mr-3`} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.time}</div>
                </div>
              </Button>
            ))}

            {/* Sprint 19.3 (Aslan 12 May): Özel saat aralığı — TimePicker */}
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                ⏰ Özel Saat Aralığı
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-muted-foreground">Başlangıç</label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    data-testid="custom-start-time"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bitiş</label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    data-testid="custom-end-time"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!pendingDrop || !customStartTime || !customEndTime) return;
                  // Sprint 20: Şube açılış-kapanış kontrolü
                  if (customStartTime < branchOpeningHours) {
                    toast({
                      title: "⚠️ Saat şube açılışından önce",
                      description: `Şube saat ${branchOpeningHours}'da açılıyor. Başlangıç bu saat veya sonrası olmalı.`,
                      variant: "destructive",
                    });
                    return;
                  }
                  if (customEndTime > branchClosingHours) {
                    toast({
                      title: "⚠️ Saat şube kapanışından sonra",
                      description: `Şube saat ${branchClosingHours}'da kapanıyor. Bitiş bu saat veya öncesi olmalı.`,
                      variant: "destructive",
                    });
                    return;
                  }
                  if (customEndTime <= customStartTime) {
                    toast({
                      title: "⚠️ Bitiş saati başlangıçtan sonra olmalı",
                      variant: "destructive",
                    });
                    return;
                  }
                  // Type'ı saatten çıkar (renk için)
                  const startH = parseInt(customStartTime.split(":")[0]);
                  const shiftType = startH < 14 ? "morning" : "evening";
                  confirmShiftCreate({
                    id: "custom",
                    label: "Özel",
                    time: `${customStartTime}-${customEndTime}`,
                    startTime: customStartTime,
                    endTime: customEndTime,
                    shiftType,
                    color: "bg-purple-500",
                  });
                }}
                disabled={createMutation.isPending || !customStartTime || !customEndTime}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="sm"
                data-testid="btn-create-custom-shift"
              >
                ✨ Özel Saat ile Oluştur
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1">
                Şube saatleri: {branchOpeningHours} - {branchClosingHours}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDrop(null)}>
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sprint 52.1 hotfix (Aslan 13 May 2026): Mevcut vardiya üzerine yazma onayı */}
      <AlertDialog open={!!overwriteConfirm} onOpenChange={(open) => { if (!open) setOverwriteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Bu hafta mevcut vardiyalar var
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              Bu hafta için <strong>{overwriteConfirm?.existingCount || 0}</strong> mevcut vardiya kaydı bulundu.
              <br /><br />
              AI önerisini uygulamak için <strong>mevcut tüm vardiyalar silinecek</strong> ve yeni plan kaydedilecek.
              <br /><br />
              Devam etmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-overwrite-cancel">İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                // Onaylandı — confirmOverwrite=true ile retry
                aiApplyMutation.mutate(true);
              }}
              data-testid="btn-overwrite-confirm"
            >
              Sil ve Yeni Plan Uygula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vardiya Detay Modal — sil + görev/mesaj bırak (Sprint 19.4) */}
      <Dialog open={!!shiftToDelete} onOpenChange={(open) => {
        if (!open) { setShiftToDelete(null); setShiftTaskText(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Vardiya Detayı
            </DialogTitle>
            <DialogDescription>
              {shiftToDelete && (
                <>
                  <strong>
                    {(() => {
                      const s = shiftToDelete.assignedToId ? staffLookup[shiftToDelete.assignedToId] : null;
                      return s
                        ? `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.username
                        : "Personel";
                    })()}
                  </strong>
                  {" "}— {shiftToDelete.shiftDate} ({shiftToDelete.startTime?.slice(0, 5)}-
                  {shiftToDelete.endTime?.slice(0, 5)})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Sprint 25+26 (Aslan 12 May): Saat Manuel Değişikliği — Collapsible */}
          <div className="border-t pt-4 space-y-2">
            {!editTimeOpen ? (
              // Kapalı durumda sadece buton — iOS Safari auto-open bug'ı yok
              <Button
                onClick={() => setEditTimeOpen(true)}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="btn-open-time-editor"
              >
                🕐 Vardiya Saatini Değiştir
              </Button>
            ) : (
              // Açık durumda input'lar göster
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    🕐 Vardiya Saatini Değiştir
                  </label>
                  <button
                    onClick={() => setEditTimeOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ↩ Geri
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Başlangıç</label>
                    <input
                      type="time"
                      value={editShiftStart}
                      onChange={(e) => setEditShiftStart(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  data-testid="edit-shift-start"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bitiş {(() => {
                  const staff = shiftToDelete?.assignedToId ? staffLookup[shiftToDelete.assignedToId] : null;
                  const isFT = staff && staff.employmentType !== "parttime" && staff.employmentType !== "yari_zamanli";
                  return isFT ? <span className="text-blue-500">(FT otomatik +8.5h)</span> : <span className="text-amber-500">(PT manuel)</span>;
                })()}</label>
                <input
                  type="time"
                  value={editShiftEnd}
                  onChange={(e) => setEditShiftEnd(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  data-testid="edit-shift-end"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                if (!shiftToDelete || !editShiftStart || !editShiftEnd) return;
                if (editShiftEnd <= editShiftStart) {
                  toast({
                    title: "⚠️ Bitiş başlangıçtan sonra olmalı",
                    variant: "destructive",
                  });
                  return;
                }
                if (editShiftStart < branchOpeningHours || editShiftEnd > branchClosingHours) {
                  toast({
                    title: "⚠️ Şube saatleri dışında",
                    description: `Şube: ${branchOpeningHours} - ${branchClosingHours}`,
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  editShiftStart === shiftToDelete.startTime?.slice(0, 5) &&
                  editShiftEnd === shiftToDelete.endTime?.slice(0, 5)
                ) {
                  toast({ title: "Saatler aynı, değişiklik yok" });
                  return;
                }
                updateShiftMutation.mutate({
                  shiftId: shiftToDelete.id,
                  updates: { startTime: editShiftStart, endTime: editShiftEnd },
                });
              }}
              disabled={updateShiftMutation.isPending || !editShiftStart || !editShiftEnd}
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="btn-save-shift-time"
            >
              {updateShiftMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : "🕐 Saati Güncelle"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Drag-drop ile başka güne taşımak yerine sadece saati değiştir.
            </p>
              </>
            )}
          </div>

          {/* Sprint 28 (Aslan 12 May 22:26): Mola Saati Belirleme — Collapsible */}
          <div className="border-t pt-4 space-y-2">
            {!editBreakOpen ? (
              <Button
                onClick={() => setEditBreakOpen(true)}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="btn-open-break-editor"
              >
                ☕ Mola Saatini {shiftToDelete?.breakStartTime ? "Düzenle" : "Belirle"}
                {shiftToDelete?.breakStartTime && shiftToDelete?.breakEndTime && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({shiftToDelete.breakStartTime.slice(0, 5)}-{shiftToDelete.breakEndTime.slice(0, 5)})
                  </span>
                )}
              </Button>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    ☕ Mola Saati
                  </label>
                  <button
                    onClick={() => setEditBreakOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ↩ Geri
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Mola Başlangıç</label>
                    <input
                      type="time"
                      value={editBreakStart}
                      onChange={(e) => setEditBreakStart(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      data-testid="edit-break-start"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Mola Bitiş <span className="text-blue-500">(otomatik +60dk)</span></label>
                    <input
                      type="time"
                      value={editBreakEnd}
                      onChange={(e) => setEditBreakEnd(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      data-testid="edit-break-end"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!shiftToDelete || !editBreakStart || !editBreakEnd) return;
                    if (editBreakEnd <= editBreakStart) {
                      toast({
                        title: "⚠️ Mola bitiş başlangıçtan sonra olmalı",
                        variant: "destructive",
                      });
                      return;
                    }
                    // Mola vardiya saatleri içinde olmalı
                    const shiftStart = shiftToDelete.startTime?.slice(0, 5) || "00:00";
                    const shiftEnd = shiftToDelete.endTime?.slice(0, 5) || "23:59";
                    if (editBreakStart < shiftStart || editBreakEnd > shiftEnd) {
                      toast({
                        title: "⚠️ Mola vardiya saatleri içinde olmalı",
                        description: `Vardiya: ${shiftStart} - ${shiftEnd}`,
                        variant: "destructive",
                      });
                      return;
                    }
                    updateShiftMutation.mutate({
                      shiftId: shiftToDelete.id,
                      updates: { breakStartTime: editBreakStart, breakEndTime: editBreakEnd },
                    });
                  }}
                  disabled={updateShiftMutation.isPending || !editBreakStart || !editBreakEnd}
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  data-testid="btn-save-break-time"
                >
                  {updateShiftMutation.isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : "☕ Molayı Güncelle"}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Mola süresi standart 60 dk önerilir (Türkiye İş Kanunu Madde 68).
                </p>
              </>
            )}
          </div>

          {/* Sprint 19.4: Görev/Mesaj Bırak */}
          <div className="border-t pt-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              📝 Bu Vardiya İçin Görev/Mesaj Bırak
            </label>
            <textarea
              value={shiftTaskText}
              onChange={(e) => setShiftTaskText(e.target.value)}
              placeholder="Örn: Vitrini sabah açılışta düzenle. Espresso makinesini temizle. Yeni menü kartlarını koy..."
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
              data-testid="shift-task-textarea"
            />
            <div className="flex items-center gap-2">
              <select
                value={shiftTaskPriority}
                onChange={(e) => setShiftTaskPriority(e.target.value)}
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                <option value="düşük">Düşük Öncelik</option>
                <option value="orta">Orta Öncelik</option>
                <option value="yüksek">Yüksek Öncelik</option>
              </select>
              <Button
                onClick={() => {
                  if (!shiftToDelete || !shiftTaskText.trim()) return;
                  shiftTaskMutation.mutate({
                    assignedToId: shiftToDelete.assignedToId,
                    description: shiftTaskText.trim(),
                    priority: shiftTaskPriority,
                    shiftId: shiftToDelete.id,
                    dueDate: shiftToDelete.shiftDate ? `${shiftToDelete.shiftDate}T23:59:59` : null,
                  });
                }}
                disabled={shiftTaskMutation.isPending || !shiftTaskText.trim()}
                size="sm"
                className="ml-auto bg-blue-600 hover:bg-blue-700"
                data-testid="btn-create-shift-task"
              >
                {shiftTaskMutation.isPending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : "📩 Gönder"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Personel kioska giriş yaptığında "Görevlerim" altında görür.
            </p>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShiftToDelete(null)}>
              Kapat
            </Button>
            <Button
              variant="destructive"
              onClick={() => shiftToDelete && deleteMutation.mutate(shiftToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Vardiyayı Sil
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Preview Modal */}
      <Dialog open={!!aiPreview} onOpenChange={(open) => !open && setAiPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Vardiya Önerisi
            </DialogTitle>
            <DialogDescription>
              {/* Aslan 11 May 2026 HOTFIX-3: backend 'plan' field */}
              {aiPreview?.plan?.length || 0} vardiya önerildi
              {aiPreview?.staffCount > 0 && ` · ${aiPreview.staffCount} personel`}
              {aiPreview?.weeklyHours && (
                <span className="block text-xs mt-1 opacity-75">
                  Haftalık saat: {Object.values(aiPreview.weeklyHours).reduce((a: any, b: any) => a + b, 0)} saat toplam
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-1 py-2 text-sm">
            {aiPreview?.plan?.filter((s: any) => !s.isOff).slice(0, 20).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs border-b py-1">
                <span>
                  {s.date} · {s.userName || s.userId?.slice(0, 8)} · {s.startTime?.slice(0, 5)}-{s.endTime?.slice(0, 5)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {s.shiftType}
                </Badge>
              </div>
            ))}
            {aiPreview?.plan?.filter((s: any) => !s.isOff).length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                + {aiPreview.plan.filter((s: any) => !s.isOff).length - 20} tane daha...
              </p>
            )}
            {aiPreview?.plan?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Plan üretilemedi. Olası sebepler: tüm personel izinli, şube saati yapılandırılmamış (08:00-17:00 default), veya algoritma bu hafta için uygun atama bulamadı.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiPreview(null)}>
              İptal
            </Button>
            <Button
              onClick={() => aiApplyMutation.mutate(false)}
              disabled={aiApplyMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {aiApplyMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Tümünü Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sprint 19.5 (Aslan 12 May): Tüm hafta aynı saat? Confirm Dialog */}
      <Dialog open={!!weekFillPending} onOpenChange={(o) => !o && setWeekFillPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📅 Tüm Hafta Aynı Saat?</DialogTitle>
            <DialogDescription>
              <strong>{weekFillPending?.staffName}</strong> için{" "}
              <strong>
                {weekFillPending?.template.label} ({weekFillPending?.template.time})
              </strong>{" "}
              vardiyasını <strong>haftanın diğer günleri için de</strong> oluşturmak ister misin?
              <br /><br />
              <span className="text-xs text-muted-foreground">
                Pazartesi'den Cumartesi'ye 6 gün aynı saat oluşturulur. Pazar OFF.
                Mevcut vardiyalar atlanır (üzerine yazılmaz).
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekFillPending(null)}>
              Hayır, Sadece Bu Gün
            </Button>
            <Button onClick={fillRestOfWeek} className="bg-blue-600 hover:bg-blue-700">
              Evet, Tüm Haftayı Doldur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sprint 19.2: Tümünü Sil Confirm Dialog */}
      <Dialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">🗑️ Tüm Vardiyaları Sil</DialogTitle>
            <DialogDescription>
              <strong>{totalShifts} vardiya</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
              <br /><br />
              Vardiyaları yeniden planlamak için bu butonu kullanın. AI Öneri ile yeni bir hafta planı oluşturabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllConfirmOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteAllMutation.mutate();
                setDeleteAllConfirmOpen(false);
              }}
              disabled={deleteAllMutation.isPending}
              data-testid="btn-confirm-delete-all"
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Evet, Tümünü Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Hafta Grid — 7 günlük droppable kart sırası
// ═══════════════════════════════════════════════════════════════════
function WeekGrid({
  days,
  shiftsByDate,
  onShiftClick,
  staffLookup,
}: {
  days: Date[];
  shiftsByDate: Record<string, any[]>;
  onShiftClick: (shift: any) => void;
  staffLookup: Record<string, { firstName?: string; lastName?: string; username?: string }>;
}) {
  const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {days.map((day, idx) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayShifts = shiftsByDate[dayStr] || [];
        const isWeekend = idx >= 5;

        return (
          <DroppableDay
            key={dayStr}
            date={dayStr}
            dayLabel={dayLabels[idx]}
            dayNumber={format(day, "d")}
            dayIndex={idx}
            shifts={dayShifts}
            isWeekend={isWeekend}
            onShiftClick={onShiftClick}
            staffLookup={staffLookup}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Droppable Gün Hücresi
// ═══════════════════════════════════════════════════════════════════
function DroppableDay({
  date,
  dayLabel,
  dayNumber,
  dayIndex,
  shifts,
  isWeekend,
  onShiftClick,
  staffLookup,
}: {
  date: string;
  dayLabel: string;
  dayNumber: string;
  dayIndex: number;
  shifts: any[];
  isWeekend: boolean;
  onShiftClick: (shift: any) => void;
  staffLookup: Record<string, { firstName?: string; lastName?: string; username?: string }>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: { date },
  });

  // Sprint 28 (Aslan 12 May 22:26): Her güne tematik subtle bg renk
  // Pzt en koyu → Paz en açık (göz hızlı tarama için kademeli)
  const dayBgClasses = [
    "bg-slate-100/60 dark:bg-slate-800/30",  // Pzt
    "bg-slate-50/70 dark:bg-slate-800/20",   // Sal
    "bg-blue-50/40 dark:bg-blue-900/15",     // Çar
    "bg-cyan-50/40 dark:bg-cyan-900/15",     // Per
    "bg-teal-50/40 dark:bg-teal-900/15",     // Cum
    "bg-amber-50/50 dark:bg-amber-900/15",   // Cmt (haftasonu vurgu)
    "bg-rose-50/50 dark:bg-rose-900/15",     // Paz (haftasonu vurgu)
  ];
  const dayBg = dayBgClasses[dayIndex] || "";

  return (
    <Card
      ref={setNodeRef}
      className={`min-h-[160px] transition-colors ${
        isOver ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 border-2" : dayBg
      }`}
    >
      <CardHeader className="pb-2 pt-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground font-medium">{dayLabel}</div>
          <div className="text-lg font-bold">{dayNumber}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2 px-2">
        {shifts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center italic py-4">
            {isOver ? "Buraya bırak" : "Boş"}
          </p>
        ) : (
          <div className="space-y-1">
            {shifts.map((shift: any) => {
              const staff = shift.assignedToId ? staffLookup[shift.assignedToId] : null;
              // Sprint 27 (Aslan 12 May 22:16): Kısa isim — "Süleyman O."
              const firstName = staff?.firstName || shift.assignedToFirstName || "";
              const lastName = staff?.lastName || "";
              const staffName = firstName && lastName
                ? `${firstName} ${lastName.charAt(0).toUpperCase()}.`
                : firstName || staff?.username || shift.assignedToName || "—";
              return (
                <DraggableShiftCard
                  key={shift.id}
                  shift={shift}
                  staffName={staffName}
                  onShiftClick={onShiftClick}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sprint 19.3 (Aslan 12 May): Draggable Vardiya Kartı
// Mevcut vardiyayı başka güne sürükleyebilmek için
// ═══════════════════════════════════════════════════════════════════
function DraggableShiftCard({
  shift,
  staffName,
  onShiftClick,
}: {
  shift: any;
  staffName: string;
  onShiftClick: (shift: any) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { type: "shift", shift } as DragData,
  });
  const bgClass = getShiftBgClass(shift.startTime);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onShiftClick(shift)}
      className={`text-sm rounded px-2 py-2 w-full text-left transition-colors cursor-grab active:cursor-grabbing touch-none ${bgClass} ${
        isDragging ? "opacity-50" : ""
      }`}
      data-testid={`shift-card-${shift.id}`}
      role="button"
    >
      <div className="font-medium truncate flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[13px]">{staffName}</span>
      </div>
      <div className="text-muted-foreground text-xs font-semibold mt-0.5">
        {shift.startTime?.slice(0, 5)}-{shift.endTime?.slice(0, 5)}
      </div>
      {/* Sprint 27 (Aslan 12 May 22:16): Mola saatini göster */}
      {shift.breakStartTime && shift.breakEndTime && (
        <div className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
          <span>☕</span>
          <span>{shift.breakStartTime.slice(0, 5)}-{shift.breakEndTime.slice(0, 5)}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Draggable Personel Kartı
// ═══════════════════════════════════════════════════════════════════
function DraggableStaff({ staff, analysis }: { staff: any; analysis?: { hours: number; daysWorked: string[]; offDays: string[] } }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: { type: "staff", staff } as DragData,
  });

  // Sprint 19.2: Haftalık saat + off gösterimi
  const isFT = staff.employmentType !== "parttime" && staff.employmentType !== "yari_zamanli";
  const target = isFT ? 45 : 30;
  const hours = analysis?.hours || 0;
  const offDays = analysis?.offDays || [];
  const isUnderTarget = hours > 0 && hours < target - 0.5;
  const isOverTarget = hours > target + 7;
  const hoursColor = isOverTarget ? "text-red-600 font-bold" : isUnderTarget ? "text-amber-600 font-semibold" : hours > 0 ? "text-green-600 font-semibold" : "text-muted-foreground";

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-4 py-2.5 rounded-lg border bg-card hover:bg-accent transition-colors cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? "opacity-50" : ""
      } ${isUnderTarget ? "border-amber-400" : isOverTarget ? "border-red-400" : ""}`}
      style={{ minHeight: 56 }} // Touch-optimize (Apple HIG 44+px)
    >
      <div className="text-sm font-medium">
        👤 {staff.firstName} {staff.lastName}
      </div>
      <div className="text-xs text-muted-foreground">
        {staff.role} · {isFT ? "FT" : "PT"}
      </div>
      {analysis && hours > 0 && (
        <div className={`text-xs mt-1 ${hoursColor}`}>
          {hours.toFixed(1)}h / {target}h{offDays.length > 0 && ` · Off: ${offDays.join(", ")}`}
        </div>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Fallback Page (yetkisiz / oturum yok)
// ═══════════════════════════════════════════════════════════════════
function FallbackPage({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onBack} className="w-full" size="lg">
            <ChevronLeft className="mr-2 h-4 w-4" /> Kiosk'a Dön
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
