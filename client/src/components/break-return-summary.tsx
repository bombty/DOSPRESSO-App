/**
 * Mola Dönüş Özeti — "Hoş geldin" Ekranı
 *
 * Kullanıcı "Molayı Bitir" tıkladığında bu ekran çıkar:
 *   - Süresinde döndü → ✅ yeşil özet
 *   - Geç döndü → ⚠️ uyarı + otomatik tutanak bildirimi
 *
 * Otomatik tutanak (eğer >3 dk geç):
 *   - employee_warnings tablosuna INSERT
 *   - user.disciplinary_count++
 *   - Şube müdürüne Mr.Dobody bildirim
 *
 * Aslan 10 May 2026 talebi.
 */

import { CheckCircle2, AlertTriangle, Clock, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BreakReturnSummaryProps {
  /** Kullanıcı adı */
  userName: string;
  /** Mola başlangıcı */
  breakStartTime: string;
  /** Mola bitişi */
  breakEndTime: string;
  /** Planlanan mola süresi (dakika) */
  plannedMinutes: number;
  /** Bugünkü toplam mola (dakika) - günün bütün molaları */
  totalDailyBreakMinutes?: number;
  /** Bu kullanıcının bugün eklenen disiplin tutanak sayısı */
  newWarningsToday?: number;
  /** "Vardiyaya Dön" tıklanınca */
  onReturnToShift: () => void;
}

export function BreakReturnSummary({
  userName,
  breakStartTime,
  breakEndTime,
  plannedMinutes,
  totalDailyBreakMinutes,
  newWarningsToday = 0,
  onReturnToShift,
}: BreakReturnSummaryProps) {
  const startMs = new Date(breakStartTime).getTime();
  const endMs = new Date(breakEndTime).getTime();
  const actualMinutes = Math.floor((endMs - startMs) / 60000);
  const actualSeconds = Math.floor(((endMs - startMs) / 1000) % 60);
  const overtimeMinutes = Math.max(0, actualMinutes - plannedMinutes);
  const isOvertime = overtimeMinutes > 0;
  const isCriticalOvertime = overtimeMinutes >= 3; // 3+ dk → tutanak

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const remainingDailyMinutes = totalDailyBreakMinutes
    ? Math.max(0, plannedMinutes - totalDailyBreakMinutes)
    : null;

  return (
    <Card
      className={`max-w-2xl mx-auto ${
        isOvertime
          ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
          : "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
      } border-2`}
    >
      <CardContent className="p-6 md:p-8">
        {/* İkon + Selamlama */}
        <div className="text-center mb-6">
          {isOvertime ? (
            <AlertTriangle className="w-16 h-16 mx-auto text-red-600 dark:text-red-400 mb-2" />
          ) : (
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-2" />
          )}
          <h2 className="text-2xl md:text-3xl font-bold">
            {isOvertime ? `⚠️ Hoş geldin ${userName}` : `✅ Hoş geldin ${userName}`}
          </h2>
          <p
            className={`text-sm mt-1 ${
              isOvertime
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {isOvertime
              ? "Geç döndün — uyarı oluşturuldu"
              : "Süresinde döndün, harika!"}
          </p>
        </div>

        {/* Mola özeti */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3 border">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold">☕ Mola Özetin</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Çıkış</p>
              <p className="font-mono text-lg font-bold">
                {formatTime(breakStartTime)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Dönüş</p>
              <p className="font-mono text-lg font-bold">
                {formatTime(breakEndTime)}
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Toplam Süre</span>
              <span
                className={`font-mono text-lg font-bold ${
                  isOvertime
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {actualMinutes} dk {actualSeconds} sn
                {isOvertime ? (
                  <span className="ml-2 text-xs">
                    🔴 {overtimeMinutes} dk geç
                  </span>
                ) : (
                  <span className="ml-2 text-xs">✅ süresinde</span>
                )}
              </span>
            </div>
          </div>

          {/* Bugünkü toplam */}
          {totalDailyBreakMinutes !== undefined && (
            <>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Bugünkü toplam mola
                  </span>
                  <span className="font-mono">
                    {totalDailyBreakMinutes} / {plannedMinutes} dk
                  </span>
                </div>
                {remainingDailyMinutes !== null && (
                  <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        totalDailyBreakMinutes >= plannedMinutes
                          ? "bg-red-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (totalDailyBreakMinutes / plannedMinutes) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
                {remainingDailyMinutes !== null &&
                  remainingDailyMinutes > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Kalan mola hakkı: {remainingDailyMinutes} dakika
                    </p>
                  )}
                {remainingDailyMinutes === 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
                    ⚠️ Mola hakkın doldu — bir sonraki mola tutanak gerektirir
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tutanak uyarısı */}
        {isCriticalOvertime && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 dark:text-red-300 mb-1">
                  ⚠️ Otomatik Tutanak Oluşturuldu
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                  <li>Geç dönüş süresi: <b>{overtimeMinutes} dakika</b></li>
                  <li>Şube müdürüne bildirim gönderildi</li>
                  <li>{overtimeMinutes} dakika telafi yapman gerekiyor</li>
                  {newWarningsToday > 0 && (
                    <li className="font-bold">
                      Bugünkü uyarı sayın: {newWarningsToday}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Hafif geç (1-2 dk) */}
        {isOvertime && !isCriticalOvertime && (
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-700 dark:text-yellow-300" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {overtimeMinutes} dk geç döndün. Bir sonraki molada dikkatli ol —
              3 dk üstü tutanak gerektirir.
            </p>
          </div>
        )}

        {/* Vardiyaya Dön Butonu */}
        <Button
          onClick={onReturnToShift}
          className={`w-full mt-6 h-14 text-lg font-bold ${
            isOvertime
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isOvertime ? "🔴" : "🟢"} Vardiyaya Dön
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Mola süresi hesaplama (Türk İş Kanunu m.68)
// ═══════════════════════════════════════════════════════════════════

/**
 * Vardiya süresine göre yasal mola süresi
 *
 * 4 saatten az → 0 dk (mola yok)
 * 4 - 7.5 saat → 30 dk
 * 7.5+ saat   → 60 dk
 *
 * @param shiftDurationMinutes Vardiya süresi (dakika)
 * @returns Yasal mola süresi (dakika)
 */
export function calculateLegalBreakMinutes(
  shiftDurationMinutes: number
): number {
  const hours = shiftDurationMinutes / 60;
  if (hours < 4) return 0;
  if (hours < 7.5) return 30;
  return 60;
}

/**
 * Mola hakkı kalan dakika (bugünkü)
 */
export function calculateRemainingBreakMinutes(
  totalUsedToday: number,
  shiftDurationMinutes: number
): number {
  const legal = calculateLegalBreakMinutes(shiftDurationMinutes);
  return Math.max(0, legal - totalUsedToday);
}
