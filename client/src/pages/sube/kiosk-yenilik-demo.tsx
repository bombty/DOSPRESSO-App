/**
 * Kiosk Yenilikleri Demo Sayfası
 *
 * Aslan 10 May 2026: Yeni component'leri canlı görmek için demo.
 *
 * URL: /sube/kiosk-demo
 *
 * Gösterilen özellikler:
 * 1. Yeni kiosk ana ekran tasarımı
 * 2. Mola sayaç + alarm (geri sayım canlı)
 * 3. Mola dönüş özeti (geç + süresinde 2 mod)
 * 4. KVKK per-user onay modal
 * 5. Bildirim hierarchy
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KioskMainScreen } from "@/components/kiosk-main-screen";
import { BreakCountdown } from "@/components/break-countdown";
import { BreakReturnSummary } from "@/components/break-return-summary";
import { KvkkPerUserModal } from "@/components/kvkk-per-user-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DemoMode = "kiosk-main" | "break-countdown" | "break-return-good" | "break-return-bad" | "kvkk-modal";

export default function KioskYenilikDemo() {
  const [mode, setMode] = useState<DemoMode>("kiosk-main");
  const [breakStartedAt, setBreakStartedAt] = useState<string>(
    new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 dk önce
  );

  // Mock data
  const mockActiveUsers = [
    { id: "1", firstName: "Cihan", lastName: "Kolakan", status: "checked_in" as const, startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { id: "2", firstName: "Buse", lastName: "Yıldız", status: "on_break" as const, startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), breakStartTime: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
    { id: "3", firstName: "Mehmet", lastName: "Ak", status: "checked_in" as const, startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  ];

  const mockNotifications = [
    { id: "n1", severity: "critical" as const, title: "Donut Teşhir Dolabı bakımı YARIN — Lara" },
    { id: "n2", severity: "warning" as const, title: "Hafta sonu çalışma eksikliği: 2 personel" },
    { id: "n3", severity: "warning" as const, title: "Mola süresi aşımı: 1 personel (Cihan, +5 dk)" },
    { id: "n4", severity: "info" as const, title: "Yeni Cinnaboom Brownie satışta!" },
    { id: "n5", severity: "info" as const, title: "Bugünkü hedef: %85" },
  ];

  const mockAnnouncements = [
    { id: "a1", title: "🎉 Pilot 13 Mayıs Çarşamba 15:00 başlıyor!", isUrgent: true },
    { id: "a2", title: "Yeni KVKK politikası v1.0 yürürlükte" },
    { id: "a3", title: "Hafta sonu özel menü: Strawberry Donut" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Demo navigasyonu */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">🧪 Kiosk Yenilikleri Demo</h1>
              <p className="text-xs text-gray-500">Aslan 10 May 2026 talebine göre 5 yeni özellik</p>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as DemoMode)}>
              <TabsList>
                <TabsTrigger value="kiosk-main">Ana Ekran</TabsTrigger>
                <TabsTrigger value="break-countdown">Mola Sayaç</TabsTrigger>
                <TabsTrigger value="break-return-good">İyi Dönüş</TabsTrigger>
                <TabsTrigger value="break-return-bad">Geç Dönüş</TabsTrigger>
                <TabsTrigger value="kvkk-modal">KVKK Modal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Demo İçerik */}
      <div className="p-4">
        {mode === "kiosk-main" && (
          <div>
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-sm">
                <strong>📌 Yeni Kiosk Ana Ekranı:</strong>
                {" "}Büyük şube ismi, DOSPRESSO branding, aktif personel kartları, bildirim hierarchy, büyük QR kod.
                <br />
                <em className="text-xs">KVKK ana ekrandan KALDIRILDI — artık PIN sonrası kişisel modal.</em>
              </p>
            </div>
            <KioskMainScreen
              branchName="Antalya Işıklar"
              branchId={5}
              activeUsers={mockActiveUsers}
              onLeaveCount={10}
              unscheduledCount={3}
              expectedCount={3}
              notifications={mockNotifications}
              announcements={mockAnnouncements}
              qrUrl="https://app.dospresso.com/sube/kiosk?branch=5"
              onStartShift={() => alert("PIN giriş ekranı açılır")}
            />
          </div>
        )}

        {mode === "break-countdown" && (
          <div className="container mx-auto max-w-3xl">
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-sm">
                <strong>📌 Mola Sayaç + Alarm:</strong>
                {" "}Geri sayım (60 dk → 0). 10/5/1 dk uyarıları (sesli + browser notification). Geç kalma rengi kırmızı.
                <br />
                <em className="text-xs">Aşağıdaki sayaç 5 dk önce başladı — gerçek zamanlı azalır.</em>
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBreakStartedAt(new Date().toISOString())}>
                  Yeni mola başlat (60 dk)
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBreakStartedAt(new Date(Date.now() - 55 * 60 * 1000).toISOString())}>
                  55 dk önce başladı (5 dk kaldı)
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBreakStartedAt(new Date(Date.now() - 65 * 60 * 1000).toISOString())}>
                  Geçmiş (65 dk önce — ALARM)
                </Button>
              </div>
            </div>
            <BreakCountdown
              breakStartTime={breakStartedAt}
              plannedMinutes={60}
              onBreakComplete={() => console.log("Mola bitti!")}
            />
          </div>
        )}

        {mode === "break-return-good" && (
          <div className="container mx-auto">
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-sm">
                <strong>📌 Mola Dönüş — Süresinde:</strong>
                {" "}47 dk mola yaptı (60'tan az), yeşil onay ekranı, motivasyonel mesaj.
              </p>
            </div>
            <BreakReturnSummary
              userName="Cihan"
              breakStartTime={new Date(Date.now() - 47 * 60 * 1000).toISOString()}
              breakEndTime={new Date().toISOString()}
              plannedMinutes={60}
              totalDailyBreakMinutes={47}
              onReturnToShift={() => alert("Vardiyaya dön — PIN tekrar")}
            />
          </div>
        )}

        {mode === "break-return-bad" && (
          <div className="container mx-auto">
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-sm">
                <strong>📌 Mola Dönüş — Geç:</strong>
                {" "}68 dk mola yaptı (60'tan fazla, 8 dk geç). Kırmızı uyarı + otomatik tutanak bildirimi.
              </p>
            </div>
            <BreakReturnSummary
              userName="Cihan"
              breakStartTime={new Date(Date.now() - 68 * 60 * 1000).toISOString()}
              breakEndTime={new Date().toISOString()}
              plannedMinutes={60}
              totalDailyBreakMinutes={68}
              newWarningsToday={1}
              onReturnToShift={() => alert("Vardiyaya dön — telafi 8 dk")}
            />
          </div>
        )}

        {mode === "kvkk-modal" && (
          <div className="container mx-auto p-8">
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-sm">
                <strong>📌 KVKK Per-User Modal:</strong>
                {" "}DB'den çeker, kullanıcıya özel onay, scroll-to-bottom kontrolü, audit kayıt.
                <br />
                <em className="text-xs">Aşağıdaki butonlarla aç/kapat. Üretimde otomatik açılır (ilk PIN sonrası).</em>
              </p>
            </div>
            <KvkkModalDemo />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper komponent — KVKK modal'ı demo amaçlı aç
function KvkkModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>KVKK Modal Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          🛡️ KVKK Modal'ı Aç (zorunlu mod)
        </Button>
        <KvkkPerUserModal
          open={open}
          approvalMethod="kiosk_pin"
          required={true}
          onApproved={() => {
            setOpen(false);
            alert("✅ Onayınız kaydedildi (audit_log)");
          }}
          onCancel={() => setOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
