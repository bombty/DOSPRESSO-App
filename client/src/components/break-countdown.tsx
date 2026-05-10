/**
 * Mola Geri Sayım — Alarm + Uyarı Sistemi
 *
 * MEVCUT (eski): "00:02:02" — geçen süre, uyarı yok
 * YENİ (Aslan 10 May 2026):
 *   - Geri sayım (60dk → 0)
 *   - 50 dk: "10 dk kaldı" uyarısı
 *   - 55 dk: "5 dk! Hazırlan" uyarısı
 *   - 60 dk: 🚨 ALARM — ses + flash
 *   - 60+ dk: 🔴 "GEÇ! Otomatik tutanak"
 *   - Renk değişimi: yeşil → sarı → kırmızı
 *
 * Aslan 10 May 2026 talebi.
 */

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Clock, Coffee, AlertOctagon } from "lucide-react";

interface BreakCountdownProps {
  /** Mola başlangıç zamanı (ISO timestamp) */
  breakStartTime: string;
  /** Planlanan mola süresi (dakika) — default 60 */
  plannedMinutes?: number;
  /** Geç kalma uyarı eşikleri (dakika) */
  warningAtMinutes?: number[];
  /** Mola bittiğinde çağrılır */
  onBreakComplete?: () => void;
  /** Şube/HQ/Fabrika konteksti — UI tonu için */
  context?: "sube" | "hq" | "fabrika";
}

interface CountdownState {
  remaining: number; // saniye
  elapsed: number; // saniye
  isOvertime: boolean;
  overtimeSeconds: number;
  status: "normal" | "warning" | "critical" | "overdue";
}

