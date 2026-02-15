import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, GraduationCap, Users, Calendar, ClipboardList, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

interface OnboardingTemplate {
  id: number;
  name: string;
  description: string | null;
  targetRole: string;
  durationDays: number;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

interface OnboardingTemplateStep {
  id: number;
  templateId: number;
  stepOrder: number;
  title: string;
  description: string | null;
  startDay: number;
  endDay: number;
  mentorRoleType: string;
  trainingModuleId: number | null;
  requiredCompletion: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  muhasebe_ik: "Muhasebe & İK",
  satinalma: "Satın Alma",
  coach: "Coach",
  marketing: "Marketing",
  trainer: "Trainer (Eğitmen)",
  kalite_kontrol: "Kalite Kontrol",
  fabrika_mudur: "Fabrika Müdürü",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı HQ",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
  yatirimci_branch: "Yatırımcı",
  fabrika_operator: "Fabrika Operatör",
  fabrika_sorumlu: "Fabrika Sorumlu",
  fabrika_personel: "Fabrika Personel",
};

const mentorRoleLabels: Record<string, string> = {
  barista: "Kıdemli Barista",
  supervisor: "Supervisor",
  supervisor_buddy: "Supervisor Buddy",
  coach: "Coach",
};

export default function CoachOnboardingPage() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editStep, setEditStep] = useState<OnboardingTemplateStep | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [stepDeleteState, setStepDeleteState] = useState<{ open: boolean; itemId: number | null; itemName: string }>({ open: false, itemId: null, itemName: "" });

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    targetRole: "barista",
    durationDays: 60,
  });

  const [newStep, setNewStep] = useState({
    title: "",
    description: "",
    startDay: 1,
    endDay: 3,
    mentorRoleType: "barista",
    requiredCompletion: true,
  });

  const { data: templates = [], isLoading } = useQuery<OnboardingTemplate[]>({
    queryKey: ["/api/onboarding-templates"],
  });

  const { data: steps = [] } = useQuery<OnboardingTemplateStep[]>({
    queryKey: ["/api/onboarding-templates", selectedTemplate?.id, "steps"],
    queryFn: async () => {
      if (!selectedTemplate) return [];
      const res = await fetch(`/api/onboarding-templates/${selectedTemplate.id}/steps`);
      return res.json();
    },
    enabled: !!selectedTemplate,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      return apiRequest("POST", "/api/onboarding-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setCreateDialogOpen(false);
      setNewTemplate({ name: "", description: "", targetRole: "barista", durationDays: 60 });
      toast({ title: "Şablon oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/onboarding-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setSelectedTemplate(null);
      toast({ title: "Şablon silindi" });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (data: typeof newStep & { templateId: number; stepOrder: number }) => {
      return apiRequest("POST", `/api/onboarding-templates/${data.templateId}/steps`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates", selectedTemplate?.id, "steps"] });
      setStepDialogOpen(false);
      setNewStep({ title: "", description: "", startDay: 1, endDay: 3, mentorRoleType: "barista", requiredCompletion: true });
      toast({ title: "Adım eklendi" });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<typeof newStep>) => {
      return apiRequest("PUT", `/api/onboarding-template-steps/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates", selectedTemplate?.id, "steps"] });
      setEditStep(null);
      toast({ title: "Adım güncellendi" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/onboarding-template-steps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates", selectedTemplate?.id, "steps"] });
      toast({ title: "Adım silindi" });
    },
  });

  const handleCreateStep = () => {
    if (!selectedTemplate || !newStep.title) return;
    createStepMutation.mutate({
      ...newStep,
      templateId: selectedTemplate.id,
      stepOrder: steps.length + 1,
    });
  };

  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Onboarding Şablonları
          </h1>
          <p className="text-muted-foreground">Yeni personel eğitim programlarını yönetin</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Şablon
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-template">
            <DialogHeader>
              <DialogTitle>Yeni Onboarding Şablonu</DialogTitle>
              <DialogDescription>Tüm şubelerde kullanılacak eğitim programı oluşturun</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Şablon Adı</Label>
                <Input
                  id="name"
                  data-testid="input-template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Örn: Yeni Barista Onboarding"
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  data-testid="textarea-template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Şablon hakkında açıklama"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetRole">Hedef Rol</Label>
                  <Select
                    value={newTemplate.targetRole}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, targetRole: v })}
                  >
                    <SelectTrigger id="targetRole" data-testid="select-target-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Süre (Gün)</Label>
                  <Input
                    id="duration"
                    type="number"
                    data-testid="input-duration"
                    value={newTemplate.durationDays}
                    onChange={(e) => setNewTemplate({ ...newTemplate, durationDays: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>İptal</Button>
              <Button
                onClick={() => createTemplateMutation.mutate(newTemplate)}
                disabled={createTemplateMutation.isPending || !newTemplate.name}
                data-testid="button-save-template"
              >
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Şablonlar</CardTitle>
            <CardDescription>{templates.length} aktif şablon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henüz şablon yok</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer hover-elevate ${
                    selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`card-template-${template.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{roleLabels[template.targetRole]}</Badge>
                        <span className="text-xs text-muted-foreground">{template.durationDays} gün</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>{selectedTemplate.description || "Açıklama yok"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-step">
                          <Plus className="h-4 w-4 mr-1" />
                          Adım Ekle
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-add-step">
                        <DialogHeader>
                          <DialogTitle>Yeni Eğitim Adımı</DialogTitle>
                          <DialogDescription>Bu aşamada hangi eğitim verilecek?</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="step-title">Adım Başlığı</Label>
                            <Input
                              id="step-title"
                              data-testid="input-step-title"
                              value={newStep.title}
                              onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                              placeholder="Örn: Apron & Temel Eğitim"
                            />
                          </div>
                          <div>
                            <Label htmlFor="step-desc">Açıklama</Label>
                            <Textarea
                              id="step-desc"
                              data-testid="textarea-step-desc"
                              value={newStep.description}
                              onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                              placeholder="Bu aşamada neler öğretilecek?"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="start-day">Başlangıç Günü</Label>
                              <Input
                                id="start-day"
                                type="number"
                                data-testid="input-start-day"
                                value={newStep.startDay}
                                onChange={(e) => setNewStep({ ...newStep, startDay: parseInt(e.target.value) || 1 })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="end-day">Bitiş Günü</Label>
                              <Input
                                id="end-day"
                                type="number"
                                data-testid="input-end-day"
                                value={newStep.endDay}
                                onChange={(e) => setNewStep({ ...newStep, endDay: parseInt(e.target.value) || 3 })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="mentor-role">Sorumlu Kişi Rolü</Label>
                            <Select
                              value={newStep.mentorRoleType}
                              onValueChange={(v) => setNewStep({ ...newStep, mentorRoleType: v })}
                            >
                              <SelectTrigger id="mentor-role" data-testid="select-mentor-role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(mentorRoleLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setStepDialogOpen(false)}>İptal</Button>
                          <Button
                            onClick={handleCreateStep}
                            disabled={createStepMutation.isPending || !newStep.title}
                            data-testid="button-save-step"
                          >
                            Ekle
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => requestDelete(selectedTemplate.id, selectedTemplate.name || "")}
                      data-testid="button-delete-template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{roleLabels[selectedTemplate.targetRole]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedTemplate.durationDays} gün</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{sortedSteps.length} adım</span>
                  </div>
                </div>

                {sortedSteps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz adım eklenmemiş</p>
                    <p className="text-sm">Yukarıdaki "Adım Ekle" butonunu kullanın</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="p-4 border rounded-lg hover-elevate"
                        data-testid={`card-step-${step.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                                {step.stepOrder}
                              </div>
                              {index < sortedSteps.length - 1 && (
                                <div className="w-0.5 h-8 bg-border mt-1" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{step.title}</p>
                              {step.description && (
                                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>Gün {step.startDay} - {step.endDay}</span>
                                <Badge variant="outline" className="text-xs">
                                  {mentorRoleLabels[step.mentorRoleType]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setStepDeleteState({ open: true, itemId: step.id, itemName: step.title || "" })}
                              data-testid={`button-delete-step-${step.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <GraduationCap className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Şablon Seçin</p>
              <p className="text-sm">Sol taraftan bir şablon seçerek detayları görüntüleyin</p>
            </CardContent>
          )}
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteTemplateMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" şablonu silinecektir. Bu işlem geri alınamaz.`}
      />

      <ConfirmDeleteDialog
        open={stepDeleteState.open}
        onOpenChange={(open) => { if (!open) setStepDeleteState({ open: false, itemId: null, itemName: "" }); }}
        onConfirm={() => {
          const id = stepDeleteState.itemId;
          setStepDeleteState({ open: false, itemId: null, itemName: "" });
          if (id) deleteStepMutation.mutate(id);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${stepDeleteState.itemName || ''}" adımı silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
