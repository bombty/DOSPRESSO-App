import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, CheckCircle, AlertCircle, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: number;
  name: string;
  category: string;
  branchId: number;
}

interface TroubleshootingStep {
  id: number;
  equipmentId: number;
  stepNumber: number;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

const stepSchema = z.object({
  equipmentId: z.number(),
  stepNumber: z.coerce.number().min(1, "Adım numarası en az 1 olmalı"),
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().min(1, "Açıklama gerekli"),
  isActive: z.boolean().default(true),
});

type StepFormData = z.infer<typeof stepSchema>;

export default function EquipmentTroubleshooting() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Only HQ/admin can create troubleshooting steps
  const canCreateSteps = user ? isHQRole(user.role as any) : false;

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
  });

  const { data: troubleshootingSteps = [], isLoading: stepsLoading } = useQuery<TroubleshootingStep[]>({
    queryKey: ['/api/equipment-troubleshooting-steps', selectedEquipmentId],
    enabled: selectedEquipmentId !== null,
  });

  const form = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      equipmentId: selectedEquipmentId || 0,
      stepNumber: "" as any, // Start empty to allow validation
      title: "",
      description: "",
      isActive: true,
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (data: StepFormData) => {
      return await apiRequest('/api/equipment-troubleshooting-steps', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-troubleshooting-steps'] });
      toast({
        title: "Başarılı",
        description: "Troubleshooting adımı oluşturuldu",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Adım oluşturulurken hata oluştu",
      });
    },
  });

  const toggleStepCompletion = (stepId: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const handleCreateStep = (data: StepFormData) => {
    createStepMutation.mutate({
      ...data,
      equipmentId: selectedEquipmentId!,
    });
  };

  // Sync equipmentId in form when selection changes
  useEffect(() => {
    if (selectedEquipmentId) {
      form.setValue('equipmentId', selectedEquipmentId);
    }
  }, [selectedEquipmentId, form]);

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);
  const sortedSteps = [...troubleshootingSteps].sort((a, b) => a.stepNumber - b.stepNumber);
  const activeSteps = sortedSteps.filter(s => s.isActive);
  const allStepsCompleted = activeSteps.length > 0 && activeSteps.every(s => completedSteps.has(s.id));

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-title">
            <Wrench className="w-8 h-8" />
            Ekipman Troubleshooting
          </h1>
          <p className="text-muted-foreground mt-1">
            Ekipman sorunlarını adım adım çözün
          </p>
        </div>

        {canCreateSteps && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-create-step"
                disabled={!selectedEquipmentId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Adım Ekle
              </Button>
            </DialogTrigger>
          <DialogContent data-testid="dialog-create-step">
            <DialogHeader>
              <DialogTitle>Troubleshooting Adımı Ekle</DialogTitle>
              <DialogDescription>
                {selectedEquipment?.name} için yeni troubleshooting adımı oluşturun
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateStep)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="stepNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adım Numarası</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="1"
                          value={field.value}
                          onChange={e => {
                            const trimmed = e.target.value.trim();
                            field.onChange(trimmed === '' ? '' : trimmed);
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-step-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Örn: Cihazı yeniden başlatın" data-testid="input-title" />
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
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Detaylı adım açıklaması..."
                          rows={4}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createStepMutation.isPending} data-testid="button-submit-step">
                  {createStepMutation.isPending ? "Oluşturuluyor..." : "Adım Ekle"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ekipman Seç</CardTitle>
          <CardDescription>Troubleshooting yapmak istediğiniz ekipmanı seçin</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEquipmentId?.toString() || ""}
            onValueChange={(value) => {
              setSelectedEquipmentId(parseInt(value));
              setCompletedSteps(new Set());
            }}
          >
            <SelectTrigger className="w-full" data-testid="select-equipment">
              <SelectValue placeholder="Ekipman seçin..." />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((eq) => (
                <SelectItem key={eq.id} value={eq.id.toString()} data-testid={`option-equipment-${eq.id}`}>
                  {eq.name} ({eq.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEquipmentId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedEquipment?.name} - Troubleshooting Adımları</CardTitle>
                <CardDescription>
                  Her adımı sırasıyla takip edin ve işaretleyin
                </CardDescription>
              </div>
              {activeSteps.length > 0 && (
                <Badge variant={allStepsCompleted ? "default" : "secondary"}>
                  {completedSteps.size} / {activeSteps.length} Tamamlandı
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stepsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : activeSteps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Bu ekipman için henüz troubleshooting adımı eklenmemiş.</p>
                <p className="text-sm mt-1">Yukarıdaki "Yeni Adım Ekle" butonunu kullanarak adım ekleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSteps.map((step) => {
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`p-4 border rounded-md transition-all ${
                        isCompleted ? 'bg-muted border-primary' : 'bg-card hover-elevate'
                      }`}
                      data-testid={`step-${step.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleStepCompletion(step.id)}
                          className="mt-1"
                          data-testid={`checkbox-step-${step.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Adım {step.stepNumber}
                            </Badge>
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <h3 className={`font-semibold mb-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {step.title}
                          </h3>
                          <p className={`text-sm ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {step.description}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 mt-2 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  );
                })}

                {allStepsCompleted && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-primary" />
                        <h3 className="font-semibold mb-2">Tüm adımlar tamamlandı!</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Sorun çözülmediyse arıza raporu oluşturabilirsiniz.
                        </p>
                        <Button variant="outline" asChild data-testid="button-create-fault">
                          <a href="/ekipman-arizalari">Arıza Raporu Oluştur</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
