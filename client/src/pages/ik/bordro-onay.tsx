/**
 * Bordro Onay Zinciri (Faz 4 — 6 May 2026)
 *
 * 3 adımlı onay süreci:
 *   1. Şube müdürü: kendi şubesi bordrolarını ön onaylar (status=draft → calculated)
 *   2. Mahmut (muhasebe_ik): HQ scope (HQ + Fabrika + Işıklar D-12) onaylar (calculated → approved_finance)
 *   3. CEO: nihai onay (approved_finance → approved_final)
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng:  monthly_payroll.status enum lifecycle, mutation atomik
 *   - F&B Ops:        Mahmut bulk onay (1 tıkla şube tümü), 24 saat undo penceresi
 *   - Senior QA:      State transition test (draft→cal→fin→final), her adım rejection
 *   - Product Mgr:    Adım göstergesi, "kim onayladı, ne zaman" timeline
 *   - Compliance:     KVKK audit trail (record_revisions), KDV/SGK external bildirim isDryRun=false
 *
 * NOT: monthly_payroll.status zaten var (schema-12). Backend approve endpoint
 * kontrol edilmeli — yoksa stub kullan, gerçek mutation Sprint 17'de.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, AlertCircle, Banknote, Clock, User, Building2 } from "lucide-react";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

interface PayrollRow {
  id: number;
  userId: string;
  branchId: number;
  positionCode: string;
  totalSalary: number;
  netPay: number;
  status: string; // draft | calculated | approved_finance | approved_final | rejected
  approvedBy?: string;
  approvedAt?: string;
  user?: { firstName: string; lastName: string };
  branch?: { name: string };
  // Sprint 9 (D-40 v2): Brüt + yasal kesintiler — TR mevzuat standardı
  grossSalary?: number;
  totalSgkDeduction?: number;
  incomeTax?: number;
  stampDuty?: number;
  totalLegalDeductions?: number;
  legalNote?: string;
}

function formatTL(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kurus / 100);
}

/** Sprint 9: Compact brüt/kesinti gösterimi (kart altında 1 satır) */
function formatTLCompact(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kurus / 100);
}

function statusLabel(status: string): { text: string; color: string; step: number } {
  switch (status) {
    case 'draft':              return { text: 'Hesaplanmamış', color: 'bg-gray-200 text-gray-700', step: 0 };
    case 'calculated':         return { text: 'Hesaplandı (müdür onayı bekliyor)', color: 'bg-yellow-100 text-yellow-800', step: 1 };
    case 'approved_manager':   return { text: 'Müdür onayladı (muhasebe bekliyor)', color: 'bg-blue-100 text-blue-800', step: 2 };
    case 'approved_finance':   return { text: 'Muhasebe onayladı (CEO bekliyor)', color: 'bg-purple-100 text-purple-800', step: 3 };
    case 'approved_final':     return { text: '✅ CEO onayladı', color: 'bg-green-100 text-green-800', step: 4 };
    case 'rejected':           return { text: '❌ Reddedildi', color: 'bg-red-100 text-red-800', step: 0 };
    default:                   return { text: status, color: 'bg-gray-100 text-gray-700', step: 0 };
  }
}

