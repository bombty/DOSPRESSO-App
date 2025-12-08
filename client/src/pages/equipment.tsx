import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Equipment as EquipmentType, InsertEquipment, insertEquipmentSchema, Branch, hasPermission, isHQRole, EQUIPMENT_METADATA, EQUIPMENT_TYPES } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Plus, QrCode, Wrench, Calendar, MapPin, Pencil, AlertTriangle, Heart } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { FaultReportDialog } from "@/components/fault-report-dialog";

interface EquipmentWithHealth extends EquipmentType {
  healthScore?: number;
}

const getHealthScoreBadge = (score?: number) => {
  if (score === undefined) return null;
  if (score >= 80) {
    return { label: `${Math.round(score)} Sağlıklı`, variant: "default" as const, color: "text-success" };
  }
  if (score >= 50) {
    return { label: `${Math.round(score)} Uyarı`, variant: "secondary" as const, color: "text-warning" };
  }
  return { label: `${Math.round(score)} Kritik`, variant: "destructive" as const, color: "text-destructive" };
};

export default function Equipment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"type" | "health">("type");
  const [faultReportEquipment, setFaultReportEquipment] = useState<EquipmentType | null>(null);

  const { data: equipment, isLoading } = useQuery<EquipmentWithHealth[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: criticalEquipment } = useQuery<EquipmentWithHealth[]>({
    queryKey: ["/api/equipment/critical"],
  });

  const canCreate = user?.role && hasPermission(user.role as any, "equipment", "create");
  const canEdit = user?.role && hasPermission(user.role as any, "equipment", "edit");

  const form = useForm<InsertEquipment>({
    resolver: zodResolver(insertEquipmentSchema),
    defaultValues: {
      equipmentType: "espresso",
      serialNumber: "",
      purchaseDate: undefined,
      branchId: undefined,
      notes: "",
    },
  });

  const editForm = useForm<InsertEquipment>({
    resolver: zodResolver(insertEquipmentSchema),
    defaultValues: {
      equipmentType: "espresso",
      serialNumber: "",
      purchaseDate: undefined,
      warrantyEndDate: undefined,
      lastMaintenanceDate: undefined,
      branchId: undefined,
      notes: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      await apiRequest("POST", "/api/equipment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Başarılı", description: "Ekipman kaydı oluşturuldu" });
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
        description: "Ekipman kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertEquipment }) => {
      await apiRequest(`/api/equipment/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Başarılı", description: "Ekipman güncellendi" });
      setIsEditDialogOpen(false);
      setEditingEquipment(null);
      editForm.reset();
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
        description: "Ekipman güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const logMaintenanceMutation = useMutation({
    mutationFn: async (equipmentId: number) => {
      await apiRequest(`/api/equipment/${equipmentId}/maintenance`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Başarılı", description: "Bakım kaydı oluşturuldu" });
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
        description: "Bakım kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const bulkQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/equipment/generate-qr-bulk", {});
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ 
        title: "Başarılı", 
        description: data.message || `${data.generated} ekipman için QR kodu oluşturuldu`
      });
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
        description: "Toplu QR kod oluşturma başarısız",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (equipment: EquipmentType) => {
    setEditingEquipment(equipment);
    editForm.reset({
      equipmentType: equipment.equipmentType,
      serialNumber: equipment.serialNumber || "",
      purchaseDate: equipment.purchaseDate || undefined,
      warrantyEndDate: equipment.warrantyEndDate || undefined,
      lastMaintenanceDate: equipment.lastMaintenanceDate || undefined,
      branchId: equipment.branchId,
      notes: equipment.notes || "",
      isActive: equipment.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const filteredEquipment = equipment
    ?.filter((item: EquipmentWithHealth) => {
      // Branch-level filtering: non-HQ users can only see their branch equipment
      if (user?.role && !isHQRole(user.role as any)) {
        if (user.branchId && item.branchId !== user.branchId) return false;
      }
      
      // Manual filters (for HQ users)
      if (selectedType && item.equipmentType !== selectedType) return false;
      if (selectedBranch && item.branchId !== parseInt(selectedBranch)) return false;
      if (maintenanceFilter && maintenanceFilter !== "all") {
        if (maintenanceFilter === "overdue") {
          if (!item.nextMaintenanceDate) return false;
          return new Date(item.nextMaintenanceDate) < new Date();
        }
        if (maintenanceFilter === "upcoming") {
          if (!item.nextMaintenanceDate) return false;
          const daysUntilMaintenance = Math.ceil((new Date(item.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilMaintenance >= 0 && daysUntilMaintenance <= 7;
        }
      }
      // Health filter
      if (healthFilter && healthFilter !== "all") {
        if (healthFilter === "critical") {
          return (item.healthScore ?? 100) < 50;
        }
        if (healthFilter === "warning") {
          const score = item.healthScore ?? 100;
          return score >= 50 && score < 80;
        }
        if (healthFilter === "healthy") {
          return (item.healthScore ?? 100) >= 80;
        }
      }
      return true;
    })
    .sort((a: EquipmentWithHealth, b: EquipmentWithHealth) => {
      if (sortBy === "health") {
        return (b.healthScore ?? 100) - (a.healthScore ?? 100);
      }
      return a.equipmentType.localeCompare(b.equipmentType);
    });

  const getMaintenanceStatus = (item: EquipmentType) => {
    if (!item.nextMaintenanceDate) return null;
    const daysUntilMaintenance = Math.ceil((new Date(item.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilMaintenance < 0) {
      return { label: `${Math.abs(daysUntilMaintenance)} gün gecikmiş`, variant: "destructive" as const };
    }
    if (daysUntilMaintenance <= 7) {
      return { label: `${daysUntilMaintenance} gün içinde`, variant: "default" as const };
    }
    return { label: `${daysUntilMaintenance} gün sonra`, variant: "secondary" as const };
  };

  const getBranchName = (branchId: number) => {
    return branches?.find((b) => b.id === branchId)?.name || "Bilinmeyen Şube";
  };

  const isHQ = user?.role && isHQRole(user.role as any);
  const missingQRCount = equipment?.filter(e => !e.qrCodeUrl).length || 0;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      {criticalEquipment && criticalEquipment.length > 0 && (
        <Card className="border-destructive bg-destructive/10 dark:bg-red-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive dark:text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Kritik Ekipmanlar ({criticalEquipment.length})
            </CardTitle>
            <CardDescription className="text-xs text-destructive dark:text-red-300">
              Sağlık skoru 50'nin altında olan ekipmanlar acil bakım gerektiriyor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {criticalEquipment.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-destructive/30 dark:border-destructive/40">
                  <div className="flex-1">
                    <p className="font-semibold text-sm" data-testid={`text-critical-${item.id}`}>
                      {EQUIPMENT_METADATA[item.equipmentType as keyof typeof EQUIPMENT_METADATA]?.nameTr || item.equipmentType}
                    </p>
                    <p className="text-xs text-muted-foreground">{getBranchName(item.branchId)}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setFaultReportEquipment(item)}
                    data-testid={`button-critical-report-${item.id}`}
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Arıza
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">Ekipman Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">Şube ekipmanlarını ve bakım takibini yönetin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHQ && missingQRCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => bulkQRMutation.mutate()}
              disabled={bulkQRMutation.isPending}
              data-testid="button-generate-qr-bulk"
            >
              <QrCode className="mr-2 h-4 w-4" />
              {bulkQRMutation.isPending 
                ? "QR Oluşturuluyor..." 
                : `${missingQRCount} Ekipman için QR Oluştur`
              }
            </Button>
          )}
          {canCreate && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-equipment">
                  <Plus className="mr-2 h-4 w-4" />
                  Ekipman Ekle
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Ekipman Kaydı</DialogTitle>
                <DialogDescription>
                  Yeni satın alınan ekipmanın bilgilerini girin
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                  <FormField
                    control={form.control}
                    name="equipmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ekipman Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-equipment-type">
                              <SelectValue placeholder="Ekipman tipi seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(EQUIPMENT_TYPES).map((type) => (
                              <SelectItem key={type} value={type}>
                                {EQUIPMENT_METADATA[type].nameTr}
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
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seri Numarası</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Ekipman seri numarası" data-testid="input-serial-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Satın Alma Tarihi</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            data-testid="input-purchase-date" 
                          />
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
                    name="faultProtocol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arıza Yönetimi Sorumlusu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'branch'}>
                          <FormControl>
                            <SelectTrigger data-testid="select-fault-protocol">
                              <SelectValue placeholder="Sorumlu seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="branch">
                              <span className="flex items-center gap-2">Şube</span>
                            </SelectItem>
                            <SelectItem value="hq_teknik">
                              <span className="flex items-center gap-2">Merkez (HQ Teknik)</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.value === 'hq_teknik' 
                            ? 'Arızalar Merkez Teknik Ekibine iletilecektir' 
                            : 'Arızalar Şube tarafından yönetilecektir'}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Ek bilgiler" data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                      {createMutation.isPending ? "Ekleniyor..." : "Ekipman Ekle"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-equipment">
          <DialogHeader>
            <DialogTitle>Ekipman Düzenle</DialogTitle>
            <DialogDescription>
              Ekipman bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (editingEquipment) {
                updateMutation.mutate({ id: editingEquipment.id, data });
              }
            })} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={editForm.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ekipman Tipi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-equipment-type">
                          <SelectValue placeholder="Ekipman tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(EQUIPMENT_TYPES).map((type) => (
                          <SelectItem key={type} value={type}>
                            {EQUIPMENT_METADATA[type].nameTr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seri Numarası</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Ekipman seri numarası" data-testid="input-edit-serial-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satın Alma Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-purchase-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="warrantyEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garanti Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-warranty-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="lastMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Son Bakım Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-maintenance-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-branch">
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
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Pasif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="faultProtocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arıza Yönetimi Sorumlusu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'branch'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-fault-protocol">
                          <SelectValue placeholder="Sorumlu seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="branch">
                          <span className="flex items-center gap-2">Şube</span>
                        </SelectItem>
                        <SelectItem value="hq_teknik">
                          <span className="flex items-center gap-2">Merkez (HQ Teknik)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === 'hq_teknik' 
                        ? 'Arızalar Merkez Teknik Ekibine iletilecektir' 
                        : 'Arızalar Şube tarafından yönetilecektir'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Ek bilgiler" data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingEquipment(null);
                    editForm.reset();
                  }}
                  data-testid="button-edit-cancel"
                >
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-edit-submit">
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]" data-testid="filter-type">
            <SelectValue placeholder="Tüm Tipler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {Object.values(EQUIPMENT_TYPES).map((type) => (
              <SelectItem key={type} value={type}>
                {EQUIPMENT_METADATA[type].nameTr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Branch filter - only for HQ users */}
        {user?.role && isHQRole(user.role as any) && branches && branches.length > 1 && (
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px]" data-testid="filter-branch">
              <SelectValue placeholder="Tüm Şubeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
          <SelectTrigger className="w-[200px]" data-testid="filter-maintenance">
            <SelectValue placeholder="Bakım Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ekipmanlar</SelectItem>
            <SelectItem value="overdue">Gecikmiş Bakımlar</SelectItem>
            <SelectItem value="upcoming">Yaklaşan Bakımlar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[200px]" data-testid="filter-health">
            <SelectValue placeholder="Sağlık Durumu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="healthy">Sağlıklı (80+)</SelectItem>
            <SelectItem value="warning">Uyarı (50-79)</SelectItem>
            <SelectItem value="critical">Kritik (&lt;50)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as "type" | "health")}>
          <SelectTrigger className="w-[200px]" data-testid="sort-by">
            <SelectValue placeholder="Sıralama" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="type">Türe Göre</SelectItem>
            <SelectItem value="health">Sağlık Skoruna Göre</SelectItem>
          </SelectContent>
        </Select>

        {(selectedType || selectedBranch || (maintenanceFilter && maintenanceFilter !== "all") || (healthFilter && healthFilter !== "all")) && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedType(undefined);
              setSelectedBranch(undefined);
              setMaintenanceFilter("all");
              setHealthFilter("all");
            }}
            data-testid="button-clear-filters"
          >
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEquipment && filteredEquipment.length > 0 ? (
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((item) => {
            const metadata = EQUIPMENT_METADATA[item.equipmentType as keyof typeof EQUIPMENT_METADATA];
            const maintenanceStatus = getMaintenanceStatus(item);
            
            return (
              <Card key={item.id} data-testid={`card-equipment-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <Link href={`/ekipman/${item.id}`} data-testid={`link-equipment-${item.id}`}>
                          <span className="hover-elevate rounded-sm px-1 -mx-1 cursor-pointer">
                            {metadata.nameTr}
                          </span>
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        S/N: {item.serialNumber}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          data-testid={`button-edit-equipment-${item.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Badge variant="outline" data-testid={`badge-type-${item.id}`}>
                        {item.equipmentType}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-branch-${item.id}`}>{getBranchName(item.branchId)}</span>
                  </div>
                  
                  {item.purchaseDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Alım: {new Date(item.purchaseDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  )}

                  {maintenanceStatus && (
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={maintenanceStatus.variant} data-testid={`badge-maintenance-${item.id}`}>
                        {maintenanceStatus.label}
                      </Badge>
                    </div>
                  )}

                  {(() => {
                    const healthBadge = getHealthScoreBadge((item as EquipmentWithHealth).healthScore);
                    return healthBadge ? (
                      <div className="flex items-center gap-2">
                        <Heart className={`h-4 w-4 ${healthBadge.color}`} />
                        <Badge variant={healthBadge.variant} data-testid={`badge-health-${item.id}`}>
                          {healthBadge.label}
                        </Badge>
                      </div>
                    ) : null;
                  })()}

                  {item.qrCodeUrl && (
                    <div className="pt-2">
                      <img 
                        src={item.qrCodeUrl} 
                        alt="QR Code" 
                        className="h-24 w-24 mx-auto border rounded"
                        data-testid={`img-qr-${item.id}`}
                      />
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {item.notes}
                    </p>
                  )}

                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFaultReportEquipment(item)}
                      className="flex-1"
                      data-testid={`button-report-fault-${item.id}`}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Arıza Bildir
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logMaintenanceMutation.mutate(item.id)}
                          disabled={logMaintenanceMutation.isPending}
                          data-testid={`button-log-maintenance-${item.id}`}
                        >
                          <Wrench className="mr-2 h-4 w-4" />
                          Bakım
                        </Button>
                        {item.qrCodeUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-view-qr-${item.id}`}
                          >
                            <a href={item.qrCodeUrl} target="_blank" rel="noopener noreferrer">
                              <QrCode className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {selectedType || selectedBranch || (maintenanceFilter && maintenanceFilter !== "all") || (healthFilter && healthFilter !== "all")
                ? "Filtrelere uygun ekipman bulunamadı"
                : "Henüz ekipman kaydı yok"}
            </p>
            {canCreate && !selectedType && !selectedBranch && (!maintenanceFilter || maintenanceFilter === "all") && (!healthFilter || healthFilter === "all") && (
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
                data-testid="button-add-first-equipment"
              >
                <Plus className="mr-2 h-4 w-4" />
                İlk Ekipmanı Ekle
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {faultReportEquipment && (
        <FaultReportDialog
          equipment={faultReportEquipment}
          isOpen={!!faultReportEquipment}
          onOpenChange={(open) => !open && setFaultReportEquipment(null)}
        />
      )}
    </div>
  );
}
