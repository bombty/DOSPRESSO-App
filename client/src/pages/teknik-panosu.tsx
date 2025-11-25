import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Clock, CheckCircle2, Wrench } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentFault } from "@shared/schema";
import { useState } from "react";

const FAULT_STAGES = {
  bekliyor: "Beklemede",
  isleme_alindi: "İşleme Alındı",
  devam_ediyor: "Devam Ediyor",
  servis_cagrildi: "Servis Çağrıldı",
  kargoya_verildi: "Kargoya Verildi",
  kapatildi: "Kapatıldı",
};

const stageUpdateSchema = z.object({
  stage: z.string(),
});

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFault, setSelectedFault] = useState<EquipmentFault | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: faults = [], isLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const form = useForm<z.infer<typeof stageUpdateSchema>>({
    resolver: zodResolver(stageUpdateSchema),
    defaultValues: { stage: "isleme_alindi" },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof stageUpdateSchema>) => {
      if (!selectedFault) return;
      await apiRequest(`/api/faults/${selectedFault.id}`, "PATCH", {
        currentStage: data.stage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza durumu güncellendi" });
      setIsDialogOpen(false);
      setSelectedFault(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  // My assigned faults (open/in progress)
  const myFaults = faults.filter(
    (f) => f.assignedTo === user?.id && f.currentStage !== "kapatildi"
  );
  const myResolvedFaults = faults.filter(
    (f) => f.assignedTo === user?.id && f.currentStage === "kapatildi"
  );

  const criticalCount = myFaults.filter((f) => f.priority === "kritik").length;
  const inProgressCount = myFaults.filter(
    (f) => f.currentStage === "devam_ediyor" || f.currentStage === "servis_cagrildi"
  ).length;

  const getPriorityIcon = (priority: string | null) => {
    if (priority === "kritik") return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (priority === "yuksek") return <Clock className="w-4 h-4 text-orange-600" />;
    return <Wrench className="w-4 h-4 text-blue-600" />;
  };

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

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case "bekliyor":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "isleme_alindi":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "devam_ediyor":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "servis_cagrildi":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "kargoya_verildi":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "kapatildi":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Teknik Panosu
        </h1>
        <p className="text-muted-foreground mt-1">Atanan arızalarınızı yönetin ve durumları güncelleyin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Atanan Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Açık görevler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Kritik Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Acil müdahale gerekli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Devam Ediyor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Aktif çalışmalar</p>
          </CardContent>
        </Card>
      </div>

      {/* Open Faults */}
      <Card>
        <CardHeader>
          <CardTitle>Açık Arızalar</CardTitle>
          <CardDescription>Atanmış ve çözülmemiş arızaları görüntüleyin</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          ) : myFaults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Atanan açık arıza yok
            </p>
          ) : (
            <div className="space-y-3">
              {myFaults.map((fault) => (
                <div
                  key={fault.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`fault-card-${fault.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIcon(fault.priority)}
                      <span className="font-semibold text-sm">Arıza #{fault.id}</span>
                      <Badge className={getPriorityColor(fault.priority)}>
                        {fault.priority === "kritik"
                          ? "Kritik"
                          : fault.priority === "yuksek"
                            ? "Yüksek"
                            : "Normal"}
                      </Badge>
                      <Badge className={getStageColor(fault.currentStage)}>
                        {FAULT_STAGES[fault.currentStage as keyof typeof FAULT_STAGES] || fault.currentStage}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fault.description || "Açıklama yok"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Raporlanan: {fault.createdAt ? format(fault.createdAt instanceof Date ? fault.createdAt : parseISO(fault.createdAt), "dd MMM HH:mm", { locale: tr }) : "-"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFault(fault);
                      form.reset({ stage: fault.currentStage || "isleme_alindi" });
                      setIsDialogOpen(true);
                    }}
                    className="ml-2 flex-shrink-0"
                    data-testid={`button-update-fault-${fault.id}`}
                  >
                    Güncelle
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Resolved */}
      {myResolvedFaults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Son Çözülen Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myResolvedFaults.slice(0, 5).map((fault) => (
                <div key={fault.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
                  <span>Arıza #{fault.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {fault.resolvedAt ? format(fault.resolvedAt instanceof Date ? fault.resolvedAt : parseISO(fault.resolvedAt), "dd MMM", { locale: tr }) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arıza Durumunu Güncelle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yeni Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stage">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="isleme_alindi">İşleme Alındı</SelectItem>
                        <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                        <SelectItem value="servis_cagrildi">Servis Çağrıldı</SelectItem>
                        <SelectItem value="kargoya_verildi">Kargoya Verildi</SelectItem>
                        <SelectItem value="kapatildi">Kapatıldı</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
