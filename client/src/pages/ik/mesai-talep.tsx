/**
 * Mesai Talep Self-Service (Faz 3 — 6 May 2026)
 *
 * Personel kendi fazla mesai talebini oluşturur (saatlik, tek gün).
 * Yönetici onayı sonrası bordroya 1.5x ile yansır (4857 SK m.41).
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng:  Time HH:MM parse + dakika hesabı pure fn, optimistic UI
 *   - F&B Ops:        "Bu hafta kaç saat onaylandı" özet — istinaen sınır kontrol
 *   - Senior QA:      Saat overlap, gece yarısı geçişi, max 270 saat/yıl uyarısı
 *   - Product Mgr:    1 ekran, 4 alan (tarih/başlangıç/bitiş/sebep)
 *   - Compliance:     4857 SK m.41: yıllık 270 saat limit, ücret 1.5x
 *
 * Endpoint:
 *   GET /api/me/overtime?limit=5         (mevcut — bu hafta özet)
 *   POST /api/overtime-requests          (mevcut)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, CheckCircle2, ArrowLeft, Send } from "lucide-react";

function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function calculateMinutes(start: string, end: string): number {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s === null || e === null) return 0;
  // Gece yarısı geçişi: end < start ise +24 saat
  if (e <= s) return (24 * 60 - s) + e;
  return e - s;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OvertimeSummary {
  list: Array<{ id: number; status: string; requestedMinutes: number; approvedMinutes: number | null }>;
  counts: { pending: number; approved: number; rejected: number };
  summary: { totalApprovedMinutes: number; totalApprovedHours: number };
}

export default function MesaiTalepPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [overtimeDate, setOvertimeDate] = useState<string>(todayISO());
  const [startTime, setStartTime] = useState<string>("18:00");
  const [endTime, setEndTime] = useState<string>("21:00");
  const [reason, setReason] = useState<string>("");

  const requestedMinutes = calculateMinutes(startTime, endTime);

  // Kullanıcı yıl içindeki mesai özeti (270 saat limit kontrolü için)
  const summaryQuery = useQuery<OvertimeSummary, Error>({
    queryKey: ['/api/me/overtime', 100],
    queryFn: async () => {
      const res = await fetch('/api/me/overtime?limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Mesai özeti alınamadı');
      return res.json();
    },
  });

  // Talep oluştur
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/overtime-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          overtimeDate,
          startTime,
          endTime,
          requestedMinutes,
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Talep oluşturulamadı');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Mesai talebi gönderildi",
        description: "Yöneticiniz onaylayınca bordroda gösterilir (1.5×).",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/overtime'] });
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests'] });
      setLocation('/ik-merkezi');
    },
    onError: (err: Error) => {
      toast({
        title: "Talep gönderilemedi",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 4857 SK m.41 yıllık limit kontrol (sezgi — backend de ayrıca validate eder)
  const yearlyApprovedHours = summaryQuery.data?.summary.totalApprovedHours ?? 0;
  const requestedHours = requestedMinutes / 60;
  const wouldExceed270 = (yearlyApprovedHours + requestedHours) > 270;

  // Validasyon
  const errors: string[] = [];
  if (!overtimeDate) errors.push("Tarih seçin");
  if (!startTime || parseTimeToMinutes(startTime) === null) errors.push("Geçerli başlangıç saati girin (HH:MM)");
  if (!endTime || parseTimeToMinutes(endTime) === null) errors.push("Geçerli bitiş saati girin (HH:MM)");
  if (requestedMinutes <= 0) errors.push("Bitiş saati başlangıçtan sonra olmalı");
  if (requestedMinutes > 720) errors.push("Tek seferde 12 saatten fazla mesai talep edilemez");
  if (!reason.trim()) errors.push("Mesai sebebi girin (zorunlu)");
  if (reason.trim().length > 0 && reason.trim().length < 10) errors.push("Sebep en az 10 karakter olmalı");

  // Sezgisel uyarı (warning, error değil)
  const warnings: string[] = [];
  if (wouldExceed270 && summaryQuery.data) {
    warnings.push(`Bu talep onaylanırsa yıllık 270 saat limiti aşılır (mevcut: ${yearlyApprovedHours.toFixed(1)} saat). 4857 SK m.41 uyarınca ek izin gerekebilir.`);
  }

  const canSubmit = errors.length === 0 && !createMutation.isPending;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/ik-merkezi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" /> İK Merkezi
        </Button>
        <h1 className="text-xl font-bold" data-testid="text-page-title">Mesai Talebi</h1>
      </div>

      {/* Özet kartı */}
      <Card data-testid="card-overtime-summary">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-orange-600" />
            <h2 className="text-sm font-semibold">Bu Yıl Mesai Durumum</h2>
          </div>
          {summaryQuery.isLoading && <p className="text-xs text-muted-foreground">Yükleniyor…</p>}
          {summaryQuery.data && (
            <div className="grid grid-cols-3 gap-3">
              <SummaryItem label="Bekleyen" value={summaryQuery.data.counts.pending} unit="talep" />
              <SummaryItem label="Onaylı Saat" value={yearlyApprovedHours} unit="sa" highlight />
              <SummaryItem label="Yıllık Limit" value={270 - yearlyApprovedHours} unit="sa kalan" muted />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ot-date">Mesai Günü</Label>
            <Input
              id="ot-date"
              type="date"
              value={overtimeDate}
              onChange={e => setOvertimeDate(e.target.value)}
              max={todayISO()}
              data-testid="input-overtime-date"
            />
            <p className="text-xs text-muted-foreground">Mesai yapılan gün (ileri tarih kabul edilmez)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Başlangıç</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                data-testid="input-start-time"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-time">Bitiş</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                data-testid="input-end-time"
              />
            </div>
          </div>

          {/* Süre özeti */}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="text-requested">
            <span className="text-muted-foreground">Toplam: </span>
            <span className="font-semibold">
              {Math.floor(requestedMinutes / 60)}sa {requestedMinutes % 60}dk
            </span>
            <span className="text-muted-foreground ml-2">
              (Bordro: ~{Math.round(requestedMinutes * 1.5)} dk × saatlik ücret)
            </span>
          </div>

          {/* Sebep */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Mesai Sebebi *</Label>
            <Textarea
              id="reason"
              placeholder="Örn: Akşam pik dönemi yoğunluk, envanter sayımı, eğitim, vb."
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              data-testid="input-reason"
            />
            <p className="text-xs text-muted-foreground">{reason.length}/500</p>
          </div>

          {/* Hatalar */}
          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2" data-testid="errors-list">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <ul className="text-xs text-red-700 space-y-0.5">
                  {errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Uyarılar */}
          {warnings.length > 0 && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2" data-testid="warnings-list">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <ul className="text-xs text-orange-800 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            data-testid="button-submit"
          >
            {createMutation.isPending ? <>Gönderiliyor…</> : (
              <><Send className="h-4 w-4 mr-2" /> Talebi Gönder</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Bilgi */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Onay süreci:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Müdürünüz veya supervisor onaylar</li>
                <li>Onaylanan saat × 1.5 = bordroya FM olarak yansır</li>
                <li>Yıllık üst sınır 270 saat (İş K. Md.41)</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value, unit, highlight, muted }: { label: string; value: number; unit: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${highlight ? 'border-orange-300 bg-orange-50' : muted ? 'bg-muted/50' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-bold ${highlight ? 'text-orange-700' : ''}`}>
        {typeof value === 'number' && Number.isInteger(value) ? value : Number(value).toFixed(1)}
        <span className="text-xs font-normal ml-1">{unit}</span>
      </div>
    </div>
  );
}
