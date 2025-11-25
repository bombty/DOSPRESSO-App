import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Equipment, EQUIPMENT_METADATA, EquipmentFault } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Wrench, Upload, History, DollarSign, Clock } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const createFaultSchema = z.object({
  description: z.string().min(10, "Arıza açıklaması en az 10 karakter olmalı"),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  estimatedCost: z.string().optional(),
});

type CreateFaultInput = z.infer<typeof createFaultSchema>;

interface FaultReportDialogProps {
  equipment: Equipment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TroubleshootingStep {
  id: number;
  description: string;
  requiresPhoto: boolean;
  isRequired: boolean;
}

interface FaultOutcome {
  type: 'hq_escalation' | 'branch_service' | 'local_resolution';
  title: string;
  message: string;
  details?: any;
}

export function FaultReportDialog({ equipment, isOpen, onOpenChange }: FaultReportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<'troubleshooting' | 'report' | 'outcome'>(equipment.faultProtocol === 'hq_teknik' ? 'troubleshooting' : 'report');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [outcome, setOutcome] = useState<FaultOutcome | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'detailed'>('quick');

  const metadata = EQUIPMENT_METADATA[equipment.equipmentType as keyof typeof EQUIPMENT_METADATA];

  // Fetch troubleshooting steps
  const { data: troubleshootingSteps = [] } = useQuery<TroubleshootingStep[]>({
    queryKey: ['/api/troubleshooting', equipment.equipmentType],
    enabled: isOpen,
  });

  // Fetch past faults for this equipment
  const { data: pastFaults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ['/api/faults', 'equipment', equipment.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/faults?equipmentId=${equipment.id}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (Array.isArray(data) ? data : []).slice(0, 5).reverse();
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const form = useForm<CreateFaultInput>({
    resolver: zodResolver(createFaultSchema),
    defaultValues: {
      description: '',
      priority: 'orta',
      notes: '',
      estimatedCost: '',
    },
  });

  const createFaultMutation = useMutation({
    mutationFn: async (data: CreateFaultInput) => {
      const response = await apiRequest('/api/faults', 'POST', {
        equipmentId: equipment.id,
        branchId: equipment.branchId,
        description: data.description,
        priority: data.priority,
        notes: data.notes,
        photoUrl: uploadedPhotoUrl || data.photoUrl,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
      });
      return response as unknown as EquipmentFault;
    },
    onSuccess: (fault: EquipmentFault) => {
      if (equipment.faultProtocol === 'hq_teknik') {
        setOutcome({
          type: 'hq_escalation',
          title: 'Talebiniz HQ\'ya İletildi',
          message: 'Arıza raporunuz Merkez Teknik Ekibine iletilmiştir. En kısa sürede sizinle iletişime geçilecektir.',
          details: { faultId: fault.id },
        });
      } else {
        setOutcome({
          type: 'branch_service',
          title: 'Arıza Raporu Oluşturuldu',
          message: 'Arıza raporunuz başarıyla kaydedilmiştir. Şube sorumlusu ile iletişime geçin.',
          details: { faultId: fault.id },
        });
      }
      setStep('outcome');
      queryClient.invalidateQueries({ queryKey: ['/api/faults'] });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Arıza raporu oluşturulamadı',
        variant: 'destructive',
      });
    },
  });

  const handleStepComplete = (stepId: number) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
  };

  const allRequiredStepsComplete = troubleshootingSteps
    .filter(s => s.isRequired)
    .every(s => completedSteps.has(s.id));

  const handleClose = () => {
    onOpenChange(false);
    setStep(equipment.faultProtocol === 'hq_teknik' ? 'troubleshooting' : 'report');
    setCompletedSteps(new Set());
    setOutcome(null);
    setUploadedPhotoUrl(null);
    setActiveTab('quick');
    form.reset();
  };

