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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Trash2, 
  Plus, 
  Pencil, 
  RefreshCw,
  Save,
  AlertTriangle
} from "lucide-react";

interface WasteReason {
  id: number;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number | null;
}

const wasteReasonSchema = z.object({
  name: z.string().min(2, "Sebep adı en az 2 karakter olmalı"),
  category: z.string().min(1, "Kategori seçiniz"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().optional(),
});

type WasteReasonFormValues = z.infer<typeof wasteReasonSchema>;

const CATEGORIES = [
  { value: "uretim", label: "Üretim Hatası" },
  { value: "malzeme", label: "Malzeme Sorunu" },
  { value: "ekipman", label: "Ekipman Arızası" },
  { value: "insan", label: "İnsan Hatası" },
  { value: "kalite", label: "Kalite Standartları" },
  { value: "diger", label: "Diğer" },
];

export default function AdminFabrikaFireSebepleri() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<WasteReason | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<WasteReason | null>(null);

  const { data: reasons = [], isLoading, refetch } = useQuery<WasteReason[]>({
    queryKey: ['/api/factory/waste-reasons'],
  });

  const form = useForm<WasteReasonFormValues>({
    resolver: zodResolver(wasteReasonSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: WasteReasonFormValues) => {
      if (editingReason) {
        const res = await apiRequest('PATCH', `/api/factory/waste-reasons/${editingReason.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/factory/waste-reasons', data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingReason ? "Fire sebebi güncellendi" : "Fire sebebi oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/waste-reasons'] });
      setDialogOpen(false);
      setEditingReason(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/factory/waste-reasons/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fire sebebi silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/waste-reasons'] });
      setDeleteDialogOpen(false);
      setReasonToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (reason: WasteReason) => {
    setEditingReason(reason);
    form.reset({
      name: reason.name,
      category: reason.category,
      description: reason.description || "",
      isActive: reason.isActive,
      sortOrder: reason.sortOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingReason(null);
    form.reset({
      name: "",
      category: "",
      description: "",
      isActive: true,
      sortOrder: reasons.length + 1,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: WasteReasonFormValues) => {
    saveMutation.mutate(data);
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'uretim': return 'bg-amber-600';
      case 'malzeme': return 'bg-blue-600';
      case 'ekipman': return 'bg-purple-600';
      case 'insan': return 'bg-red-600';
      case 'kalite': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trash2 className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold">Fire Sebepleri Yönetimi</h1>
            <p className="text-muted-foreground">Zaiyat/fire nedenlerini yapılandırın</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={handleCreate} className="bg-amber-600 hover:bg-amber-700" data-testid="button-add-reason">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sebep
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fire Sebepleri</CardTitle>
          <CardDescription>{reasons.length} sebep tanımlı</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : reasons.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sebep Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.map((reason) => (
                  <TableRow key={reason.id} data-testid={`row-reason-${reason.id}`}>
                    <TableCell className="font-medium">{reason.name}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(reason.category)}>
                        {getCategoryLabel(reason.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {reason.description || "-"}
                    </TableCell>
                    <TableCell>
                      {reason.isActive ? (
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
                          onClick={() => handleEdit(reason)}
                          data-testid={`button-edit-${reason.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setReasonToDelete(reason);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-${reason.id}`}
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
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz fire sebebi tanımlı değil</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                İlk Sebebi Oluştur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReason ? "Fire Sebebi Düzenle" : "Yeni Fire Sebebi"}
            </DialogTitle>
            <DialogDescription>
              {editingReason ? "Fire sebebi bilgilerini güncelleyin" : "Yeni bir fire sebebi oluşturun"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sebep Adı</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Yanlış pişirme süresi" data-testid="input-name" />
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Detaylı açıklama..." data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Aktif Durum</FormLabel>
                      <p className="text-sm text-muted-foreground">Bu sebep aktif mi?</p>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fire Sebebini Sil</DialogTitle>
            <DialogDescription>
              "{reasonToDelete?.name}" fire sebebini silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => reasonToDelete && deleteMutation.mutate(reasonToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
