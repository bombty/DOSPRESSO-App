import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { CentrumShell, KpiChip, Widget, MiniStats, ListItem, DobodySlot, TimeFilter, type TimePeriod, type KpiVariant } from "@/components/centrum/CentrumShell";
import { useState } from "react";
import { Link } from "wouter";  // Sprint 6 Bölüm 4: anormallik kartlarında click-to-detail
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function MuhasebeCentrum() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const { data: financeData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/finance", period],
    refetchInterval: 120000,
  });

  const { data: ikData } = useQuery<any>({
    queryKey: ["/api/hr/ik-dashboard"],
    refetchInterval: 120000,
  });

  // Sprint 3 (5 May 2026): Mahmut Bey IK Dashboard yeni endpoint'leri
  const { data: gunlukOzet } = useQuery<any>({
    queryKey: ["/api/ik/gunluk-ozet"],
    refetchInterval: 60000, // 1 dk
  });

  const { data: bekleyenIslemler } = useQuery<any>({
    queryKey: ["/api/ik/bekleyen-islemler"],
    refetchInterval: 60000,
  });

  const { data: anormallikler } = useQuery<any>({
    queryKey: ["/api/ik/anormallikler"],
    refetchInterval: 120000,
  });

  const { data: financialSummary } = useQuery<any[]>({
    queryKey: ["/api/branch-financial-summary"],
  });

  const { data: dobodyActions = [] } = useQuery<any[]>({
    queryKey: ["/api/agent/actions", "pending", "muhasebe"],
    queryFn: async () => { const r = await fetch("/api/agent/actions?status=pending&limit=5", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : (d.data || d.actions || []); },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const totalStaff = ikData?.totalEmployees ?? 0;
  const pendingLeave = ikData?.pendingLeaveRequests ?? 0;
  const payrollCompletion = financeData?.payrollCompletion ?? 0;
  const totalPending = bekleyenIslemler?.counts?.total ?? 0;
  const totalAnomalies = anormallikler?.summary?.totalAnomalies ?? 0;

  return (
    <CentrumShell
      title="İK & Muhasebe Merkezi"
      subtitle="Personel · Bordro · Maliyet"
      roleLabel="İK/Muhasebe" roleColor="#fb923c" roleBg="rgba(251,146,60,0.12)"
      kpis={[
        { label: "Aktif Personel", value: totalStaff, variant: "ok" as KpiVariant },
        { label: "Bekleyen İşlem", value: totalPending, variant: totalPending > 0 ? "warn" as KpiVariant : "ok" as KpiVariant },
        { label: "Anormallik", value: totalAnomalies, variant: totalAnomalies > 0 ? "warn" as KpiVariant : "ok" as KpiVariant },
        { label: "Bordro", value: `%${payrollCompletion}`, variant: payrollCompletion >= 80 ? "ok" as KpiVariant : "warn" as KpiVariant },
      ]}
      actions={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => window.location.href="/ik"} className="text-xs h-7">Personel</Button><Button size="sm" variant="outline" onClick={() => window.location.href="/muhasebe"} className="text-xs h-7">Finans</Button><TimeFilter value={period} onChange={setPeriod} /></div>}
      rightPanel={
        <DobodySlot actions={dobodyActions.length > 0 ? dobodyActions.map((a: any) => ({
          id: a.id, title: a.title || a.message, sub: a.description, mode: (a.actionType === "info" ? "info" : "action") as any,
        })) : [
          { id: 1, title: "Bordro onay bekliyor", sub: "3 şube — deadline 5 Nisan", mode: "info" },
        ]} />
      }
    >
      {/* Sprint 3 (5 May): GÜNLÜK ÖZET — 3 lokasyon kartları (yeni endpoint) */}
      {gunlukOzet?.locations && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground/80 px-1">📍 Bugün — 3 Lokasyon Anlık Durum</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gunlukOzet.locations.map((loc: any) => (
              <Widget key={loc.id} title={`${loc.type === 'factory' ? '🏭' : loc.type === 'office' ? '🏢' : '☕'} ${loc.name}`}>
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Toplam Personel</span>
                    <span className="font-semibold">{loc.totalEmployees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Bugün Giriş Yapan</span>
                    <Badge variant={loc.attendanceRate >= 80 ? "default" : "destructive"} className="text-xs">
                      {loc.checkedInToday} / {loc.totalEmployees} (%{loc.attendanceRate})
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Şu An İçeride</span>
                    <span className="font-semibold text-green-500">{loc.currentlyWorking}</span>
                  </div>
                  {loc.notCheckedIn > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Devamsız</span>
                      <Badge variant="destructive" className="text-xs">{loc.notCheckedIn}</Badge>
                    </div>
                  )}
                </div>
              </Widget>
            ))}
          </div>
        </div>
      )}

      {/* Sprint 3 (5 May): BEKLEYEN İŞLEMLER */}
      {bekleyenIslemler && totalPending > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground/80 px-1">⏳ Bekleyen İşlemler ({totalPending})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Widget title={`💪 Mesai Talepleri (${bekleyenIslemler.counts?.overtimes ?? 0})`}>
              {(bekleyenIslemler.pendingOvertimes || []).slice(0, 5).map((o: any) => (
                <ListItem
                  key={o.id}
                  title={o.userName}
                  meta={`${o.overtimeDate} ${o.startTime}-${o.endTime} (${o.requestedMinutes} dk)`}
                  priority="⏰"
                  priorityColor="#fbbf24"
                  onClick={() => window.location.href = `/mesai?id=${o.id}`}
                />
              ))}
              {(bekleyenIslemler.pendingOvertimes || []).length === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Bekleyen mesai talebi yok</p>
              )}
            </Widget>

            <Widget title={`🏖️ İzin Talepleri (${bekleyenIslemler.counts?.leaves ?? 0})`}>
              {(bekleyenIslemler.pendingLeaves || []).slice(0, 5).map((l: any) => (
                <ListItem
                  key={l.id}
                  title={l.userName}
                  meta={`${l.startDate} → ${l.endDate} (${l.totalDays} gün)`}
                  priority="📅"
                  priorityColor="#60a5fa"
                  onClick={() => window.location.href = `/izin-talepleri?id=${l.id}`}
                />
              ))}
              {(bekleyenIslemler.pendingLeaves || []).length === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Bekleyen izin talebi yok</p>
              )}
            </Widget>

            <Widget title={`📊 Bordro Onayları (${bekleyenIslemler.counts?.payrolls ?? 0})`}>
              {(bekleyenIslemler.draftPayrolls || []).slice(0, 5).map((p: any) => (
                <ListItem
                  key={p.id}
                  title={p.userName}
                  meta={`${p.year}/${String(p.month).padStart(2, '0')} • ₺${(p.totalSalary || 0).toLocaleString('tr-TR')}`}
                  priority="💰"
                  priorityColor="#10b981"
                  onClick={() => window.location.href = `/bordro?id=${p.id}`}
                />
              ))}
              {(bekleyenIslemler.draftPayrolls || []).length === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Onay bekleyen bordro yok</p>
              )}
            </Widget>
          </div>
        </div>
      )}

      {/* Sprint 3 (5 May): ANORMALLIKLER - Sprint 6 Bölüm 4: tıklanabilir ListItem'lar */}
      {anormallikler && totalAnomalies > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-red-500">🚨 Anormallikler ({totalAnomalies})</h3>
            <span className="text-[10px] text-muted-foreground">Personele tıkla → detayı gör</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Widget title={`⏱️ Açık Vardıyalar (${anormallikler.openShifts?.total ?? 0})`}>
              {[...(anormallikler.openShifts?.branch || []), ...(anormallikler.openShifts?.factory || [])].slice(0, 5).map((s: any) => (
                <Link key={`shift-${s.id}`} href={`/personel-detay/${s.userId}?tab=attendance`}>
                  <div className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors">
                    <ListItem
                      title={s.userName}
                      meta={`${Math.floor(s.hoursOpen)} saat açık →`}
                      priority="!"
                      priorityColor="#f87171"
                    />
                  </div>
                </Link>
              ))}
              {anormallikler.openShifts?.total === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Açık vardiya yok ✅</p>
              )}
            </Widget>

            <Widget title={`👤 Devamsız Personel (${anormallikler.absentUsers?.total ?? 0})`}>
              <p className="text-[10px] text-muted-foreground px-3 pt-2">
                {anormallikler.absentUsers?.threshold || 3}+ gün giriş yapmamış
              </p>
              {(anormallikler.absentUsers?.list || []).slice(0, 5).map((u: any) => (
                <Link key={`absent-${u.user_id}`} href={`/personel-detay/${u.user_id}?tab=attendance`}>
                  <div className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors">
                    <ListItem
                      title={u.user_name}
                      meta={`${u.days_absent} gün devamsız →`}
                      priority="⚠"
                      priorityColor="#fbbf24"
                    />
                  </div>
                </Link>
              ))}
              {anormallikler.absentUsers?.total === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Devamsız personel yok ✅</p>
              )}
            </Widget>

            <Widget title={`💼 Eksik Bordrolar (${anormallikler.missingPayrolls?.total ?? 0})`}>
              <p className="text-[10px] text-muted-foreground px-3 pt-2">
                {anormallikler.missingPayrolls?.period} dönemi için hesaplanmamış
              </p>
              {(anormallikler.missingPayrolls?.list || []).slice(0, 5).map((p: any) => (
                <Link key={`missing-${p.userId}`} href={`/personel-detay/${p.userId}?tab=attendance`}>
                  <div className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors">
                    <ListItem
                      title={p.userName}
                      meta={`${p.role} →`}
                      priority="!"
                      priorityColor="#f87171"
                    />
                  </div>
                </Link>
              ))}
              {anormallikler.missingPayrolls?.total === 0 && (
                <p className="text-[10px] text-muted-foreground px-3 py-3">Tüm bordrolar tamam ✅</p>
              )}
            </Widget>
          </div>
        </div>
      )}

      {/* Mevcut widget'lar — eski API'ler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MiniStats title="💰 Merkez Giderler" rows={[
          { label: "Toplam kira", value: financeData?.totalRent ?? "—" },
          { label: "Stok maliyeti", value: financeData?.stockCost ?? "—", color: "#fbbf24" },
          { label: "Satınalma raporu", value: "bağlantı →", color: "#60a5fa" },
        ]} linkText="Satınalma →" onLink={() => window.location.href = "/satinalma-centrum"} />
        <MiniStats title="📊 Diğer Şubeler Bordro" rows={[
          { label: "Toplam bordro", value: financeData?.totalBranchPayroll ?? "—" },
          { label: "Onay bekleyen", value: financeData?.pendingApproval ?? "—", color: "#fbbf24" },
          { label: "Sözleşme biten", value: financeData?.expiringContracts ?? "—", color: "#f87171" },
        ]} onLink={() => window.location.href = "/ik"} />
      </div>
    </CentrumShell>
  );
}