export function BreakCountdown({
  breakStartTime,
  plannedMinutes = 60,
  warningAtMinutes = [10, 5, 1], // sondaki kalan dakikalar
  onBreakComplete,
  context = "sube",
}: BreakCountdownProps) {
  const [state, setState] = useState<CountdownState>({
    remaining: plannedMinutes * 60,
    elapsed: 0,
    isOvertime: false,
    overtimeSeconds: 0,
    status: "normal",
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastWarningRef = useRef<Set<number>>(new Set());
  const alarmPlayedRef = useRef(false);

  // Sayaç güncelleme
  useEffect(() => {
    const calculateState = (): CountdownState => {
      const startMs = new Date(breakStartTime).getTime();
      const nowMs = Date.now();
      const elapsedSec = Math.floor((nowMs - startMs) / 1000);
      const plannedSec = plannedMinutes * 60;
      const remainingSec = plannedSec - elapsedSec;

      let status: CountdownState["status"] = "normal";
      const minutesLeft = Math.ceil(remainingSec / 60);

      if (remainingSec < 0) {
        status = "overdue";
      } else if (minutesLeft <= 1) {
        status = "critical";
      } else if (minutesLeft <= 5) {
        status = "warning";
      } else if (minutesLeft <= 10) {
        status = "warning";
      }

      return {
        remaining: Math.max(0, remainingSec),
        elapsed: elapsedSec,
        isOvertime: remainingSec < 0,
        overtimeSeconds: Math.max(0, -remainingSec),
        status,
      };
    };

    // İlk değer
    setState(calculateState());

    const intervalId = setInterval(() => {
      const newState = calculateState();
      setState(newState);

      // Uyarı tetikleme — sadece 1 kere
      const minutesLeft = Math.ceil(newState.remaining / 60);
      for (const warningMin of warningAtMinutes) {
        if (
          minutesLeft === warningMin &&
          !lastWarningRef.current.has(warningMin)
        ) {
          lastWarningRef.current.add(warningMin);
          showWarning(warningMin);
        }
      }

      // Mola bitti alarmı — ilk geçişte
      if (newState.isOvertime && !alarmPlayedRef.current) {
        alarmPlayedRef.current = true;
        playAlarm();
        // Notify parent
        onBreakComplete?.();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [breakStartTime, plannedMinutes, warningAtMinutes, onBreakComplete]);

  // Uyarı gösterme (browser notification)
  const showWarning = (minutesLeft: number) => {
    let title = "";
    let body = "";

    if (minutesLeft === 10) {
      title = "⏰ 10 dakikan kaldı";
      body = "Hazırlan, mola süren bitmek üzere";
    } else if (minutesLeft === 5) {
      title = "⚠️ 5 dakika!";
      body = "Kioska geri dön, mola süren neredeyse bitti";
    } else if (minutesLeft === 1) {
      title = "🚨 SON 1 DAKİKA!";
      body = "Kiosa hemen dön — mola bitmek üzere";
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    // Beep sesi
    playBeep();
  };

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } catch (e) {
      // ignore
    }
  };

  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      // 3 ardışık beep
      [0, 300, 600].forEach((delay) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = 1000;
          gain.gain.value = 0.2;
          osc.start();
          setTimeout(() => osc.stop(), 200);
        }, delay);
      });
    } catch (e) {
      // ignore
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 MOLA BİTTİ!", {
        body: "Kioska hemen dön — geç dönüş tutanak gerektirir",
        icon: "/favicon.ico",
        requireInteraction: true,
      });
    }
  };

  // Format helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Renk + ikon
  const colorScheme = {
    normal: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-500",
      icon: <Coffee className="w-12 h-12 text-green-600" />,
      label: "Mola süresi normal",
    },
    warning: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-500",
      icon: <Clock className="w-12 h-12 text-yellow-600 animate-pulse" />,
      label: "Mola süresi azalıyor",
    },
    critical: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-500",
      icon: <AlertTriangle className="w-12 h-12 text-orange-600 animate-bounce" />,
      label: "ACELE ET!",
    },
    overdue: {
      bg: "bg-red-100 dark:bg-red-900/30 animate-pulse",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-500",
      icon: <AlertOctagon className="w-12 h-12 text-red-600 animate-pulse" />,
      label: "🚨 MOLA SÜRESİ DOLDU!",
    },
  }[state.status];

  // Progress bar yüzdesi
  const progressPercent = state.isOvertime
    ? 100
    : Math.min(100, (state.elapsed / (plannedMinutes * 60)) * 100);

  return (
    <div
      className={`rounded-lg border-2 p-6 ${colorScheme.bg} ${colorScheme.border} transition-all`}
    >
      <div className="flex items-center gap-3 mb-3">
        {colorScheme.icon}
        <div>
          <h3 className={`font-bold text-lg ${colorScheme.text}`}>
            ☕ MOLADA — {plannedMinutes} dk hakkın var
          </h3>
          <p className={`text-sm ${colorScheme.text}`}>{colorScheme.label}</p>
        </div>
      </div>

      {/* Geri sayım — büyük */}
      <div className="text-center my-6">
        {!state.isOvertime ? (
          <>
            <div className={`text-7xl md:text-8xl font-mono font-bold ${colorScheme.text}`}>
              {formatTime(state.remaining)}
            </div>
            <p className={`text-sm mt-2 ${colorScheme.text}`}>kalan süre</p>
          </>
        ) : (
          <>
            <div className="text-7xl md:text-8xl font-mono font-bold text-red-600 dark:text-red-400">
              +{formatTime(state.overtimeSeconds)}
            </div>
            <p className="text-sm mt-2 text-red-600 dark:text-red-400 font-bold">
              🔴 GEÇ DÖNDÜN — Otomatik tutanak oluşacak
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            state.status === "normal"
              ? "bg-green-500"
              : state.status === "warning"
              ? "bg-yellow-500"
              : state.status === "critical"
              ? "bg-orange-500"
              : "bg-red-600"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Detay */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Çıkış</p>
          <p className="font-mono font-bold">
            {new Date(breakStartTime).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Geçen Süre</p>
          <p className="font-mono font-bold">
            {formatTime(state.elapsed)} / {plannedMinutes}:00
          </p>
        </div>
      </div>

      {/* Uyarı çubuğu */}
      {state.status === "critical" && !state.isOvertime && (
        <div className="mt-4 p-3 bg-orange-200 dark:bg-orange-800 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-700 dark:text-orange-200" />
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-200">
            Kioska hemen geri dön! Mola süren bitmek üzere.
          </p>
        </div>
      )}

      {state.isOvertime && (
        <div className="mt-4 p-3 bg-red-200 dark:bg-red-800 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon className="w-5 h-5 text-red-700 dark:text-red-200" />
            <p className="font-bold text-red-700 dark:text-red-200">
              UYARI: Geç döndün!
            </p>
          </div>
          <ul className="text-xs text-red-700 dark:text-red-200 list-disc list-inside">
            <li>Otomatik tutanak oluşturuldu</li>
            <li>Telafi süresi: {formatTime(state.overtimeSeconds)} eklenecek</li>
            <li>Şube müdürüne bildirim gitti</li>
          </ul>
        </div>
      )}
    </div>
  );
}
