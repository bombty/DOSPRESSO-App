import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentFault } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  bekliyor: "Beklemede",
  isleme_alindi: "İşleme Alındı",
  devam_ediyor: "Devam Ediyor",
  servis_cagrildi: "Servis Çağrıldı",
  kargoya_verildi: "Kargoya Verildi",
  kapatildi: "Kapatıldı",
};

const PRIORITY_LABELS: Record<string, string> = {
  kritik: "Kritik",
  yuksek: "Yüksek",
  normal: "Normal",
};

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  actualCost: z.string().optional(),
  notes: z.string().optional(),
});

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-gray-100 text-gray-800 dark:bg-gray-900",
  isleme_alindi: "bg-blue-100 text-blue-800 dark:bg-blue-900",
  devam_ediyor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900",
  servis_cagrildi: "bg-orange-100 text-orange-800 dark:bg-orange-900",
  kargoya_verildi: "bg-purple-100 text-purple-800 dark:bg-purple-900",
  kapatildi: "bg-green-100 text-green-800 dark:bg-green-900",
};

const PRIORITY_COLORS: Record<string, string> = {
  kritik: "bg-red-100 text-red-800 dark:bg-red-900",
  yuksek: "bg-orange-100 text-orange-800 dark:bg-orange-900",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900",
};

export default function FaultDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: fault, isLoading: faultLoading } = useQuery<EquipmentFault>({
    queryKey: ["/api/faults", id],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`/api/faults`);
      if (!response.ok) throw new Error("Failed to fetch faults");
      const data = await response.json();
      const faults = Array.isArray(data) ? data : (data.data || []);
      const found = faults.find((f: EquipmentFault) => f.id === parseInt(id || "0"));
      if (!found) throw new Error("Arıza bulunamadı");
      return found;
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof updateFaultSchema>>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: {
      currentStage: fault?.currentStage || "bekliyor",
      assignedTo: fault?.assignedTo || undefined,
      actualCost: fault?.actualCost ? String(fault.actualCost) : undefined,
      notes: undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFaultSchema>) => {
      await apiRequest(`/api/faults/${id}`, "PATCH", {
        currentStage: data.currentStage,
        assignedTo: data.assignedTo || null,
        actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza güncellendi" });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  if (faultLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!fault) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        <Button variant="outline" onClick={() => setLocation("/ariza")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Arıza bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <Button variant="outline" onClick={() => setLocation("/ariza")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Geri Dön
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{fault.equipmentName}</h1>
          <p className="text-muted-foreground mt-1">Arıza ID: #{fault.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/ariza-yeni")}>Yeni Arıza</Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>Güncelle</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Öncelik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={fault.priority ? PRIORITY_COLORS[fault.priority] : PRIORITY_COLORS.normal}>
              {fault.priority ? (PRIORITY_LABELS[fault.priority] || fault.priority) : "Normal"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Durum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={STAGE_COLORS[fault.currentStage] || "bg-gray-100"}>
              {STAGE_LABELS[fault.currentStage] || fault.currentStage}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Sorumluluğu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {(fault as any).maintenanceResponsible || (fault as any).faultProtocol || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Gerçek Maliyet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {fault.actualCost ? `₺${typeof fault.actualCost === 'string' ? parseFloat(fault.actualCost).toFixed(2) : Number(fault.actualCost).toFixed(2)}` : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detaylı Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Açıklama</p>
              <p className="text-sm font-medium">{fault.description || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Raporlandığı Tarih</p>
              <p className="text-sm font-medium">
                {fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tahmini Maliyet</p>
              <p className="text-sm font-medium">
                {fault.estimatedCost ? `₺${typeof fault.estimatedCost === 'string' ? parseFloat(fault.estimatedCost).toFixed(2) : (Number(fault.estimatedCost)).toFixed(2)}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fotoğraf</p>
              {fault.photoUrl ? (
                <a href={fault.photoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Fotoğrafı Görüntüle
                </a>
              ) : (
                <p className="text-sm font-medium">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Atanan Kişi</p>
              <p className="text-sm font-medium">{fault.assignedTo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durumu</p>
              <Badge variant={fault.currentStage === "kapatildi" ? "default" : "secondary"}>
                {fault.currentStage === "kapatildi" ? "Çözüldü" : "Açık"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arıza Güncelle</DialogTitle>
            <DialogDescription>
              Arıza detaylarını güncelleyebilirsiniz
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atanan Kişi</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Atama Kaldır</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerçek Maliyet (₺)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                      <Textarea placeholder="..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
