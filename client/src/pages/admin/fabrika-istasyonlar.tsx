import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Factory, 
  Plus, 
  Pencil, 
  Trash2, 
  Target,
  Clock,
  Settings,
  RefreshCw,
  Save
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

interface Station {
  id: number;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  targetHourlyOutput: number | null;
  maxCapacity: number | null;
  isActive: boolean;
  sortOrder: number | null;
}

const stationSchema = z.object({
  name: z.string().min(2, "İstasyon adı en az 2 karakter olmalı"),
  code: z.string().min(2, "Kod en az 2 karakter olmalı"),
  description: z.string().optional(),
  category: z.string().optional(),
  targetHourlyOutput: z.coerce.number().min(0).optional(),
  maxCapacity: z.coerce.number().min(1).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().optional(),
});

type StationFormValues = z.infer<typeof stationSchema>;

const CATEGORIES = [
  { value: "hamur", label: "Hamur Hazırlama" },
  { value: "pisirim", label: "Pişirme" },
  { value: "dekor", label: "Dekorasyon" },
  { value: "paketleme", label: "Paketleme" },
  { value: "kalite", label: "Kalite Kontrol" },
  { value: "diger", label: "Diğer" },
];

export default function AdminFabrikaIstasyonlar() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const { data: stations = [], isLoading, refetch } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      category: "",
      targetHourlyOutput: 0,
      maxCapacity: 1,
      isActive: true,
      sortOrder: 0,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: StationFormValues) => {
      if (editingStation) {
        const res = await apiRequest('PATCH', `/api/factory/stations/${editingStation.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/factory/stations', data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingStation ? "İstasyon güncellendi" : "İstasyon oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/stations'] });
      setDialogOpen(false);
      setEditingStation(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/factory/stations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "İstasyon silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/stations'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    form.reset({
      name: station.name,
      code: station.code,
      description: station.description || "",
      category: station.category || "",
      targetHourlyOutput: station.targetHourlyOutput || 0,
      maxCapacity: station.maxCapacity || 1,
      isActive: station.isActive,
      sortOrder: station.sortOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStation(null);
    form.reset({
      name: "",
      code: "",
      description: "",
      category: "",
      targetHourlyOutput: 0,
      maxCapacity: 1,
      isActive: true,
      sortOrder: stations.length + 1,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: StationFormValues) => {
    saveMutation.mutate(data);
  };

  const getCategoryLabel = (category: string | null) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category || "Belirsiz";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika İstasyon Yönetimi</h1>
            <p className="text-muted-foreground">Üretim istasyonlarını yapılandırın</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={handleCreate} className="bg-amber-600 hover:bg-amber-700" data-testid="button-add-station">
            <Plus className="h-4 w-4 mr-2" />
            Yeni İstasyon
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İstasyonlar</CardTitle>
          <CardDescription>{stations.length} istasyon tanımlı</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : stations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Hedef/Saat</TableHead>
                  <TableHead>Kapasite</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => (
                  <TableRow key={station.id} data-testid={`row-station-${station.id}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{station.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCategoryLabel(station.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-amber-500" />
                        <span>{station.targetHourlyOutput || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{station.maxCapacity || 1} kişi</span>
                    </TableCell>
                    <TableCell>
                      {station.isActive ? (
                        <Badge className="bg-green-600">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(station)}
                          data-testid={`button-edit-${station.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => requestDelete(station.id, station.name || "")}
                          data-testid={`button-delete-${station.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz istasyon tanımlı değil</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                İlk İstasyonu Oluştur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStation ? "İstasyon Düzenle" : "Yeni İstasyon"}
            </DialogTitle>
            <DialogDescription>
              {editingStation ? "İstasyon bilgilerini güncelleyin" : "Yeni bir üretim istasyonu oluşturun"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İstasyon Adı</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Donut Hamur Hattı" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kod</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="DHH" className="font-mono" data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="İstasyon hakkında açıklama..." data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetHourlyOutput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saatlik Hedef</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="100" data-testid="input-target" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maks. Kapasite (kişi)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="3" data-testid="input-capacity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Aktif Durum</FormLabel>
                      <p className="text-sm text-muted-foreground">İstasyon aktif mi?</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={saveMutation.isPending} data-testid="button-save">
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
        description={`"${deleteState.itemName || ''}" istasyonu silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
