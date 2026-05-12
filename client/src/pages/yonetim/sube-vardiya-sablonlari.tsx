// Sprint 20.1 (Aslan 12 May 2026): Şube Vardiya Şablonları Yönetimi
// HQ admin/ceo/cgo/mudur şube spesifik şift şablonlarını CRUD ile yönetir
// Backend endpoint: PATCH /api/branches/:id/shift-templates (Sprint 20'de eklendi)
// Tek truth source: branches.shift_templates JSONB

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, RotateCcw, Clock, Building2, Loader2 } from "lucide-react";

interface ShiftTemplate {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
}

interface Branch {
  id: number;
  name: string;
  openingHours?: string;
  closingHours?: string;
  shiftTemplates?: ShiftTemplate[];
}

const COLOR_OPTIONS = [
  { value: "yellow", label: "🟡 Sarı (Sabah)", className: "bg-yellow-500" },
  { value: "blue", label: "🔵 Mavi (Öğle)", className: "bg-blue-500" },
  { value: "pink", label: "🩷 Pembe (Akşam)", className: "bg-pink-500" },
  { value: "green", label: "🟢 Yeşil", className: "bg-green-500" },
  { value: "purple", label: "🟣 Mor", className: "bg-purple-500" },
  { value: "orange", label: "🟠 Turuncu", className: "bg-orange-500" },
  { value: "indigo", label: "🔷 İndigo", className: "bg-indigo-500" },
];

const DEFAULT_TEMPLATE: ShiftTemplate = {
  id: "",
  label: "",
  startTime: "08:00",
  endTime: "17:00",
  color: "blue",
  isActive: true,
};

