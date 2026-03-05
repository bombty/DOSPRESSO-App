import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Trash2, 
  Plus, 
  Pencil, 
  RefreshCw,
  Save,
  ClipboardCheck,
  Ruler,
  ToggleLeft,
  FileText,
  Camera
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

interface QualitySpec {
  id: number;
  stationId: number;
  productId: number | null;
  name: string;
  description: string | null;
  measurementType: string;
  unit: string | null;
  minValue: string | null;
  maxValue: string | null;
  targetValue: string | null;
  isRequired: boolean;
  requirePhoto: boolean;
  sortOrder: number | null;
  isActive: boolean;
}

interface Station {
  id: number;
  name: string;
  code: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
}

const qualitySpecSchema = z.object({
  stationId: z.coerce.number().min(1, "İstasyon seçiniz"),
  productId: z.coerce.number().optional().nullable(),
  name: z.string().min(2, "Kriter adı en az 2 karakter olmalı"),
  description: z.string().optional(),
  measurementType: z.string().min(1, "Ölçüm tipi seçiniz"),
  unit: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  targetValue: z.string().optional(),
  isRequired: z.boolean().default(true),
  requirePhoto: z.boolean().default(false),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

type QualitySpecFormValues = z.infer<typeof qualitySpecSchema>;

const MEASUREMENT_TYPES = [
  { value: "numeric", label: "Sayısal (Min/Max)", icon: Ruler },
  { value: "boolean", label: "Evet/Hayır (Checkbox)", icon: ToggleLeft },
  { value: "text", label: "Metin (Açıklama)", icon: FileText },
];

const PRODUCT_CATEGORIES = [
  { value: "donut", label: "Donut" },
  { value: "cinnaboom", label: "Cinnaboom" },
  { value: "quesadilla", label: "Quesadilla" },
  { value: "mamabon", label: "Mamabon" },
  { value: "cookie", label: "Cookie" },
  { value: "cake", label: "Cake" },
  { value: "cheesecake", label: "Cheesecake" },
  { value: "brownie", label: "Brownie" },
  { value: "kruvasan", label: "Kruvasan" },
  { value: "sirup", label: "Şurup" },
  { value: "sos", label: "Sos" },
];

export default function AdminFabrikaKaliteKriterleri() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<QualitySpec | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: specs = [], isLoading, refetch } = useQuery<QualitySpec[]>({
    queryKey: ['/api/factory/quality-specs'],
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/factory/products'],
  });

  const form = useForm<QualitySpecFormValues>({
    resolver: zodResolver(qualitySpecSchema),
    defaultValues: {
      stationId: 0,
      productId: null,
      name: "",
      description: "",
      measurementType: "boolean",
      unit: "",
      minValue: "",
      maxValue: "",
      targetValue: "",
      isRequired: true,
      requirePhoto: false,
      sortOrder: 0,
      isActive: true,
    },
  });

  const measurementType = form.watch("measurementType");

  const saveMutation = useMutation({
    mutationFn: async (data: QualitySpecFormValues) => {
      if (editingSpec) {
        const res = await apiRequest('PATCH', `/api/factory/quality-specs/${editingSpec.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/factory/quality-specs', data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingSpec ? "Kriter güncellendi" : "Kriter oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/quality-specs'] });
      setDialogOpen(false);
      setEditingSpec(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/factory/quality-specs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kriter silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/quality-specs'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (spec: QualitySpec) => {
    setEditingSpec(spec);
    form.reset({
      stationId: spec.stationId,
      productId: spec.productId || undefined,
      name: spec.name,
      description: spec.description || "",
      measurementType: spec.measurementType,
      unit: spec.unit || "",
      minValue: spec.minValue || "",
      maxValue: spec.maxValue || "",
      targetValue: spec.targetValue || "",
      isRequired: spec.isRequired,
      requirePhoto: spec.requirePhoto,
      sortOrder: spec.sortOrder || 0,
      isActive: spec.isActive,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSpec(null);
    form.reset({
      stationId: selectedStation || 0,
      productId: null,
      name: "",
      description: "",
      measurementType: "boolean",
      unit: "",
      minValue: "",
      maxValue: "",
      targetValue: "",
      isRequired: true,
      requirePhoto: false,
      sortOrder: 0,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleDelete = (spec: QualitySpec) => {
    requestDelete(spec.id, spec.name || "");
  };

  const onSubmit = (data: QualitySpecFormValues) => {
    saveMutation.mutate(data);
  };

  const filteredSpecs = specs.filter(spec => {
    if (selectedStation && spec.stationId !== selectedStation) return false;
    if (selectedCategory !== "all") {
      const product = products.find(p => p.id === spec.productId);
      if (!product || product.category !== selectedCategory) return false;
    }
    return true;
  });

  const getStationName = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.name || "-";
  };

  const getProductName = (productId: number | null) => {
    if (!productId) return "Genel";
    const product = products.find(p => p.id === productId);
    return product?.name || "-";
  };

  const getMeasurementTypeLabel = (type: string) => {
    const mt = MEASUREMENT_TYPES.find(t => t.value === type);
    return mt?.label || type;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Kalite Kontrol Kriterleri</CardTitle>
                <CardDescription>Ürün ve istasyon bazlı kalite kontrol kriterlerini yönetin</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleAdd} data-testid="button-add-spec">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kriter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={selectedStation?.toString() || "all"} onValueChange={(v) => setSelectedStation(v === "all" ? null : parseInt(v))}>
              <SelectTrigger className="w-[200px]" data-testid="select-station-filter">
                <SelectValue placeholder="İstasyon filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm İstasyonlar</SelectItem>
                {stations.map(station => (
                  <SelectItem key={station.id} value={station.id.toString()}>{station.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Kategori filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredSpecs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz kalite kriteri tanımlanmamış</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kriter Adı</TableHead>
                  <TableHead>İstasyon</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Ölçüm Tipi</TableHead>
                  <TableHead>Değerler</TableHead>
                  <TableHead>Zorunlu</TableHead>
                  <TableHead>Fotoğraf</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpecs.map((spec) => (
                  <TableRow key={spec.id} data-testid={`row-spec-${spec.id}`}>
                    <TableCell className="font-medium">{spec.name}</TableCell>
                    <TableCell>{getStationName(spec.stationId)}</TableCell>
                    <TableCell>{getProductName(spec.productId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMeasurementTypeLabel(spec.measurementType)}</Badge>
                    </TableCell>
                    <TableCell>
                      {spec.measurementType === "numeric" ? (
                        <span className="text-sm">
                          {spec.minValue && spec.maxValue 
                            ? `${spec.minValue} - ${spec.maxValue} ${spec.unit || ''}`
                            : spec.targetValue 
                              ? `Hedef: ${spec.targetValue} ${spec.unit || ''}`
                              : '-'}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {spec.isRequired ? (
                        <Badge variant="default">Zorunlu</Badge>
                      ) : (
                        <Badge variant="secondary">Opsiyonel</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {spec.requirePhoto && <Camera className="h-4 w-4 text-primary" />}
                    </TableCell>
                    <TableCell>
                      {spec.isActive ? (
                        <Badge className="bg-green-500">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(spec)} data-testid={`button-edit-${spec.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(spec)} data-testid={`button-delete-${spec.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpec ? "Kriter Düzenle" : "Yeni Kriter Ekle"}</DialogTitle>
            <DialogDescription>
              {editingSpec 
                ? "Kalite kontrol kriterini güncelleyin" 
                : "Yeni bir kalite kontrol kriteri tanımlayın"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İstasyon *</FormLabel>
                      <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                        <FormControl>
                          <SelectTrigger data-testid="input-station">
                            <SelectValue placeholder="İstasyon seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stations.map(station => (
                            <SelectItem key={station.id} value={station.id.toString()}>{station.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ürün (Opsiyonel)</FormLabel>
                      <Select 
                        value={field.value?.toString() || "general"} 
                        onValueChange={(v) => field.onChange(v === "general" ? null : parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="input-product">
                            <SelectValue placeholder="Ürün seçin veya genel bırakın" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">Genel (Tüm ürünler)</SelectItem>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Boş bırakılırsa istasyondaki tüm ürünler için geçerli olur</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kriter Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Gramaj Kontrolü" {...field} data-testid="input-name" />
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
                        placeholder="Kriter hakkında detaylı açıklama..." 
                        {...field} 
                        rows={2}
                        data-testid="input-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ölçüm Tipi *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="input-measurement-type">
                          <SelectValue placeholder="Ölçüm tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEASUREMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sayısal: Min/Max değer aralığı kontrolü, Evet/Hayır: Checkbox, Metin: Açık uçlu not
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {measurementType === "numeric" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <FormField
                    control={form.control}
                    name="minValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Değer</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="55" {...field} data-testid="input-min" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Değer</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="60" {...field} data-testid="input-max" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hedef Değer</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="57" {...field} data-testid="input-target" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birim</FormLabel>
                        <FormControl>
                          <Input placeholder="gr, cm, °C" {...field} data-testid="input-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Zorunlu</FormLabel>
                        <FormDescription>Bu kriter doldurulmadan geçilemez</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-required" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requirePhoto"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Fotoğraf Gerekli</FormLabel>
                        <FormDescription>Bu kriter için fotoğraf zorunlu</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-photo" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Aktif</FormLabel>
                        <FormDescription>Kriter aktif/pasif durumu</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıralama</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-sort-order" />
                    </FormControl>
                    <FormDescription>Düşük değer önce gösterilir</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" kriteri silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
