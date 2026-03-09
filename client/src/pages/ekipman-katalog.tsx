import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type EquipmentCatalog, type Branch } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Pencil,
  Send,
  BookOpen,
  Wrench,
  AlertTriangle,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const EQUIPMENT_TYPE_OPTIONS = [
  { value: "espresso", label: "Espresso Makinesi" },
  { value: "grinder", label: "Öğütücü" },
  { value: "refrigerator", label: "Buzdolabı" },
  { value: "oven", label: "Fırın" },
  { value: "dishwasher", label: "Bulaşık Makinesi" },
  { value: "mixer", label: "Mikser" },
  { value: "display_case", label: "Teşhir Dolabı" },
  { value: "ice_machine", label: "Buz Makinesi" },
  { value: "water_filter", label: "Su Filtresi" },
  { value: "pos_system", label: "POS Sistemi" },
] as const;

const equipmentTypeLabels: Record<string, string> = Object.fromEntries(
  EQUIPMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const catalogFormSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  equipmentType: z.string().min(1, "Ekipman tipi zorunludur"),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  usageGuide: z.string().optional().default(""),
  calibrationProcedure: z.string().optional().default(""),
  calibrationIntervalDays: z.coerce.number().optional(),
  maintenanceIntervalDays: z.coerce.number().optional(),
  maintenanceGuide: z.string().optional().default(""),
  troubleshootSteps: z.array(z.object({
    order: z.number(),
    title: z.string(),
    description: z.string(),
    requiresPhoto: z.boolean(),
  })).default([]),
  tips: z.string().optional().default(""),
  defaultServiceProviderName: z.string().optional().default(""),
  defaultServiceProviderPhone: z.string().optional().default(""),
  defaultServiceProviderEmail: z.string().optional().default(""),
  defaultServiceProviderAddress: z.string().optional().default(""),
});

type CatalogFormValues = z.infer<typeof catalogFormSchema>;

const assignFormSchema = z.object({
  branchId: z.coerce.number().min(1, "Şube seçimi zorunludur"),
  serialNumber: z.string().min(1, "Seri numarası zorunludur"),
  warrantyEndDate: z.string().optional().default(""),
  purchaseDate: z.string().optional().default(""),
});

type AssignFormValues = z.infer<typeof assignFormSchema>;

