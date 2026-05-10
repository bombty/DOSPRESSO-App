/**
 * KVKK Haklarım — Veri Sahibi Talep Sayfası (KVKK m.11)
 *
 * Tüm çalışanlar erişebilir. Kendi verileri hakkında talep gönderir:
 *   - Bilgi
 *   - Düzeltme
 *   - Silme/Yok edilme
 *   - 3. kişilere bildirim
 *   - Otomatik analize itiraz
 *   - Tazminat
 *
 * URL: /kvkk-haklarim
 *
 * Aslan 10 May 2026
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send,
} from "lucide-react";

const REQUEST_TYPES = [
  {
    value: "info",
    label: "📋 Bilgi Talebi",
    description: "Verilerimin işlenip işlenmediğini, nerede saklandığını öğrenmek istiyorum",
  },
  {
    value: "correction",
    label: "✏️ Düzeltme",
    description: "Verilerim eksik veya yanlış, düzeltilsin",
  },
  {
    value: "deletion",
    label: "🗑️ Silme/Yok Etme",
    description: "Verilerimin silinmesini istiyorum",
  },
  {
    value: "notification",
    label: "📣 3. Kişilere Bildirim",
    description: "Düzeltme/silme talebimin aktarıldığı 3. kişilere bildirilmesini istiyorum",
  },
  {
    value: "objection",
    label: "⚖️ İtiraz (Otomatik Analiz)",
    description: "Otomatik sistemle aleyhime sonuç çıkmasına itiraz ediyorum",
  },
  {
    value: "compensation",
    label: "💰 Tazminat",
    description: "Verilerimin işlenmesinden zarara uğradım, tazminat istiyorum",
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received: { label: "Alındı", color: "bg-blue-500" },
  in_review: { label: "İncelemede", color: "bg-yellow-500" },
  additional_info: { label: "Ek Bilgi İsteniyor", color: "bg-orange-500" },
  approved: { label: "Kabul Edildi", color: "bg-green-500" },
  completed: { label: "Tamamlandı", color: "bg-green-700" },
  rejected: { label: "Reddedildi", color: "bg-red-500" },
  partial: { label: "Kısmen Yerine Getirildi", color: "bg-purple-500" },
};

export default function KvkkHaklarim() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterTcNo: "",
    requestType: "",
    requestDescription: "",
    dataCategory: "",
  });

  // Kendi taleplerim
  const { data: myData, isLoading } = useQuery<any>({
    queryKey: ["/api/kvkk/requests/my"],
    queryFn: async () => {
      const r = await fetch("/api/kvkk/requests/my", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Talepler alınamadı");
      return r.json();
    },
  });

  // Talep gönder
  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/kvkk/requests/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Talep gönderilemedi");
      }
      return r.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Talebiniz alındı",
        description: data.request.message,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/kvkk/requests/my"],
      });
      setSubmitOpen(false);
      setForm({
        requesterName: "",
        requesterEmail: "",
        requesterPhone: "",
        requesterTcNo: "",
        requestType: "",
        requestDescription: "",
        dataCategory: "",
      });
    },
    onError: (e: any) => {
      toast({
        title: "❌ Hata",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const requests = myData?.requests || [];

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#192838] dark:text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-[#C0392B]" />
          KVKK Haklarım
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          6698 sayılı KVKK m.11 — kişisel verileriniz hakkında talepleriniz
        </p>
      </div>

      {/* Yasal bilgilendirme */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Haklarınız (KVKK m.11)
              </p>
              <ul className="mt-2 text-blue-800 dark:text-blue-200 space-y-0.5 text-xs list-disc list-inside">
                <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>Bilgi talep etme</li>
                <li>İşlenme amacını öğrenme</li>
                <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
                <li>Kanun şartlarına göre silinmesini/yok edilmesini isteme</li>
                <li>3. kişilere bildirilmesini isteme</li>
                <li>Otomatik analiz sonucuna itiraz etme</li>
                <li>Zarara uğradıysanız tazminat talep etme</li>
              </ul>
              <p className="mt-2 text-xs font-semibold">
                ⏰ Talepleriniz 30 gün içinde yanıtlanır (KVKK m.13)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yeni talep butonu */}
      <Button
        onClick={() => setSubmitOpen(true)}
        className="w-full bg-[#C0392B] hover:bg-[#A0322B] gap-2"
      >
        <Plus className="w-4 h-4" />
        Yeni Talep Oluştur
      </Button>

      {/* Geçmiş taleplerim */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Geçmiş Taleplerim</CardTitle>
          <CardDescription>
            Daha önce oluşturduğunuz talepler ve durumları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Henüz talep oluşturmadınız</p>
              <p className="text-xs text-gray-400 mt-1">
                Üstteki "Yeni Talep Oluştur" butonu ile başlayabilirsiniz
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r: any) => {
                const statusConfig =
                  STATUS_LABELS[r.status] || STATUS_LABELS.received;
                const typeConfig = REQUEST_TYPES.find(
                  (t) => t.value === r.requestType
                );
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div>
                          <p className="font-semibold">
                            {typeConfig?.label || r.requestType}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            #{r.id} •{" "}
                            {new Date(r.receivedAt).toLocaleString("tr-TR")}
                          </p>
                        </div>
                        <Badge className={statusConfig.color + " text-white"}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <p className="text-sm mt-2">{r.requestDescription}</p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Son tarih:</span>{" "}
                          <span
                            className={
                              new Date(r.deadline) < new Date() &&
                              r.status !== "completed"
                                ? "text-red-600 font-bold"
                                : ""
                            }
                          >
                            {new Date(r.deadline).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        {r.respondedAt && (
                          <div>
                            <span className="text-gray-500">Yanıt:</span>{" "}
                            <span className="text-green-600">
                              ✅{" "}
                              {new Date(r.respondedAt).toLocaleDateString(
                                "tr-TR"
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {r.responseText && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
                          <p className="font-semibold text-xs text-gray-500 mb-1">
                            DOSPRESSO yanıtı:
                          </p>
                          <p>{r.responseText}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Talep oluşturma dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni KVKK Talebi</DialogTitle>
            <DialogDescription>
              KVKK m.11 kapsamında haklarınızı talep edin. 30 gün içinde yanıt
              verilir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Talep türü */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Talep Türü <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {REQUEST_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      setForm({ ...form, requestType: t.value })
                    }
                    className={`p-3 text-left rounded-md border-2 transition-all ${
                      form.requestType === t.value
                        ? "border-[#C0392B] bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Detaylı Açıklama <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={form.requestDescription}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requestDescription: e.target.value,
                  })
                }
                placeholder="Talebinizi detaylı açıklayın..."
                rows={4}
              />
            </div>

            {/* Veri kategorisi (opsiyonel) */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Hangi Veri Hakkında (opsiyonel)
              </label>
              <Input
                value={form.dataCategory}
                onChange={(e) =>
                  setForm({ ...form, dataCategory: e.target.value })
                }
                placeholder="örn: bordro, pdks kayıtları, mola süreleri..."
              />
            </div>

            {/* İletişim bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.requesterName}
                  onChange={(e) =>
                    setForm({ ...form, requesterName: e.target.value })
                  }
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  TC Kimlik No
                </label>
                <Input
                  value={form.requesterTcNo}
                  onChange={(e) =>
                    setForm({ ...form, requesterTcNo: e.target.value })
                  }
                  placeholder="11 haneli"
                  maxLength={11}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  E-posta
                </label>
                <Input
                  type="email"
                  value={form.requesterEmail}
                  onChange={(e) =>
                    setForm({ ...form, requesterEmail: e.target.value })
                  }
                  placeholder="ornek@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Telefon
                </label>
                <Input
                  value={form.requesterPhone}
                  onChange={(e) =>
                    setForm({ ...form, requesterPhone: e.target.value })
                  }
                  placeholder="05XX..."
                />
              </div>
            </div>

            {/* Gönder butonu */}
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={
                !form.requesterName ||
                !form.requestType ||
                !form.requestDescription ||
                submitMutation.isPending
              }
              className="w-full bg-[#C0392B] hover:bg-[#A0322B] gap-2"
            >
              <Send className="w-4 h-4" />
              {submitMutation.isPending
                ? "Gönderiliyor..."
                : "Talebimi Gönder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
