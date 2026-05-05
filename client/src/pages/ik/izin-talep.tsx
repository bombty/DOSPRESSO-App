/**
 * İzin Talep Self-Service (Faz 3 — 6 May 2026)
 *
 * Personel kendi yıllık/sağlık/mazeret/ücretsiz izin talebini oluşturur.
 * Yöneticisi /izin-talepleri sayfasından onaylar.
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng:  Date validation + days hesabı pure fn, optimistic UI
 *   - F&B Ops:        Bakiye en üstte (kullanmayacağı izni talep etmesin)
 *   - Senior QA:      Negatif gün, taşma, geçmiş tarih → hata mesajı
 *   - Product Mgr:    1 ekrana sığacak, 4 alan (tip/başlangıç/bitiş/sebep) — minimum friction
 *   - Compliance:     İş K. Md.53 (yıllık izin hak ediliş) backend'de validate edilir
 *
 * Endpoint:
 *   GET /api/me/leave-balance         (mevcut)
 *   POST /api/leave-requests          (mevcut)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, AlertTriangle, CheckCircle2, ArrowLeft, Send } from "lucide-react";

const LEAVE_TYPES = [
  { value: "annual",   label: "Yıllık İzin",      desc: "Hak edilen yıllık izin (İş K. Md.53)" },
  { value: "sick",     label: "Sağlık İzni",      desc: "Hastalık raporu ile" },
  { value: "personal", label: "Mazeret İzni",     desc: "Doğum, ölüm, evlilik, vb." },
  { value: "unpaid",   label: "Ücretsiz İzin",    desc: "Maaştan kesintiyle" },
] as const;

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  if (e < s) return 0;
  // İnclusive: 1 May - 1 May = 1 gün
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface LeaveBalance {
  annual?: { earned: number; carriedOver: number; used: number; remaining: number };
  sick?: { used: number };
  // Backend dönen şekle uyarlanacak
}

export default function IzinTalepPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [leaveType, setLeaveType] = useState<string>("annual");
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>(todayISO());
  const [reason, setReason] = useState<string>("");

  const totalDays = calculateDays(startDate, endDate);

  // Bakiye sorgu
  const balanceQuery = useQuery<LeaveBalance, Error>({
    queryKey: ['/api/me/leave-balance'],
    queryFn: async () => {
      const res = await fetch('/api/me/leave-balance', { credentials: 'include' });
      if (!res.ok) throw new Error('Bakiye yüklenemedi');
      return res.json();
    },
  });

  // Talep oluştur
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          totalDays,
          reason: reason.trim() || null,
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
        title: "✅ Talep gönderildi",
        description: "Yöneticiniz onaylayınca bilgilendirileceksiniz.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/my'] });
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

  // Validasyon
  const errors: string[] = [];
  if (!startDate) errors.push("Başlangıç tarihi seçin");
  if (!endDate) errors.push("Bitiş tarihi seçin");
  if (totalDays <= 0) errors.push("Bitiş tarihi başlangıçtan sonra olmalı");
  if (totalDays > 365) errors.push("İzin süresi 365 günü geçemez");
  if (leaveType === "annual" && balanceQuery.data?.annual && totalDays > balanceQuery.data.annual.remaining) {
    errors.push(`Yıllık izin bakiyeniz yetersiz (kalan: ${balanceQuery.data.annual.remaining} gün)`);
  }
  const canSubmit = errors.length === 0 && !createMutation.isPending;

  const annualBalance = balanceQuery.data?.annual;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/ik-merkezi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" /> İK Merkezi
        </Button>
        <h1 className="text-xl font-bold" data-testid="text-page-title">İzin Talebi</h1>
      </div>

      {/* Bakiye Kartı (yıllık için) */}
      {leaveType === "annual" && (
        <Card data-testid="card-leave-balance">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold">Yıllık İzin Bakiyesi (2026)</h2>
            </div>
            {balanceQuery.isLoading && <p className="text-xs text-muted-foreground">Yükleniyor…</p>}
            {balanceQuery.isError && <p className="text-xs text-red-600">Bakiye alınamadı</p>}
            {annualBalance && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <BalanceItem label="Hak Edilen" value={annualBalance.earned} />
                <BalanceItem label="Devir" value={annualBalance.carriedOver} />
                <BalanceItem label="Kullanılan" value={annualBalance.used} muted />
                <BalanceItem label="Kalan" value={annualBalance.remaining} highlight />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* İzin Tipi */}
          <div className="space-y-1.5">
            <Label htmlFor="leave-type">İzin Tipi</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger id="leave-type" data-testid="select-leave-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tarih aralığı */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Başlangıç</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min={todayISO()}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">Bitiş</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate || todayISO()}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Gün sayısı (otomatik) */}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="text-total-days">
            <span className="text-muted-foreground">Toplam: </span>
            <span className="font-semibold">{totalDays} gün</span>
          </div>

          {/* Sebep */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Sebep (opsiyonel)</Label>
            <Textarea
              id="reason"
              placeholder="Örn: Tatil, doktor randevusu, özel iş…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              data-testid="input-reason"
            />
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

          {/* Gönder */}
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            data-testid="button-submit"
          >
            {createMutation.isPending ? (
              <>Gönderiliyor…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Talebi Gönder</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Yardım */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Onay süreci:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Talebi gönderirsiniz</li>
                <li>Yöneticiniz bildirim alır</li>
                <li>Onay/red sonucu size bildirim olarak iletilir</li>
                <li>Onaylanan izinler PDKS'te otomatik işlenir</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceItem({ label, value, muted, highlight }: { label: string; value: number; muted?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${highlight ? 'border-green-300 bg-green-50' : muted ? 'bg-muted/50' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-bold ${highlight ? 'text-green-700' : ''}`}>{value} <span className="text-xs font-normal">gün</span></div>
    </div>
  );
}
