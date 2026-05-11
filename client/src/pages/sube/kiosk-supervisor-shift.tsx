// ═══════════════════════════════════════════════════════════════════
// Sprint 15.1 (S15.1) — Kiosk Üzerinde Vardiya Planlama
// ═══════════════════════════════════════════════════════════════════
// AŞAMA 1 İSKELET (11 May 2026, Aslan kararı):
//
// Bu sayfa Aslan'ın istediği özelliği başlatır: supervisor/mudur PIN ile
// kioska girer, vardiya planlama sekmesi açar, 1-2 haftalık plan yapar.
//
// MEVCUT DURUM (11 May 2026):
//   - Aşama 1 (iskelet) ✅ Bu dosya yapıldı
//   - Aşama 2 (veri çekme + takvim grid) — sonraki Claude oturumu
//   - Aşama 3 (drag-drop) — sonraki Claude oturumu
//   - Aşama 4 (şablonlar + AI öneri) — sonraki Claude oturumu
//   - Aşama 5 (test + polish) — sonraki Claude oturumu
//
// REFERANS DÖKÜMAN: docs/SPRINT-15-1-PLAN-KIOSK-VARDIYA.md (466 satır)
// MEVCUT WEB SÜRÜMÜ: client/src/pages/vardiya-planlama.tsx (2711 satır)
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  X,
  Calendar,
  Users,
  AlertTriangle,
  Construction,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { tr } from "date-fns/locale";

const SUPERVISOR_ROLES = ["supervisor", "supervisor_buddy", "mudur"];

