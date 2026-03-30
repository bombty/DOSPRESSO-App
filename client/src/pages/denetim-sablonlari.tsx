import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, FileText, Edit, Trash2, CheckCircle2, XCircle, 
  ClipboardList, Settings
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { AUDIT_CATEGORY_LABELS } from "@/lib/turkish-labels";
import { 
  insertAuditTemplateSchema, 
  insertAuditTemplateItemSchema,
  type AuditTemplate,
  type AuditTemplateItem,
} from "@shared/schema";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

// Template list with itemCount
type AuditTemplateWithCount = AuditTemplate & { itemCount: number };

// Form schema for template - omit only createdById (server fills this)
// insertAuditTemplateSchema already omits id, createdAt, updatedAt
const templateFormSchema = insertAuditTemplateSchema.omit({
  createdById: true, // Server fills this from req.user
}).extend({
  auditType: z.enum(['branch', 'personnel']), // Make required and typed
  category: z.string().min(1, "Kategori gerekli"),
});

// Form schema for template items - omit server-managed fields
// insertAuditTemplateItemSchema already omits id, createdAt
const templateItemFormSchema = insertAuditTemplateItemSchema.omit({ 
  templateId: true, // Server fills this
  maxPoints: true, // Legacy field not used
}).extend({
  itemText: z.string().min(1, "Madde metni gerekli"),
  itemType: z.string().nullable().default('checkbox'),
  weight: z.coerce.number().min(0).nullable().default(1),
  sortOrder: z.number(),
  options: z.array(z.string()).nullable().optional(), // For multiple choice questions
  correctAnswer: z.string().nullable().optional(), // For test questions
}).superRefine((data, ctx) => {
  // Conditional validation for multiple_choice type
  if (data.itemType === 'multiple_choice') {
    // Filter out empty/whitespace-only options
    const validOptions = (data.options || []).filter(opt => opt && opt.trim() !== '');
    
    if (validOptions.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Çoktan seçmeli sorular için en az 2 geçerli şık gerekli (boş şıklar kabul edilmez)",
        path: ['options'],
      });
    }
    
    // Check each option is non-empty
    if (data.options) {
      data.options.forEach((opt, idx) => {
        if (!opt || opt.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Şık ${idx + 1} boş olamaz`,
            path: ['options', idx],
          });
        }
      });
    }
    
    if (!data.correctAnswer || data.correctAnswer.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Doğru cevap gerekli",
        path: ['correctAnswer'],
      });
    }
    
    if (data.options && data.correctAnswer && !data.options.includes(data.correctAnswer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Doğru cevap şıklardan biri olmalı",
        path: ['correctAnswer'],
      });
    }
  }
});

type TemplateFormData = z.infer<typeof templateFormSchema>;
type TemplateItemFormData = z.infer<typeof templateItemFormSchema>;

export default function DenetimSablonlariPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditTemplate | null>(null);
  const [items, setItems] = useState<TemplateItemFormData[]>([]);

  // Form for template metadata
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: '',
      description: '',
      auditType: 'branch',
      category: '',
      isActive: true,
      requiresPhoto: false,
      aiAnalysisEnabled: false,
    },
  });

  // Build filter object for query key segments
  const filters = {
    ...(filterType !== 'all' && { auditType: filterType }),
    ...(filterCategory !== 'all' && { category: filterCategory }),
    ...(filterActive !== 'all' && { isActive: filterActive }),
  };
  
  // Use array-based query key for proper invalidation
  const { data: templates = [], isLoading, isError, refetch } = useQuery<AuditTemplateWithCount[]>({
    queryKey: ['/api/audit-templates', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters as Record<string, string>);
      const url = queryParams.toString() 
        ? `/api/audit-templates?${queryParams}` 
        : '/api/audit-templates';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Şablonlar yüklenemedi');
      return res.json();
    },
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: { template: TemplateFormData; items: TemplateItemFormData[] }) => {
      return await apiRequest('POST', '/api/audit-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-templates'] });
      toast({ title: "Şablon oluşturuldu", description: "Denetim şablonu başarıyla kaydedildi." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Şablon oluşturulurken hata oluştu",
        variant: "destructive"
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; template: Partial<TemplateFormData>; items?: TemplateItemFormData[] }) => {
      return await apiRequest('PATCH', `/api/audit-templates/${data.id}`, { 
        template: data.template, 
        items: data.items 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-templates'] });
      toast({ title: "Şablon güncellendi", description: "Değişiklikler kaydedildi." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Şablon güncellenirken hata oluştu",
        variant: "destructive"
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/audit-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-templates'] });
      toast({ title: "Şablon silindi", description: "Denetim şablonu başarıyla kaldırıldı." });
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Şablon silinirken hata oluştu",
        variant: "destructive"
      });
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingTemplate(null);
    form.reset({
      title: '',
      description: '',
      auditType: 'branch',
      category: '',
      isActive: true,
      requiresPhoto: false,
      aiAnalysisEnabled: false,
    });
    setItems([]);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = async (template: AuditTemplate) => {
    // Fetch full template with items using authenticated API
    const fullTemplate = await queryClient.fetchQuery<AuditTemplate & { items: AuditTemplateItem[] }>({
      queryKey: [`/api/audit-templates/${template.id}`],
    });
    
    setEditingTemplate(template);
    form.reset({
      title: fullTemplate.title,
      description: fullTemplate.description || '',
      auditType: (fullTemplate.auditType as 'branch' | 'personnel') || 'branch',
      category: fullTemplate.category,
      isActive: fullTemplate.isActive,
      requiresPhoto: fullTemplate.requiresPhoto,
      aiAnalysisEnabled: fullTemplate.aiAnalysisEnabled,
    });
    
    // Map items to form data (exclude id and templateId)
    setItems(fullTemplate.items?.map((item: AuditTemplateItem) => ({
      itemText: item.itemText,
      itemType: item.itemType || 'checkbox',
      weight: item.weight || 1,
      sortOrder: item.sortOrder,
      requiresPhoto: item.requiresPhoto || false,
      aiCheckEnabled: item.aiCheckEnabled || false,
      aiPrompt: item.aiPrompt || null,
      options: item.options || null,
      correctAnswer: item.correctAnswer || null,
    })));
    
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTemplate(null);
    form.reset();
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemText: '',
        itemType: 'checkbox',
        weight: 1,
        sortOrder: items.length,
        requiresPhoto: false,
        aiCheckEnabled: false,
        aiPrompt: null,
        options: null,
        correctAnswer: null,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof TemplateItemFormData, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-initialize options array when changing to multiple_choice
    if (field === 'itemType' && value === 'multiple_choice' && !newItems[index].options) {
      newItems[index].options = ['', ''];
    }
    
    // Clear MC fields when changing away from multiple_choice
    if (field === 'itemType' && value !== 'multiple_choice') {
      newItems[index].options = null;
      newItems[index].correctAnswer = null;
    }
    
    setItems(newItems);
  };

  const onSubmit = (data: TemplateFormData) => {
    // Validation
    if (items.length === 0) {
      toast({ title: "Hata", description: "En az bir denetim maddesi ekleyin", variant: "destructive" });
      return;
    }
    
    if (items.some(item => !item.itemText.trim())) {
      toast({ title: "Hata", description: "Tüm maddelerin açıklaması olmalı", variant: "destructive" });
      return;
    }
    
    // Update sortOrder based on array index
    const itemsWithOrder = (Array.isArray(items) ? items : []).map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        template: data,
        items: itemsWithOrder,
      });
    } else {
      createMutation.mutate({
        template: data,
        items: itemsWithOrder,
      });
    }
  };

  const handleDelete = (id: number, name?: string) => {
    requestDelete(id, name || "Şablon");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold">Denetim Şablonları</h1>
          <p className="text-muted-foreground">Şube ve personel denetim şablonlarını yönetin</p>
        </div>
        <Button onClick={handleOpenCreateDialog} data-testid="button-create-template">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Şablon
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-type">Denetim Türü</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter-type" data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-type-all">Tümü</SelectItem>
                <SelectItem value="branch" data-testid="option-type-branch">Şube Denetimi</SelectItem>
                <SelectItem value="personnel" data-testid="option-type-personnel">Personel Denetimi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-category">Kategori</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="filter-category" data-testid="select-filter-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-category-all">Tümü</SelectItem>
                <SelectItem value="hijyen" data-testid="option-category-hijyen">Hijyen</SelectItem>
                <SelectItem value="hizmet_kalitesi" data-testid="option-category-hizmet">Hizmet Kalitesi</SelectItem>
                <SelectItem value="stok_yonetimi" data-testid="option-category-stok">Stok Yönetimi</SelectItem>
                <SelectItem value="ekipman" data-testid="option-category-ekipman">Ekipman</SelectItem>
                <SelectItem value="bilgi_testi" data-testid="option-category-bilgi">Bilgi Testi</SelectItem>
                <SelectItem value="beceri_degerlendirme" data-testid="option-category-beceri">Beceri Değerlendirme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-active">Durum</Label>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger id="filter-active" data-testid="select-filter-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-active-all">Tümü</SelectItem>
                <SelectItem value="true" data-testid="option-active-true">Aktif</SelectItem>
                <SelectItem value="false" data-testid="option-active-false">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {(Array.isArray(templates) ? templates : []).map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`} className="hover-elevate">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium line-clamp-2" data-testid={`title-template-${template.id}`}>
                    {template.title}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4"
                      onClick={() => handleOpenEditDialog(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4"
                      onClick={() => handleDelete(template.id, template.name)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={template.auditType === 'branch' ? 'default' : 'secondary'} className="text-xs" data-testid={`badge-type-${template.id}`}>
                    {template.auditType === 'branch' ? 'Şube' : 'Personel'}
                  </Badge>
                  {template.category && (
                    <Badge variant="outline" className="text-xs" data-testid={`badge-category-${template.id}`}>{AUDIT_CATEGORY_LABELS[template.category] || template.category}</Badge>
                  )}
                  <Badge variant={template.isActive ? 'default' : 'secondary'} className="text-xs" data-testid={`badge-status-${template.id}`}>
                    {template.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`itemcount-${template.id}`}>
                  <ClipboardList className="h-3 w-3" />
                  {template.itemCount} madde
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Henüz şablon oluşturulmamış</p>
            <p className="text-sm text-muted-foreground mb-4">
              İlk denetim şablonunuzu oluşturmak için yukarıdaki butona tıklayın
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
            </DialogTitle>
            <DialogDescription>
              Denetim şablonu detaylarını ve maddeleri tanımlayın
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
              {/* Template Info */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şablon Başlığı *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Örn: Hijyen Denetimi"
                          data-testid="input-template-title"
                        />
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
                          {...field}
                          value={field.value || ''}
                          placeholder="Şablon açıklaması..."
                          data-testid="input-template-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="auditType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denetim Türü *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-audit-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="branch" data-testid="option-audittype-branch">Şube Denetimi</SelectItem>
                            <SelectItem value="personnel" data-testid="option-audittype-personnel">Personel Denetimi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hijyen" data-testid="option-category-form-hijyen">Hijyen</SelectItem>
                            <SelectItem value="hizmet_kalitesi" data-testid="option-category-form-hizmet">Hizmet Kalitesi</SelectItem>
                            <SelectItem value="stok_yonetimi" data-testid="option-category-form-stok">Stok Yönetimi</SelectItem>
                            <SelectItem value="ekipman" data-testid="option-category-form-ekipman">Ekipman</SelectItem>
                            <SelectItem value="bilgi_testi" data-testid="option-category-form-bilgi">Bilgi Testi</SelectItem>
                            <SelectItem value="beceri_degerlendirme" data-testid="option-category-form-beceri">Beceri Değerlendirme</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="requiresPhoto"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-requires-photo"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Fotoğraf Gerekli</FormLabel>
                          <FormDescription>
                            Bu denetim için fotoğraf zorunlu olsun
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aiAnalysisEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-ai-analysis"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>AI Analizi Aktif</FormLabel>
                          <FormDescription>
                            Fotoğraflar AI ile otomatik analiz edilsin
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="grid grid-cols-1 gap-2 sm:gap-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Denetim Maddeleri</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    data-testid="button-add-item"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Madde Ekle
                  </Button>
                </div>

                {(Array.isArray(items) ? items : []).map((item, index) => (
                  <Card key={index} data-testid={`card-item-${index}`}>
                    <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <Label className="text-sm font-medium">Madde {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label htmlFor={`item-text-${index}`}>Madde Metni *</Label>
                        <Textarea
                          id={`item-text-${index}`}
                          value={item.itemText}
                          onChange={(e) => handleUpdateItem(index, 'itemText', e.target.value)}
                          placeholder="Örn: Tezgah temizliği uygun mu?"
                          data-testid={`input-item-text-${index}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div>
                          <Label htmlFor={`item-type-${index}`}>Madde Tipi</Label>
                          <Select
                            value={item.itemType || 'checkbox'}
                            onValueChange={(value) => handleUpdateItem(index, 'itemType', value)}
                          >
                            <SelectTrigger id={`item-type-${index}`} data-testid={`select-item-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checkbox" data-testid={`option-itemtype-${index}-checkbox`}>Checkbox</SelectItem>
                              <SelectItem value="rating" data-testid={`option-itemtype-${index}-rating`}>Rating (1-5)</SelectItem>
                              <SelectItem value="text" data-testid={`option-itemtype-${index}-text`}>Metin Yanıt</SelectItem>
                              <SelectItem value="photo" data-testid={`option-itemtype-${index}-photo`}>Fotoğraf</SelectItem>
                              <SelectItem value="multiple_choice" data-testid={`option-itemtype-${index}-multiple_choice`}>Çoktan Seçmeli Test</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`weight-${index}`}>Puan Ağırlığı</Label>
                          <Input
                            id={`weight-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={item.weight || 1}
                            onChange={(e) => handleUpdateItem(index, 'weight', parseInt(e.target.value) || 1)}
                            data-testid={`input-weight-${index}`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`requires-photo-${index}`}
                            checked={item.requiresPhoto || false}
                            onCheckedChange={(checked) => handleUpdateItem(index, 'requiresPhoto', checked)}
                            data-testid={`checkbox-item-photo-${index}`}
                          />
                          <Label htmlFor={`requires-photo-${index}`} className="text-sm font-normal">
                            Bu madde için fotoğraf gerekli
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`ai-check-${index}`}
                            checked={item.aiCheckEnabled || false}
                            onCheckedChange={(checked) => handleUpdateItem(index, 'aiCheckEnabled', checked)}
                            data-testid={`checkbox-item-ai-${index}`}
                          />
                          <Label htmlFor={`ai-check-${index}`} className="text-sm font-normal">
                            AI kontrolü aktif
                          </Label>
                        </div>
                      </div>

                      {item.aiCheckEnabled && (
                        <div>
                          <Label htmlFor={`ai-prompt-${index}`}>AI Prompt (Opsiyonel)</Label>
                          <Textarea
                            id={`ai-prompt-${index}`}
                            value={item.aiPrompt || ''}
                            onChange={(e) => handleUpdateItem(index, 'aiPrompt', e.target.value || null)}
                            placeholder="AI için özel talimatlar..."
                            className="h-20"
                            data-testid={`textarea-ai-prompt-${index}`}
                          />
                        </div>
                      )}

                      {/* Multiple Choice Options */}
                      {item.itemType === 'multiple_choice' && (
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <div>
                            <Label>Şıklar (En az 2 şık gerekli)</Label>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                              {(item.options || []).map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(item.options || [])];
                                      newOptions[optionIndex] = e.target.value;
                                      handleUpdateItem(index, 'options', newOptions);
                                    }}
                                    placeholder={`Şık ${optionIndex + 1}`}
                                    data-testid={`input-option-${index}-${optionIndex}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const newOptions = (item.options || []).filter((_, i: number) => i !== optionIndex);
                                      handleUpdateItem(index, 'options', newOptions.length > 0 ? newOptions : null);
                                      // Clear correctAnswer if it was the removed option
                                      if (item.correctAnswer === option) {
                                        handleUpdateItem(index, 'correctAnswer', null);
                                      }
                                    }}
                                    data-testid={`button-remove-option-${index}-${optionIndex}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = [...(item.options || []), ''];
                                  handleUpdateItem(index, 'options', newOptions);
                                }}
                                data-testid={`button-add-option-${index}`}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Şık Ekle
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`correct-answer-${index}`}>Doğru Cevap</Label>
                            <Select
                              value={item.correctAnswer || ''}
                              onValueChange={(value) => handleUpdateItem(index, 'correctAnswer', value)}
                            >
                              <SelectTrigger id={`correct-answer-${index}`} data-testid={`select-correct-answer-${index}`}>
                                <SelectValue placeholder="Doğru şıkkı seçin..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(item.options || []).map((option: string, optionIndex: number) => (
                                  <SelectItem 
                                    key={optionIndex} 
                                    value={option}
                                    data-testid={`option-correct-answer-${index}-${optionIndex}`}
                                  >
                                    {option || `Şık ${optionIndex + 1}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {items.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <ClipboardList className="h-4 w-4 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Henüz madde eklenmedi. "Madde Ekle" butonuna tıklayın
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-dialog-cancel"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-dialog-submit"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id !== null) deleteMutation.mutate(id as number);
        }}
        title="Şablonu Sil"
        description={`"${deleteState.itemName || ''}" şablonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
