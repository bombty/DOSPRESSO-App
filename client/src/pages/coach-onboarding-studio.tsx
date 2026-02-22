import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Users,
  UserPlus,
  ChevronRight,
  GraduationCap,
  FileQuestion,
  Wrench,
  ChefHat,
} from "lucide-react";

interface OnboardingTemplate {
  id: number;
  name: string;
  description: string | null;
  targetRole: string;
  scope: string;
  durationDays: number;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  stepCount: number;
  assignmentCount: number;
  steps?: TemplateStep[];
}

interface TemplateStep {
  id: number;
  templateId: number;
  stepOrder: number;
  title: string;
  description: string | null;
  startDay: number;
  endDay: number;
  contentType: string;
  contentId: number | null;
  estimatedMinutes: number;
  approverType: string;
  mentorRoleType: string;
  trainingModuleId: number | null;
  requiredCompletion: boolean;
}

interface AssignmentData {
  id: number;
  userId: string;
  branchId: number;
  templateId: number;
  status: string;
  overallProgress: number;
  startDate: string;
  expectedEndDate: string | null;
  userName: string;
  userRole: string;
  templateName: string;
  templateDuration: number;
}

interface AvailableUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number | null;
}

interface Branch {
  id: number;
  name: string;
}

type StudioView = "list" | "editor" | "preview" | "assign";

const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Supervisor Buddy",
  supervisor: "Supervisor",
};

const CONTENT_TYPES = [
  { value: "module", label: "Modül", icon: BookOpen },
  { value: "quiz", label: "Quiz", icon: FileQuestion },
  { value: "practical", label: "Pratik", icon: Wrench },
  { value: "recipe", label: "Reçete", icon: ChefHat },
  { value: "gate_exam", label: "Gate Sınavı", icon: GraduationCap },
];

const APPROVER_TYPES = [
  { value: "auto", label: "Otomatik" },
  { value: "supervisor", label: "Supervisor" },
  { value: "mentor", label: "Mentor" },
  { value: "trainer", label: "Trainer" },
];

