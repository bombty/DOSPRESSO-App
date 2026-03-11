import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Edit2, Trash2, Save, GripVertical, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface AuditTemplate {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  auditType: string | null;
  isActive: boolean;
  requiresPhoto: boolean;
  aiAnalysisEnabled: boolean;
  items: AuditTemplateItem[];
}

interface AuditTemplateItem {
  id: number;
  templateId: number;
  itemText: string;
  itemType: string | null;
  weight: string | null;
  section: string | null;
  requiresPhoto: boolean | null;
  sortOrder: number;
  maxPoints: number;
  aiCheckEnabled: boolean | null;
}

const TemplateSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı").max(200, "Başlık çok uzun"),
  description: z.string().max(500, "Açıklama çok uzun").optional().nullable(),
  category: z.string().max(100, "Kategori çok uzun").optional().nullable(),
  isActive: z.boolean(),
});

const ItemSchema = z.object({
  itemText: z.string().min(3, "Madde metni en az 3 karakter olmalı"),
  itemType: z.string().default("checkbox"),
  section: z.string().min(1, "Bölüm seçilmelidir"),
  weight: z.string().optional(),
  maxPoints: z.number().min(1).max(100).default(10),
  requiresPhoto: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

type TemplateFormValues = z.infer<typeof TemplateSchema>;
type ItemFormValues = z.infer<typeof ItemSchema>;

// Template type options (what kind of audit template is this)
const TEMPLATE_TYPE_OPTIONS = [
  { value: "magaza_denetimi", label: "Mağaza Denetimi" },
  { value: "hijyen_denetimi", label: "Hijyen Denetimi" },
  { value: "ekipman_denetimi", label: "Ekipman Denetimi" },
  { value: "acilis_denetimi", label: "Açılış Denetimi" },
  { value: "personel_denetimi", label: "Personel Denetimi" },
  { value: "genel", label: "Genel" },
];

// Section options for item scoring (6 weighted sections)
const SECTION_OPTIONS = [
  { value: "gida_guvenligi", label: "Gıda Güvenliği", weight: 25, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "urun_standardi", label: "Ürün Standardı", weight: 25, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { value: "servis", label: "Servis", weight: 15, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "operasyon", label: "Operasyon", weight: 15, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "marka", label: "Marka", weight: 10, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "ekipman", label: "Ekipman", weight: 10, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
];

const ITEM_TYPE_OPTIONS = [
  { value: "checkbox", label: "Checkbox (Evet/Hayır)" },
  { value: "rating", label: "Puanlama (1-10)" },
  { value: "text", label: "Metin Girişi" },
  { value: "photo", label: "Fotoğraf" },
];

export default function AdminKaliteDenetimSablonuDuzenle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const templateId = parseInt(params.id || "0");
  
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const { data: template, isLoading, isError, refetch } = useQuery<AuditTemplate>({
    queryKey: ["/api/audit-templates", templateId],
    enabled: templateId > 0,
  });

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      isActive: true,
    },
  });

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(ItemSchema),
    defaultValues: {
      itemText: "",
      itemType: "checkbox",
      section: "",
      weight: "",
      maxPoints: 10,
      requiresPhoto: false,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (template) {
      templateForm.reset({
        title: template.title,
        description: template.description || "",
        category: template.category || "",
        isActive: template.isActive,
      });
    }
  }, [template]);

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return await apiRequest("PUT", `/api/audit-templates/${templateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates"] });
      toast({ title: "Başarılı", description: "Şablon güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon güncellenemedi", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      return await apiRequest("POST", `/api/audit-templates/${templateId}/items`, {
        ...data,
        sortOrder: (template?.items?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates", templateId] });
      toast({ title: "Başarılı", description: "Madde eklendi" });
      itemForm.reset();
      setIsEditingItem(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Madde eklenemedi", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: number; data: ItemFormValues }) => {
      return await apiRequest("PUT", `/api/audit-templates/${templateId}/items/${itemId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates", templateId] });
      toast({ title: "Başarılı", description: "Madde güncellendi" });
      itemForm.reset();
      setEditingItemId(null);
      setIsEditingItem(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Madde güncellenemedi", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("DELETE", `/api/audit-templates/${templateId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates", templateId] });
      toast({ title: "Başarılı", description: "Madde silindi" });
      setDeleteItemId(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Madde silinemedi", variant: "destructive" });
    },
  });

  if (user?.role !== "admin" && user?.role !== "coach") {
    return <Redirect to="/" />;
  }

  const handleSaveTemplate = templateForm.handleSubmit((data) => {
    updateTemplateMutation.mutate(data);
  });

  const handleAddItem = itemForm.handleSubmit((data) => {
    if (editingItemId) {
      updateItemMutation.mutate({ itemId: editingItemId, data });
    } else {
      addItemMutation.mutate(data);
    }
  });

  const handleEditItem = (item: AuditTemplateItem) => {
    setEditingItemId(item.id);
    itemForm.reset({
      itemText: item.itemText,
      itemType: item.itemType || "checkbox",
      section: item.section || "",
      weight: item.weight || "",
      maxPoints: item.maxPoints,
      requiresPhoto: item.requiresPhoto || false,
      sortOrder: item.sortOrder,
    });
    setIsEditingItem(true);
  };

  const handleCancelItemEdit = () => {
    setEditingItemId(null);
    itemForm.reset();
    setIsEditingItem(false);
  };

  if (isLoading) {
    

  return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Şablon bulunamadı</p>
          <Link href="/admin/kalite-denetim-sablonlari">
            <Button variant="outline" className="mt-4">Geri Dön</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/kalite-denetim-sablonlari">
              <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Geri dön">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Şablon Düzenle</h1>
              <p className="text-sm text-muted-foreground">{template.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={template.isActive ? "default" : "secondary"} data-testid="badge-status">
              {template.isActive ? "Aktif" : "Pasif"}
            </Badge>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={updateTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {updateTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Şablon Bilgileri</CardTitle>
                <CardDescription>Temel şablon ayarları</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...templateForm}>
                  <form className="space-y-4">
                    <FormField
                      control={templateForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input placeholder="Şablon başlığı" data-testid="input-template-title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Şablon açıklaması" 
                              data-testid="textarea-template-desc" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şablon Türü</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Şablon türü seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Bu şablonun ne tür bir denetim için kullanılacağını belirtir
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Aktif</FormLabel>
                            <p className="text-xs text-muted-foreground">Şablon kullanılabilir durumda</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-is-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Section Weights Summary */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bölüm Ağırlıkları</CardTitle>
                <CardDescription className="text-xs">6 değerlendirme bölümü ve puanlama ağırlıkları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SECTION_OPTIONS.map((section) => {
                  const itemCount = template.items?.filter(i => i.section === section.value).length || 0;
                  return (
                    <div key={section.value} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={section.color} variant="outline">
                          {section.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{itemCount} madde</span>
                        <span className="font-medium">%{section.weight}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Denetim Maddeleri</CardTitle>
                    <CardDescription>{template.items?.length || 0} madde</CardDescription>
                  </div>
                  <Button 
                    onClick={() => { setEditingItemId(null); itemForm.reset(); setIsEditingItem(true); }}
                    size="sm"
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Madde Ekle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.items && template.items.length > 0 ? (
                    template.items
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item, idx) => (
                        <Card key={item.id} className="bg-muted/50" data-testid={`card-item-${item.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="font-medium text-sm">{idx + 1}</span>
                              </div>
                              <div className="flex-1 space-y-2">
                                <p className="font-medium" data-testid={`text-item-${item.id}`}>{item.itemText}</p>
                                <div className="flex gap-2 flex-wrap">
                                  {item.section && (
                                    <Badge 
                                      className={SECTION_OPTIONS.find(s => s.value === item.section)?.color || ""} 
                                      data-testid={`badge-section-${item.id}`}
                                    >
                                      {SECTION_OPTIONS.find(s => s.value === item.section)?.label || item.section}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" data-testid={`badge-type-${item.id}`}>
                                    {ITEM_TYPE_OPTIONS.find(o => o.value === item.itemType)?.label || item.itemType}
                                  </Badge>
                                  {item.weight && (
                                    <Badge variant="outline" data-testid={`badge-weight-${item.id}`}>
                                      Ağırlık: %{Number(item.weight).toFixed(2)}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" data-testid={`badge-points-${item.id}`}>
                                    Max: {item.maxPoints} puan
                                  </Badge>
                                  {item.requiresPhoto && (
                                    <Badge variant="secondary" data-testid={`badge-photo-${item.id}`}>
                                      <Camera className="h-3 w-3 mr-1" />
                                      Fotoğraf
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                  data-testid={`button-edit-item-${item.id}`}
                                  aria-label={`Maddeyi düzenle: ${item.itemText}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteItemId(item.id)}
                                  data-testid={`button-delete-item-${item.id}`}
                                  aria-label={`Maddeyi sil: ${item.itemText}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Henüz madde eklenmemiş</p>
                      <p className="text-sm">Yeni madde eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditingItem} onOpenChange={(open) => !open && handleCancelItemEdit()}>
        <DialogContent data-testid="dialog-item-form">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Madde Düzenle" : "Yeni Madde Ekle"}</DialogTitle>
            <DialogDescription>Denetim maddesi bilgilerini girin</DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={handleAddItem} className="space-y-4">
              <FormField
                control={itemForm.control}
                name="itemText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Madde Metni</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Denetim maddesi açıklaması" 
                        data-testid="textarea-item-text" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bölüm (Zorunlu)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-section">
                          <SelectValue placeholder="Bölüm seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.label}
                              <span className="text-xs text-muted-foreground">(%{opt.weight})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Bu madde hangi değerlendirme bölümüne ait?
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Madde Tipi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-type">
                            <SelectValue placeholder="Tip seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ITEM_TYPE_OPTIONS.map((opt) => (
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
                <FormField
                  control={itemForm.control}
                  name="maxPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Puan</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={100}
                          data-testid="input-max-points" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ağırlık (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="Örn: 6.25"
                        data-testid="input-weight" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="requiresPhoto"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Fotoğraf Gerekli</FormLabel>
                      <p className="text-xs text-muted-foreground">Bu madde için fotoğraf yüklenmeli</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-requires-photo"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancelItemEdit} data-testid="button-cancel-item">
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={addItemMutation.isPending || updateItemMutation.isPending}
                  data-testid="button-save-item"
                >
                  {(addItemMutation.isPending || updateItemMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingItemId ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!deleteItemId} 
        onOpenChange={(open) => {
          if (!open && !deleteItemMutation.isPending) {
            setDeleteItemId(null);
          }
        }}
      >
        <DialogContent data-testid="dialog-delete-item-confirm">
          <DialogHeader>
            <DialogTitle>Maddeyi Sil?</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz. Maddeyi silmek istediğinizden emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteItemId(null)}
              disabled={deleteItemMutation.isPending}
              data-testid="button-cancel-delete-item"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
              disabled={deleteItemMutation.isPending}
              data-testid="button-confirm-delete-item"
            >
              {deleteItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
