// ═══════════════════════════════════════════════════════════════════
// Sprint 4 / TASK-#345 (5 May 2026): Personel Self-Service Sayfası
// ═══════════════════════════════════════════════════════════════════
// Personel kendi puantaj + izin + mesai durumunu tek sayfada görür.
// /personel-puantajim adresinden erişilir.
// ═══════════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, TrendingUp, CheckCircle, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function PersonelPuantajim() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Sprint 4: 3 yeni endpoint
  const { data: puantaj, isLoading: loadingPuantaj } = useQuery<any>({
    queryKey: ['/api/me/puantaj', year, month],
    queryFn: async () => {
      const r = await fetch(`/api/me/puantaj?year=${year}&month=${month}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Puantaj yüklenemedi');
      return r.json();
    },
    refetchInterval: 60000, // Her dakika güncel "aktif" durumu için
  });

  const { data: leaveBalance } = useQuery<any>({
    queryKey: ['/api/me/leave-balance', year],
    queryFn: async () => {
      const r = await fetch(`/api/me/leave-balance?year=${year}`, { credentials: 'include' });
      if (!r.ok) throw new Error('İzin bakiyesi yüklenemedi');
      return r.json();
    },
  });

  const { data: overtime } = useQuery<any>({
    queryKey: ['/api/me/overtime'],
    queryFn: async () => {
      const r = await fetch('/api/me/overtime', { credentials: 'include' });
      if (!r.ok) throw new Error('Mesai talepleri yüklenemedi');
      return r.json();
    },
  });

  if (!user) return <div className="p-8 text-center">Giriş yapın</div>;

  const monthName = new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      {/* HEADER + AKTİF BADGE */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Puantajım</h1>
          <p className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName} • {monthName}
          </p>
        </div>
        {puantaj?.isActiveToday && (
          <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Bugün Aktifsin
          </Badge>
        )}
      </div>

      {/* AY/YIL SEÇİCİ */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Dönem:</span>
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-1 border rounded text-sm bg-background"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleDateString('tr-TR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-1 border rounded text-sm bg-background"
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Tabs defaultValue="puantaj" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="puantaj">
            <Clock className="h-4 w-4 mr-1.5" />
            Puantaj
          </TabsTrigger>
          <TabsTrigger value="izin">
            <Calendar className="h-4 w-4 mr-1.5" />
            İzin
            {leaveBalance?.remainingDays > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {leaveBalance.remainingDays} gün
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mesai">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Mesai
            {overtime?.counts?.pending > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {overtime.counts.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────── */}
        {/* PUANTAJ TAB */}
        {/* ────────────────────────────── */}
        <TabsContent value="puantaj" className="space-y-4">
          {loadingPuantaj ? (
            <Skeleton className="h-64" />
          ) : puantaj ? (
            <>
              {/* Aylık özet kartları */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Çalışılan Gün</p>
                    <p className="text-2xl font-bold">{puantaj.summary?.workedDays ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Toplam Çalışma</p>
                    <p className="text-2xl font-bold">{puantaj.summary?.formattedTotal ?? '0s 0dk'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Mesai (onaylı)</p>
                    <p className="text-2xl font-bold">
                      {Math.floor((puantaj.summary?.overtimeMinutesApproved ?? 0) / 60)}s {(puantaj.summary?.overtimeMinutesApproved ?? 0) % 60}dk
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Aktif Vardiya</p>
                    <p className="text-2xl font-bold">
                      {puantaj.isActiveToday ? '🟢' : '⚪'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Günlük tablo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Günlük Giriş-Çıkış</CardTitle>
                  <CardDescription>{monthName}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {(puantaj.dailyRecords || []).length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">
                      Bu ay için kayıt yok
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2">Tarih</th>
                            <th className="text-left px-3 py-2">Giriş</th>
                            <th className="text-left px-3 py-2">Çıkış</th>
                            <th className="text-right px-3 py-2">Süre</th>
                            <th className="text-center px-3 py-2">Yer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {puantaj.dailyRecords.map((r: any) => (
                            <tr key={r.date} className="border-t">
                              <td className="px-3 py-2 font-medium">
                                {format(new Date(r.date), 'd MMM', { locale: tr })}
                              </td>
                              <td className="px-3 py-2 text-green-600">
                                {r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '—'}
                              </td>
                              <td className="px-3 py-2 text-red-500">
                                {r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : <Badge variant="outline">Açık</Badge>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {r.minutes ? `${Math.floor(r.minutes / 60)}s ${r.minutes % 60}dk` : '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {r.source === 'factory' ? '🏭' : '☕'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ────────────────────────────── */}
        {/* İZİN TAB */}
        {/* ────────────────────────────── */}
        <TabsContent value="izin" className="space-y-4">
          {leaveBalance && (
            <>
              {leaveBalance.warning && (
                <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm">{leaveBalance.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* İzin bakiye özet */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Yıllık Hak</p>
                    <p className="text-2xl font-bold">{leaveBalance.annualEntitlementDays}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Devir</p>
                    <p className="text-2xl font-bold">{leaveBalance.carriedOverDays || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Kullanılan</p>
                    <p className="text-2xl font-bold text-orange-500">{leaveBalance.usedDays}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Kalan</p>
                    <p className="text-2xl font-bold text-green-600">{leaveBalance.remainingDays}</p>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={() => window.location.href = '/izin-talepleri?action=new'} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Yeni İzin Talebi
              </Button>

              {/* Bekleyen + onaylı izinler */}
              {leaveBalance.pendingLeaves?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Bekleyen İzin Talepleri ({leaveBalance.pendingLeaves.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {leaveBalance.pendingLeaves.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                        <div>
                          <p className="text-sm font-medium">{l.startDate} → {l.endDate}</p>
                          <p className="text-xs text-muted-foreground">{l.reason || l.leaveType}</p>
                        </div>
                        <Badge variant="outline">{l.totalDays} gün</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {leaveBalance.approvedLeaves?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Onaylanmış İzinler ({leaveBalance.approvedLeaves.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {leaveBalance.approvedLeaves.slice(0, 10).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                        <div>
                          <p className="text-sm font-medium">{l.startDate} → {l.endDate}</p>
                          <p className="text-xs text-muted-foreground">{l.leaveType}</p>
                        </div>
                        <Badge variant="default">{l.totalDays} gün</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ────────────────────────────── */}
        {/* MESAİ TAB */}
        {/* ────────────────────────────── */}
        <TabsContent value="mesai" className="space-y-4">
          {overtime && (
            <>
              {/* Mesai özet */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Toplam Talep</p>
                    <p className="text-2xl font-bold">{overtime.summary?.total ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Bekleyen</p>
                    <p className="text-2xl font-bold text-amber-500">{overtime.counts?.pending ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Onaylı</p>
                    <p className="text-2xl font-bold text-green-600">{overtime.counts?.approved ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Toplam Saat</p>
                    <p className="text-2xl font-bold">{overtime.summary?.totalApprovedHours ?? 0}s</p>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={() => window.location.href = '/mesai?action=new'} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Mesai Talebi
              </Button>

              {/* Mesai listesi */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tüm Mesai Talepleri</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {(overtime.list || []).length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">
                      Henüz mesai talebi yok
                    </p>
                  ) : (
                    <div className="divide-y">
                      {overtime.list.map((o: any) => (
                        <div key={o.id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{o.overtimeDate}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.startTime} - {o.endTime} • {o.requestedMinutes} dk
                            </p>
                            {o.reason && <p className="text-xs text-muted-foreground mt-1">{o.reason}</p>}
                          </div>
                          <Badge 
                            variant={o.status === 'approved' ? 'default' : o.status === 'rejected' ? 'destructive' : 'outline'}
                          >
                            {o.status === 'approved' ? '✅ Onaylandı' : o.status === 'rejected' ? '❌ Red' : '⏳ Bekliyor'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer linkleri */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Detaylı bordro bilgisi için:</span>
          <Button variant="link" size="sm" onClick={() => window.location.href = '/bordrom'}>
            Bordrom <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
