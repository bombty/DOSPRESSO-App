import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Settings, Plus, QrCode, Wrench, Calendar, MapPin } from "lucide-react";

export default function Equipment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [maintenanceFilter, setMaintenanceFilter] = useState<string | undefined>(undefined);

  const { data: equipment, isLoading } = useQuery<EquipmentType[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      await apiRequest("/api/equipment", "POST", data);
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

  const filteredEquipment = equipment?.filter((item) => {
    // Branch-level filtering: non-HQ users can only see their branch equipment
    if (user?.role && !isHQRole(user.role as any)) {
      if (user.branchId && item.branchId !== user.branchId) return false;
    }
    
    // Manual filters (for HQ users)
    if (selectedType && item.equipmentType !== selectedType) return false;
    if (selectedBranch && item.branchId !== parseInt(selectedBranch)) return false;
    if (maintenanceFilter === "overdue") {
      if (!item.nextMaintenanceDate) return false;
      return new Date(item.nextMaintenanceDate) < new Date();
    }
    if (maintenanceFilter === "upcoming") {
      if (!item.nextMaintenanceDate) return false;
      const daysUntilMaintenance = Math.ceil((new Date(item.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilMaintenance >= 0 && daysUntilMaintenance <= 7;
    }
    return true;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Ekipman Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Şube ekipmanlarını ve bakım takibini yönetin</p>
        </div>
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
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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

      <div className="flex flex-wrap gap-3">
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

        {(selectedType || selectedBranch || maintenanceFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedType(undefined);
              setSelectedBranch(undefined);
              setMaintenanceFilter(undefined);
            }}
            data-testid="button-clear-filters"
          >
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((item) => {
            const metadata = EQUIPMENT_METADATA[item.equipmentType as keyof typeof EQUIPMENT_METADATA];
            const maintenanceStatus = getMaintenanceStatus(item);
            
            return (
              <Card key={item.id} data-testid={`card-equipment-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {metadata.nameTr}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        S/N: {item.serialNumber}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" data-testid={`badge-type-${item.id}`}>
                      {item.equipmentType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
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

                  {canEdit && (
                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logMaintenanceMutation.mutate(item.id)}
                        disabled={logMaintenanceMutation.isPending}
                        className="flex-1"
                        data-testid={`button-log-maintenance-${item.id}`}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Bakım Kaydet
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
                    </div>
                  )}
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
              {selectedType || selectedBranch || maintenanceFilter
                ? "Filtrelere uygun ekipman bulunamadı"
                : "Henüz ekipman kaydı yok"}
            </p>
            {canCreate && !selectedType && !selectedBranch && !maintenanceFilter && (
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
    </div>
  );
}
