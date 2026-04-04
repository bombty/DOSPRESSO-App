import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import {
  Plus, ArrowLeft, Trash2, Edit2, ClipboardList, Settings, CheckSquare,
  ToggleLeft, Star, SlidersHorizontal, ListChecks, Camera, FileText,
  Weight, GripVertical, ChevronRight, Copy, Eye
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { ListSkeleton } from "@/components/list-skeleton";

// ─── Soru tipi config ─────────────────────────────────────
const questionTypeConfig: Record<string, { label: string; icon: any; description: string }> = {
  checkbox: { label: "Checkbox (Tik)", icon: CheckSquare, description: "Tik atma — tik=100, boş=0" },
  yesno: { label: "Evet / Hayır", icon: ToggleLeft, description: "İki seçenek — Evet=100, Hayır=0" },
  rating: { label: "Puan (0-100)", icon: SlidersHorizontal, description: "Slider veya sayı girişi" },
  stars: { label: "Yıldız (1-5)", icon: Star, description: "★★★★★ — her yıldız ×20" },
  select: { label: "Çoktan Seçmeli", icon: ListChecks, description: "Seçenekler + puanları tanımlanır" },
  photo: { label: "Fotoğraf Zorunlu", icon: Camera, description: "Yüklendi = geçti" },
  text: { label: "Metin Notu", icon: FileText, description: "Puansız açıklama alanı" },
};

// ─── Types ────────────────────────────────────────────────
type Template = {
  id: number; name: string; description: string | null;
  version: number; isActive: boolean; isDefault: boolean;
  categoryCount: number; questionCount: number;
  createdAt: string; updatedAt: string;
};
type Category = {
  id: number; templateId: number; name: string; description: string | null;
  weight: number; orderIndex: number; isActive: boolean;
  questions: Question[];
};
type Question = {
  id: number; categoryId: number; questionText: string;
  questionType: string; options: { label: string; score: number }[] | null;
  isRequired: boolean; weight: number; orderIndex: number; helpText: string | null;
};
type TemplateDetail = Template & { categories: Category[] };

export default function DenetimSablonlariPage() {
  const { toast } = useToast();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  // ─── State ──────────────────────────────────────────────
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  // Form state
  const [templateForm, setTemplateForm] = useState({ name: "", description: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", weight: 10 });
  const [questionForm, setQuestionForm] = useState({
    questionText: "", questionType: "checkbox", isRequired: true, weight: 1, helpText: "",
    options: [{ label: "", score: 100 }, { label: "", score: 0 }] as { label: string; score: number }[],
  });

  // ─── Queries ────────────────────────────────────────────
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/v2/audit-templates"],
  });

  const { data: templateDetail, isLoading: detailLoading } = useQuery<TemplateDetail>({
    queryKey: ["/api/v2/audit-templates", selectedTemplateId],
    enabled: !!selectedTemplateId,
  });

  const activeTemplates = useMemo(() => templates?.filter(t => t.isActive) || [], [templates]);
  const inactiveTemplates = useMemo(() => templates?.filter(t => !t.isActive) || [], [templates]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/v2/audit-templates"] });
    if (selectedTemplateId) queryClient.invalidateQueries({ queryKey: ["/api/v2/audit-templates", selectedTemplateId] });
  };

  // ─── Template Mutations ─────────────────────────────────
  const createTemplateMut = useMutation({
    mutationFn: async (data: typeof templateForm) => (await apiRequest("POST", "/api/v2/audit-templates", data)).json(),
    onSuccess: (data: any) => { invalidateAll(); setIsCreateTemplateOpen(false); setTemplateForm({ name: "", description: "" }); setSelectedTemplateId(data.id); toast({ title: "Şablon oluşturuldu" }); },
  });
  const updateTemplateMut = useMutation({
    mutationFn: async (data: any) => (await apiRequest("PATCH", `/api/v2/audit-templates/${selectedTemplateId}`, data)).json(),
    onSuccess: () => { invalidateAll(); setIsEditTemplateOpen(false); toast({ title: "Şablon güncellendi" }); },
  });
  const deleteTemplateMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/v2/audit-templates/${id}`)).json(),
    onSuccess: () => { invalidateAll(); setSelectedTemplateId(null); toast({ title: "Şablon silindi" }); },
  });
  const toggleTemplateMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => (await apiRequest("PATCH", `/api/v2/audit-templates/${id}`, { isActive })).json(),
    onSuccess: () => invalidateAll(),
  });

  // ─── Category Mutations ─────────────────────────────────
  const createCategoryMut = useMutation({
    mutationFn: async (data: typeof categoryForm) => (await apiRequest("POST", `/api/v2/audit-templates/${selectedTemplateId}/categories`, data)).json(),
    onSuccess: () => { invalidateAll(); setIsAddCategoryOpen(false); setCategoryForm({ name: "", description: "", weight: 10 }); toast({ title: "Kategori eklendi" }); },
  });
  const updateCategoryMut = useMutation({
    mutationFn: async ({ id, ...data }: any) => (await apiRequest("PATCH", `/api/v2/audit-categories/${id}`, data)).json(),
    onSuccess: () => { invalidateAll(); setEditingCategoryId(null); toast({ title: "Kategori güncellendi" }); },
  });
  const deleteCategoryMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/v2/audit-categories/${id}`)).json(),
    onSuccess: () => { invalidateAll(); toast({ title: "Kategori silindi" }); },
  });

  // ─── Question Mutations ─────────────────────────────────
  const createQuestionMut = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", `/api/v2/audit-categories/${activeCategoryId}/questions`, data)).json(),
    onSuccess: () => {
      invalidateAll(); setIsAddQuestionOpen(false);
      setQuestionForm({ questionText: "", questionType: "checkbox", isRequired: true, weight: 1, helpText: "", options: [{ label: "", score: 100 }, { label: "", score: 0 }] });
      toast({ title: "Soru eklendi" });
    },
  });
  const deleteQuestionMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/v2/audit-questions/${id}`)).json(),
    onSuccess: () => { invalidateAll(); toast({ title: "Soru silindi" }); },
  });

  // ─── Toplam ağırlık hesapla ─────────────────────────────
  const totalWeight = useMemo(() => {
    if (!templateDetail?.categories) return 0;
    return templateDetail.categories.reduce((sum, c) => sum + (c.weight || 0), 0);
  }, [templateDetail]);

  // ─── Loading ────────────────────────────────────────────
  if (isLoading) return <div className="p-4"><ListSkeleton count={4} variant="card" showHeader /></div>;

  // ═══════════════════════════════════════════════════════════
  // TEMPLATE LIST VIEW
  // ═══════════════════════════════════════════════════════════
  if (!selectedTemplateId) {
    return (
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Denetim Şablonları
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Şube denetim formlarını oluşturun ve yönetin</p>
          </div>
          <Button onClick={() => setIsCreateTemplateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Şablon
          </Button>
        </div>

        {/* Active Templates */}
        {activeTemplates.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Aktif Şablonlar ({activeTemplates.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTemplates.map(t => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTemplateId(t.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{t.name}</h3>
                        {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.isDefault && <Badge variant="default" className="text-xs">Varsayılan</Badge>}
                        <Badge variant="secondary" className="text-xs">v{t.version}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{t.categoryCount} kategori</span>
                      <span>{t.questionCount} soru</span>
                      <ChevronRight className="h-3 w-3 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Inactive */}
        {inactiveTemplates.length > 0 && (
          <div className="space-y-2 mt-6">
            <h2 className="text-sm font-medium text-muted-foreground">Pasif Şablonlar ({inactiveTemplates.length})</h2>
            {inactiveTemplates.map(t => (
              <Card key={t.id} className="opacity-60 cursor-pointer hover:opacity-80" onClick={() => setSelectedTemplateId(t.id)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm">{t.name}</span>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleTemplateMut.mutate({ id: t.id, isActive: true }); }}>
                    Aktifleştir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {(!templates || templates.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Henüz şablon yok. İlk denetim şablonunuzu oluşturun.</p>
              <Button className="mt-4" onClick={() => setIsCreateTemplateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> İlk Şablonu Oluştur
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Template Dialog */}
        <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Denetim Şablonu</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Şablon Adı *</Label>
                <Input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Örn: Standart Şube Denetimi" />
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="Şablonun amacı ve kapsamı" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>İptal</Button>
              <Button onClick={() => { if (templateForm.name.trim()) createTemplateMut.mutate(templateForm); else toast({ title: "Şablon adı gerekli", variant: "destructive" }); }} disabled={createTemplateMut.isPending}>
                {createTemplateMut.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // TEMPLATE DETAIL VIEW
  // ═══════════════════════════════════════════════════════════
  if (detailLoading) return <div className="p-4"><ListSkeleton count={6} variant="card" showHeader /></div>;
  if (!templateDetail) return <div className="p-4 text-center text-muted-foreground">Şablon bulunamadı</div>;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTemplateId(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold flex-1 min-w-0 truncate">{templateDetail.name}</h1>
        <Badge variant={templateDetail.isActive ? "default" : "secondary"}>
          {templateDetail.isActive ? "Aktif" : "Pasif"}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => { setTemplateForm({ name: templateDetail.name, description: templateDetail.description || "" }); setIsEditTemplateOpen(true); }}>
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Düzenle
        </Button>
        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => requestDelete(templateDetail.id, templateDetail.name)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {templateDetail.description && (
        <p className="text-sm text-muted-foreground">{templateDetail.description}</p>
      )}

      {/* Weight Summary */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Weight className="h-4 w-4" /> Toplam Ağırlık
            </span>
            <span className={`font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
              %{totalWeight} {totalWeight === 100 ? '✓' : `(hedef: %100)`}
            </span>
          </div>
          <Progress value={totalWeight} className={`h-1.5 mt-2 ${totalWeight === 100 ? '' : '[&>div]:bg-red-500'}`} />
        </CardContent>
      </Card>

      {/* Categories + Questions */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Kategoriler ({templateDetail.categories?.length || 0})
        </h2>
        <Button size="sm" onClick={() => { setCategoryForm({ name: "", description: "", weight: 10 }); setIsAddCategoryOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Kategori Ekle
        </Button>
      </div>

      {templateDetail.categories?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Henüz kategori eklenmemiş. Denetim formundaki ana bölümleri (Dış Mekan, Bar Düzeni, vb.) kategori olarak ekleyin.
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" className="space-y-2">
        {templateDetail.categories?.map((cat) => (
          <AccordionItem key={cat.id} value={`cat-${cat.id}`} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <span className="font-medium text-sm truncate">{cat.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">%{cat.weight}</Badge>
                <Badge variant="secondary" className="text-xs shrink-0">{cat.questions?.length || 0} soru</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 space-y-3">
              {/* Category actions */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <Button variant="outline" size="sm" onClick={() => { setCategoryForm({ name: cat.name, description: cat.description || "", weight: cat.weight }); setEditingCategoryId(cat.id); }}>
                  <Edit2 className="h-3 w-3 mr-1" /> Düzenle
                </Button>
                <Button variant="outline" size="sm" className="text-red-400" onClick={() => deleteCategoryMut.mutate(cat.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Sil
                </Button>
                <div className="flex-1" />
                <Button size="sm" onClick={() => { setActiveCategoryId(cat.id); setQuestionForm({ questionText: "", questionType: "checkbox", isRequired: true, weight: 1, helpText: "", options: [{ label: "", score: 100 }, { label: "", score: 0 }] }); setIsAddQuestionOpen(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> Soru Ekle
                </Button>
              </div>

              {/* Questions list */}
              {cat.questions?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Bu kategoride henüz soru yok</p>
              )}
              {cat.questions?.map((q, qi) => {
                const typeInfo = questionTypeConfig[q.questionType] || questionTypeConfig.checkbox;
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={q.id} className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-muted/30">
                    <span className="text-xs text-muted-foreground mt-0.5 w-5 shrink-0">{qi + 1}.</span>
                    <TypeIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                        {q.isRequired && <Badge variant="secondary" className="text-[10px]">Zorunlu</Badge>}
                        {q.helpText && <span className="text-[10px] text-muted-foreground truncate">💡 {q.helpText}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 shrink-0" onClick={() => deleteQuestionMut.mutate(q.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* ═══ DIALOGS ═══ */}

      {/* Edit Template */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Şablonu Düzenle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Şablon Adı</Label>
              <Input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={templateDetail.isActive} onCheckedChange={(v) => toggleTemplateMut.mutate({ id: templateDetail.id, isActive: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateTemplateMut.mutate({ name: templateForm.name, description: templateForm.description })} disabled={updateTemplateMut.isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category */}
      <Dialog open={isAddCategoryOpen || editingCategoryId !== null} onOpenChange={(open) => { if (!open) { setIsAddCategoryOpen(false); setEditingCategoryId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategoryId ? "Kategori Düzenle" : "Yeni Kategori"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kategori Adı *</Label>
              <Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Örn: Dış Mekan, Bar Düzeni" />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Bu kategori neyi denetler?" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Ağırlık (%) — Toplam tüm kategoriler = %100</Label>
              <Input type="number" min={1} max={100} value={categoryForm.weight} onChange={e => setCategoryForm({ ...categoryForm, weight: parseInt(e.target.value) || 10 })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!categoryForm.name.trim()) { toast({ title: "Kategori adı gerekli", variant: "destructive" }); return; }
              if (editingCategoryId) updateCategoryMut.mutate({ id: editingCategoryId, ...categoryForm });
              else createCategoryMut.mutate(categoryForm);
            }} disabled={createCategoryMut.isPending || updateCategoryMut.isPending}>
              {editingCategoryId ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yeni Soru Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Soru Tipi *</Label>
              <Select value={questionForm.questionType} onValueChange={v => setQuestionForm({ ...questionForm, questionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(questionTypeConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" /> {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{questionTypeConfig[questionForm.questionType]?.description}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Soru Metni *</Label>
              <Input value={questionForm.questionText} onChange={e => setQuestionForm({ ...questionForm, questionText: e.target.value })} placeholder="Örn: Tabelalar temiz ve aydınlatması çalışıyor" />
            </div>

            {/* Çoktan seçmeli seçenekler */}
            {questionForm.questionType === "select" && (
              <div className="space-y-2">
                <Label>Seçenekler (etiket + puan)</Label>
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="flex-1" placeholder={`Seçenek ${i + 1}`} value={opt.label} onChange={e => {
                      const opts = [...questionForm.options];
                      opts[i] = { ...opts[i], label: e.target.value };
                      setQuestionForm({ ...questionForm, options: opts });
                    }} />
                    <Input className="w-20" type="number" min={0} max={100} placeholder="Puan" value={opt.score} onChange={e => {
                      const opts = [...questionForm.options];
                      opts[i] = { ...opts[i], score: parseInt(e.target.value) || 0 };
                      setQuestionForm({ ...questionForm, options: opts });
                    }} />
                    {questionForm.options.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => {
                        setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, j) => j !== i) });
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, { label: "", score: 0 }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Seçenek Ekle
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ağırlık</Label>
                <Input type="number" min={1} max={10} value={questionForm.weight} onChange={e => setQuestionForm({ ...questionForm, weight: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={questionForm.isRequired} onCheckedChange={v => setQuestionForm({ ...questionForm, isRequired: v })} />
                <Label className="text-sm">Zorunlu</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>İpucu / Yardım Metni</Label>
              <Input value={questionForm.helpText} onChange={e => setQuestionForm({ ...questionForm, helpText: e.target.value })} placeholder="Denetçiye rehber not (opsiyonel)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>İptal</Button>
            <Button onClick={() => {
              if (!questionForm.questionText.trim()) { toast({ title: "Soru metni gerekli", variant: "destructive" }); return; }
              const data: any = { ...questionForm };
              if (questionForm.questionType !== "select") delete data.options;
              createQuestionMut.mutate(data);
            }} disabled={createQuestionMut.isPending}>
              {createQuestionMut.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => { const id = confirmDelete(); if (id !== null) deleteTemplateMut.mutate(id as number); }}
        title="Şablonu Sil"
        description={`"${deleteState.itemName || ''}" şablonunu pasif yapmak istediğinize emin misiniz?`}
      />
    </div>
  );
}