export default function SubeVardiyaSablonlari() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Şube listesi
  const branchesQuery = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Şubeler getirilemedi");
      return res.json();
    },
  });

  // Seçili şube detayı
  const branchQuery = useQuery<Branch>({
    queryKey: ["/api/branches", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${selectedBranchId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Şube bilgisi alınamadı");
      return res.json();
    },
    enabled: !!selectedBranchId,
  });

  // Şube değişince templates state'ini yükle
  useEffect(() => {
    if (branchQuery.data?.shiftTemplates) {
      setTemplates(branchQuery.data.shiftTemplates);
      setHasChanges(false);
    } else if (branchQuery.data) {
      setTemplates([]);
      setHasChanges(false);
    }
  }, [branchQuery.data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) throw new Error("Şube seçili değil");
      const res = await fetch(
        `/api/branches/${selectedBranchId}/shift-templates`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shiftTemplates: templates }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Kayıt başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Şablonlar kaydedildi",
        description: "Şubeniz için vardiya şablonları güncellendi.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/branches", selectedBranchId],
      });
      setHasChanges(false);
    },
    onError: (err: any) => {
      toast({
        title: "❌ Kayıt hatası",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const branchOpeningHours = useMemo(
    () => (branchQuery.data?.openingHours || "08:00").toString().slice(0, 5),
    [branchQuery.data]
  );
  const branchClosingHours = useMemo(
    () => (branchQuery.data?.closingHours || "22:00").toString().slice(0, 5),
    [branchQuery.data]
  );

  const addTemplate = () => {
    const newId = `custom_${Date.now()}`;
    setTemplates([
      ...templates,
      { ...DEFAULT_TEMPLATE, id: newId, label: "Yeni Şablon" },
    ]);
    setHasChanges(true);
  };

  const updateTemplate = (
    index: number,
    field: keyof ShiftTemplate,
    value: any
  ) => {
    const updated = [...templates];
    updated[index] = { ...updated[index], [field]: value };
    setTemplates(updated);
    setHasChanges(true);
  };

  const removeTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setTemplates([
      {
        id: "morning",
        label: "Sabah Açılış",
        startTime: "08:00",
        endTime: "17:00",
        color: "yellow",
        isActive: true,
      },
      {
        id: "mid",
        label: "Öğle",
        startTime: "11:00",
        endTime: "20:00",
        color: "blue",
        isActive: true,
      },
      {
        id: "evening",
        label: "Akşam Kapanış",
        startTime: "14:00",
        endTime: "22:00",
        color: "pink",
        isActive: true,
      },
    ]);
    setHasChanges(true);
    toast({ title: "Varsayılan şablonlar yüklendi" });
  };

  const validateAndSave = () => {
    // Validation
    for (const t of templates) {
      if (!t.label.trim()) {
        toast({
          title: "⚠️ Eksik bilgi",
          description: "Tüm şablonların adı (label) olmalı",
          variant: "destructive",
        });
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(t.startTime) || !/^\d{2}:\d{2}$/.test(t.endTime)) {
        toast({
          title: "⚠️ Geçersiz saat formatı",
          description: `${t.label}: HH:MM formatında olmalı`,
          variant: "destructive",
        });
        return;
      }
      if (t.startTime < branchOpeningHours) {
        toast({
          title: "⚠️ Başlangıç şube açılışından önce",
          description: `${t.label}: ${t.startTime} < şube ${branchOpeningHours}`,
          variant: "destructive",
        });
        return;
      }
      if (t.endTime > branchClosingHours) {
        toast({
          title: "⚠️ Bitiş şube kapanışından sonra",
          description: `${t.label}: ${t.endTime} > şube ${branchClosingHours}`,
          variant: "destructive",
        });
        return;
      }
      if (t.endTime <= t.startTime) {
        toast({
          title: "⚠️ Bitiş başlangıçtan önce",
          description: `${t.label}`,
          variant: "destructive",
        });
        return;
      }
    }
    // Unique ID check
    const ids = templates.map((t) => t.id);
    if (new Set(ids).size !== ids.length) {
      toast({
        title: "⚠️ Çakışan id",
        description: "Tüm şablonların id'si benzersiz olmalı",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  const branches = branchesQuery.data || [];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8" />
          Şube Vardiya Şablonları
        </h1>
        <p className="text-muted-foreground mt-1">
          HQ admin şube spesifik şift şablonlarını yönetir. Kiosk vardiya
          planlama bu şablonları kullanır.
        </p>
      </div>

      {/* Şube Seçici */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Şube Seç
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedBranchId?.toString() || ""}
            onValueChange={(v) => setSelectedBranchId(parseInt(v))}
          >
            <SelectTrigger data-testid="branch-selector">
              <SelectValue placeholder="Şube seçin..." />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  #{b.id} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBranchId && branchQuery.isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              Şube bilgileri yükleniyor...
            </p>
          </CardContent>
        </Card>
      )}

      {selectedBranchId && branchQuery.data && (
        <>
          {/* Şube saatleri */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">
                Şube Çalışma Saatleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <strong>Açılış:</strong> {branchOpeningHours} •{" "}
                <strong>Kapanış:</strong> {branchClosingHours}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Şablonlar bu saat aralığında olmalı. Şube saatleri değiştirilmek
                istenirse Şube Listesi sayfasından düzenle.
              </p>
            </CardContent>
          </Card>

          {/* Şablonlar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Vardiya Şablonları ({templates.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaults}
                    data-testid="btn-reset-defaults"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Varsayılan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTemplate}
                    data-testid="btn-add-template"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Yeni
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Henüz şablon yok. "Varsayılan" veya "Yeni" ile başla.
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="border rounded-lg p-4 space-y-3"
                      data-testid={`template-row-${idx}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">ID (benzersiz)</Label>
                          <Input
                            value={t.id}
                            onChange={(e) =>
                              updateTemplate(idx, "id", e.target.value)
                            }
                            placeholder="örn: morning, mid, evening"
                            data-testid={`input-id-${idx}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Etiket (gösterilen)</Label>
                          <Input
                            value={t.label}
                            onChange={(e) =>
                              updateTemplate(idx, "label", e.target.value)
                            }
                            placeholder="örn: Sabah Açılış"
                            data-testid={`input-label-${idx}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Başlangıç</Label>
                          <Input
                            type="time"
                            value={t.startTime}
                            onChange={(e) =>
                              updateTemplate(idx, "startTime", e.target.value)
                            }
                            data-testid={`input-start-${idx}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bitiş</Label>
                          <Input
                            type="time"
                            value={t.endTime}
                            onChange={(e) =>
                              updateTemplate(idx, "endTime", e.target.value)
                            }
                            data-testid={`input-end-${idx}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Renk</Label>
                          <Select
                            value={t.color}
                            onValueChange={(v) =>
                              updateTemplate(idx, "color", v)
                            }
                          >
                            <SelectTrigger data-testid={`select-color-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLOR_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Durum</Label>
                          <Select
                            value={t.isActive ? "active" : "inactive"}
                            onValueChange={(v) =>
                              updateTemplate(idx, "isActive", v === "active")
                            }
                          >
                            <SelectTrigger data-testid={`select-active-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">✅ Aktif</SelectItem>
                              <SelectItem value="inactive">⏸️ Pasif</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              COLOR_OPTIONS.find((c) => c.value === t.color)
                                ?.className || "bg-blue-500"
                            }`}
                          />
                          Önizleme: {t.label} ({t.startTime}-{t.endTime})
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTemplate(idx)}
                          data-testid={`btn-remove-${idx}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Sil
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save bar */}
              {hasChanges && (
                <div className="mt-6 sticky bottom-4 bg-background border rounded-lg p-4 shadow-lg flex items-center justify-between">
                  <div className="text-sm text-yellow-600">
                    ⚠️ Kaydedilmemiş değişiklikler var
                  </div>
                  <Button
                    onClick={validateAndSave}
                    disabled={saveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="btn-save-templates"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Kaydet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
