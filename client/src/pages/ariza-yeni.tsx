import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { compressImage } from "@/lib/image-utils";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ArrowLeft, Upload, Loader2, CheckCircle2, Circle, ClipboardList, AlertCircle } from "lucide-react";
import type { Equipment, Branch, EquipmentTroubleshootingStep } from "@shared/schema";

const faultReportSchema = z.object({
  branchId: z.coerce.number().int().positive("Şube seçiniz"),
  equipmentId: z.coerce.number().int().optional(),
  equipmentName: z.string().min(3, "Ekipman adı en az 3 karakter olmalı"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
  priority: z.enum(["dusuk", "orta", "yuksek"]).default("orta"),
  immediateImpact: z.boolean().default(false),
  safetyHazard: z.boolean().default(false),
  symptoms: z.string().optional(),
  affectedAreas: z.string().optional(),
  partsIdentified: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

type FaultReportForm = z.infer<typeof faultReportSchema>;

export default function NewFaultReport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, { done: boolean; notes: string }>>({});
  const [troubleshootingPassed, setTroubleshootingPassed] = useState(false);
  
  // Parse URL parameters for QR code flow
  const urlParams = new URLSearchParams(searchString);
  const urlEquipmentId = urlParams.get("equipmentId");

  const { data: branches = [], isLoading: branchesLoading, isError, refetch } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const form = useForm<FaultReportForm>({
    resolver: zodResolver(faultReportSchema),
    defaultValues: {
      branchId: user?.branchId ? parseInt(String(user.branchId)) : undefined,
      equipmentId: undefined,
      equipmentName: "",
      description: "",
      priority: "orta",
      immediateImpact: false,
      safetyHazard: false,
      symptoms: "",
      affectedAreas: "",
      partsIdentified: "",
      notes: "",
      photoUrl: undefined,
    },
  });

  const watchedEquipmentId = form.watch("equipmentId");
  const selectedEq = equipment.find(eq => eq.id === watchedEquipmentId);
  const equipmentType = selectedEq?.equipmentType || "";

  const { data: troubleshootingSteps = [] } = useQuery<EquipmentTroubleshootingStep[]>({
    queryKey: ['/api/troubleshooting', equipmentType],
    enabled: !!equipmentType,
  });

  const hasTroubleshootingSteps = troubleshootingSteps.length > 0;
  const allStepsCompleted = hasTroubleshootingSteps && troubleshootingSteps.every(s => completedSteps[s.id]?.done);

  useEffect(() => {
    if (!hasTroubleshootingSteps) {
      setTroubleshootingPassed(true);
    } else {
      setTroubleshootingPassed(allStepsCompleted);
    }
  }, [hasTroubleshootingSteps, allStepsCompleted]);

  useEffect(() => {
    setCompletedSteps({});
    setTroubleshootingPassed(!hasTroubleshootingSteps);
  }, [equipmentType]);

  const createMutation = useMutation({
    mutationFn: async (data: FaultReportForm) => {
      const tsSteps = Object.entries(completedSteps)
        .filter(([, v]) => v.done)
        .map(([stepId, v]) => ({ stepId: parseInt(stepId), notes: v.notes || "" }));
      
      const response = await apiRequest("POST", "/api/faults", {
        branchId: data.branchId,
        equipmentId: data.equipmentId || null,
        equipmentName: data.equipmentName,
        description: data.description,
        priority: data.priority,
        status: "acik",
        photoUrl: data.photoUrl || null,
        faultReportDetails: {
          symptoms: data.symptoms?.split(",").map(s => s.trim()).filter(Boolean) || [],
          affectedAreas: data.affectedAreas?.split(",").map(a => a.trim()).filter(Boolean) || [],
          immediateImpact: data.immediateImpact,
          safetyHazard: data.safetyHazard,
          partsIdentified: data.partsIdentified?.split(",").map(p => p.trim()).filter(Boolean) || [],
          notes: data.notes || "",
        },
        currentStage: "bekliyor",
        priorityLevel: data.priority === "yuksek" ? "red" : data.priority === "dusuk" ? "green" : "yellow",
        troubleshootingCompleted: hasTroubleshootingSteps ? allStepsCompleted : true,
        completedTroubleshootingSteps: tsSteps,
      });
      return response as unknown as { id: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({
        title: "Başarılı",
        description: `Arıza #${data.id} raporlanmıştır. Hemen yönlendiriliyorsunuz...`,
      });
      setTimeout(() => {
        setLocation(`/ariza-detay/${data.id}`);
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Arıza raporlama başarısız oldu",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
      form.setValue("photoUrl", compressed);

      toast({
        title: "Başarılı",
        description: "Fotoğraf sıkıştırılıp yüklendi",
      });
    } catch (error) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setPhotoPreview(preview);
        form.setValue("photoUrl", preview);
      };
      reader.readAsDataURL(file);
      toast({
        title: "Uyarı",
        description: "Fotoğraf sıkıştırılamadı, orijinal yüklendi",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectedBranch = branches.find(b => b.id === form.watch("branchId"));

  // Auto-fill equipment when coming from QR code scan or when equipment is selected
  useEffect(() => {
    // QR code flow - URL has equipmentId parameter
    if (urlEquipmentId && equipment.length > 0) {
      const eqId = parseInt(urlEquipmentId);
      if (!isNaN(eqId)) {
        const eq = equipment.find(e => e.id === eqId);
        if (eq) {
          form.setValue("equipmentId", eqId);
          form.setValue("equipmentName", eq.equipmentType || "");
          if (eq.branchId) {
            form.setValue("branchId", eq.branchId);
          }
          toast({
            title: "Ekipman Seçildi",
            description: `${eq.equipmentType} - QR kod ile otomatik dolduruldu`,
          });
        } else {
          toast({
            title: "Uyarı",
            description: "QR koddaki ekipman bulunamadı",
            variant: "destructive",
          });
        }
      }
    }
  }, [urlEquipmentId, equipment]);

  // Update equipment name when user selects equipment from dropdown (not QR flow)
  useEffect(() => {
    const eqId = form.watch("equipmentId");
    if (eqId && !urlEquipmentId && selectedEq) {
      form.setValue("equipmentName", selectedEq.equipmentType || "");
    }
  }, [form.watch("equipmentId"), selectedEq, urlEquipmentId]);

  if (branchesLoading || equipmentLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-3 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setLocation("/ariza")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Yeni Arıza Bildir</h1>
          <p className="text-muted-foreground mt-1">Ekipman arızasını hızlı ve detaylı bir şekilde bildirin</p>
        </div>
      </div>

      {/* Priority Warning */}
      <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5/20 dark:border-warning/40">
        <CardContent className="pt-6">
          <div className="flex gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning dark:text-warning">Acil Durum</p>
              <p className="text-sm text-warning dark:text-yellow-300 mt-1">
                Eğer bu bir güvenlik tehlikesi veya üretim durması ise, lütfen "Yüksek" veya "Kritik" olarak işaretleyin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="flex flex-col gap-3 sm:gap-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Temel Bilgiler</CardTitle>
              <CardDescription>Arıza hakkında temel bilgileri girin</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube *</FormLabel>
                    <Select value={String(field.value || "")} onValueChange={(val) => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Şubeyi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(branches) ? branches : []).map((branch: Branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ekipman (İsteğe Bağlı)</FormLabel>
                    <Select
                      value={String(field.value || "")}
                      onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Ekipmanı seçin veya manuel girin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipment
                          .filter((eq: Equipment) => eq.branchId === form.watch("branchId"))
                          .map((eq: Equipment) => (
                            <SelectItem key={eq.id} value={String(eq.id)}>
                              {(eq as any).equipmentName || "Ekipman"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ekipman Adı *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Espresso Makinesi, Değirmeni, vb."
                        disabled={!!selectedEq}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dusuk">Düşük - Beklenebilir</SelectItem>
                        <SelectItem value="orta">Orta - Kısa zamanda çözülmeli</SelectItem>
                        <SelectItem value="yuksek">Yüksek - Acil müdahale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {hasTroubleshootingSteps && (
            <Card data-testid="card-troubleshooting-wizard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Sorun Giderme Adımları
                </CardTitle>
                <CardDescription>
                  Arıza bildirimi yapabilmek için aşağıdaki adımları tamamlamanız gerekmektedir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {troubleshootingSteps.sort((a, b) => a.order - b.order).map((step) => {
                  const isDone = completedSteps[step.id]?.done || false;
                  return (
                    <div
                      key={step.id}
                      className={`p-3 rounded-md border transition-colors ${isDone ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}
                      data-testid={`troubleshooting-step-${step.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCompletedSteps(prev => ({
                              ...prev,
                              [step.id]: { done: !prev[step.id]?.done, notes: prev[step.id]?.notes || "" },
                            }));
                          }}
                          className="mt-0.5 shrink-0"
                          data-testid={`button-step-toggle-${step.id}`}
                        >
                          {isDone
                            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                            : <Circle className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {step.description}
                          </p>
                          {isDone && (
                            <Input
                              placeholder="Not ekleyin (opsiyonel)"
                              className="mt-2"
                              value={completedSteps[step.id]?.notes || ""}
                              onChange={(e) => {
                                setCompletedSteps(prev => ({
                                  ...prev,
                                  [step.id]: { ...prev[step.id], notes: e.target.value },
                                }));
                              }}
                              data-testid={`input-step-notes-${step.id}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={allStepsCompleted ? "default" : "secondary"} data-testid="badge-troubleshooting-status">
                    {allStepsCompleted
                      ? "Tüm adımlar tamamlandı"
                      : `${Object.values(completedSteps).filter(s => s.done).length}/${troubleshootingSteps.length} adım tamamlandı`}
                  </Badge>
                </div>

                {!allStepsCompleted && (
                  <div className="flex gap-2 p-3 rounded-md bg-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Arıza bildirimi yapabilmek için tüm sorun giderme adımlarını tamamlamanız gerekmektedir.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detailed Description */}
          <Card>
            <CardHeader>
              <CardTitle>Detaylı Açıklama</CardTitle>
              <CardDescription>Arıza hakkında ayrıntılı bilgi verin</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arıza Açıklaması *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ne oldu? Hangi semptomlar gözlemlendi? Ne zaman başladı?"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semptomlar (virgülle ayırın)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Isıtma yok, Garip ses, Koku"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affectedAreas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etkilenen Bölgeler (virgülle ayırın)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Isıtma Grubu, Pompası, Kontak"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partsIdentified"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tespit Edilen Parçalar (virgülle ayırın)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Termostat, Kalıp, O-Ring"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ek Notlar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Başka bilgiler..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Impact Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Etki Değerlendirmesi</CardTitle>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="immediateImpact"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Üretimi etkiliyor (anlık etki var)
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="safetyHazard"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer text-destructive dark:text-destructive">
                      Güvenlik tehlikesi oluşturuyor
                    </FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Fotoğraf (İsteğe Bağlı)</CardTitle>
              <CardDescription>Sorunu belgeleyen bir fotoğraf yükleyin</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              {photoPreview ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                    <img src={photoPreview} alt="Arıza fotoğrafı" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoPreview(null);
                      form.setValue("photoUrl", undefined);
                    }}
                  >
                    Değiştir
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full px-3 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Fotoğraf yüklemek için tıklayın</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG veya WebP</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/ariza")}
            >
              İptal Et
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || isUploading || (hasTroubleshootingSteps && !allStepsCompleted)}
              className="flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bildiriliyor...
                </>
              ) : (
                "Arızayı Bildir"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