export default function KioskSupervisorShift() {
  const [, setLocation] = useLocation();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Kiosk auth: zaten girişli kullanıcı bilgisi localStorage'dan
  const kioskUserRaw = typeof window !== "undefined" ? localStorage.getItem("kiosk-user") : null;
  const kioskUser = kioskUserRaw ? JSON.parse(kioskUserRaw) : null;

  // Yetki kontrolü
  if (!kioskUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Kiosk oturumu yok
            </CardTitle>
            <CardDescription>
              Bu sayfaya erişmek için önce kiosk'a giriş yapmanız gerekir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/sube/kiosk")} className="w-full" size="lg">
              <ChevronLeft className="mr-2 h-4 w-4" /> Kiosk'a Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!SUPERVISOR_ROLES.includes(kioskUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Yetkisiz erişim
            </CardTitle>
            <CardDescription>
              Vardiya planlama sadece <strong>Müdür</strong> ve <strong>Supervisor</strong> rolleri için açıktır.
              Mevcut rol: <Badge variant="outline">{kioskUser.role}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/sube/kiosk")} className="w-full" size="lg">
              <ChevronLeft className="mr-2 h-4 w-4" /> Kiosk'a Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Hafta hesaplamaları
  const week1Start = currentWeekStart;
  const week2Start = addWeeks(week1Start, 1);
  const week1Days = Array.from({ length: 7 }, (_, i) => addDays(week1Start, i));
  const week2Days = Array.from({ length: 7 }, (_, i) => addDays(week2Start, i));

  // Vardiyaları çek (Aşama 2'de kullanılacak — şimdilik placeholder)
  const week2End = addDays(week2Start, 6);
  const startStr = format(week1Start, "yyyy-MM-dd");
  const endStr = format(week2End, "yyyy-MM-dd");

  const { data: shiftsData } = useQuery<any>({
    queryKey: ["/api/shifts", kioskUser.branchId, startStr, endStr],
    queryFn: async () => {
      const res = await fetch(
        `/api/shifts?branchId=${kioskUser.branchId}&startDate=${startStr}&endDate=${endStr}`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!kioskUser.branchId,
  });

  const { data: staffList } = useQuery<any>({
    queryKey: ["/api/branches", kioskUser.branchId, "staff"],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${kioskUser.branchId}/staff`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!kioskUser.branchId,
  });

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Button onClick={() => setLocation("/sube/kiosk")} size="lg" variant="outline">
          <ChevronLeft className="mr-2 h-5 w-5" /> Kiosk'a Dön
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center justify-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            Vardiya Planla
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {kioskUser.firstName} {kioskUser.lastName} · {kioskUser.role}
          </p>
        </div>
        <Button size="lg" variant="outline" disabled title="Sprint 15.1 Aşama 4'te aktif olacak">
          <Sparkles className="mr-2 h-5 w-5" /> AI Öneri
        </Button>
      </header>

      {/* Sprint 15.1 Aşama 1 Bilgilendirme Banner */}
      <Card className="mb-4 border-blue-300 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Construction className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Vardiya Planlama — Aşama 1 (Önizleme)
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Bu özelliğin temel iskeleti hazır. <strong>Drag-drop, AI öneri ve tam planlama</strong> Sprint 15.1 Aşama 2-5'te (post-pilot 20 May+) eklenecek.
                Şu anda mevcut vardiyalar görüntülenebilir, ancak yeni vardiya web sayfasından (
                <button
                  onClick={() => setLocation("/vardiya-planlama")}
                  className="underline font-medium hover:text-blue-600"
                >
                  /vardiya-planlama
                </button>
                ) oluşturulmalı.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hafta seçici */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setCurrentWeekStart((d) => addWeeks(d, -1))}
        >
          <ChevronLeft className="mr-1 h-5 w-5" /> Önceki Hafta
        </Button>
        <div className="text-center text-sm font-medium">
          {format(week1Start, "d MMM", { locale: tr })} -{" "}
          {format(addDays(week2Start, 6), "d MMM yyyy", { locale: tr })}
        </div>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setCurrentWeekStart((d) => addWeeks(d, 1))}
        >
          Sonraki Hafta <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="week1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week1">Hafta 1</TabsTrigger>
          <TabsTrigger value="week2">Hafta 2</TabsTrigger>
        </TabsList>

        <TabsContent value="week1" className="mt-4">
          <WeekGrid days={week1Days} shifts={shiftsData?.shifts || []} />
        </TabsContent>

        <TabsContent value="week2" className="mt-4">
          <WeekGrid days={week2Days} shifts={shiftsData?.shifts || []} />
        </TabsContent>
      </Tabs>

      {/* Personel havuzu (read-only önizleme) */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Personel Havuzu ({staffList?.length || 0} kişi)
          </CardTitle>
          <CardDescription className="text-xs">
            Aşama 3'te bu havuzdan personeli güne sürükleyebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {staffList?.map((s: any) => (
              <Badge key={s.id} variant="outline" className="px-3 py-1.5 text-sm">
                👤 {s.firstName} {s.lastName}
              </Badge>
            ))}
            {(!staffList || staffList.length === 0) && (
              <p className="text-sm text-muted-foreground">Personel listesi yükleniyor...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sprint 15.1 yol haritası */}
      <Card className="mt-4 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 Sprint 15.1 Yol Haritası</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✅</span>
            <div>
              <strong>Aşama 1:</strong> İskelet + role check + veri çekme (bu sayfa)
            </div>
          </div>
          <div className="flex items-start gap-2 opacity-60">
            <span className="text-muted-foreground font-bold">⏳</span>
            <div>
              <strong>Aşama 2:</strong> Takvim grid + mevcut vardiyalar (read-only)
            </div>
          </div>
          <div className="flex items-start gap-2 opacity-60">
            <span className="text-muted-foreground font-bold">⏳</span>
            <div>
              <strong>Aşama 3:</strong> Drag-drop ile yeni vardiya oluşturma (@dnd-kit/core)
            </div>
          </div>
          <div className="flex items-start gap-2 opacity-60">
            <span className="text-muted-foreground font-bold">⏳</span>
            <div>
              <strong>Aşama 4:</strong> Şablonlar (sabah/akşam) + AI öneri butonu
            </div>
          </div>
          <div className="flex items-start gap-2 opacity-60">
            <span className="text-muted-foreground font-bold">⏳</span>
            <div>
              <strong>Aşama 5:</strong> Touch optimizasyonu + çakışma kontrolü + test
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Detay: <code>docs/SPRINT-15-1-PLAN-KIOSK-VARDIYA.md</code> (466 satır kapsamlı plan)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WeekGrid — 7 günlük takvim hücreleri (Aşama 2 placeholder)
// ═══════════════════════════════════════════════════════════════════
function WeekGrid({ days, shifts }: { days: Date[]; shifts: any[] }) {
  const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, idx) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s: any) => s.shiftDate === dayStr);
        const isWeekend = idx >= 5;

        return (
          <Card
            key={dayStr}
            className={`min-h-[160px] ${isWeekend ? "bg-muted/30" : ""}`}
          >
            <CardHeader className="pb-2 pt-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{dayLabels[idx]}</div>
                <div className="text-lg font-bold">{format(day, "d")}</div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-2 px-2">
              {dayShifts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center italic py-4">
                  Vardiya yok
                </p>
              ) : (
                <div className="space-y-1">
                  {dayShifts.map((shift: any) => (
                    <div
                      key={shift.id}
                      className="text-xs bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1"
                    >
                      <div className="font-medium truncate">
                        {shift.assignedToName || "—"}
                      </div>
                      <div className="text-muted-foreground">
                        {shift.startTime?.slice(0, 5)}-{shift.endTime?.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
