import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEquipmentFaultSchema, type EquipmentFault, type InsertEquipmentFault, type Branch, type Equipment, FAULT_STAGES, type FaultStageType, type FaultStageTransition, EQUIPMENT_METADATA, isBranchRole } from "@shared/schema";
import { AlertTriangle, Camera, CheckCircle, Clock, ChevronRight } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import { z } from "zod";

const stageChangeSchema = z.object({
  stage: z.string(),
  notes: z.string().optional(),
});

type StageChangeFormData = z.infer<typeof stageChangeSchema>;

const faultFormSchema = insertEquipmentFaultSchema.extend({
  equipmentId: z.number({ required_error: "Ekipman seçimi zorunludur" }),
});

type FaultFormData = z.infer<typeof faultFormSchema>;

export default function EquipmentFaults() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadingFaultId, setUploadingFaultId] = useState<number | null>(null);
  const [stageChangeFaultId, setStageChangeFaultId] = useState<number | null>(null);
  const [viewHistoryFaultId, setViewHistoryFaultId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { data: faults, isLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: equipment } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    
    if (statusParam) {
      const validStatuses = ['acik', 'devam_ediyor', 'cozuldu'];
      if (validStatuses.includes(statusParam)) {
        setFilterStatus(statusParam);
      }
    }
  }, []);

  // Filter equipment by user's branch if branch role
  const availableEquipment = equipment?.filter((eq) => {
    if (user?.role && isBranchRole(user.role as any)) {
      return user.branchId && eq.branchId === user.branchId;
    }
    return true;
  });

  const filteredFaults = useMemo(() => {
    if (!faults) return [];
    
    let filtered = [...faults];
    
    if (filterStatus) {
      filtered = filtered.filter(f => f.status === filterStatus);
    }
    
    return filtered;
  }, [faults, filterStatus]);

  const form = useForm<FaultFormData>({
    resolver: zodResolver(faultFormSchema),
    defaultValues: {
      equipmentId: undefined,
      equipmentName: "",
      description: "",
      status: "acik",
      priority: "orta",
      branchId: undefined,
      reportedById: "",
    },
  });

  const stageForm = useForm<StageChangeFormData>({
    resolver: zodResolver(stageChangeSchema),
    defaultValues: {
      stage: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FaultFormData) => {
      await apiRequest("/api/faults", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza raporu oluşturuldu" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Arıza raporu oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (faultId: number) => {
      await apiRequest(`/api/faults/${faultId}/resolve`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza çözüldü olarak işaretlendi" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Arıza çözülemedi",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParams = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = (faultId: number) => (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful && result.successful[0]) {
      const photoUrl = result.successful[0].uploadURL;
      apiRequest(`/api/faults/${faultId}/photo`, "POST", { photoUrl }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
        toast({ title: "Başarılı", description: "Fotoğraf yüklendi ve AI analizi yapıldı" });
        setUploadingFaultId(null);
      });
    }
  };

  const stageChangeMutation = useMutation({
    mutationFn: async (data: { faultId: number; stage: string; notes?: string }) => {
      await apiRequest(`/api/faults/${data.faultId}/stage`, "PUT", {
        stage: data.stage,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza aşaması güncellendi" });
      setStageChangeFaultId(null);
      stageForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: error.message || "Aşama güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const { data: stageHistory } = useQuery<FaultStageTransition[]>({
    queryKey: ['/api/faults', viewHistoryFaultId, 'history'],
    queryFn: async () => {
      if (!viewHistoryFaultId) return [];
      const response = await fetch(`/api/faults/${viewHistoryFaultId}/history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: !!viewHistoryFaultId,
  });

  const priorityLabels: Record<string, string> = {
    dusuk: "Düşük",
    orta: "Orta",
    yuksek: "Yüksek",
  };

  const statusLabels: Record<string, string> = {
    acik: "Açık",
    devam_ediyor: "Devam Ediyor",
    cozuldu: "Çözüldü",
  };

  const severityLabels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  };

  const stageLabels: Record<FaultStageType, string> = {
    [FAULT_STAGES.BEKLIYOR]: "Bekliyor",
    [FAULT_STAGES.ISLEME_ALINDI]: "İşleme Alındı",
    [FAULT_STAGES.SERVIS_CAGRILDI]: "Servis Çağrıldı",
    [FAULT_STAGES.KARGOYA_VERILDI]: "Kargoya Verildi",
    [FAULT_STAGES.TESLIM_ALINDI]: "Teslim Alındı",
    [FAULT_STAGES.TAKIP_EDILIYOR]: "Takip Ediliyor",
    [FAULT_STAGES.KAPATILDI]: "Kapatıldı",
  };

  // Permission check: can user change fault stage?
  const canChangeStage = (fault: EquipmentFault) => {
    if (!user) return false;
    // Teknik can change any fault
    if (user.role === 'teknik') return true;
    // Branch users can only change their own branch's faults
    const isBranchUser = ['supervisor', 'barista', 'stajyer'].includes(user.role);
    return isBranchUser && user.branchId === fault.branchId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Ekipman Arızaları</h1>
          <p className="text-muted-foreground mt-1">Ekipman arızalarını raporlayın ve AI ile analiz edin</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-fault">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Arıza Rapor Et
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Arıza Raporu</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="equipmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ekipman *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const selectedEquipmentId = Number(value);
                          field.onChange(selectedEquipmentId);
                          
                          const selectedEquipment = availableEquipment?.find(eq => eq.id === selectedEquipmentId);
                          if (selectedEquipment) {
                            const equipmentLabel = `${EQUIPMENT_METADATA[selectedEquipment.equipmentType as keyof typeof EQUIPMENT_METADATA]?.nameTr} - ${selectedEquipment.serialNumber || 'S/N Yok'}`;
                            form.setValue('equipmentName', equipmentLabel);
                            if (selectedEquipment.branchId) {
                              form.setValue('branchId', selectedEquipment.branchId);
                            }
                          }
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-equipment">
                            <SelectValue placeholder="Ekipman seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableEquipment?.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id.toString()}>
                              {EQUIPMENT_METADATA[eq.equipmentType as keyof typeof EQUIPMENT_METADATA]?.nameTr} - {eq.serialNumber || 'S/N Yok'}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arıza Açıklaması</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Arızayı detaylı açıklayın" data-testid="input-fault-description" />
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
                      <FormLabel>Öncelik</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "orta"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Öncelik seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dusuk">Düşük</SelectItem>
                          <SelectItem value="orta">Orta</SelectItem>
                          <SelectItem value="yuksek">Yüksek</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-fault">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stage Change Dialog */}
      <Dialog open={stageChangeFaultId !== null} onOpenChange={(open) => !open && setStageChangeFaultId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arıza Aşaması Güncelle</DialogTitle>
            <DialogDescription>
              Arızanın mevcut aşamasını güncelleyin. İsteğe bağlı olarak not ekleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <Form {...stageForm}>
            <form
              onSubmit={stageForm.handleSubmit((data) => {
                if (stageChangeFaultId) {
                  stageChangeMutation.mutate({
                    faultId: stageChangeFaultId,
                    stage: data.stage,
                    notes: data.notes,
                  });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={stageForm.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yeni Aşama</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-stage">
                          <SelectValue placeholder="Aşama seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(FAULT_STAGES).map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stageLabels[stage as FaultStageType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stageForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Aşama değişikliği hakkında notlar"
                        data-testid="input-stage-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStageChangeFaultId(null)}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={stageChangeMutation.isPending}
                  data-testid="button-submit-stage-change"
                >
                  {stageChangeMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Stage History Dialog */}
      <Dialog open={viewHistoryFaultId !== null} onOpenChange={(open) => {
        if (!open) {
          // Clear cache when closing to avoid stale data
          if (viewHistoryFaultId) {
            queryClient.removeQueries({ queryKey: ['/api/faults', viewHistoryFaultId, 'history'] });
          }
          setViewHistoryFaultId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Arıza Aşama Geçmişi</DialogTitle>
            <DialogDescription>
              Arızanın tüm aşama değişikliklerinin zaman çizelgesi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {stageHistory && stageHistory.length > 0 ? (
              <div className="relative pl-6 space-y-4">
                {stageHistory.map((transition, index) => (
                  <div key={transition.id} className="relative">
                    <div className="absolute left-[-1.5rem] top-2 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                    {index < stageHistory.length - 1 && (
                      <div className="absolute left-[-1.15rem] top-5 bottom-[-1rem] w-0.5 bg-border" />
                    )}
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {transition.fromStage && (
                            <>
                              {stageLabels[transition.fromStage as FaultStageType]} →{' '}
                            </>
                          )}
                          {stageLabels[transition.toStage as FaultStageType]}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {new Date(transition.changedAt).toLocaleDateString("tr-TR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Badge>
                      </div>
                      {transition.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {transition.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Henüz aşama değişikliği yok
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFaults?.map((fault) => (
            <Card key={fault.id} data-testid={`card-fault-${fault.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {fault.equipmentName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{fault.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(fault.createdAt!).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge
                      variant={
                        fault.currentStage === FAULT_STAGES.KAPATILDI
                          ? "default"
                          : fault.currentStage === FAULT_STAGES.BEKLIYOR
                          ? "secondary"
                          : "outline"
                      }
                      data-testid={`badge-stage-${fault.id}`}
                    >
                      {stageLabels[fault.currentStage as FaultStageType]}
                    </Badge>
                    <Badge variant="outline">
                      {priorityLabels[fault.priority || "orta"]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fault.photoUrl && (
                  <div>
                    <img
                      src={fault.photoUrl}
                      alt="Arıza fotoğrafı"
                      className="rounded-md max-h-48 object-cover"
                      data-testid={`img-fault-photo-${fault.id}`}
                    />
                  </div>
                )}
                {fault.aiAnalysis && (
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-1">AI Analizi:</p>
                      <p className="text-sm text-muted-foreground">{fault.aiAnalysis}</p>
                    </div>
                    {fault.aiSeverity && (
                      <Badge variant="outline">
                        Ciddiyet: {severityLabels[fault.aiSeverity]}
                      </Badge>
                    )}
                    {fault.aiRecommendations && fault.aiRecommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Öneriler:</p>
                        <ul className="space-y-1">
                          {fault.aiRecommendations.map((recommendation, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {!fault.photoUrl && fault.status !== "cozuldu" && (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParams}
                      onComplete={handleUploadComplete(fault.id)}
                      buttonClassName="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </ObjectUploader>
                  )}
                  {canChangeStage(fault) && fault.currentStage !== FAULT_STAGES.KAPATILDI && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStageChangeFaultId(fault.id);
                        stageForm.setValue("stage", fault.currentStage);
                      }}
                      data-testid={`button-change-stage-${fault.id}`}
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Aşama Değiştir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewHistoryFaultId(fault.id);
                      // Invalidate to force fresh fetch
                      queryClient.invalidateQueries({ queryKey: ['/api/faults', fault.id, 'history'] });
                    }}
                    data-testid={`button-view-history-${fault.id}`}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Geçmiş
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!filteredFaults || filteredFaults.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {filterStatus 
                    ? `${statusLabels[filterStatus]} durumunda arıza raporu bulunamadı.`
                    : 'Henüz arıza raporu yok. Yeni arıza rapor etmek için yukarıdaki butonu kullanın.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
