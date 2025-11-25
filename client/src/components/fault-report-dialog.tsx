import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Equipment, EQUIPMENT_METADATA } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Wrench } from "lucide-react";
import { z } from "zod";

const createFaultSchema = z.object({
  description: z.string().min(10, "Arıza açıklaması en az 10 karakter olmalı"),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  notes: z.string().optional(),
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
  const [step, setStep] = useState<'troubleshooting' | 'report' | 'outcome'>(equipment.faultProtocol === 'hq_teknik' ? 'troubleshooting' : 'report');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [outcome, setOutcome] = useState<FaultOutcome | null>(null);

  const metadata = EQUIPMENT_METADATA[equipment.equipmentType as keyof typeof EQUIPMENT_METADATA];

  // Fetch troubleshooting steps
  const { data: troubleshootingSteps = [] } = useQuery<TroubleshootingStep[]>({
    queryKey: ['/api/troubleshooting', equipment.equipmentType],
    enabled: isOpen,
  });

  const form = useForm<CreateFaultInput>({
    resolver: zodResolver(createFaultSchema),
    defaultValues: {
      description: '',
      priority: 'orta',
      notes: '',
    },
  });

  const createFaultMutation = useMutation({
    mutationFn: async (data: CreateFaultInput) => {
      const response = await apiRequest('POST', '/api/faults', {
        equipmentId: equipment.id,
        branchId: equipment.branchId,
        ...data,
      });
      return response;
    },
    onSuccess: (fault) => {
      // Determine outcome based on faultProtocol
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
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
              {troubleshootingSteps.map((step) => (
                <Card key={step.id} className={completedSteps.has(step.id) ? 'bg-green-50 dark:bg-green-950' : ''}>
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="flex-1">
                      <p className="text-sm">{step.description}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={completedSteps.has(step.id) ? 'default' : 'outline'}
                      onClick={() => handleStepComplete(step.id)}
                      data-testid={`button-complete-step-${step.id}`}
                    >
                      {completedSteps.has(step.id) ? 'Tamamlandı' : 'Tamamla'}
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
            <p className="text-sm font-medium">Adım 2: Arıza Raporu</p>
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
                    type="submit"
                    disabled={createFaultMutation.isPending}
                    className="ml-auto"
                  >
                    {createFaultMutation.isPending ? 'Oluşturuluyor...' : 'Arıza Raporu Oluştur'}
                  </Button>
                </div>
              </form>
            </Form>
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
