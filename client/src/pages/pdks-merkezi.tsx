// ═══════════════════════════════════════════════════════════════════
// Sprint 15 (S15.2) — PDKS Merkezi Hub
// ═══════════════════════════════════════════════════════════════════
// D-44 Bağlam-İçi Tab Prensibi:
//   4 dağınık PDKS sayfası → 1 hub + sekmeler
//   - pdks.tsx              (Genel)
//   - pdks-manuel-giris.tsx (Manuel Giriş)
//   - pdks-excel-import.tsx (Excel Import)
//   - pdks-izin-gunleri.tsx (İzin Günleri)
//
// Eski sayfalar redirect ile korunur (link bozulmaz).
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileSpreadsheet, Calendar, Activity, AlertTriangle, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TAB_KEY = "pdks-merkezi-tab";

export default function PdksMerkeziPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "genel";
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("tab");
    if (fromQuery) return fromQuery;
    return sessionStorage.getItem(TAB_KEY) || "genel";
  });

  useEffect(() => {
    sessionStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  const isAuthorized = user?.role && [
    "admin", "ceo", "cgo", "muhasebe", "muhasebe_ik", "coach", "mudur", "supervisor"
  ].includes(user.role);

  // Haftalık 45h ihlal sayısı (eğer Mahmut için anlamlı bir uyarı)
  const { data: weeklyData } = useQuery<any>({
    queryKey: ["/api/pdks/weekly-check", user?.branchId],
    queryFn: async () => {
      if (!user?.branchId) return null;
      const weekStart = new Date();
      const dow = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() + (dow === 0 ? -6 : 1 - dow));
      const ws = weekStart.toISOString().split("T")[0];
      const res = await fetch(
        `/api/pdks/weekly-check?branchId=${user.branchId}&weekStart=${ws}`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.branchId && isAuthorized,
  });

  if (!isAuthorized) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Erişim yok
            </CardTitle>
            <CardDescription>
              PDKS Merkezi sadece HQ rolleri ve şube yöneticileri için açık.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleExcelExport = async () => {
    if (!user?.branchId) {
      toast({ title: "Şube seçilmedi", variant: "destructive" });
      return;
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const url = `/api/pdks/export.xlsx?branchId=${user.branchId}&startDate=${monthStart}&endDate=${monthEnd}`;
    window.open(url, "_blank");
    toast({ title: "Excel hazırlanıyor", description: "İndirme başlayacak." });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            PDKS Merkezi
          </h1>
          <p className="text-muted-foreground mt-1">
            Personel devam-takip yönetimi — tüm araçlar tek sayfada
          </p>
        </div>
        <Button onClick={handleExcelExport} className="gap-2">
          <Download className="h-4 w-4" />
          Bu Ayı Excel İndir
        </Button>
      </div>

      {/* Haftalık ihlal banner (Sprint 15 S15.3) */}
      {weeklyData?.violationCount > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  Bu hafta İş K. m.63 ihlali: {weeklyData.violationCount} personel
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  Fulltime 45h/parttime 30h üst sınırı aşılmış. Detay için Genel sekmesi.
                </p>
              </div>
              <Badge variant="destructive">{weeklyData.violationCount}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="genel" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Genel</span>
            <span className="sm:hidden">G</span>
          </TabsTrigger>
          <TabsTrigger value="manuel" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Manuel Giriş</span>
            <span className="sm:hidden">M</span>
          </TabsTrigger>
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel Import</span>
            <span className="sm:hidden">E</span>
          </TabsTrigger>
          <TabsTrigger value="izin" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">İzin Günleri</span>
            <span className="sm:hidden">İ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="genel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Genel PDKS</CardTitle>
              <CardDescription>
                Personel giriş-çıkış kayıtları, filtre + detay görünüm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation("/pdks")}>
                Eski PDKS sayfasını aç →
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Mevcut <code>/pdks</code> sayfası tüm özellikleriyle çalışıyor.
                Bu hub Sprint 16'da içeri tam taşıyacak.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manuel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manuel Giriş</CardTitle>
              <CardDescription>
                Sistem dışı tarihler için manuel kayıt + admin onay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation("/pdks-manuel-giris")}>
                Manuel Giriş sayfasını aç →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Excel Import</CardTitle>
              <CardDescription>
                Eski sistem (POS, fabrika kart) çıktısından PDKS aktarımı.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation("/pdks-excel-import")}>
                Excel Import sayfasını aç →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="izin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>İzin Günleri</CardTitle>
              <CardDescription>
                Tatil, izin, sağlık raporu, doğum izni vb. günlerin yönetimi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation("/pdks-izin-gunleri")}>
                İzin Günleri sayfasını aç →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
