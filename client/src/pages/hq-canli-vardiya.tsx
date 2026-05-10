/**
 * HQ Canlı Vardiya — Tüm Şubeler Tek Ekran
 *
 * ASLAN 10 MAY 2026:
 * 'HQ (CGO, Mahmut IK-muhasebe, Coach, Trainer) tüm şubelerin
 *  personel vardiya canlı görebilmeli'
 *
 * URL: /hq/canli-vardiya
 *
 * YETKİ: admin, ceo, cgo, owner, coach, trainer, muhasebe_ik, muhasebe
 *
 * ÖZELLİKLER:
 * - 25 şubenin canlı durumu (10sn refresh)
 * - Her şube için aktif/molada/ihlal sayıları
 * - İhlal varsa kırmızı vurgu + animate-pulse
 * - Şubeye tıklayınca personel detay drill-down
 * - Filter: durum, ihlal var/yok
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Activity,
  Users,
  Coffee,
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useLocation } from "wouter";

export default function HqCanliVardiya() {
  const [, navigate] = useLocation();
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "violations">("all");

  // Canlı veri (10sn refresh)
  const { data, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/hq/live-shifts"],
    queryFn: async () => {
      const r = await fetch("/api/hq/live-shifts", { credentials: "include" });
      if (!r.ok) throw new Error("Veri alınamadı");
      return r.json();
    },
    refetchInterval: 10000, // 10 saniye
  });

  // Saat sayacı (her saniye)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-32 w-full mt-4" />
        <Skeleton className="h-96 w-full mt-4" />
      </div>
    );
  }

  const branches = data?.branches || [];
  const summary = data?.summary || {
    totalBranches: 0,
    totalActive: 0,
    totalOnBreak: 0,
    totalViolations: 0,
    branchesWithViolations: 0,
  };

  // Filter
  const filtered = branches.filter((b: any) => {
    if (filter === "active") {
      return b.activeCount > 0 || b.onBreakCount > 0;
    }
    if (filter === "violations") {
      return b.violationCount > 0;
    }
    return true;
  });

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#192838] dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-[#C0392B]" />
            HQ Canlı Vardiya
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Tüm şubelerin canlı personel durumu —{" "}
            <span className="font-mono">
              {now.toLocaleTimeString("tr-TR")}
            </span>{" "}
            (10 saniyede bir yenilenir)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Toplam Şube</p>
                <p className="text-2xl font-bold">{summary.totalBranches}</p>
              </div>
              <Building2 className="w-7 h-7 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Çalışıyor</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.totalActive}
                </p>
              </div>
              <Users className="w-7 h-7 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Molada</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.totalOnBreak}
                </p>
              </div>
              <Coffee className="w-7 h-7 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            summary.totalViolations > 0
              ? "bg-red-50 dark:bg-red-900/20 border-red-300 animate-pulse"
              : ""
          }
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">İhlal (60+ dk)</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary.totalViolations}
                </p>
              </div>
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">İhlalli Şube</p>
                <p className="text-2xl font-bold">
                  {summary.branchesWithViolations}
                </p>
              </div>
              <TrendingUp className="w-7 h-7 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 mr-2">Filtre:</span>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tümü ({branches.length})
            </Button>
            <Button
              size="sm"
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => setFilter("active")}
            >
              Aktif Personeli Olan
            </Button>
            <Button
              size="sm"
              variant={filter === "violations" ? "destructive" : "outline"}
              onClick={() => setFilter("violations")}
            >
              ⚠️ Sadece İhlalli ({summary.branchesWithViolations})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Şube grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((b: any) => (
          <Card
            key={b.branchId}
            className={`cursor-pointer transition-all hover:scale-[1.02] ${
              b.violationCount > 0
                ? "border-red-500 bg-red-50/50 dark:bg-red-900/10 animate-pulse"
                : b.activeCount > 0
                ? "border-green-300 bg-green-50/30 dark:bg-green-900/10"
                : ""
            }`}
            onClick={() => setSelectedBranch(b)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{b.branchName}</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    #{b.branchId} • {b.city || "—"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {b.ownershipType === "hq" ? "HQ" : "Franchise"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Aktif</p>
                  <p className="text-2xl font-bold text-green-600">
                    {b.activeCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Molada</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {b.onBreakCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">İhlal</p>
                  <p
                    className={`text-2xl font-bold ${
                      b.violationCount > 0 ? "text-red-600" : "text-gray-300"
                    }`}
                  >
                    {b.violationCount}
                  </p>
                </div>
              </div>

              {/* Personel mini-list (ilk 3) */}
              {b.personnel.length > 0 && (
                <div className="mt-3 space-y-1">
                  {b.personnel.slice(0, 3).map((p: any) => (
                    <div
                      key={p.userId}
                      className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                        p.isViolation
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold"
                          : p.status === "on_break"
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-green-100 dark:bg-green-900/30"
                      }`}
                    >
                      <span>
                        {p.isViolation && "🚨 "}
                        {p.firstName} {p.lastName?.[0]}.
                      </span>
                      <span className="font-mono">
                        {p.status === "on_break"
                          ? `${p.currentBreakMinutes}/60 dk`
                          : p.status === "active"
                          ? "✅"
                          : ""}
                      </span>
                    </div>
                  ))}
                  {b.personnel.length > 3 && (
                    <p className="text-xs text-gray-400 text-center">
                      ... +{b.personnel.length - 3} kişi daha
                    </p>
                  )}
                </div>
              )}

              {b.personnel.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Şu an aktif personel yok
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">
            {filter === "violations"
              ? "✅ İhlal yok, harika!"
              : "Bu filtreye uyan şube yok"}
          </p>
        </Card>
      )}

      {/* Şube detay dialog */}
      <BranchDetailDialog
        branch={selectedBranch}
        onClose={() => setSelectedBranch(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Şube Detay Dialog
// ═══════════════════════════════════════════════════════════════════

function BranchDetailDialog({
  branch,
  onClose,
}: {
  branch: any | null;
  onClose: () => void;
}) {
  if (!branch) return null;

  return (
    <Dialog open={!!branch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {branch.branchName} - Canlı Personel
          </DialogTitle>
          <DialogDescription>
            #{branch.branchId} • {branch.city || "—"} •{" "}
            {branch.ownershipType === "hq" ? "HQ" : "Franchise"}
          </DialogDescription>
        </DialogHeader>

        {/* Özet */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {branch.activeCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Molada</p>
              <p className="text-2xl font-bold text-orange-600">
                {branch.onBreakCount}
              </p>
            </CardContent>
          </Card>
          <Card
            className={branch.violationCount > 0 ? "border-red-500" : ""}
          >
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">İhlal</p>
              <p
                className={`text-2xl font-bold ${
                  branch.violationCount > 0 ? "text-red-600" : "text-gray-300"
                }`}
              >
                {branch.violationCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personel listesi */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm">Personel</h3>
          {branch.personnel.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Şu an aktif personel yok
            </p>
          )}
          {branch.personnel.map((p: any) => (
            <Card
              key={p.userId}
              className={
                p.isViolation
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse"
                  : p.status === "on_break"
                  ? "border-orange-300"
                  : ""
              }
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        p.isViolation
                          ? "bg-red-600 animate-pulse"
                          : p.status === "on_break"
                          ? "bg-orange-600"
                          : "bg-green-600"
                      }`}
                    >
                      {p.firstName?.[0]}
                      {p.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{p.role}</p>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    {p.status === "active" && (
                      <Badge className="bg-green-600">✅ Çalışıyor</Badge>
                    )}
                    {p.status === "on_break" && !p.isViolation && (
                      <Badge className="bg-orange-600">
                        ☕ Molada {p.currentBreakMinutes}/60 dk
                      </Badge>
                    )}
                    {p.isViolation && (
                      <Badge className="bg-red-600 animate-pulse">
                        🚨 İHLAL {p.currentBreakMinutes}/60 dk (+
                        {p.currentBreakMinutes - 60}dk)
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {p.checkInTime && (
                    <p>
                      <Clock className="w-3 h-3 inline" /> Giriş:{" "}
                      {new Date(p.checkInTime).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  {p.totalBreakMinutesToday > 0 && (
                    <p>
                      <Coffee className="w-3 h-3 inline" /> Bugünkü toplam mola:{" "}
                      {p.totalBreakMinutesToday} dk
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
