/**
 * KVKK Denetim Merkezi - Admin Sayfası
 *
 * URL: /kvkk-denetim
 *
 * Özellikler:
 * - Tüm onayların listesi (filtre + search)
 * - Onay yüzdesi + özet kart
 * - Tek tıkla PDF sertifika indirme (her kullanıcı için)
 * - Toplu PDF rapor indirme (devlet denetiminde sun)
 * - Onaylanmamış kullanıcıların listesi
 *
 * Yetki: admin, ceo, cgo, muhasebe_ik, owner
 *
 * Aslan 10 May 2026 talebi.
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Download,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Calendar,
} from "lucide-react";

export default function KvkkDenetim() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState<string>("all");

  // Tüm onaylar
  const { data: auditData, isLoading } = useQuery<any>({
    queryKey: ["/api/kvkk/audit/all-approvals", versionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (versionFilter !== "all") params.set("version", versionFilter);
      const r = await fetch(
        `/api/kvkk/audit/all-approvals?${params.toString()}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("Onaylar alınamadı");
      return r.json();
    },
  });

  // Aktif policy
  const { data: activePolicy } = useQuery<any>({
    queryKey: ["/api/kvkk/policy/active"],
    queryFn: async () => {
      const r = await fetch("/api/kvkk/policy/active");
      if (!r.ok) return null;
      return r.json();
    },
  });

  const approvals = auditData?.approvals || [];
  const summary = auditData?.summary || { totalApprovals: 0, uniqueUsers: 0, versions: [] };

  // Filtreleme
  const filteredApprovals = approvals.filter((a: any) =>
    search === ""
      ? true
      : a.userName?.toLowerCase().includes(search.toLowerCase()) ||
        a.userRole?.toLowerCase().includes(search.toLowerCase())
  );

  // PDF indir — tek kişi
  const downloadCertificate = async (userId: string, userName: string) => {
    try {
      toast({ title: "PDF hazırlanıyor..." });
      const r = await fetch(`/api/kvkk/audit/user/${userId}/certificate`, {
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "PDF alınamadı");
      }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KVKK-Onay-${userName.replace(/\s/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "✅ İndirildi",
        description: "Denetimde sunulabilir, devlet görevlisi için hazır",
      });
    } catch (e: any) {
      toast({
        title: "❌ Hata",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  // Toplu rapor indir
  const downloadSummaryReport = async () => {
    try {
      toast({ title: "Toplu rapor hazırlanıyor..." });
      const r = await fetch("/api/kvkk/audit/summary-report", {
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Rapor alınamadı");
      }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KVKK-Toplu-Rapor-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "✅ Toplu rapor indirildi",
        description: "Devlet denetiminde sunulabilir",
      });
    } catch (e: any) {
      toast({
        title: "❌ Hata",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      {/* Başlık */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#192838] dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#C0392B]" />
            KVKK Denetim Merkezi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Devlet denetiminde sunulacak onay belgeleri ve raporlar
          </p>
        </div>
        <Button
          onClick={downloadSummaryReport}
          className="bg-[#C0392B] hover:bg-[#A0322B] gap-2"
        >
          <Download className="w-4 h-4" />
          📊 Toplu PDF Raporu İndir
        </Button>
      </div>

      {/* Yasal not */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Yasal Dayanak
              </p>
              <ul className="mt-1 text-blue-800 dark:text-blue-200 space-y-0.5 text-xs">
                <li>• 6698 sayılı KVKK m.10 — Aydınlatma Yükümlülüğü</li>
                <li>• Aydınlatma Yükümlülüğü Tebliği (RG 10.03.2018/30356)</li>
                <li>• Veri işleme dayanağı: KVKK m.5/2-c (Sözleşmenin ifası)</li>
                <li>• Saklama süresi: 10 yıl (SGK m.86 + İş K. m.75)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Toplam Onay</p>
                <p className="text-3xl font-bold">{summary.totalApprovals}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Onaylayan Kişi</p>
                <p className="text-3xl font-bold text-green-600">
                  {summary.uniqueUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Aktif Versiyon</p>
                <p className="text-2xl font-bold text-[#C0392B]">
                  {activePolicy?.version || "—"}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Versiyon Sayısı</p>
                <p className="text-3xl font-bold">
                  {summary.versions?.length || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter ve arama */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Çalışan adı veya görev ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="px-3 py-2 border rounded-md dark:bg-gray-900"
            >
              <option value="all">Tüm Versiyonlar</option>
              {summary.versions?.map((v: string) => (
                <option key={v} value={v}>
                  Versiyon {v}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Onaylar listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Onay Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Onay kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#192838] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Çalışan</th>
                    <th className="px-3 py-2 text-left">Görev</th>
                    <th className="px-3 py-2 text-left">Onay Tarihi</th>
                    <th className="px-3 py-2 text-left">Versiyon</th>
                    <th className="px-3 py-2 text-left">Yöntem</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map((a: any) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-3 font-medium">
                        {a.userName || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        <Badge variant="outline" className="text-xs">
                          {a.userRole || "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs font-mono">
                        {new Date(a.approvedAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className="bg-blue-100 text-blue-700">
                          {a.policyVersion}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {a.approvalMethod === "kiosk_pin" && "🏪 Kiosk"}
                        {a.approvalMethod === "mobile_app" && "📱 Mobil"}
                        {a.approvalMethod === "web_dashboard" && "💻 Web"}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono text-gray-500">
                        {a.ipAddress || "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            downloadCertificate(a.userId, a.userName)
                          }
                          className="gap-1"
                          title="PDF sertifika indir (denetim için)"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devlet denetim rehberi */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-700" />
            Devlet Denetimi Rehberi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 text-yellow-900 dark:text-yellow-100">
            <p>
              <b>KVKK Kurulu denetçisi geldiğinde sunabilecekleriniz:</b>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <b>Toplu PDF Raporu</b> — Tüm çalışanların onay durumu (yukarıdaki buton)
              </li>
              <li>
                <b>Tek Kişilik Sertifika</b> — Her onaylanan kişi için PDF (tabloda PDF butonu)
              </li>
              <li>
                <b>Audit Trail</b> — IP adresi, zaman damgası, cihaz bilgisi (delil)
              </li>
              <li>
                <b>Versiyon Geçmişi</b> — Eski politika metinleri DB'de arşivli
              </li>
            </ul>
            <p className="mt-3 text-xs italic">
              ⚖️ KVKK m.5/2-c gereği iş sözleşmesinin ifası için veri işleme zorunludur,
              açık rıza GEREKMEZ. Bu sistemde sadece "aydınlatma metni okundu/anlaşıldı" beyanı kaydedilir.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
