import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentFault } from "@shared/schema";
import { useState } from "react";

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  actualCost: z.string().optional(),
});

type UpdateFaultForm = z.infer<typeof updateFaultSchema>;

const FAULT_STAGES = {
  bekliyor: { label: "Beklemede", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  isleme_alindi: { label: "İşleme Alındı", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  devam_ediyor: { label: "Devam Ediyor", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  servis_cagrildi: { label: "Servis Çağrıldı", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  kargoya_verildi: { label: "Kargoya Verildi", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  kapatildi: { label: "Kapatıldı", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

export default function FaultManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const { data: faults = [], isLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<UpdateFaultForm>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: {
      currentStage: "bekliyor",
      assignedTo: undefined,
      notes: "",
      actualCost: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateFaultForm) => {
      if (!selectedFault) return;
      await apiRequest(`/api/faults/${selectedFault.id}`, "PATCH", {
        currentStage: data.currentStage,
        assignedTo: data.assignedTo || null,
        actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza güncellendi" });
      setIsUpdateDialogOpen(false);
      setSelectedFault(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Arıza güncellenemedi", variant: "destructive" });
    },
  });

  const openUpdateDialog = (fault: EquipmentFault) => {
    setSelectedFault(fault);
    form.reset({
      currentStage: fault.currentStage || "bekliyor",
      assignedTo: fault.assignedTo || "",
      actualCost: fault.actualCost?.toString() || "",
    });
    setIsUpdateDialogOpen(true);
  };

  // Filter faults - show unresolved faults, optionally assigned to current user
  const myFaults = faults.filter(f => f.currentStage !== "kapatildi" && (f.assignedTo === user?.id || !f.assignedTo));
  const resolvedFaults = faults.filter(f => f.currentStage === "kapatildi");

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "kritik":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "yuksek":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return "Atanmadı";
    return users.find(u => u.id === userId)?.fullName || "Bilinmeyen Kullanıcı";
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Arıza Yönetimi</h1>
        <p className="text-muted-foreground mt-2">Ekipman arızalarını atayın, takip edin ve çözün</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Açık Arızalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Sizin veya atanmamış</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Devam Edeniyor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myFaults.filter(f => f.currentStage === "devam_ediyor").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Çalışılmakta olan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Çözülen (Bu Ay)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Kapatılan arızalar</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Faults */}
      <Card>
        <CardHeader>
          <CardTitle>Açık Arızalar</CardTitle>
          <CardDescription>Çözülmesi gereken ekipman arızaları</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : myFaults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Görecek açık arıza yok</p>
          ) : (
            <div className="space-y-3">
              {myFaults.map((fault) => (
                <div key={fault.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors" data-testid={`fault-row-${fault.id}`}>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{fault.equipmentName || "Bilinmeyen Ekipman"}</p>
                      <Badge className={getPriorityColor(fault.priority)}>
                        {fault.priority === "kritik" ? "Kritik" : fault.priority === "yuksek" ? "Yüksek" : "Normal"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{fault.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fault.createdAt ? format(parseISO(fault.createdAt.toString()), "dd MMM HH:mm", { locale: tr }) : "Tarih bilinmiyor"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {getAssignedUserName(fault.assignedTo)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={FAULT_STAGES[fault.currentStage as keyof typeof FAULT_STAGES]?.color || "bg-gray-100"}>
                      {FAULT_STAGES[fault.currentStage as keyof typeof FAULT_STAGES]?.label || fault.currentStage}
                    </Badge>
                    <Dialog open={isUpdateDialogOpen && selectedFault?.id === fault.id} onOpenChange={(open) => {
                      if (!open) {
                        setIsUpdateDialogOpen(false);
                        setSelectedFault(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => openUpdateDialog(fault)} data-testid={`button-update-fault-${fault.id}`}>
                          Güncelle
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-update-fault">
                        <DialogHeader>
                          <DialogTitle>Arıza Güncelle</DialogTitle>
                          <DialogDescription>
                            {selectedFault?.equipmentName} - Durum ve atama bilgilerini güncelleyin
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="currentStage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Arıza Durumu</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-fault-stage">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(FAULT_STAGES).map(([key, stage]) => (
                                        <SelectItem key={key} value={key}>
                                          {stage.label}
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
                              name="assignedTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Atanan Kişi</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-assign-to">
                                        <SelectValue placeholder="Atayın..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="">Atamasız</SelectItem>
                                      {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.fullName}
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
                              name="actualCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Gerçek Maliyet (TL)</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-cost" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notlar</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Servis notları..." data-testid="textarea-notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsUpdateDialogOpen(false);
                                  setSelectedFault(null);
                                }}
                              >
                                İptal
                              </Button>
                              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-fault-update">
                                {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Faults */}
      <Card>
        <CardHeader>
          <CardTitle>Kapatılan Arızalar</CardTitle>
          <CardDescription>Çözülen ekipman arızaları</CardDescription>
        </CardHeader>
        <CardContent>
          {resolvedFaults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Kapatılan arıza yok</p>
          ) : (
            <div className="space-y-2">
              {resolvedFaults.slice(0, 5).map((fault) => (
                <div key={fault.id} className="flex items-center justify-between p-3 border rounded text-sm">
                  <div>
                    <p className="font-medium">{fault.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{fault.description}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Çözüldü</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