export default function BordroOnayPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Rol bazlı yetki
  const canManagerApprove = user && ['mudur', 'fabrika_mudur', 'supervisor', 'uretim_sefi'].includes(user.role);
  const canFinanceApprove = user && ['muhasebe_ik', 'muhasebe', 'admin'].includes(user.role);
  const canCEOApprove = user && ['ceo', 'admin'].includes(user.role);

  // Bordro listesi (rol bazlı scope)
  const branchId = user?.branchId;
  const isHQ = user && ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'muhasebe'].includes(user.role);

  const payrollQuery = useQuery<PayrollRow[], Error>({
    queryKey: ['/api/payroll/pending', isHQ ? 'all' : branchId, year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (!isHQ && branchId) params.set('branchId', String(branchId));
      const res = await fetch(`/api/payroll/pending?${params}`, { credentials: 'include' });
      if (!res.ok) {
        // Endpoint henüz yoksa boş liste dön (graceful degrade)
        if (res.status === 404) return [];
        throw new Error('Bordro listesi alınamadı');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.list || []);
    },
  });

  // Onay mutation (3 farklı action: manager/finance/ceo)
  const approveMutation = useMutation({
    mutationFn: async ({ id, level }: { id: number; level: 'manager' | 'finance' | 'ceo' }) => {
      const res = await fetch(`/api/payroll/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Onay yapılamadı');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Onaylandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/pending'] });
    },
    onError: (err: Error) => {
      toast({ title: "Onay başarısız", description: err.message, variant: "destructive" });
    },
  });

  const list = payrollQuery.data || [];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/ik-merkezi')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" /> İK Merkezi
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Banknote className="h-5 w-5" /> Bordro Onay
        </h1>
      </div>

      {/* Onay zinciri açıklama */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-3">
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-semibold">3 adımlı onay süreci:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Şube müdürü → kendi şubesini ön onaylar</li>
              <li>Muhasebe (Mahmut) → HQ kapsam onaylar (HQ+Fabrika+Işıklar)</li>
              <li>CEO → nihai onay verir, SGK bildirim açılır</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Ay seçim */}
      <div className="flex items-center gap-2">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-32" data-testid="select-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[year - 1, year].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {payrollQuery.isLoading && (
        <Card><CardContent className="p-8 text-center text-muted-foreground" data-testid="loading-state">Yükleniyor…</CardContent></Card>
      )}
      {payrollQuery.isError && (
        <Card><CardContent className="p-8 text-center text-red-600" data-testid="error-state">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          Bordro listesi alınamadı
        </CardContent></Card>
      )}
      {!payrollQuery.isLoading && !payrollQuery.isError && list.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground" data-testid="empty-state">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          {MONTHS[month - 1]} {year} için bekleyen onay yok
        </CardContent></Card>
      )}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map(row => {
            const status = statusLabel(row.status);
            const showManagerBtn = canManagerApprove && (row.status === 'calculated');
            const showFinanceBtn = canFinanceApprove && (row.status === 'approved_manager');
            const showCEOBtn = canCEOApprove && (row.status === 'approved_finance');
            return (
              <Card key={row.id} data-testid={`row-payroll-${row.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate" data-testid={`text-name-${row.id}`}>
                          {row.user?.firstName} {row.user?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {row.branch?.name && (
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{row.branch.name}</span>
                          )}
                          <span>{row.positionCode}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold" data-testid={`text-net-${row.id}`}>{formatTL(row.netPay)}</div>
                      <div className="text-xs text-muted-foreground">net</div>
                    </div>
                  </div>

                  {/* Sprint 9 (D-40 v2): Compact brüt + kesinti satırı (Mahmut için) */}
                  {row.grossSalary !== undefined && row.grossSalary > 0 && (
                    <div 
                      className="mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap font-mono"
                      data-testid={`detail-${row.id}`}
                    >
                      <span title="Brüt Maaş">
                        Brüt: <span className="text-foreground font-medium">{formatTLCompact(row.grossSalary)} ₺</span>
                      </span>
                      <span title="SGK Primi (%14) + İşsizlik (%1)">
                        SGK: <span className="text-red-600 dark:text-red-400">{formatTLCompact(row.totalSgkDeduction || 0)}</span>
                      </span>
                      <span title="Gelir Vergisi (asgari ücret istisnası sonrası)">
                        GV: <span className="text-red-600 dark:text-red-400">{formatTLCompact(row.incomeTax || 0)}</span>
                      </span>
                      <span title="Damga Vergisi (asgari ücret istisnası sonrası)">
                        DV: <span className="text-red-600 dark:text-red-400">{formatTLCompact(row.stampDuty || 0)}</span>
                      </span>
                    </div>
                  )}

                  {/* Asgari ücret fallback uyarısı (Mahmut için kompakt) */}
                  {row.legalNote && (
                    <div 
                      className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/40"
                      data-testid={`legal-note-${row.id}`}
                    >
                      ⚖️ {row.legalNote}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`} data-testid={`status-${row.id}`}>
                      {status.text}
                    </span>
                    <div className="flex items-center gap-2">
                      {showManagerBtn && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ id: row.id, level: 'manager' })}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-manager-${row.id}`}
                        >
                          Müdür Onayı
                        </Button>
                      )}
                      {showFinanceBtn && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ id: row.id, level: 'finance' })}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-finance-${row.id}`}
                        >
                          Muhasebe Onayı
                        </Button>
                      )}
                      {showCEOBtn && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate({ id: row.id, level: 'ceo' })}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-ceo-${row.id}`}
                        >
                          CEO Onayı (nihai)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {list.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          <Clock className="h-3 w-3 inline mr-1" />
          {list.length} bordro · İşlem yapan: {user?.firstName}
        </div>
      )}
    </div>
  );
}
