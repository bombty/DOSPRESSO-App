import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEquipmentFaultSchema, type EquipmentFault, type InsertEquipmentFault, type Branch } from "@shared/schema";
import { AlertTriangle, Camera, CheckCircle } from "lucide-react";
import type { UploadResult } from "@uppy/core";

export default function EquipmentFaults() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadingFaultId, setUploadingFaultId] = useState<number | null>(null);

  const { data: faults, isLoading } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<InsertEquipmentFault>({
    resolver: zodResolver(insertEquipmentFaultSchema),
    defaultValues: {
      equipmentName: "",
      description: "",
      status: "acik",
      priority: "orta",
      branchId: undefined,
      reportedById: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipmentFault) => {
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

  const handleUploadComplete = (faultId: number) => async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const photoUrl = result.successful[0].uploadURL;
      await apiRequest(`/api/faults/${faultId}/photo`, "POST", { photoUrl });
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Fotoğraf yüklendi ve AI analizi yapıldı" });
      setUploadingFaultId(null);
    }
  };

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
                  name="equipmentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ekipman Adı</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Örn: Espresso Makinesi" data-testid="input-equipment-name" />
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
                        <Textarea {...field} placeholder="Arızayı detaylı açıklayın" data-testid="input-fault-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder="Şube seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {faults?.map((fault) => (
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
                        fault.status === "cozuldu"
                          ? "default"
                          : fault.priority === "yuksek"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {statusLabels[fault.status]}
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
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">AI Analizi:</p>
                    <p className="text-sm text-muted-foreground">{fault.aiAnalysis}</p>
                    {fault.aiSeverity && (
                      <Badge variant="outline" className="mt-2">
                        Ciddiyet: {severityLabels[fault.aiSeverity]}
                      </Badge>
                    )}
                  </div>
                )}
                {fault.status !== "cozuldu" && (
                  <div className="flex gap-2">
                    {!fault.photoUrl && (
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
                    <Button
                      variant="outline"
                      onClick={() => resolveMutation.mutate(fault.id)}
                      disabled={resolveMutation.isPending}
                      data-testid={`button-resolve-fault-${fault.id}`}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Çözüldü Olarak İşaretle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!faults || faults.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Henüz arıza raporu yok. Yeni arıza rapor etmek için yukarıdaki butonu kullanın.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
