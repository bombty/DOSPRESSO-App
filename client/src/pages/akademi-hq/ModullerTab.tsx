import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { type TrainingModule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { ModuleGallery } from "@/components/ModuleGallery";
import { MobileFilterCollapse } from "@/components/mobile-filter-collapse";
import { AIModuleCreator } from "./components/AIModuleCreator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, GraduationCap, Edit2, Trash2, Search, Sparkles, Brain, BookOpen, UserPlus, Clock, Eye, EyeOff } from "lucide-react";

type ViewMode = "egitim" | "onboarding";

const CATEGORY_LABELS: Record<string, string> = {
  barista_temelleri: "Barista Temelleri",
  hijyen_guvenlik: "Hijyen & Güvenlik",
  musteri_iliskileri: "Müşteri İlişkileri",
  yonetim: "Yönetim",
  ekipman: "Ekipman",
  genel_gelisim: "Genel Gelişim",
  onboarding: "Onboarding",
};

const trainingModuleSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  scope: z.enum(["branch", "factory", "both"]).default("branch"),
  estimatedDuration: z.number().min(1),
  isPublished: z.boolean().default(false),
  requiredForRole: z.array(z.string()).default([]),
});

export function ModullerTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const [viewMode, setViewMode] = useState<ViewMode>("egitim");
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [editingGalleryImages, setEditingGalleryImages] = useState<any[]>([]);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isAiOnboardingOpen, setIsAiOnboardingOpen] = useState(false);
  const [aiOnboardingRole, setAiOnboardingRole] = useState("stajyer");
  const [aiOnboardingScope, setAiOnboardingScope] = useState("branch");
  const [aiOnboardingDuration, setAiOnboardingDuration] = useState(60);
  const [aiOnboardingResult, setAiOnboardingResult] = useState<any>(null);

  const [isAiProgramOpen, setIsAiProgramOpen] = useState(false);
  const [aiProgramRole, setAiProgramRole] = useState("stajyer");
  const [aiProgramScope, setAiProgramScope] = useState("branch");
  const [aiProgramType, setAiProgramType] = useState("role_training");
  const [aiProgramResult, setAiProgramResult] = useState<any>(null);

  const editTrainingForm = useForm<z.infer<typeof trainingModuleSchema>>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", category: "", level: "beginner" as const, scope: "branch" as const, estimatedDuration: 30, isPublished: false, requiredForRole: [] },
  });

  const { data: trainingModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch(`/api/training/modules`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/training/modules/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Modül silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Silme işlemi başarısız", variant: "destructive" });
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trainingModuleSchema>) => {
      if (!editingModule) throw new Error("Module not selected");
      return apiRequest("PUT", `/api/training/modules/${editingModule.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Modül güncellendi" });
      setIsEditTrainingOpen(false);
      setEditingModule(null);
      editTrainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const generateOnboardingMutation = useMutation({
    mutationFn: async (data: { targetRole: string; scope: string; durationDays: number }) => {
      const res = await apiRequest("POST", "/api/academy/ai-generate-onboarding", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAiOnboardingResult(data);
      toast({ title: "Onboarding şablonu oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const saveOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const templateRes = await apiRequest("POST", "/api/onboarding-templates", {
        name: data.name, description: data.description, targetRole: data.targetRole,
        scope: data.scope, durationDays: data.durationDays, isActive: true, createdById: user?.id,
      });
      const template = await templateRes.json();
      for (const step of data.steps || []) {
        await apiRequest("POST", `/api/onboarding-templates/${template.id}/steps`, { templateId: template.id, ...step });
      }
      return template;
    },
    onSuccess: () => {
      toast({ title: "Onboarding şablonu kaydedildi" });
      setIsAiOnboardingOpen(false);
      setAiOnboardingResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-templates'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şablon kaydedilemedi", variant: "destructive" });
    },
  });

  const generateProgramMutation = useMutation({
    mutationFn: async (data: { targetRole: string; scope: string; programType: string }) => {
      const res = await apiRequest("POST", "/api/academy/ai-generate-program", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAiProgramResult(data);
      toast({ title: "Eğitim programı oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Program oluşturulamadı", variant: "destructive" });
    },
  });

  const saveProgramModulesMutation = useMutation({
    mutationFn: async (modules: any[]) => {
      const results = [];
      for (const mod of modules) {
        const res = await apiRequest("POST", "/api/training/modules", {
          title: mod.title, description: mod.description, category: mod.category,
          level: mod.level || "beginner", estimatedDuration: mod.estimatedDuration || 30,
          requiredForRole: mod.requiredForRole || [], scope: mod.scope || "branch",
          learningObjectives: mod.learningObjectives || [],
          steps: (mod.steps || []).map((s: any, i: number) => ({ stepNumber: s.stepNumber || i + 1, title: s.title, content: s.content })),
          isPublished: false, generatedByAi: true, createdBy: user?.id,
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      toast({ title: "Modüller başarıyla kaydedildi" });
      setIsAiProgramOpen(false);
      setAiProgramResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Modüller kaydedilemedi", variant: "destructive" });
    },
  });

  const isOnboarding = (m: any) => m.category === "onboarding" || m.moduleType === "onboarding" || m.module_type === "onboarding";

  const onboardingModules = trainingModules.filter((m: any) => isOnboarding(m));
  const trainingOnly = trainingModules.filter((m: any) => !isOnboarding(m));

  const currentModules = viewMode === "onboarding" ? onboardingModules : trainingOnly;

  const filteredModules = currentModules
    .filter((m: any) => scopeFilter === "all" || m.scope === scopeFilter || m.scope === 'both')
    .filter((m: any) => !searchQuery || m.title?.toLowerCase().includes(searchQuery.toLowerCase()));

  const publishedCount = currentModules.filter((m: any) => m.isPublished).length;
  const draftCount = currentModules.filter((m: any) => !m.isPublished).length;

  const activeFilterCount = (scopeFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="w-full space-y-2 sm:space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold">Modülleri Yönet</h2>
          <div className="flex flex-wrap gap-2">
            {viewMode === "egitim" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsAiGeneratorOpen(true)} data-testid="button-ai-generator">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">AI Modül</span>
                  <span className="sm:hidden">AI</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAiProgramOpen(true)} data-testid="button-ai-program">
                  <Brain className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Program</span>
                </Button>
              </>
            )}
            {viewMode === "onboarding" && (
              <Button variant="outline" size="sm" onClick={() => setIsAiOnboardingOpen(true)} data-testid="button-ai-onboarding">
                <Sparkles className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">AI Onboarding</span>
                <span className="sm:hidden">AI</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setLocation('/akademi-modul-editor')} data-testid="button-add-training">
              <Plus className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Yeni Modül</span>
              <span className="sm:hidden">Ekle</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "egitim" ? "default" : "outline"}
            size="sm"
            onClick={() => { setViewMode("egitim"); setSearchQuery(""); setScopeFilter("all"); }}
            data-testid="toggle-view-egitim"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Eğitim Modülleri
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 no-default-hover-elevate no-default-active-elevate">{trainingOnly.length}</Badge>
          </Button>
          <Button
            variant={viewMode === "onboarding" ? "default" : "outline"}
            size="sm"
            onClick={() => { setViewMode("onboarding"); setSearchQuery(""); setScopeFilter("all"); }}
            data-testid="toggle-view-onboarding"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Onboarding
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 no-default-hover-elevate no-default-active-elevate">{onboardingModules.length}</Badge>
          </Button>
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {publishedCount} yayında</span>
          <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> {draftCount} taslak</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {currentModules.length} toplam</span>
        </div>
      </div>

      <MobileFilterCollapse activeFilterCount={activeFilterCount} testId="module-filter">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Modül ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" data-testid="input-module-search" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { value: "all", label: "Tümü" },
              { value: "branch", label: "Şube" },
              { value: "factory", label: "Fabrika" },
            ].map(f => (
              <Button key={f.value} size="sm" variant={scopeFilter === f.value ? "default" : "outline"} onClick={() => setScopeFilter(f.value)} data-testid={`filter-scope-${f.value}`}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </MobileFilterCollapse>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModules.map((trainingMod: TrainingModule) => (
          <div
            key={trainingMod.id}
            onClick={() => { sessionStorage.setItem('academyReferrer', '/akademi-hq'); setLocation(`/akademi-modul/${trainingMod.id}`); }}
            className="cursor-pointer"
          >
            <Card className="hover-elevate h-full flex flex-col">
              <CardHeader className="pb-2 pt-3 px-3 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge
                        variant={isOnboarding(trainingMod) ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate"
                        style={isOnboarding(trainingMod) ? { backgroundColor: 'hsl(var(--chart-4))', color: 'white' } : undefined}
                        data-testid={`badge-type-${trainingMod.id}`}
                      >
                        {isOnboarding(trainingMod) ? "Onboarding" : "Eğitim"}
                      </Badge>
                      {trainingMod.isPublished ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">Yayında</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">Taslak</Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">{trainingMod.title}</CardTitle>
                    {trainingMod.description && (
                      <CardDescription className="text-xs mt-1 line-clamp-2">{trainingMod.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setLocation(`/akademi-modul-editor/${trainingMod.id}`); }} title="Düzenle" data-testid={`button-edit-module-${trainingMod.id}`}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); requestDelete(trainingMod.id, trainingMod.title || ""); }} disabled={deleteTrainingMutation.isPending} title="Sil" data-testid={`button-delete-module-${trainingMod.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                    {trainingMod.level === 'beginner' ? 'Başlangıç' : trainingMod.level === 'intermediate' ? 'Orta' : 'İleri'}
                  </Badge>
                  <Badge variant={(trainingMod as any).scope === 'factory' ? 'destructive' : (trainingMod as any).scope === 'both' ? 'outline' : 'secondary'} className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                    {(trainingMod as any).scope === 'factory' ? 'Fabrika' : (trainingMod as any).scope === 'both' ? 'Tümü' : 'Şube'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                    {trainingMod.estimatedDuration} dk
                  </Badge>
                  {!isOnboarding(trainingMod) && (trainingMod as any).category && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                      {CATEGORY_LABELS[(trainingMod as any).category] || (trainingMod as any).category}
                    </Badge>
                  )}
                </div>
                {trainingMod.requiredForRole && trainingMod.requiredForRole.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex gap-1 flex-wrap">
                      {trainingMod.requiredForRole.slice(0, 3).map((role: string) => (
                        <Badge key={role} variant="outline" className="text-[10px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{role}</Badge>
                      ))}
                      {trainingMod.requiredForRole.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{trainingMod.requiredForRole.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {filteredModules.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            {viewMode === "onboarding" ? (
              <UserPlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            ) : (
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            )}
            <p className="text-muted-foreground text-sm" data-testid="text-no-modules">
              {searchQuery
                ? "Arama sonucu bulunamadı"
                : viewMode === "onboarding"
                  ? "Henüz onboarding modülü eklenmedi"
                  : "Henüz eğitim modülü eklenmedi"
              }
            </p>
          </CardContent>
        </Card>
      )}

      <AIModuleCreator open={isAiGeneratorOpen} onOpenChange={setIsAiGeneratorOpen} />

      <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Eğitim Modülünü Düzenle</DialogTitle></DialogHeader>
          {editingModule && (
            <Form {...editTrainingForm}>
              <form onSubmit={editTrainingForm.handleSubmit((data) => updateTrainingMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                <FormField control={editTrainingForm.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Başlık</FormLabel><FormControl><Input placeholder="Modül başlığı" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editTrainingForm.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Açıklama</FormLabel><FormControl><Textarea placeholder="Modül açıklaması" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <FormField control={editTrainingForm.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seviye</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={editingModule?.level || "beginner"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Başlangıç</SelectItem>
                          <SelectItem value="intermediate">Orta</SelectItem>
                          <SelectItem value="advanced">İleri</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={editTrainingForm.control} name="scope" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapsam</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "branch"}>
                        <FormControl><SelectTrigger data-testid="select-module-scope-edit"><SelectValue placeholder="Kapsam seçin" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="branch">Şube Eğitimi</SelectItem>
                          <SelectItem value="factory">Fabrika Eğitimi</SelectItem>
                          <SelectItem value="both">Her İkisi</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={editTrainingForm.control} name="estimatedDuration" render={({ field }) => (
                  <FormItem><FormLabel>Tahmini Süre (dk)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>
                )} />
                {editingModule.id && (
                  <ModuleGallery moduleId={editingModule.id} images={editingGalleryImages} onImagesChange={setEditingGalleryImages} disabled={updateTrainingMutation.isPending} />
                )}
                <Button type="submit" disabled={updateTrainingMutation.isPending} className="w-full">
                  {updateTrainingMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAiOnboardingOpen} onOpenChange={setIsAiOnboardingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Onboarding Şablon Üretici
            </DialogTitle>
          </DialogHeader>
          {!aiOnboardingResult ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Pozisyon</label>
                <Select value={aiOnboardingRole} onValueChange={setAiOnboardingRole}>
                  <SelectTrigger data-testid="select-onboarding-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="fabrika_personel">Fabrika Personeli</SelectItem>
                    <SelectItem value="uretim_sorumlusu">Üretim Sorumlusu</SelectItem>
                    <SelectItem value="kalite_kontrol">Kalite Kontrol</SelectItem>
                    <SelectItem value="depocu">Depocu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kapsam</label>
                <Select value={aiOnboardingScope} onValueChange={setAiOnboardingScope}>
                  <SelectTrigger data-testid="select-onboarding-scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Şube</SelectItem>
                    <SelectItem value="factory">Fabrika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Süre (gün)</label>
                <Input type="number" value={aiOnboardingDuration} onChange={(e) => setAiOnboardingDuration(parseInt(e.target.value) || 60)} data-testid="input-onboarding-duration" />
              </div>
              <Button onClick={() => generateOnboardingMutation.mutate({ targetRole: aiOnboardingRole, scope: aiOnboardingScope, durationDays: aiOnboardingDuration })} disabled={generateOnboardingMutation.isPending} className="w-full" data-testid="btn-generate-onboarding">
                {generateOnboardingMutation.isPending ? "Oluşturuluyor..." : "AI ile Şablon Oluştur"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-md border">
                <p className="font-medium text-sm">{aiOnboardingResult.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{aiOnboardingResult.description}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Adımlar ({aiOnboardingResult.steps?.length || 0})</p>
                {(aiOnboardingResult.steps || []).map((step: any, idx: number) => (
                  <div key={idx} className="p-2 rounded border text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{step.stepOrder || idx + 1}. {step.title}</span>
                      <Badge variant="outline" className="text-[10px]">Gün {step.startDay}-{step.endDay}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{step.description}</p>
                    <p className="mt-1">Mentör: <Badge variant="secondary" className="text-[10px]">{step.mentorRoleType}</Badge></p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiOnboardingResult(null)} className="flex-1" data-testid="btn-regenerate-onboarding">Yeniden Oluştur</Button>
                <Button onClick={() => saveOnboardingMutation.mutate(aiOnboardingResult)} disabled={saveOnboardingMutation.isPending} className="flex-1" data-testid="btn-save-onboarding">
                  {saveOnboardingMutation.isPending ? "Kaydediliyor..." : "Şablonu Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAiProgramOpen} onOpenChange={setIsAiProgramOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Brain className="w-5 h-5 text-primary" />
              AI Eğitim Programı Üretici
            </DialogTitle>
          </DialogHeader>
          {!aiProgramResult ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Pozisyon</label>
                <Select value={aiProgramRole} onValueChange={setAiProgramRole}>
                  <SelectTrigger data-testid="select-program-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="fabrika_personel">Fabrika Personeli</SelectItem>
                    <SelectItem value="uretim_sorumlusu">Üretim Sorumlusu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kapsam</label>
                <Select value={aiProgramScope} onValueChange={setAiProgramScope}>
                  <SelectTrigger data-testid="select-program-scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Şube</SelectItem>
                    <SelectItem value="factory">Fabrika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Program Türü</label>
                <Select value={aiProgramType} onValueChange={setAiProgramType}>
                  <SelectTrigger data-testid="select-program-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role_training">Temel Eğitim Programı</SelectItem>
                    <SelectItem value="machine_training">Makine Kullanım Eğitimi</SelectItem>
                    <SelectItem value="skill_upgrade">Yetkinlik Geliştirme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => generateProgramMutation.mutate({ targetRole: aiProgramRole, scope: aiProgramScope, programType: aiProgramType })} disabled={generateProgramMutation.isPending} className="w-full" data-testid="btn-generate-program">
                {generateProgramMutation.isPending ? "Oluşturuluyor..." : "AI ile Program Oluştur"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-md border">
                <p className="font-medium text-sm">{aiProgramResult.programName}</p>
                <p className="text-xs text-muted-foreground">{aiProgramResult.modules?.length || 0} modül oluşturuldu</p>
              </div>
              <div className="space-y-2">
                {(aiProgramResult.modules || []).map((mod: any, idx: number) => (
                  <div key={idx} className="p-2 rounded border text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{mod.title}</span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px]">{mod.level || 'beginner'}</Badge>
                        <Badge variant="outline" className="text-[10px]">{mod.estimatedDuration || 30} dk</Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1">{mod.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiProgramResult(null)} className="flex-1" data-testid="btn-regenerate-program">Yeniden Oluştur</Button>
                <Button onClick={() => saveProgramModulesMutation.mutate(aiProgramResult.modules || [])} disabled={saveProgramModulesMutation.isPending} className="flex-1" data-testid="btn-save-program">
                  {saveProgramModulesMutation.isPending ? "Kaydediliyor..." : "Tüm Modülleri Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => { const id = confirmDelete(); if (id) deleteTrainingMutation.mutate(id as number); }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" modülü silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
