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
  HelpCircle,
  Sparkles,
  FileText,
  Check,
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

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

const EQUIPMENT_TYPE_MAP: Record<string, string> = {
  'espresso': 'espresso_machine',
  'espresso_machine': 'espresso_machine',
  'grinder': 'grinder',
  'cappuccino': 'espresso_machine',
  'water_filter': 'water_filter',
  'kiosk': 'pos',
  'pos': 'pos',
  'tea': 'general',
  'ice': 'ice_machine',
  'ice_machine': 'ice_machine',
  'refrigerator': 'refrigerator',
  'dishwasher': 'dishwasher',
  'oven': 'oven',
  'blender': 'blender',
  'general': 'general',
};

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
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiFormData, setAIFormData] = useState({
    equipmentType: "",
    brand: "",
    model: "",
    manualText: "",
  });
  const [generatedItems, setGeneratedItems] = useState<Array<{
    category: string;
    title: string;
    content: string;
    keywords: string[];
    selected: boolean;
  }>>([]);
  
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

  const { data: missingKnowledge } = useQuery<{
    totalEquipment: number;
    missingKnowledgeCount: number;
    groups: Array<{ type: string; brand: string | null; model: string | null; count: number; equipmentIds: number[] }>;
  }>({
    queryKey: ["/api/equipment-knowledge/missing"],
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

  const autoResearchMutation = useMutation({
    mutationFn: async (data: { equipmentType: string; brand: string; model: string }) => {
      const res = await apiRequest("/api/equipment-knowledge/auto-research", "POST", data);
      return res.json() as Promise<{ items: Array<{ category: string; title: string; content: string; keywords: string[] }>; summary: string }>;
    },
    onSuccess: (result) => {
      setGeneratedItems(result.items.map(item => ({ ...item, selected: true })));
      toast({ title: "Bilgiler araştırıldı", description: result.summary });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof aiFormData) => {
      const res = await apiRequest("/api/equipment-knowledge/generate-from-manual", "POST", data);
      return res.json() as Promise<{ items: Array<{ category: string; title: string; content: string; keywords: string[] }>; summary: string }>;
    },
    onSuccess: (result) => {
      setGeneratedItems(result.items.map(item => ({ ...item, selected: true })));
      toast({ title: "İçerikler oluşturuldu", description: result.summary });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const saveGeneratedMutation = useMutation({
    mutationFn: async (items: typeof generatedItems) => {
      const selectedItems = items.filter(item => item.selected);
      const promises = selectedItems.map(item => 
        apiRequest("/api/equipment-knowledge", "POST", {
          equipmentType: aiFormData.equipmentType,
          brand: aiFormData.brand || null,
          model: aiFormData.model || null,
          category: item.category,
          title: item.title,
          content: item.content,
          keywords: item.keywords,
          priority: 2,
          isActive: true,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-knowledge"] });
      toast({ title: "Seçili bilgiler kaydedildi" });
      setIsAIDialogOpen(false);
      setGeneratedItems([]);
      setAIFormData({ equipmentType: "", brand: "", model: "", manualText: "" });
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Bilgi Yönetimi</h1>
          <p className="text-muted-foreground">
            AI asistanının kullanacağı ekipman bilgilerini yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAIDialogOpen} onOpenChange={(open) => {
            setIsAIDialogOpen(open);
            if (!open) {
              setGeneratedItems([]);
              setAIFormData({ equipmentType: "", brand: "", model: "", manualText: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-smart-generate">
                <Sparkles className="h-4 w-4 mr-2" />
                Akıllı İçerik Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Akıllı İçerik Oluşturucu
                </DialogTitle>
              </DialogHeader>
              
              {generatedItems.length === 0 ? (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Cihaz kılavuzu veya troubleshooting metnini yapıştırın. AI otomatik olarak:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>İngilizce metni Türkçeye çevirir</li>
                    <li>İçeriği kategorize eder (bakım, arıza, kullanım, güvenlik)</li>
                    <li>Adım adım çözümler oluşturur</li>
                  </ul>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Ekipman Tipi *</Label>
                      <Select 
                        value={aiFormData.equipmentType} 
                        onValueChange={(v) => setAIFormData(f => ({ ...f, equipmentType: v }))}
                      >
                        <SelectTrigger data-testid="ai-select-equipment">
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
                      <Label>Marka</Label>
                      <Input 
                        value={aiFormData.brand}
                        onChange={(e) => setAIFormData(f => ({ ...f, brand: e.target.value }))}
                        placeholder="Örn: La Marzocco"
                        data-testid="ai-input-brand"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input 
                        value={aiFormData.model}
                        onChange={(e) => setAIFormData(f => ({ ...f, model: e.target.value }))}
                        placeholder="Örn: Linea PB"
                        data-testid="ai-input-model"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Kılavuz / Troubleshooting Metni *</Label>
                    <Textarea 
                      value={aiFormData.manualText}
                      onChange={(e) => setAIFormData(f => ({ ...f, manualText: e.target.value }))}
                      placeholder="Cihaz kılavuzundan veya troubleshooting dökümanından metni buraya yapıştırın... (İngilizce de olabilir)"
                      className="min-h-[250px]"
                      data-testid="ai-textarea-manual"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 50 karakter. İngilizce metin otomatik Türkçeye çevrilecektir.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    AI tarafından oluşturulan içerikler. Kaydetmek istediklerinizi seçin:
                  </p>
                  <div className="space-y-3">
                    {generatedItems.map((item, index) => {
                      const categoryInfo = getCategoryInfo(item.category);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Card 
                          key={index} 
                          className={`cursor-pointer transition-colors ${item.selected ? 'ring-2 ring-primary' : 'opacity-60'}`}
                          onClick={() => {
                            setGeneratedItems(items => 
                              items.map((it, i) => i === index ? { ...it, selected: !it.selected } : it)
                            );
                          }}
                          data-testid={`generated-item-${index}`}
                        >
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1">
                                  <CategoryIcon className="h-3 w-3" />
                                  {categoryInfo.label}
                                </Badge>
                                <span className="font-medium">{item.title}</span>
                              </div>
                              {item.selected && <Check className="h-5 w-5 text-primary" />}
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {item.content.substring(0, 200)}...
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.keywords.slice(0, 5).map((kw, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <DialogFooter>
                {generatedItems.length === 0 ? (
                  <>
                    <Button variant="outline" onClick={() => setIsAIDialogOpen(false)} data-testid="button-cancel-ai">
                      İptal
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => autoResearchMutation.mutate({
                        equipmentType: aiFormData.equipmentType,
                        brand: aiFormData.brand,
                        model: aiFormData.model
                      })}
                      disabled={autoResearchMutation.isPending || generateMutation.isPending || !aiFormData.equipmentType || !aiFormData.brand || !aiFormData.model}
                      data-testid="button-auto-research"
                    >
                      {autoResearchMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Araştırılıyor...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Otomatik Araştır
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => generateMutation.mutate(aiFormData)}
                      disabled={generateMutation.isPending || autoResearchMutation.isPending || !aiFormData.equipmentType || aiFormData.manualText.length < 50}
                      data-testid="button-generate"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI İşliyor...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Metin İşle
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setGeneratedItems([])}>
                      Geri
                    </Button>
                    <Button 
                      onClick={() => saveGeneratedMutation.mutate(generatedItems)}
                      disabled={saveGeneratedMutation.isPending || !generatedItems.some(i => i.selected)}
                      data-testid="button-save-generated"
                    >
                      {saveGeneratedMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Seçilenleri Kaydet ({generatedItems.filter(i => i.selected).length})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
      </div>

      {missingKnowledge && missingKnowledge.missingKnowledgeCount > 0 && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Eksik Bilgi Uyarısı
            </CardTitle>
            <CardDescription>
              {missingKnowledge.missingKnowledgeCount} ekipman için AI bilgi bankasında kayıt bulunamadı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingKnowledge.groups.slice(0, 10).map((group, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setAIFormData(f => ({
                      ...f,
                      equipmentType: EQUIPMENT_TYPE_MAP[group.type] || 'general',
                      brand: group.brand || '',
                      model: group.model || ''
                    }));
                    setIsAIDialogOpen(true);
                  }}
                  data-testid={`missing-knowledge-${index}`}
                >
                  {getEquipmentLabel(EQUIPMENT_TYPE_MAP[group.type] || group.type)} 
                  {group.brand && ` - ${group.brand}`}
                  {group.model && ` ${group.model}`}
                  <span className="ml-1 text-muted-foreground">({group.count})</span>
                </Badge>
              ))}
              {missingKnowledge.groups.length > 10 && (
                <Badge variant="secondary">+{missingKnowledge.groups.length - 10} daha</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Bir badge'e tıklayarak o ekipman için akıllı içerik oluşturabilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}

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
                            onClick={() => requestDelete(item.id, item.title || "")}
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

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
