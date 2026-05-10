/**
 * Yeni Kiosk Ana Ekran — DOSPRESSO Branded
 *
 * MEVCUT:
 *   - Şube ismi küçük başlıkta okunaksız
 *   - KVKK altta (yanlış konum)
 *   - Bildirimler küçük metin
 *
 * YENİ (Aslan 10 May 2026):
 *   - Büyük şube ismi + DOSPRESSO logosu
 *   - "Kimler Şubede" özet kartı (büyük rakam)
 *   - Saat + tarih + tarih kartı
 *   - Aktif personel kartları (büyük, görünür)
 *   - Bildirim hierarchy (kırmızı/sarı/mavi)
 *   - QR kod büyük (telefon erişimi kolay)
 *
 * Bu component eski kiosk ana ekranının üzerine giyilir.
 * shift status, announcements, vs eskisi gibi çalışır.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, Users, AlertTriangle, Bell, Megaphone, CheckCircle2, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  status: "checked_in" | "on_break";
  startTime: string;
  breakStartTime?: string;
}

interface KioskMainScreenProps {
  branchName: string;
  branchId: number;
  // Ekip durumları
  activeUsers: ActiveUser[];
  onLeaveCount: number;
  unscheduledCount: number;
  expectedCount?: number;
  // Bildirimler
  notifications?: KioskNotification[];
  announcements?: KioskAnnouncement[];
  // QR kod URL
  qrUrl?: string;
  // Vardiya başlatma butonu
  onStartShift: () => void;
}

interface KioskNotification {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message?: string;
}

interface KioskAnnouncement {
  id: string;
  title: string;
  isUrgent?: boolean;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    badge: "bg-red-600 text-white",
    label: "🚨 ACİL",
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    badge: "bg-yellow-600 text-white",
    label: "🟡 UYARI",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    icon: <Bell className="w-5 h-5 text-blue-600" />,
    badge: "bg-blue-600 text-white",
    label: "ℹ️ BİLGİ",
  },
};

export function KioskMainScreen({
  branchName,
  branchId,
  activeUsers,
  onLeaveCount,
  unscheduledCount,
  expectedCount,
  notifications = [],
  announcements = [],
  qrUrl,
  onStartShift,
}: KioskMainScreenProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Bildirimleri severity'e göre grupla
  const critical = notifications.filter((n) => n.severity === "critical");
  const warnings = notifications.filter((n) => n.severity === "warning");
  const infos = notifications.filter((n) => n.severity === "info");

  // Aktif personel sayısı
  const activeCount = activeUsers.filter((u) => u.status === "checked_in").length;
  const onBreakCount = activeUsers.filter((u) => u.status === "on_break").length;

  // Tarih formatı
  const dateStr = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#192838] to-[#0c0f14] text-white p-4 md:p-6">
      {/* ═══════════════════════════════════════════════ */}
      {/* HEADER — DOSPRESSO branding + büyük şube ismi  */}
      {/* ═══════════════════════════════════════════════ */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#C0392B] rounded-lg p-3">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">
                DOSPRESSO
              </p>
              <h1 className="text-3xl md:text-4xl font-bold">
                {branchName}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Şube #{branchId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-600/20 border-green-500 text-green-300 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              {activeCount} aktif
            </Badge>
            <Badge variant="outline" className="bg-orange-600/20 border-orange-500 text-orange-300 px-3 py-1">
              ☕ {onBreakCount} molada
            </Badge>
            <Badge variant="outline" className="bg-blue-600/20 border-blue-500 text-blue-300 px-3 py-1">
              📅 {onLeaveCount} izinli
            </Badge>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════ */}
      {/* GRID 1: Saat/Tarih + QR Kod                     */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Saat + Tarih kartı */}
        <Card className="md:col-span-2 bg-gray-800/60 border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">📅 {dateStr}</p>
                <div className="text-5xl md:text-6xl font-mono font-bold text-white">
                  {timeStr}
                </div>
              </div>
              <Coffee className="w-16 h-16 text-[#C0392B] opacity-30" />
            </div>
          </CardContent>
        </Card>

        {/* QR Kod kartı — büyük */}
        <Card className="bg-white border-2 border-[#C0392B]">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-xs uppercase tracking-wider text-gray-600 mb-2">
              📱 Telefonumdan açayım
            </p>
            {qrUrl && (
              <QRCodeSVG
                value={qrUrl}
                size={120}
                bgColor="#FFFFFF"
                fgColor="#192838"
              />
            )}
            <p className="text-xs text-gray-600 mt-2 text-center">
              QR'ı tara veya tıklayıp PIN gir
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* AKTİF PERSONEL KARTLARI                         */}
      {/* ═══════════════════════════════════════════════ */}
      {activeUsers.length > 0 && (
        <Card className="mb-6 bg-gray-800/60 border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              ŞU AN ÇALIŞANLAR ({activeUsers.length} kişi)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {activeUsers.slice(0, 12).map((u) => (
                <Card
                  key={u.id}
                  className={`${
                    u.status === "on_break"
                      ? "bg-orange-900/40 border-orange-500"
                      : "bg-green-900/40 border-green-500"
                  } border-2`}
                >
                  <CardContent className="p-3 text-center">
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold ${
                        u.status === "on_break"
                          ? "bg-orange-600"
                          : "bg-green-600"
                      }`}
                    >
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {u.firstName} {u.lastName?.[0]}.
                    </p>
                    <p className="text-xs mt-1">
                      {u.status === "on_break" ? (
                        <span className="text-orange-300">☕ Molada</span>
                      ) : (
                        <span className="text-green-300">✅ Çalışıyor</span>
                      )}
                    </p>
                    {u.startTime && (
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Giriş: {new Date(u.startTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* VARDİYAYI BAŞLAT BUTONU — BÜYÜK                 */}
      {/* ═══════════════════════════════════════════════ */}
      <button
        onClick={onStartShift}
        className="w-full bg-[#C0392B] hover:bg-[#A0322B] text-white py-6 px-8 rounded-xl text-2xl font-bold shadow-2xl mb-6 transition-all hover:scale-[1.02]"
      >
        ➕ Vardiyayı Başlat — PIN Gir
      </button>

      {/* ═══════════════════════════════════════════════ */}
      {/* BİLDİRİMLER HIERARCHY                           */}
      {/* ═══════════════════════════════════════════════ */}
      {(critical.length > 0 || warnings.length > 0 || infos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* CRITICAL */}
          {critical.length > 0 && (
            <Card className={`border-2 ${SEVERITY_CONFIG.critical.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-700 dark:text-red-300">
                    🚨 ACİL ({critical.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {critical.slice(0, 5).map((n) => (
                    <li key={n.id} className="text-sm text-red-700 dark:text-red-300">
                      • {n.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* WARNINGS */}
          {warnings.length > 0 && (
            <Card className={`border-2 ${SEVERITY_CONFIG.warning.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-yellow-700 dark:text-yellow-300">
                    🟡 UYARI ({warnings.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {warnings.slice(0, 5).map((n) => (
                    <li key={n.id} className="text-sm text-yellow-700 dark:text-yellow-300">
                      • {n.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* INFO */}
          {infos.length > 0 && (
            <Card className={`border-2 ${SEVERITY_CONFIG.info.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-blue-700 dark:text-blue-300">
                    ℹ️ BİLGİ ({infos.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {infos.slice(0, 5).map((n) => (
                    <li key={n.id} className="text-sm text-blue-700 dark:text-blue-300">
                      • {n.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* DUYURULAR (mevcut sistem)                       */}
      {/* ═══════════════════════════════════════════════ */}
      {announcements.length > 0 && (
        <Card className="bg-gray-800/60 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-[#C0392B]" />
              <h3 className="font-bold">📢 DUYURULAR</h3>
            </div>
            <ul className="space-y-2">
              {announcements.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className={`p-2 rounded ${
                    a.isUrgent
                      ? "bg-red-900/40 border-l-4 border-red-500"
                      : "bg-gray-700/40 border-l-4 border-gray-500"
                  }`}
                >
                  <span className={a.isUrgent ? "text-red-300 font-bold" : "text-gray-300"}>
                    {a.isUrgent && "🔴 "}
                    {a.title}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer KVKK link (artık sadece info, modal kullanıcıya özel) */}
      <footer className="mt-8 text-center text-xs text-gray-500">
        🛡️ Çalışan kişisel verileri KVKK gereği işlenir. PIN ile giriş sonrası kişisel onay alınır.
      </footer>
    </div>
  );
}
