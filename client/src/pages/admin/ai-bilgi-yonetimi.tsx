import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  BookOpen,
  Loader2,
  Wrench,
  AlertTriangle,
  Shield,
  HelpCircle
} from "lucide-react";

interface EquipmentKnowledge {
  id: number;
  equipmentType: string;
  brand: string | null;
  model: string | null;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EQUIPMENT_TYPES = [
  { value: "espresso_machine", label: "Espresso Makinesi" },
  { value: "grinder", label: "Kahve Değirmeni" },
  { value: "refrigerator", label: "Buzdolabı" },
  { value: "blender", label: "Blender" },
  { value: "ice_machine", label: "Buz Makinesi" },
  { value: "dishwasher", label: "Bulaşık Makinesi" },
  { value: "oven", label: "Fırın" },
  { value: "pos", label: "POS Cihazı" },
  { value: "water_filter", label: "Su Filtresi" },
  { value: "general", label: "Genel" },
];

const CATEGORIES = [
  { value: "maintenance", label: "Bakım", icon: Wrench, color: "bg-blue-500" },
  { value: "troubleshooting", label: "Arıza Giderme", icon: AlertTriangle, color: "bg-orange-500" },
  { value: "usage", label: "Kullanım", icon: BookOpen, color: "bg-green-500" },
  { value: "safety", label: "Güvenlik", icon: Shield, color: "bg-red-500" },
  { value: "faq", label: "SSS", icon: HelpCircle, color: "bg-purple-500" },
];

export default function AdminAIBilgiYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentKnowledge | null>(null);
  
  const [formData, setFormData] = useState({
    equipmentType: "",
    brand: "",
    model: "",
    category: "maintenance",
    title: "",
    content: "",
    keywords: "",
    priority: 1,
    isActive: true,
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: knowledgeItems = [], isLoading } = useQuery<EquipmentKnowledge[]>({
    queryKey: ["/api/equipment-knowledge"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        keywords: data.keywords.split(",").map(k => k.trim()).filter(Boolean),
        brand: data.brand || null,
        model: data.model || null,
      };
      return apiRequest("/api/equipment-knowledge", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-knowledge"] });
      toast({ title: "Bilgi başarıyla eklendi" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const payload = {
        ...data,
        keywords: data.keywords.split(",").map(k => k.trim()).filter(Boolean),
        brand: data.brand || null,
        model: data.model || null,
      };
      return apiRequest(`/api/equipment-knowledge/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-knowledge"] });
      toast({ title: "Bilgi başarıyla güncellendi" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/equipment-knowledge/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-knowledge"] });
      toast({ title: "Bilgi silindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      equipmentType: "",
      brand: "",
      model: "",
      category: "maintenance",
      title: "",
      content: "",
      keywords: "",
      priority: 1,
      isActive: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: EquipmentKnowledge) => {
    setEditingItem(item);
    setFormData({
      equipmentType: item.equipmentType,
      brand: item.brand || "",
      model: item.model || "",
      category: item.category,
      title: item.title,
      content: item.content,
      keywords: item.keywords?.join(", ") || "",
      priority: item.priority,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.equipmentType || !formData.title || !formData.content) {
      toast({ title: "Ekipman tipi, başlık ve içerik zorunludur", variant: "destructive" });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredItems = knowledgeItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || item.equipmentType === filterType;
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  const getEquipmentLabel = (type: string) => {
    return EQUIPMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Bilgi Yönetimi</h1>
          <p className="text-muted-foreground">
            AI asistanının kullanacağı ekipman bilgilerini yönetin
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-knowledge">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Bilgi Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Bilgiyi Düzenle" : "Yeni Bilgi Ekle"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ekipman Tipi *</Label>
                  <Select 
                    value={formData.equipmentType} 
                    onValueChange={(v) => setFormData(f => ({ ...f, equipmentType: v }))}
                  >
                    <SelectTrigger data-testid="select-equipment-type">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marka (Opsiyonel)</Label>
                  <Input 
                    value={formData.brand}
                    onChange={(e) => setFormData(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Örn: La Marzocco"
                    data-testid="input-brand"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model (Opsiyonel)</Label>
                  <Input 
                    value={formData.model}
                    onChange={(e) => setFormData(f => ({ ...f, model: e.target.value }))}
                    placeholder="Örn: Linea PB"
                    data-testid="input-model"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Başlık *</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="Bilgi başlığı"
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label>İçerik *</Label>
                <Textarea 
                  value={formData.content}
                  onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                  placeholder="Markdown formatında içerik yazabilirsiniz..."
                  className="min-h-[200px]"
                  data-testid="textarea-content"
                />
              </div>

              <div className="space-y-2">
                <Label>Anahtar Kelimeler (virgülle ayırın)</Label>
                <Input 
                  value={formData.keywords}
                  onChange={(e) => setFormData(f => ({ ...f, keywords: e.target.value }))}
                  placeholder="bakım, temizlik, günlük"
                  data-testid="input-keywords"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Öncelik</Label>
                  <Select 
                    value={formData.priority.toString()} 
                    onValueChange={(v) => setFormData(f => ({ ...f, priority: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-24" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Düşük</SelectItem>
                      <SelectItem value="2">Normal</SelectItem>
                      <SelectItem value="3">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Aktif</Label>
                  <Switch 
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData(f => ({ ...f, isActive: v }))}
                    data-testid="switch-active"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ekipman Bilgi Bankası
          </CardTitle>
          <CardDescription>
            {filteredItems.length} bilgi kaydı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" data-testid="filter-type">
                <SelectValue placeholder="Ekipman Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {EQUIPMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]" data-testid="filter-category">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Henüz bilgi kaydı yok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Ekipman</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const categoryInfo = getCategoryInfo(item.category);
                  const CategoryIcon = categoryInfo.icon;
                  return (
                    <TableRow key={item.id} data-testid={`row-knowledge-${item.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.brand && (
                            <div className="text-xs text-muted-foreground">
                              {item.brand} {item.model}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getEquipmentLabel(item.equipmentType)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <CategoryIcon className="h-3 w-3" />
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Bu bilgiyi silmek istediğinizden emin misiniz?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