export default function EkipmanKatalog() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentCatalog | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningItemId, setAssigningItemId] = useState<number | null>(null);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (typeFilter) queryParams.set("equipmentType", typeFilter);
  const queryString = queryParams.toString();

  const { data: catalogItems, isLoading, isError, refetch } = useQuery<EquipmentCatalog[]>({
    queryKey: ["/api/equipment-catalog", queryString ? `?${queryString}` : ""],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: "",
      equipmentType: "",
      brand: "",
      model: "",
      imageUrl: "",
      usageGuide: "",
      calibrationProcedure: "",
      calibrationIntervalDays: undefined,
      maintenanceIntervalDays: 30,
      maintenanceGuide: "",
      troubleshootSteps: [],
      tips: "",
      defaultServiceProviderName: "",
      defaultServiceProviderPhone: "",
      defaultServiceProviderEmail: "",
      defaultServiceProviderAddress: "",
    },
  });

  const editForm = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      name: "",
      equipmentType: "",
      brand: "",
      model: "",
      imageUrl: "",
      usageGuide: "",
      calibrationProcedure: "",
      calibrationIntervalDays: undefined,
      maintenanceIntervalDays: 30,
      maintenanceGuide: "",
      troubleshootSteps: [],
      tips: "",
      defaultServiceProviderName: "",
      defaultServiceProviderPhone: "",
      defaultServiceProviderEmail: "",
      defaultServiceProviderAddress: "",
    },
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      branchId: 0,
      serialNumber: "",
      warrantyEndDate: "",
      purchaseDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CatalogFormValues) => {
      await apiRequest("POST", "/api/equipment-catalog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-catalog"] });
      toast({ title: "Başarılı", description: "Katalog öğesi oluşturuldu" });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Katalog öğesi oluşturulamadı", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CatalogFormValues }) => {
      await apiRequest("PUT", `/api/equipment-catalog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-catalog"] });
      toast({ title: "Başarılı", description: "Katalog öğesi güncellendi" });
      setIsEditOpen(false);
      setEditingItem(null);
      editForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Katalog öğesi güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/equipment-catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-catalog"] });
      toast({ title: "Başarılı", description: "Katalog öğesi silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Katalog öğesi silinemedi", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ catalogId, data }: { catalogId: number; data: AssignFormValues }) => {
      await apiRequest("POST", `/api/equipment-catalog/${catalogId}/assign-to-branch`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Başarılı", description: "Ekipman şubeye atandı" });
      setIsAssignOpen(false);
      setAssigningItemId(null);
      assignForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Ekipman atanamadı", variant: "destructive" });
    },
  });

  const openEditDialog = (item: EquipmentCatalog) => {
    setEditingItem(item);
    editForm.reset({
      name: item.name,
      equipmentType: item.equipmentType,
      brand: item.brand || "",
      model: item.model || "",
      imageUrl: item.imageUrl || "",
      usageGuide: item.usageGuide || "",
      calibrationProcedure: item.calibrationProcedure || "",
      calibrationIntervalDays: item.calibrationIntervalDays ?? undefined,
      maintenanceIntervalDays: item.maintenanceIntervalDays ?? 30,
      maintenanceGuide: item.maintenanceGuide || "",
      troubleshootSteps: (item.troubleshootSteps as any[]) || [],
      tips: item.tips || "",
      defaultServiceProviderName: item.defaultServiceProviderName || "",
      defaultServiceProviderPhone: item.defaultServiceProviderPhone || "",
      defaultServiceProviderEmail: item.defaultServiceProviderEmail || "",
      defaultServiceProviderAddress: item.defaultServiceProviderAddress || "",
    });
    setIsEditOpen(true);
  };

  const openAssignDialog = (itemId: number) => {
    setAssigningItemId(itemId);
    assignForm.reset({ branchId: 0, serialNumber: "", warrantyEndDate: "", purchaseDate: "" });
    setIsAssignOpen(true);
  };

  const [troubleshootSteps, setTroubleshootSteps] = useState<Array<{ order: number; title: string; description: string; requiresPhoto: boolean }>>([]);
  const [editTroubleshootSteps, setEditTroubleshootSteps] = useState<Array<{ order: number; title: string; description: string; requiresPhoto: boolean }>>([]);

  const addTroubleshootStep = (isEdit: boolean) => {
    const steps = isEdit ? editTroubleshootSteps : troubleshootSteps;
    const setSteps = isEdit ? setEditTroubleshootSteps : setTroubleshootSteps;
    const formRef = isEdit ? editForm : form;
    const newStep = { order: steps.length + 1, title: "", description: "", requiresPhoto: false };
    const updated = [...steps, newStep];
    setSteps(updated);
    formRef.setValue("troubleshootSteps", updated);
  };

  const updateTroubleshootStep = (isEdit: boolean, index: number, field: string, value: any) => {
    const steps = isEdit ? editTroubleshootSteps : troubleshootSteps;
    const setSteps = isEdit ? setEditTroubleshootSteps : setTroubleshootSteps;
    const formRef = isEdit ? editForm : form;
    const updated = steps.map((step, i) => i === index ? { ...step, [field]: value } : step);
    setSteps(updated);
    formRef.setValue("troubleshootSteps", updated);
  };

  const removeTroubleshootStep = (isEdit: boolean, index: number) => {
    const steps = isEdit ? editTroubleshootSteps : troubleshootSteps;
    const setSteps = isEdit ? setEditTroubleshootSteps : setTroubleshootSteps;
    const formRef = isEdit ? editForm : form;
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(updated);
    formRef.setValue("troubleshootSteps", updated);
  };

  const renderCatalogForm = (currentForm: ReturnType<typeof useForm<CatalogFormValues>>, onSubmit: (data: CatalogFormValues) => void, isPending: boolean, isEdit: boolean) => {
    const steps = isEdit ? editTroubleshootSteps : troubleshootSteps;

    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <Form {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ekipman adı" data-testid="input-catalog-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="equipmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ekipman Tipi *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-catalog-type">
                        <SelectValue placeholder="Tip seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EQUIPMENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marka</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Marka" data-testid="input-catalog-brand" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Model" data-testid="input-catalog-model" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={currentForm.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Görsel URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." data-testid="input-catalog-image" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={currentForm.control}
            name="usageGuide"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kullanım Kılavuzu</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Kullanım talimatları..." rows={3} data-testid="textarea-catalog-usage" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="calibrationProcedure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kalibrasyon Prosedürü</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Kalibrasyon adımları..." rows={2} data-testid="textarea-catalog-calibration" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="calibrationIntervalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kalibrasyon Aralığı (gün)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} placeholder="90" data-testid="input-catalog-calibration-days" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="maintenanceIntervalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bakım Aralığı (gün)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ""} placeholder="30" data-testid="input-catalog-maintenance-days" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={currentForm.control}
              name="maintenanceGuide"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bakım Kılavuzu</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Bakım talimatları..." rows={2} data-testid="textarea-catalog-maintenance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <FormLabel>Arıza Giderme Adımları</FormLabel>
              <Button type="button" variant="outline" size="sm" onClick={() => addTroubleshootStep(isEdit)} data-testid="button-add-troubleshoot">
                <Plus className="mr-1 h-3 w-3" />
                Adım Ekle
              </Button>
            </div>
            {steps.map((step, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Adım {step.order}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTroubleshootStep(isEdit, index)} data-testid={`button-remove-step-${index}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Başlık"
                    value={step.title}
                    onChange={(e) => updateTroubleshootStep(isEdit, index, "title", e.target.value)}
                    data-testid={`input-step-title-${index}`}
                  />
                  <Textarea
                    placeholder="Açıklama"
                    value={step.description}
                    onChange={(e) => updateTroubleshootStep(isEdit, index, "description", e.target.value)}
                    rows={2}
                    data-testid={`textarea-step-desc-${index}`}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={step.requiresPhoto}
                      onCheckedChange={(checked) => updateTroubleshootStep(isEdit, index, "requiresPhoto", !!checked)}
                      data-testid={`checkbox-step-photo-${index}`}
                    />
                    <span className="text-sm">Fotoğraf gerekli</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <FormField
            control={currentForm.control}
            name="tips"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İpuçları</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Ekipman ipuçları..." rows={2} data-testid="textarea-catalog-tips" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium">Varsayılan Servis Sağlayıcı</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={currentForm.control}
                name="defaultServiceProviderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Servis firma adı" data-testid="input-service-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={currentForm.control}
                name="defaultServiceProviderPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0532 ..." data-testid="input-service-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={currentForm.control}
                name="defaultServiceProviderEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="servis@firma.com" data-testid="input-service-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={currentForm.control}
                name="defaultServiceProviderAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Servis adresi" data-testid="input-service-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-catalog-submit">
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-catalog-title">
            Ekipman Kataloğu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Merkez ekipman tanımlarını ve şubeye atamalarını yönetin
          </p>
        </div>
        <Button onClick={() => { form.reset(); setTroubleshootSteps([]); setIsCreateOpen(true); }} data-testid="button-create-catalog">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Ekipman Tanımı
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ekipman ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-catalog-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]" data-testid="select-catalog-filter">
            <SelectValue placeholder="Tüm Tipler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {EQUIPMENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !catalogItems || catalogItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center" data-testid="text-empty-catalog">
              Henüz katalog öğesi bulunmamaktadır
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogItems.map((item) => (
            <Card key={item.id} className="hover-elevate" data-testid={`card-catalog-${item.id}`}>
              {item.imageUrl && (
                <div className="h-40 overflow-hidden rounded-t-md">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    data-testid={`img-catalog-${item.id}`}
                    loading="lazy"
                  />
                </div>
              )}
              {!item.imageUrl && (
                <div className="h-40 bg-muted flex items-center justify-center rounded-t-md">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base" data-testid={`text-catalog-name-${item.id}`}>
                    {item.name}
                  </CardTitle>
                  <Badge variant="secondary" data-testid={`badge-catalog-type-${item.id}`}>
                    {equipmentTypeLabels[item.equipmentType] || item.equipmentType}
                  </Badge>
                </div>
                {(item.brand || item.model) && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-catalog-brand-${item.id}`}>
                    {[item.brand, item.model].filter(Boolean).join(" - ")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {item.usageGuide && (
                    <Badge variant="outline">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Kılavuz
                    </Badge>
                  )}
                  {item.troubleshootSteps && (item.troubleshootSteps as any[]).length > 0 && (
                    <Badge variant="outline">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {(item.troubleshootSteps as any[]).length} Adım
                    </Badge>
                  )}
                  {item.maintenanceIntervalDays && (
                    <Badge variant="outline">
                      <Wrench className="mr-1 h-3 w-3" />
                      {item.maintenanceIntervalDays} gün
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                    data-testid={`button-edit-catalog-${item.id}`}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Düzenle
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openAssignDialog(item.id)}
                    data-testid={`button-assign-catalog-${item.id}`}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Şubeye Ata
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Ekipman Tanımı</DialogTitle>
            <DialogDescription>Merkez ekipman kataloğuna yeni bir ekipman tanımı ekleyin</DialogDescription>
          </DialogHeader>
          {renderCatalogForm(form, (data) => createMutation.mutate(data), createMutation.isPending, false)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ekipman Düzenle</DialogTitle>
            <DialogDescription>{editingItem?.name} ekipmanını düzenleyin</DialogDescription>
          </DialogHeader>
          {editingItem && renderCatalogForm(
            editForm,
            (data) => updateMutation.mutate({ id: editingItem.id, data }),
            updateMutation.isPending,
            true
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={(open) => { setIsAssignOpen(open); if (!open) setAssigningItemId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şubeye Ekipman Ata</DialogTitle>
            <DialogDescription>Bu ekipmanı bir şubeye atayın</DialogDescription>
          </DialogHeader>
          <Form {...assignForm}>
            <form
              onSubmit={assignForm.handleSubmit((data) => {
                if (assigningItemId) assignMutation.mutate({ catalogId: assigningItemId, data });
              })}
              className="space-y-4"
            >
              <FormField
                control={assignForm.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assign-branch">
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
                control={assignForm.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seri Numarası *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Seri numarası girin" data-testid="input-assign-serial" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignForm.control}
                name="warrantyEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garanti Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-assign-warranty" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satın Alma Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-assign-purchase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)} data-testid="button-assign-cancel">
                  İptal
                </Button>
                <Button type="submit" disabled={assignMutation.isPending} data-testid="button-assign-submit">
                  {assignMutation.isPending ? "Atanıyor..." : "Şubeye Ata"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
