/**
 * CGO Şube Veri Toplama Sayfası
 *
 * 25 şube için Excel template indir/yükle akışı.
 * Aslan 10 May 2026 talebi.
 *
 * Yetki: cgo, ceo, admin, owner
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  FileSpreadsheet,
  Users,
  Settings,
  TrendingUp,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Status renkleri ve etiketleri
// ═══════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any; bgClass: string }
> = {
  not_started: {
    label: "Başlanmadı",
    color: "text-gray-600",
    icon: AlertCircle,
    bgClass: "bg-gray-100 dark:bg-gray-800",
  },
  template_downloaded: {
    label: "Template İndirildi",
    color: "text-blue-600",
    icon: Download,
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
  },
  in_progress: {
    label: "Doldu Doluyor",
    color: "text-orange-600",
    icon: Clock,
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
  },
  uploaded_pending_review: {
    label: "Yüklendi (İnceleme)",
    color: "text-purple-600",
    icon: Upload,
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
  },
  completed: {
    label: "Tamamlandı",
    color: "text-green-600",
    icon: CheckCircle2,
    bgClass: "bg-green-100 dark:bg-green-900/30",
  },
  outdated: {
    label: "Güncellenmeli",
    color: "text-yellow-600",
    icon: AlertCircle,
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
  },
};

// ═══════════════════════════════════════════════════════════════════
// Ana komponent
// ═══════════════════════════════════════════════════════════════════

export default function CgoSubeVeriToplama() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    branchId: number | null;
    branchName: string;
  }>({ open: false, branchId: null, branchName: "" });
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    branchId: number | null;
    branchName: string;
  }>({ open: false, branchId: null, branchName: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 25 şube + status
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/cgo/branch-data/status"],
    queryFn: async () => {
      const r = await fetch("/api/cgo/branch-data/status", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Status alınamadı");
      return r.json();
    },
  });

  // Template indirme
  const handleDownload = async (branchId: number, branchName: string) => {
    try {
      toast({
        title: "Template hazırlanıyor...",
        description: `${branchName} için Excel oluşturuluyor`,
      });

      const r = await fetch(`/api/cgo/branch-data/template/${branchId}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Template alınamadı");

      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dospresso-sube-veri-${branchName.replace(/\s/g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ İndirildi",
        description: `${branchName} template hazır. Şube müdürüne gönder.`,
      });
      refetch();
    } catch (e: any) {
      toast({
        title: "❌ Hata",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  // Excel yükleme
  const uploadMutation = useMutation({
    mutationFn: async ({ branchId, file }: { branchId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const r = await fetch(`/api/cgo/branch-data/upload/${branchId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Yükleme başarısız");
      }
      return r.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Yüklendi",
        description: `${data.summary.totalPersonnel} personel + ${data.summary.totalEquipment} ekipman kaydedildi`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/cgo/branch-data/status"],
      });
      setUploadDialog({ open: false, branchId: null, branchName: "" });
    },
    onError: (e: any) => {
      toast({
        title: "❌ Yükleme hatası",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (file: File) => {
    if (!uploadDialog.branchId) return;
    uploadMutation.mutate({ branchId: uploadDialog.branchId, file });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const branches = data?.branches ?? [];
  const summary = data?.summary ?? {
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionRate: 0,
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold text-[#192838] dark:text-white">
          📋 Şube Veri Toplama
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          25 şubeden personel + ekipman bilgilerini Excel ile topla.
        </p>
      </div>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toplam Şube
                </p>
                <p className="text-3xl font-bold text-[#192838] dark:text-white">
                  {summary.total}
                </p>
              </div>
              <FileSpreadsheet className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tamamlanan
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {summary.completed}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Devam Eden
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {summary.inProgress}
                </p>
              </div>
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tamamlanma %
                </p>
                <p className="text-3xl font-bold text-[#C0392B]">
                  {summary.completionRate}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* İşlem Akışı (rehber) */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">📖 Nasıl Çalışır?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              Şube için <b>"📥 İndir"</b> tıkla → Excel template indirilir
            </li>
            <li>Şube müdürüne gönder (WhatsApp / email)</li>
            <li>Şube müdürü doldurur ve sana iade eder</li>
            <li>
              Şubenin satırında <b>"📤 Yükle"</b> tıkla → Excel'i seç →
              Sistem otomatik kaydeder
            </li>
            <li>
              Durum yeşil (✅ Tamamlandı) olur — şube hazırdır
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Şube Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>25 Şube Durum Tablosu</CardTitle>
          <CardDescription>
            Her şube için template indir, müdüre gönder, geri al, yükle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#192838] text-white">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Şube</th>
                  <th className="px-3 py-2 text-left">Tip</th>
                  <th className="px-3 py-2 text-left">Müdür</th>
                  <th className="px-3 py-2 text-center">Durum</th>
                  <th className="px-3 py-2 text-center">Personel</th>
                  <th className="px-3 py-2 text-center">Ekipman</th>
                  <th className="px-3 py-2 text-center">İlerleme</th>
                  <th className="px-3 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b: any) => {
                  const statusConfig =
                    STATUS_CONFIG[b.status] || STATUS_CONFIG.not_started;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr
                      key={b.branchId}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-3 font-mono text-xs">
                        #{b.branchId}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {b.branchName}
                        {b.city && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({b.city})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-xs">
                          {b.ownershipType === "hq" ? "HQ" : "Franchise"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                        {b.managerName || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded ${statusConfig.bgClass}`}
                        >
                          <StatusIcon
                            className={`w-3 h-3 ${statusConfig.color}`}
                          />
                          <span
                            className={`text-xs ${statusConfig.color} font-medium`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono">
                          {b.totalPersonnel || 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono">
                          {b.totalEquipment || 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{
                                width: `${b.completionPercentage || 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {b.completionPercentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownload(b.branchId, b.branchName)
                            }
                            title="Excel template indir"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              setUploadDialog({
                                open: true,
                                branchId: b.branchId,
                                branchName: b.branchName,
                              })
                            }
                            title="Doldurulmuş Excel yükle"
                            className="bg-[#C0392B] hover:bg-[#A0322B]"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setHistoryDialog({
                                open: true,
                                branchId: b.branchId,
                                branchName: b.branchName,
                              })
                            }
                            title="Yükleme geçmişi"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Yükleme Dialog */}
      <Dialog
        open={uploadDialog.open}
        onOpenChange={(open) =>
          setUploadDialog({ ...uploadDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📤 Excel Yükle — {uploadDialog.branchName}</DialogTitle>
            <DialogDescription>
              Şube müdüründen aldığın doldurulmuş Excel dosyasını yükle.
              Sistem otomatik parse edecek ve personel + ekipman tablolarına kaydedecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              disabled={uploadMutation.isPending}
            />
            {uploadMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="w-4 h-4 animate-spin" />
                Yükleniyor ve parse ediliyor...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Geçmiş Dialog */}
      <HistoryDialog
        open={historyDialog.open}
        branchId={historyDialog.branchId}
        branchName={historyDialog.branchName}
        onClose={() =>
          setHistoryDialog({ open: false, branchId: null, branchName: "" })
        }
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Geçmiş Dialog Komponenti
// ═══════════════════════════════════════════════════════════════════

function HistoryDialog({
  open,
  branchId,
  branchName,
  onClose,
}: {
  open: boolean;
  branchId: number | null;
  branchName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/cgo/branch-data/history", branchId],
    queryFn: async () => {
      if (!branchId) return { history: [] };
      const r = await fetch(
        `/api/cgo/branch-data/history/${branchId}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("Geçmiş alınamadı");
      return r.json();
    },
    enabled: open && !!branchId,
  });

  const history = data?.history ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📚 Yükleme Geçmişi — {branchName}</DialogTitle>
          <DialogDescription>
            Bu şubeye ait son 50 Excel yükleme kaydı
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading && (
            <Skeleton className="h-24 w-full" />
          )}
          {!isLoading && history.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Henüz yükleme yapılmadı
            </p>
          )}
          {history.map((h: any) => (
            <Card key={h.id} className="p-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{h.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {h.uploadedByName} ({h.uploadedByRole}) •{" "}
                    {new Date(h.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <Badge
                  variant={
                    h.status === "success"
                      ? "default"
                      : h.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {h.status}
                </Badge>
              </div>
              {h.status === "success" && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>
                      Personel: +{h.insertedPersonnelCount} yeni / ↻{" "}
                      {h.updatedPersonnelCount} güncellendi
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    <span>
                      Ekipman: +{h.insertedEquipmentCount} yeni / ↻{" "}
                      {h.updatedEquipmentCount} güncellendi
                    </span>
                  </div>
                </div>
              )}
              {h.processingTimeMs && (
                <p className="text-xs text-gray-400 mt-1">
                  ⏱ İşlem süresi: {(h.processingTimeMs / 1000).toFixed(2)}s
                </p>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