export default function CoachOnboardingStudio() {
  const { toast } = useToast();
  const [view, setView] = useState<StudioView>("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<TemplateStep | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    targetRole: "stajyer",
    scope: "branch",
    durationDays: 14,
  });

  const [newStep, setNewStep] = useState({
    title: "",
    description: "",
    startDay: 1,
    endDay: 1,
    contentType: "module",
    estimatedMinutes: 15,
    approverType: "auto",
    mentorRoleType: "barista",
    requiredCompletion: true,
  });

  const [assignData, setAssignData] = useState({
    branchId: "",
    role: "",
    userId: "",
    templateId: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<OnboardingTemplate[]>({
    queryKey: ["/api/academy/onboarding/templates"],
  });

  const { data: templateDetail, isLoading: detailLoading } = useQuery<OnboardingTemplate>({
    queryKey: ["/api/academy/onboarding/templates", selectedTemplateId],
    enabled: !!selectedTemplateId && view !== "list",
  });

  const { data: assignments } = useQuery<AssignmentData[]>({
    queryKey: ["/api/academy/onboarding/assignments"],
  });

  const { data: allBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: availableUsers } = useQuery<AvailableUser[]>({
    queryKey: ["/api/academy/onboarding/available-users", assignData.branchId, assignData.role],
    enabled: !!assignData.branchId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof newTemplate) =>
      apiRequest("POST", "/api/academy/onboarding/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/templates"] });
      setShowCreateDialog(false);
      setNewTemplate({ name: "", description: "", targetRole: "stajyer", scope: "branch", durationDays: 14 });
      toast({ title: "Şablon oluşturuldu" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/academy/onboarding/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/templates"] });
      toast({ title: "Şablon silindi" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const createStepMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/academy/onboarding/templates/${selectedTemplateId}/steps`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/templates", selectedTemplateId] });
      setShowStepDialog(false);
      resetStepForm();
      toast({ title: "Adım eklendi" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/academy/onboarding/steps/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/templates", selectedTemplateId] });
      setShowStepDialog(false);
      setEditingStep(null);
      resetStepForm();
      toast({ title: "Adım güncellendi" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/academy/onboarding/steps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/templates", selectedTemplateId] });
      toast({ title: "Adım silindi" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/academy/onboarding/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/assignments"] });
      setShowAssignDialog(false);
      setAssignData({ branchId: "", role: "", userId: "", templateId: "", startDate: new Date().toISOString().split("T")[0] });
      toast({ title: "Onboarding ataması oluşturuldu" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  function resetStepForm() {
    setNewStep({ title: "", description: "", startDay: 1, endDay: 1, contentType: "module", estimatedMinutes: 15, approverType: "auto", mentorRoleType: "barista", requiredCompletion: true });
  }

  function openStepEditor(step?: TemplateStep) {
    if (step) {
      setEditingStep(step);
      setNewStep({
        title: step.title,
        description: step.description || "",
        startDay: step.startDay,
        endDay: step.endDay,
        contentType: step.contentType || "module",
        estimatedMinutes: step.estimatedMinutes || 15,
        approverType: step.approverType || "auto",
        mentorRoleType: step.mentorRoleType || "barista",
        requiredCompletion: step.requiredCompletion,
      });
    } else {
      setEditingStep(null);
      resetStepForm();
    }
    setShowStepDialog(true);
  }

  function handleSaveStep() {
    if (editingStep) {
      updateStepMutation.mutate({ id: editingStep.id, data: newStep });
    } else {
      createStepMutation.mutate(newStep);
    }
  }

  function openTemplateEditor(templateId: number) {
    setSelectedTemplateId(templateId);
    setView("editor");
  }

  function getStepsByDay(steps: TemplateStep[]): Record<number, TemplateStep[]> {
    const grouped: Record<number, TemplateStep[]> = {};
    for (const step of steps) {
      const day = step.startDay;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(step);
    }
    return grouped;
  }

  const contentTypeIcon = (type: string) => {
    const ct = CONTENT_TYPES.find(c => c.value === type);
    if (!ct) return <BookOpen className="h-3.5 w-3.5" />;
    const Icon = ct.icon;
    return <Icon className="h-3.5 w-3.5" />;
  };

  if (templatesLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="studio-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (view === "editor" && selectedTemplateId) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto" data-testid="studio-editor">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedTemplateId(null); }} data-testid="button-back-to-list">
            <ArrowLeft className="h-4 w-4 mr-1" /> Geri
          </Button>
          <h2 className="text-lg font-semibold">{templateDetail?.name || "..."}</h2>
          {templateDetail && (
            <Badge variant="secondary">{ROLE_LABELS[templateDetail.targetRole] || templateDetail.targetRole}</Badge>
          )}
          <Badge variant="outline">{templateDetail?.durationDays || 0} gün</Badge>
        </div>

        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {templateDetail?.steps?.length || 0} adım tanımlanmış
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setView("preview")} data-testid="button-preview">
                  <Eye className="h-4 w-4 mr-1" /> Önizleme
                </Button>
                <Button size="sm" onClick={() => openStepEditor()} data-testid="button-add-step">
                  <Plus className="h-4 w-4 mr-1" /> Adım Ekle
                </Button>
              </div>
            </div>

            {templateDetail?.steps && templateDetail.steps.length > 0 ? (
              Object.entries(getStepsByDay(templateDetail.steps))
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, steps]) => (
                  <div key={day} className="space-y-2" data-testid={`day-group-${day}`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Gün {day}</h3>
                      <Badge variant="secondary" className="text-xs">{steps.length} adım</Badge>
                    </div>
                    <div className="space-y-2 ml-6">
                      {steps.map((step) => (
                        <Card key={step.id} data-testid={`step-card-${step.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <div className="mt-0.5">{contentTypeIcon(step.contentType)}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium">{step.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {CONTENT_TYPES.find(c => c.value === step.contentType)?.label || step.contentType}
                                    </Badge>
                                    {step.requiredCompletion && <Badge variant="default" className="text-xs">Zorunlu</Badge>}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> {step.estimatedMinutes} dk
                                    </span>
                                    <span>Onay: {APPROVER_TYPES.find(a => a.value === step.approverType)?.label || step.approverType}</span>
                                    {step.startDay !== step.endDay && <span>Gün {step.startDay}-{step.endDay}</span>}
                                  </div>
                                  {step.description && <p className="text-xs text-muted-foreground mt-1">{step.description}</p>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => openStepEditor(step)} data-testid={`button-edit-step-${step.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => deleteStepMutation.mutate(step.id)} data-testid={`button-delete-step-${step.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Henüz adım eklenmemiş</p>
                  <Button size="sm" className="mt-3" onClick={() => openStepEditor()} data-testid="button-add-first-step">
                    <Plus className="h-4 w-4 mr-1" /> İlk Adımı Ekle
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStep ? "Adım Düzenle" : "Yeni Adım Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Başlık</Label>
                <Input value={newStep.title} onChange={(e) => setNewStep({ ...newStep, title: e.target.value })} data-testid="input-step-title" />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea value={newStep.description} onChange={(e) => setNewStep({ ...newStep, description: e.target.value })} className="min-h-[60px]" data-testid="input-step-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Başlangıç Günü</Label>
                  <Input type="number" min={1} value={newStep.startDay} onChange={(e) => setNewStep({ ...newStep, startDay: parseInt(e.target.value) || 1, endDay: Math.max(parseInt(e.target.value) || 1, newStep.endDay) })} data-testid="input-step-start-day" />
                </div>
                <div>
                  <Label>Bitiş Günü</Label>
                  <Input type="number" min={newStep.startDay} value={newStep.endDay} onChange={(e) => setNewStep({ ...newStep, endDay: parseInt(e.target.value) || newStep.startDay })} data-testid="input-step-end-day" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>İçerik Tipi</Label>
                  <Select value={newStep.contentType} onValueChange={(v) => setNewStep({ ...newStep, contentType: v })}>
                    <SelectTrigger data-testid="select-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tahmini Süre (dk)</Label>
                  <Input type="number" min={1} value={newStep.estimatedMinutes} onChange={(e) => setNewStep({ ...newStep, estimatedMinutes: parseInt(e.target.value) || 15 })} data-testid="input-step-duration" />
                </div>
              </div>
              <div>
                <Label>Onaylayan</Label>
                <Select value={newStep.approverType} onValueChange={(v) => setNewStep({ ...newStep, approverType: v })}>
                  <SelectTrigger data-testid="select-approver-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_TYPES.map(at => (
                      <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStepDialog(false)}>İptal</Button>
              <Button onClick={handleSaveStep} disabled={!newStep.title || createStepMutation.isPending || updateStepMutation.isPending} data-testid="button-save-step">
                {editingStep ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (view === "preview" && selectedTemplateId && templateDetail) {
    const dayGroups = getStepsByDay(templateDetail.steps || []);
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto" data-testid="studio-preview">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setView("editor")} data-testid="button-back-to-editor">
            <ArrowLeft className="h-4 w-4 mr-1" /> Editöre Dön
          </Button>
          <h2 className="text-lg font-semibold">Önizleme</h2>
          <Badge variant="secondary">Employee Görünümü</Badge>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium">Onboarding — Gün 1/{templateDetail.durationDays}</p>
                <p className="text-xs text-muted-foreground">{templateDetail.name}</p>
              </div>
              <Badge variant="outline">%0</Badge>
            </div>
            <div className="w-full h-2 rounded-full bg-muted mt-2">
              <div className="h-2 rounded-full bg-primary" style={{ width: "0%" }} />
            </div>
          </CardContent>
        </Card>

        {Object.entries(dayGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, steps]) => (
            <div key={day} className="space-y-2" data-testid={`preview-day-${day}`}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Gün {day}</h3>
              </div>
              <div className="space-y-1.5 ml-6">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{step.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-0.5">{contentTypeIcon(step.contentType)} {CONTENT_TYPES.find(c => c.value === step.contentType)?.label}</span>
                        <span>{step.estimatedMinutes} dk</span>
                        {step.approverType !== "auto" && (
                          <Badge variant="outline" className="text-xs">{APPROVER_TYPES.find(a => a.value === step.approverType)?.label} onayı</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {Object.keys(dayGroups).length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-sm">Şablonda henüz adım yok</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-onboarding-studio">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Onboarding Studio</h2>
          <Badge variant="secondary">{(templates || []).length} şablon</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(true)} data-testid="button-assign-onboarding">
            <UserPlus className="h-4 w-4 mr-1" /> Atama Yap
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-1" /> Yeni Şablon
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {(templates || []).map((template) => (
          <Card key={template.id} className="hover-elevate" data-testid={`template-card-${template.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary flex-shrink-0">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[template.targetRole] || template.targetRole}</Badge>
                      <span>{template.durationDays} gün</span>
                      <span>{template.stepCount} adım</span>
                      <span>{template.assignmentCount} atama</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => openTemplateEditor(template.id)} data-testid={`button-edit-template-${template.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteTemplateMutation.mutate(template.id)} disabled={template.assignmentCount > 0} data-testid={`button-delete-template-${template.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(templates || []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm mb-2">Henüz onboarding şablonu oluşturulmamış</p>
              <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-1" /> İlk Şablonu Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {assignments && assignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Son Atamalar
            <Badge variant="secondary">{assignments.length}</Badge>
          </h3>
          {assignments.slice(0, 5).map((a) => (
            <Card key={a.id} data-testid={`assignment-card-${a.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{a.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.templateName} | {ROLE_LABELS[a.userRole] || a.userRole}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-medium">%{a.overallProgress}</p>
                      <div className="w-16 h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${a.overallProgress}%` }} />
                      </div>
                    </div>
                    <Badge variant={a.status === "in_progress" ? "default" : a.status === "completed" ? "secondary" : "outline"}>
                      {a.status === "in_progress" ? "Devam" : a.status === "completed" ? "Tamamlandı" : a.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Onboarding Şablonu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Şablon Adı</Label>
              <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Stajyer 14 Gün Programı" data-testid="input-template-name" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} className="min-h-[60px]" data-testid="input-template-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hedef Rol</Label>
                <Select value={newTemplate.targetRole} onValueChange={(v) => setNewTemplate({ ...newTemplate, targetRole: v })}>
                  <SelectTrigger data-testid="select-target-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Süre (Gün)</Label>
                <Input type="number" min={1} value={newTemplate.durationDays} onChange={(e) => setNewTemplate({ ...newTemplate, durationDays: parseInt(e.target.value) || 14 })} data-testid="input-template-duration" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>İptal</Button>
            <Button onClick={() => createTemplateMutation.mutate(newTemplate)} disabled={!newTemplate.name || createTemplateMutation.isPending} data-testid="button-save-template">
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboarding Ataması</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Şablon</Label>
              <Select value={assignData.templateId} onValueChange={(v) => setAssignData({ ...assignData, templateId: v })}>
                <SelectTrigger data-testid="select-assign-template">
                  <SelectValue placeholder="Şablon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(templates || []).filter(t => t.isActive).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({ROLE_LABELS[t.targetRole] || t.targetRole})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Şube</Label>
              <Select value={assignData.branchId} onValueChange={(v) => setAssignData({ ...assignData, branchId: v, userId: "" })}>
                <SelectTrigger data-testid="select-assign-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(allBranches || []).map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Personel</Label>
              <Select value={assignData.userId} onValueChange={(v) => setAssignData({ ...assignData, userId: v })} disabled={!assignData.branchId}>
                <SelectTrigger data-testid="select-assign-user">
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(availableUsers || []).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({ROLE_LABELS[u.role] || u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Başlangıç Tarihi</Label>
              <Input type="date" value={assignData.startDate} onChange={(e) => setAssignData({ ...assignData, startDate: e.target.value })} data-testid="input-assign-start-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>İptal</Button>
            <Button
              onClick={() => createAssignmentMutation.mutate({
                userId: assignData.userId,
                branchId: parseInt(assignData.branchId),
                templateId: parseInt(assignData.templateId),
                startDate: assignData.startDate,
              })}
              disabled={!assignData.userId || !assignData.templateId || !assignData.branchId || createAssignmentMutation.isPending}
              data-testid="button-create-assignment"
            >
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}