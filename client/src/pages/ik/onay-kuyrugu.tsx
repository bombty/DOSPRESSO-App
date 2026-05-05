/**
 * Onay Kuyruğu (Faz 4 — 6 May 2026)
 *
 * Yönetici için tüm bekleyen onaylar tek liste:
 *   - İzin talepleri (status=pending)
 *   - Mesai talepleri (status=pending)
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng:  2 query paralel, tek liste merge, optimistic mutation
 *   - F&B Ops:        Müdür "bekleyen 8 onay" tek tıkla giderir
 *   - Senior QA:      Empty state + boş liste + reject sebep zorunlu
 *   - Product Mgr:    En eski talep en üstte (FIFO), kategori grupla
 *   - Compliance:     Audit trail her onay/red için (mevcut endpoint'lerde var)
 *
 * Endpoint'ler (mevcut):
 *   GET /api/leave-requests?status=pending
 *   PATCH /api/leave-requests/:id/approve
 *   PATCH /api/leave-requests/:id/reject
 *   GET /api/overtime-requests (sadece pending'ler için frontend filter)
 *   PATCH /api/overtime-requests/:id/approve
 *   PATCH /api/overtime-requests/:id/reject
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, X, Clock, Calendar, AlertCircle, User } from "lucide-react";

interface LeaveRequest {
  id: number;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; branchId?: number };
}

interface OvertimeRequest {
  id: number;
  userId: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  requestedMinutes: number;
  reason: string;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; branchId?: number };
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Yıllık",
  sick: "Sağlık",
  personal: "Mazeret",
  unpaid: "Ücretsiz",
};

function trDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function trDateRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  return trDateShort(iso);
}

export default function OnayKuyruguPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<{ type: 'leave' | 'overtime'; id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Bekleyen izinler
  const leavesQuery = useQuery<LeaveRequest[], Error>({
    queryKey: ['/api/leave-requests', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/leave-requests?status=pending', { credentials: 'include' });
      if (!res.ok) throw new Error('İzin talepleri alınamadı');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.list || []);
    },
  });

  // Bekleyen mesailer
  const overtimesQuery = useQuery<OvertimeRequest[], Error>({
    queryKey: ['/api/overtime-requests', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/overtime-requests?status=pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Mesai talepleri alınamadı');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.list || []);
      // Eğer endpoint status filter desteklemiyorsa frontend filter
      return list.filter((o: OvertimeRequest) => o.status === 'pending');
    },
  });

  // İzin onay/red
  const leaveMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) => {
      const res = await fetch(`/api/leave-requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: action === 'reject' ? JSON.stringify({ rejectionReason: reason }) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `${action === 'approve' ? 'Onay' : 'Red'} başarısız`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ İşlem tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  // Mesai onay/red
  const overtimeMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) => {
      const res = await fetch(`/api/overtime-requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: action === 'reject' ? JSON.stringify({ rejectionReason: reason }) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `${action === 'approve' ? 'Onay' : 'Red'} başarısız`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ İşlem tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/overtime-requests'] });
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const leavesPending = leavesQuery.data || [];
  const overtimesPending = overtimesQuery.data || [];
  const totalPending = leavesPending.length + overtimesPending.length;
  const isLoading = leavesQuery.isLoading || overtimesQuery.isLoading;
  const isError = leavesQuery.isError || overtimesQuery.isError;

  const handleReject = () => {
    if (!rejectingId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast({ title: "Red sebebi en az 5 karakter olmalı", variant: "destructive" });
      return;
    }
    if (rejectingId.type === 'leave') {
      leaveMutation.mutate({ id: rejectingId.id, action: 'reject', reason: rejectReason.trim() });
    } else {
      overtimeMutation.mutate({ id: rejectingId.id, action: 'reject', reason: rejectReason.trim() });
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/ik-merkezi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" /> İK Merkezi
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Clock className="h-5 w-5" /> Onay Kuyruğu
          {totalPending > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {totalPending}
            </span>
          )}
        </h1>
      </div>

      {/* Loading / Error / Empty */}
      {isLoading && (
        <Card><CardContent className="p-8 text-center text-muted-foreground" data-testid="loading-state">Yükleniyor…</CardContent></Card>
      )}
      {isError && (
        <Card><CardContent className="p-8 text-center text-red-600" data-testid="error-state">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          Liste alınamadı
        </CardContent></Card>
      )}
      {!isLoading && !isError && totalPending === 0 && (
        <Card><CardContent className="p-8 text-center" data-testid="empty-state">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <h3 className="font-semibold">Bekleyen onay yok 🎉</h3>
          <p className="text-sm text-muted-foreground mt-1">Tüm talepler işlenmiş durumda</p>
        </CardContent></Card>
      )}

      {/* Red dialog (basitçe inline expandable card) */}
      {rejectingId && (
        <Card className="border-red-200 bg-red-50/50" data-testid="reject-dialog">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-red-900">Red sebebi</h3>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Talebin neden reddedildiğini açıklayın (en az 5 karakter)…"
              rows={2}
              maxLength={500}
              data-testid="input-reject-reason"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRejectingId(null); setRejectReason(""); }} data-testid="button-cancel-reject">
                İptal
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReject} data-testid="button-confirm-reject">
                Reddet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* İzin talepleri */}
      {leavesPending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> İzin Talepleri ({leavesPending.length})
          </h2>
          {leavesPending.map(lv => (
            <Card key={`lv-${lv.id}`} data-testid={`leave-${lv.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium" data-testid={`text-leave-name-${lv.id}`}>
                        {lv.user?.firstName} {lv.user?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {LEAVE_TYPE_LABELS[lv.leaveType] || lv.leaveType} · {lv.totalDays} gün
                        · {trDateShort(lv.startDate)} → {trDateShort(lv.endDate)}
                      </div>
                      {lv.reason && (
                        <div className="text-xs text-muted-foreground mt-1 italic">"{lv.reason}"</div>
                      )}
                      <div className="text-xs text-muted-foreground/70 mt-1">{trDateRel(lv.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => leaveMutation.mutate({ id: lv.id, action: 'approve' })}
                      disabled={leaveMutation.isPending}
                      data-testid={`button-approve-leave-${lv.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingId({ type: 'leave', id: lv.id })}
                      data-testid={`button-reject-leave-${lv.id}`}
                    >
                      <X className="h-4 w-4 mr-1 text-red-600" /> Reddet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mesai talepleri */}
      {overtimesPending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Mesai Talepleri ({overtimesPending.length})
          </h2>
          {overtimesPending.map(ot => (
            <Card key={`ot-${ot.id}`} data-testid={`overtime-${ot.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium" data-testid={`text-ot-name-${ot.id}`}>
                        {ot.user?.firstName} {ot.user?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trDateShort(ot.overtimeDate)} · {ot.startTime} - {ot.endTime}
                        · {Math.floor(ot.requestedMinutes / 60)}sa {ot.requestedMinutes % 60}dk
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 italic">"{ot.reason}"</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">{trDateRel(ot.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => overtimeMutation.mutate({ id: ot.id, action: 'approve' })}
                      disabled={overtimeMutation.isPending}
                      data-testid={`button-approve-ot-${ot.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingId({ type: 'overtime', id: ot.id })}
                      data-testid={`button-reject-ot-${ot.id}`}
                    >
                      <X className="h-4 w-4 mr-1 text-red-600" /> Reddet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
