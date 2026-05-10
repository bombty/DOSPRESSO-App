/**
 * Şube Müdürü — Ekipman Yönetimi
 *
 * Şube müdürü kendi şubesinin ekipmanlarını:
 * 1. Excel ile toplu yükleyebilir
 * 2. Tek tek dashboard'dan ekleyebilir/düzenleyebilir
 *
 * Aslan 10 May 2026 talebi.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Calendar,
  Phone,
  ChevronRight,
} from "lucide-react";

const EQUIPMENT_LABELS: Record<string, string> = {
  espresso: "Espresso Makinesi",
  krema: "Krema Makinesi",
  mixer: "Bar Mikseri",
  blender: "Blender",
  cash: "Kasa Sistemi",
  kiosk: "Kiosk Sistemi",
  tea: "Çay Makinesi",
  ice: "Buz Makinesi",
  filtre_kahve: "Filtre Kahve Makinesi",
  turk_kahve: "Türk Kahvesi Makinesi",
  donut_teshir: "Donut Teşhir Dolabı",
  positive_teshir: "+4 Teşhir Dolabı",
  notr_teshir: "Nötr Teşhir Dolabı",
  teshir_set: "Teşhir Dolabı Set",
  firin: "Fırın",
  hizli_firin: "Hızlı Fırın",
  tost: "Tost Makinesi",
};

export default function SubeEkipmanYonetimi() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kendi şubemin durumu
  const { data: myStatus } = useQuery<any>({
    queryKey: ["/api/branch/my/data-status"],
    queryFn: async () => {
      const r = await fetch("/api/branch/my/data-status", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Durum alınamadı");
      return r.json();
    },
  });

  const branchId = myStatus?.branch?.id;
  const branchName = myStatus?.branch?.name || "Şubem";

  // Ekipman listesi
  const { data: equipmentData, isLoading: equipLoading } = useQuery<any>({
    queryKey: ["/api/branches", branchId, "equipment"],
    queryFn: async () => {
      if (!branchId) return { equipment: [] };
      const r = await fetch(`/api/branches/${branchId}/equipment`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Ekipman listesi alınamadı");
      return r.json();
    },
    enabled: !!branchId,
  });

  // Template indir
  const handleDownloadTemplate = async () => {
    if (!branchId) return;
    try {
      toast({ title: "Template hazırlanıyor..." });
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
        description: "Excel'i doldur, sonra 'Yükle' butonuyla geri yolla",
      });
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
    mutationFn: async (file: File) => {
      if (!branchId) throw new Error("Şube ID yok");
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
        queryKey: ["/api/branch/my/data-status"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/branches", branchId, "equipment"],
      });
      setUploadOpen(false);
    },
    onError: (e: any) => {
      toast({
        title: "❌ Yükleme hatası",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  if (!branchId) {
    return (
      <div className="p-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const equipment = equipmentData?.equipment ?? [];
  const status = myStatus?.status;

  // Bakım yaklaşan ekipmanlar (14 gün içinde)
  const upcomingMaintenance = equipment.filter((e: any) => {
    if (!e.nextMaintenanceDate) return false;
    const next = new Date(e.nextMaintenanceDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft >= 0 && daysLeft <= 14;
  });

  const overdue = equipment.filter((e: any) => {
    if (!e.nextMaintenanceDate) return false;
    return new Date(e.nextMaintenanceDate) < new Date();
  });

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#192838] dark:text-white">
          🔧 Ekipman Yönetimi
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {branchName} şubesi ekipman bilgileri
        </p>
      </div>

      {/* Durum + Excel Butonları */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <p className="text-sm text-gray-600">Toplam Ekipman</p>
              <p className="text-3xl font-bold">{equipment.length}</p>
              {status?.completionPercentage !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Tamamlanma: {status.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${status.completionPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Excel Template İndir
              </Button>
              <Button
                onClick={() => setUploadOpen(true)}
                className="bg-[#C0392B] hover:bg-[#A0322B] gap-2"
              >
                <Upload className="w-4 h-4" />
                Doldurulmuş Excel Yükle
              </Button>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Aktif: {equipment.filter((e: any) => e.isActive).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Bakım yaklaşan: {upcomingMaintenance.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Bakım gecikti: {overdue.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bakım Uyarıları */}
      {(upcomingMaintenance.length > 0 || overdue.length > 0) && (
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Bakım Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length > 0 && (
              <div className="mb-3">
                <p className="font-medium text-red-600 mb-1">
                  ⚠️ Gecikmiş Bakım ({overdue.length}):
                </p>
                <ul className="text-sm space-y-1">
                  {overdue.map((e: any) => (
                    <li key={e.id} className="text-red-700">
                      • {EQUIPMENT_LABELS[e.equipmentType] || e.equipmentType} —{" "}
                      {new Date(e.nextMaintenanceDate).toLocaleDateString("tr-TR")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {upcomingMaintenance.length > 0 && (
              <div>
                <p className="font-medium text-orange-600 mb-1">
                  📅 Yaklaşan Bakım (14 gün, {upcomingMaintenance.length}):
                </p>
                <ul className="text-sm space-y-1">
                  {upcomingMaintenance.map((e: any) => {
                    const daysLeft = Math.ceil(
                      (new Date(e.nextMaintenanceDate).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <li key={e.id} className="text-orange-700">
                        • {EQUIPMENT_LABELS[e.equipmentType] || e.equipmentType}{" "}
                        — {daysLeft} gün sonra
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ekipman Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Ekipman Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {equipLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : equipment.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Henüz ekipman kaydı yok</p>
              <p className="text-sm text-gray-400 mt-1">
                Excel template indir, doldur, yükle
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipment.map((e: any) => (
                <Card key={e.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium">
                        {EQUIPMENT_LABELS[e.equipmentType] || e.equipmentType}
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                        {e.modelNo && <p>Model: {e.modelNo}</p>}
                        {e.serialNumber && <p>Seri: {e.serialNumber}</p>}
                        {e.warrantyEndDate && (
                          <p className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Garanti:{" "}
                            {new Date(e.warrantyEndDate).toLocaleDateString(
                              "tr-TR"
                            )}
                          </p>
                        )}
                        {e.nextMaintenanceDate && (
                          <p className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Sonraki bakım:{" "}
                            {new Date(e.nextMaintenanceDate).toLocaleDateString(
                              "tr-TR"
                            )}
                          </p>
                        )}
                        {e.serviceContactPhone && (
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Servis: {e.serviceContactName} —{" "}
                            {e.serviceContactPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={e.isActive ? "default" : "secondary"}>
                      {e.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yükleme Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📤 Excel Yükle</DialogTitle>
            <DialogDescription>
              Doldurduğun Excel dosyasını yükle. Sistem otomatik parse edecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
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
    </div>
  );
}