  const handlePhotoUpload = (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful?.[0]) {
      const photoUrl = result.successful[0].uploadURL;
      setUploadedPhotoUrl(photoUrl);
      form.setValue('photoUrl', photoUrl);
      toast({ title: 'Başarılı', description: 'Fotoğraf başarıyla yüklendi' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arıza Bildirimi - {metadata?.nameTr}</DialogTitle>
          <DialogDescription>
            S/N: {equipment.serialNumber}
          </DialogDescription>
        </DialogHeader>

        {step === 'troubleshooting' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Adım 1: Sorun Giderme İşlemleri</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {troubleshootingSteps.map((s) => (
                <Card key={s.id} className={completedSteps.has(s.id) ? 'bg-green-50 dark:bg-green-950' : ''}>
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="flex-1">
                      <p className="text-sm">{s.description}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={completedSteps.has(s.id) ? 'default' : 'outline'}
                      onClick={() => handleStepComplete(s.id)}
                      data-testid={`button-complete-step-${s.id}`}
                    >
                      {completedSteps.has(s.id) ? 'Tamamlandı' : 'Tamamla'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button
                onClick={() => setStep('report')}
                disabled={!allRequiredStepsComplete}
                className="ml-auto"
              >
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'quick' | 'detailed')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">Hızlı Raporlama</TabsTrigger>
                <TabsTrigger value="detailed">Detaylı Bilgiler</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <p className="text-sm font-medium">Adım 2: Arıza Raporu (Hızlı)</p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createFaultMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arıza Açıklaması</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Sorun nedir? Hangi semptomlar gözleniyor?"
                              {...field}
                              data-testid="input-fault-description"
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
                          <FormLabel>Öncelik</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
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

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ek Notlar (İsteğe Bağlı)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ek bilgiler veya gözlemler"
                              {...field}
                              data-testid="input-fault-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('troubleshooting')}
                      >
                        Geri Dön
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('detailed')}
                      >
                        Detayları Ekle
                      </Button>
                      <Button
                        type="submit"
                        disabled={createFaultMutation.isPending}
                        className="ml-auto"
                      >
                        {createFaultMutation.isPending ? 'Oluşturuluyor...' : 'Raporu Gönder'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <p className="text-sm font-medium">Adım 2: Arıza Raporu (Detaylı)</p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createFaultMutation.mutate(data))} className="space-y-4">
                    {/* Fotoğraf Yükleme */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Fotoğraf Ekle
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {uploadedPhotoUrl ? (
                          <div className="space-y-2">
                            <img
                              src={uploadedPhotoUrl}
                              alt="Yüklenen Fotoğraf"
                              className="h-32 w-32 object-cover rounded border"
                              data-testid="img-uploaded-photo"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadedPhotoUrl(null);
                                form.setValue('photoUrl', '');
                              }}
                            >
                              Değiştir
                            </Button>
                          </div>
                        ) : (
                          <ObjectUploader
                            onGetUploadParameters={async () => {
                              try {
                                const response = await apiRequest('/api/upload-url', 'POST', {
                                  fileName: `fault-${equipment.id}-${Date.now()}.jpg`,
                                  fileType: 'image/jpeg',
                                });
                                return response as unknown as { method: "PUT"; url: string };
                              } catch (err) {
                                toast({ title: 'Hata', description: 'Upload URL alınamadı', variant: 'destructive' });
                                throw err;
                              }
                            }}
                            onComplete={handlePhotoUpload}
                            buttonClassName="w-full"
                          >
                            📸 Fotoğraf Yükle
                          </ObjectUploader>
                        )}
                      </CardContent>
                    </Card>

                    {/* Tahmini Maliyet */}
                    <FormField
                      control={form.control}
                      name="estimatedCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Tahmini Maliyet (₺)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-estimated-cost"
                            />
                          </FormControl>
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
                            <Textarea
                              placeholder="Sorun nedir? Hangi semptomlar gözleniyor?"
                              {...field}
                              data-testid="input-fault-description"
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
                          <FormLabel>Öncelik</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
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

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ek Notlar</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ek bilgiler veya gözlemler"
                              {...field}
                              data-testid="input-fault-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Geçmiş Arızalar */}
                    {pastFaults.length > 0 && (
                      <Card className="bg-muted">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Geçmiş Arızalar
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {pastFaults.map((fault) => (
                            <div key={fault.id} className="flex items-start justify-between gap-2 p-2 bg-background rounded text-sm">
                              <div className="flex-1">
                                <p className="font-medium">{fault.description?.substring(0, 50)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fault.createdAt ? format(new Date(fault.createdAt), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}
                                </p>
                              </div>
                              <Badge
                                variant={fault.priority === 'yuksek' ? 'destructive' : fault.priority === 'orta' ? 'default' : 'secondary'}
                              >
                                {fault.priority}
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('quick')}>
                        Geri
                      </Button>
                      <Button
                        type="submit"
                        disabled={createFaultMutation.isPending}
                        className="ml-auto"
                      >
                        {createFaultMutation.isPending ? 'Oluşturuluyor...' : 'Raporu Gönder'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'outcome' && outcome && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {outcome.type === 'hq_escalation' ? (
                <AlertCircle className="h-6 w-6 text-blue-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              <h3 className="font-semibold">{outcome.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{outcome.message}</p>

            {outcome.type === 'branch_service' && (
              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-base">Servis Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Cihaz:</strong> {metadata?.nameTr}</div>
                  <div><strong>Seri No:</strong> {equipment.serialNumber}</div>
                  <div><strong>Şube:</strong> {equipment.branchId}</div>
                  {uploadedPhotoUrl && (
                    <div><strong>Fotoğraf:</strong> Yüklendi ✓</div>
                  )}
                  <p className="pt-2 text-xs text-muted-foreground">
                    Şube sorumlusuna servis talebini iletildi.
                  </p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleClose} className="w-full">
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
