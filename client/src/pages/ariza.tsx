import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Zap } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import type { EquipmentFault } from "@shared/schema";

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  actualCost: z.string().optional(),
});

export default function FaultHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const { data: faults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof updateFaultSchema>>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: { currentStage: "bekliyor" },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFaultSchema>) => {
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
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  // Calculate metrics
  const criticalFaults = faults.filter(f => f.priority === "kritik" && f.currentStage !== "kapatildi");
  const highFaults = faults.filter(f => f.priority === "yuksek" && f.currentStage !== "kapatildi");
  const resolvedFaults = faults.filter(f => f.currentStage === "kapatildi");
  const myFaults = faults.filter(f => f.assignedTo === user?.id && f.currentStage !== "kapatildi");

  // SLA calculations
  const breachedFaults = faults.filter(f => {
    if (f.currentStage === "kapatildi" || !f.createdAt) return false;
    const hoursSinceCreation = differenceInHours(new Date(), new Date(f.createdAt));
    return (f.priority === "kritik" && hoursSinceCreation > 2.5) || (f.priority === "yuksek" && hoursSinceCreation > 5);
  });

  const atRiskFaults = faults.filter(f => {
    if (f.currentStage === "kapatildi" || !f.createdAt) return false;
    if (breachedFaults.find(bf => bf.id === f.id)) return false;
    const hoursSinceCreation = differenceInHours(new Date(), new Date(f.createdAt));
    return (f.priority === "kritik" && hoursSinceCreation > 1.5) || (f.priority === "yuksek" && hoursSinceCreation > 3.5);
  });

  const getTimeSinceCreation = (createdAt: any) => {
    if (!createdAt) return "-";
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours < 1) return "< 1 saat";
    if (hours < 24) return `${hours} saat`;
    return `${Math.floor(hours / 24)} gün`;
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "kritik": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "yuksek": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case "bekliyor": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "isleme_alindi": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "devam_ediyor": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "servis_cagrildi": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "kargoya_verildi": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "kapatildi": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const stageLabelMap: Record<string, string> = {
    bekliyor: "Beklemede",
    isleme_alindi: "İşleme Alındı",
    devam_ediyor: "Devam Ediyor",
    servis_cagrildi: "Servis Çağrıldı",
    kargoya_verildi: "Kargoya Verildi",
    kapatildi: "Kapatıldı",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Arıza Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Tüm ekipman arızalarını merkezi olarak yönetin</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="sla">SLA Durumu</TabsTrigger>
          <TabsTrigger value="manage">Yönet</TabsTrigger>
          {user?.id && <TabsTrigger value="myFaults">Benim Arızalarım</TabsTrigger>}
        </TabsList>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Kritik
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{criticalFaults.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Acil müdahale</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Yüksek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{highFaults.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Kısa sürede çözülmeli</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Çözüldü
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{resolvedFaults.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Toplam çözülen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Açık
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{faults.filter(f => f.currentStage !== "kapatildi").length}</div>
                <p className="text-xs text-muted-foreground mt-1">İşlem halinde</p>
              </CardContent>
            </Card>
          </div>

          {criticalFaults.length > 0 && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Kritik Arızalar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalFaults.map((fault) => (
                    <div key={fault.id} className="flex items-center justify-between p-2 bg-white dark:bg-red-900/20 rounded border border-red-200">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{fault.equipmentName}</p>
                        <p className="text-xs text-muted-foreground">{fault.description}</p>
                      </div>
                      <Badge className={getStageColor(fault.currentStage)}>{stageLabelMap[fault.currentStage] || fault.currentStage}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Son Arızalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faults.slice(0, 8).map((fault) => (
                  <div key={fault.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(fault.createdAt || new Date()), "dd MMM HH:mm", { locale: tr })}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(fault.priority)}>{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                      <Badge className={getStageColor(fault.currentStage)}>{stageLabelMap[fault.currentStage]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SLA Status */}
        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">SLA İhlali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{breachedFaults.length}</div>
              </CardContent>
            </Card>

            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-600">Risk Altında</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{atRiskFaults.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Sağlıklı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{faults.filter(f => f.currentStage !== "kapatildi" && !breachedFaults.find(b => b.id === f.id) && !atRiskFaults.find(a => a.id === f.id)).length}</div>
              </CardContent>
            </Card>
          </div>

          {breachedFaults.length > 0 && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-600">SLA İhlali Yapan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {breachedFaults.map((fault) => (
                    <div key={fault.id} className="p-2 bg-red-50 dark:bg-red-950 rounded">
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{getTimeSinceCreation(fault.createdAt)} açık</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {atRiskFaults.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-orange-600">Risk Altında Olan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {atRiskFaults.map((fault) => (
                    <div key={fault.id} className="p-2 bg-orange-50 dark:bg-orange-950 rounded">
                      <p className="font-medium text-sm">{fault.equipmentName}</p>
                      <p className="text-xs text-muted-foreground">{getTimeSinceCreation(fault.createdAt)} (sınıra yaklaşıyor)</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: Manage Faults */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tüm Arızalar</CardTitle>
              <CardDescription>Arızaları atayın, durumlarını güncelleyin ve maliyeti takip edin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faults
                  .filter(f => f.currentStage !== "kapatildi")
                  .map((fault) => (
                    <div key={fault.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted">
                      <div className="flex-1">
                        <p className="font-medium">{fault.equipmentName}</p>
                        <p className="text-xs text-muted-foreground">{fault.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedFault(fault);
                          form.reset({ currentStage: fault.currentStage });
                          setIsUpdateDialogOpen(true);
                        }}
                        variant="outline"
                      >
                        Güncelle
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Arıza Güncelleyin: {selectedFault?.equipmentName}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bekliyor">Beklemede</SelectItem>
                              <SelectItem value="isleme_alindi">İşleme Alındı</SelectItem>
                              <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                              <SelectItem value="servis_cagrildi">Servis Çağrıldı</SelectItem>
                              <SelectItem value="kargoya_verildi">Kargoya Verildi</SelectItem>
                              <SelectItem value="kapatildi">Kapatıldı</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teknisyen</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.fullName || u.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maliyet (₺)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
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
                          <Textarea placeholder="Servis notları..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateMutation.isPending} className="w-full">
                    {updateMutation.isPending ? "Güncelleniyor..." : "Kaydet"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB 4: My Faults (Technician) */}
        {user?.id && (
          <TabsContent value="myFaults" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Toplam</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{myFaults.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-600">Kritik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{myFaults.filter(f => f.priority === "kritik").length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">Devam Ediyor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{myFaults.filter(f => f.currentStage === "devam_ediyor").length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Benim Arızalarım</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myFaults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Size atanmış arıza yok</p>
                  ) : (
                    myFaults.map((fault) => (
                      <div key={fault.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{fault.equipmentName}</p>
                            <p className="text-xs text-muted-foreground">{fault.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getPriorityColor(fault.priority)}>{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                            <Badge className={getStageColor(fault.currentStage)}>{stageLabelMap[fault.currentStage]}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
