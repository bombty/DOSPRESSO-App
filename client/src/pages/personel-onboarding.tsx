import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  MessageSquarePlus,
  UserCheck,
  CircleDot,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { z } from "zod";
import type { User, EmployeeOnboarding } from "@shared/schema";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const statusLabels: Record<string, string> = {
  not_started: "Başlamadı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

const taskTypeLabels: Record<string, string> = {
  orientation: "Oryantasyon",
  training: "Eğitim",
  document: "Belge Teslimi",
  system_access: "Sistem Erişimi",
  introduction: "Tanışma",
  practical: "Pratik Uygulama",
  evaluation: "Değerlendirme",
  other: "Diğer",
};

const MENTOR_ROLES = ["supervisor", "supervisor_buddy", "barista", "mudur"];

const startOnboardingSchema = z.object({
  userId: z.string().min(1, "Personel seçin"),
  branchId: z.string().min(1, "Şube seçin"),
  templateId: z.string().min(1, "Şablon seçin"),
  mentorId: z.string().optional().default(""),
  startDate: z.string().min(1, "Başlangıç tarihi seçin"),
});

type StartOnboardingForm = z.infer<typeof startOnboardingSchema>;

const mentorNoteSchema = z.object({
  note: z.string().min(1, "Not giriniz"),
  rating: z.string().optional().default(""),
});

type MentorNoteForm = z.infer<typeof mentorNoteSchema>;

function getDaysRemaining(expectedDate: string | null | undefined): number | null {
  if (!expectedDate) return null;
  return Math.ceil((new Date(expectedDate).getTime() - new Date().getTime()) / 86400000);
}

function getDaysColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-destructive";
  if (days < 14) return "text-destructive";
  if (days <= 30) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function DaysRemainingBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days < 14;
  

  return (
    <Badge
      variant={isOverdue || isUrgent ? "destructive" : "secondary"}
      data-testid="badge-days-remaining"
    >
      {isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
      {isOverdue ? `${Math.abs(days)} gün gecikme` : `Kalan: ${days} gün`}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "default" : status === "in_progress" ? "secondary" : "outline";
  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
      {status === "not_started" && <AlertCircle className="h-3 w-3 mr-1" />}
      {statusLabels[status] || status}
    </Badge>
  );
}

export default function PersonelOnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mentorNoteDialogId, setMentorNoteDialogId] = useState<number | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const isMentorEligible = user?.role && MENTOR_ROLES.includes(user.role);

  const { data: onboardingRecords = [], isLoading, isError, refetch } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: ["/api/employee-onboarding?filter=all"],
    enabled: !!user,
  });

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/onboarding-templates"],
    enabled: !!user,
  });

  const { data: mentees = [], isLoading: menteesLoading } = useQuery<(EmployeeOnboarding & { user?: User })[]>({
    queryKey: ["/api/employee-onboarding/mentor/my-mentees"],
    enabled: !!user && !!isMentorEligible,
  });

  const filteredRecords = useMemo(() => {
    return onboardingRecords.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (searchText) {
        const search = searchText.toLocaleLowerCase('tr-TR');
        const fullName = `${record.user?.firstName || ""} ${record.user?.lastName || ""}`.toLocaleLowerCase('tr-TR');
        if (!fullName.includes(search)) return false;
      }
      return true;
    });
  }, [onboardingRecords, statusFilter, searchText]);

  const stats = useMemo(() => ({
    total: onboardingRecords.length,
    notStarted: onboardingRecords.filter(r => r.status === "not_started").length,
    inProgress: onboardingRecords.filter(r => r.status === "in_progress").length,
    completed: onboardingRecords.filter(r => r.status === "completed").length,
  }), [onboardingRecords]);

  const startMutation = useMutation({
    mutationFn: async (data: StartOnboardingForm) => {
      return apiRequest("POST", "/api/employee-onboarding/start-from-template", {
        userId: data.userId,
        branchId: parseInt(data.branchId),
        templateId: parseInt(data.templateId),
        mentorId: data.mentorId || undefined,
        startDate: data.startDate || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Onboarding süreci başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding?filter=all"] });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/employee-onboarding/${id}`),
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Kayıt silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding?filter=all"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const mentorNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MentorNoteForm }) => {
      return apiRequest("POST", `/api/employee-onboarding/${id}/mentor-note`, {
        note: data.note,
        rating: data.rating ? parseInt(data.rating) : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mentor notu eklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding/mentor/my-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding?filter=all"] });
      setMentorNoteDialogId(null);
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <ListSkeleton count={5} variant="row" showHeader />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const mentorEmployees = employees.filter(e => MENTOR_ROLES.includes(e.role || ""));

  const renderRecordCard = (record: EmployeeOnboarding & { user?: User }, showActions = true) => {
    const days = getDaysRemaining(record.expectedCompletionDate);
    const pct = (record as any).completionPercentage ?? 0;
    const mentor = record.assignedMentorId ? employees.find(e => e.id === record.assignedMentorId) : null;
    const branch = branches.find((b: any) => b.id === record.branchId);
    const isExpanded = expandedId === record.id;

    return (
      <Card key={record.id} data-testid={`card-onboarding-${record.id}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold" data-testid={`text-employee-name-${record.id}`}>
                    {record.user?.firstName} {record.user?.lastName}
                  </span>
                  <StatusBadge status={record.status} />
                  {days !== null && <DaysRemainingBadge days={days} />}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {record.user?.role && (
                    <span data-testid={`text-role-${record.id}`}>{record.user.role}</span>
                  )}
                  {branch && (
                    <span data-testid={`text-branch-${record.id}`}>{(branch as any).name}</span>
                  )}
                  {mentor && (
                    <span className="flex items-center gap-1" data-testid={`text-mentor-${record.id}`}>
                      <UserCheck className="h-3 w-3" />
                      {mentor.firstName} {mentor.lastName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {record.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(record.startDate), "d MMM yyyy", { locale: tr })}
                    </span>
                  )}
                  {record.expectedCompletionDate && (
                    <span className={`flex items-center gap-1 ${getDaysColor(days)}`}>
                      <Clock className="h-3 w-3" />
                      {format(new Date(record.expectedCompletionDate), "d MMM yyyy", { locale: tr })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showActions && (
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-${record.id}`}
                    onClick={(e) => { e.stopPropagation(); requestDelete(record.id, ""); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-detail-${record.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  Detay
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={pct} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-progress-${record.id}`}>
                %{pct}
              </span>
            </div>
          </div>
          {isExpanded && <TimelineDetail onboardingId={record.id} record={record} />}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Personel Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Yeni personellerin işe alım ve oryantasyon süreçlerini yönet</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-start-onboarding" className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Onboarding Başlat
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Toplam", value: stats.total, testId: "stat-total" },
          { label: "Başlamadı", value: stats.notStarted, testId: "stat-not-started" },
          { label: "Devam Ediyor", value: stats.inProgress, testId: "stat-in-progress" },
          { label: "Tamamlandı", value: stats.completed, testId: "stat-completed" },
        ].map((s) => (
          <Card key={s.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={s.testId}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="not_started">Başlamadı</SelectItem>
            <SelectItem value="in_progress">Devam Ediyor</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Personel adı ara..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {isMentorEligible ? (
        <Tabs defaultValue="all" className="w-full">
          <TabsList data-testid="tabs-onboarding">
            <TabsTrigger value="all" data-testid="tab-all-records">Tüm Kayıtlar</TabsTrigger>
            <TabsTrigger value="mentees" data-testid="tab-mentees">Mentorlukların</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="flex flex-col gap-3 mt-3">
            <RecordsList records={filteredRecords} renderCard={renderRecordCard} searchText={searchText} statusFilter={statusFilter} />
          </TabsContent>
          <TabsContent value="mentees" className="flex flex-col gap-3 mt-3">
            {menteesLoading ? (
              <ListSkeleton count={3} variant="row" />
            ) : mentees.length === 0 ? (
              <EmptyState title="Mentee bulunamadı" description="Henüz size atanmış mentee yok" />
            ) : (
              mentees.map((m) => (
                <div key={m.id} className="flex flex-col gap-2">
                  {renderRecordCard(m, false)}
                  <div className="pl-4">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-add-note-${m.id}`}
                      onClick={() => setMentorNoteDialogId(m.id)}
                      className="gap-1"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Not Ekle
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col gap-3">
          <RecordsList records={filteredRecords} renderCard={renderRecordCard} searchText={searchText} statusFilter={statusFilter} />
        </div>
      )}

      <StartOnboardingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        branches={branches}
        templates={templates}
        mentorEmployees={mentorEmployees}
        onSubmit={(data) => startMutation.mutate(data)}
        isLoading={startMutation.isPending}
      />

      <MentorNoteDialog
        open={mentorNoteDialogId !== null}
        onOpenChange={(open) => !open && setMentorNoteDialogId(null)}
        onSubmit={(data) => {
          if (mentorNoteDialogId) mentorNoteMutation.mutate({ id: mentorNoteDialogId, data });
        }}
        isLoading={mentorNoteMutation.isPending}
      />

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description="Bu kayıt silinecektir. Bu işlem geri alınamaz."
      />
    </div>
  );
}

function RecordsList({
  records,
  renderCard,
  searchText,
  statusFilter,
}: {
  records: (EmployeeOnboarding & { user?: User })[];
  renderCard: (r: EmployeeOnboarding & { user?: User }) => React.ReactNode;
  searchText: string;
  statusFilter: string;
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="Henüz kayıt bulunmuyor"
        description={searchText || statusFilter !== "all" ? "Seçili filtreler ile eşleşen kayıt bulunmuyor" : "Henüz onboarding kaydı oluşturulmamış"}
      />
    );
  }
  return <>{(Array.isArray(records) ? records : []).map((r) => renderCard(r))}</>;
}

function TimelineDetail({
  onboardingId,
  record,
}: {
  onboardingId: number;
  record: EmployeeOnboarding & { user?: User };
}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/onboarding-tasks", onboardingId],
    queryFn: () => fetch(`/api/onboarding-tasks/${onboardingId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!onboardingId,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => apiRequest("POST", `/api/onboarding-tasks/${taskId}/complete`),
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Görev tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboardingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding?filter=all"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const verifyTaskMutation = useMutation({
    mutationFn: async (taskId: number) => apiRequest("POST", `/api/onboarding-tasks/${taskId}/verify`),
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Görev doğrulandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboardingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding?filter=all"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const canVerify = user?.role && MENTOR_ROLES.includes(user.role);

  if (isLoading) return <ListSkeleton count={3} variant="row" />;

  if (tasks.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground py-6">
        Bu onboarding kaydı için henüz görev tanımlanmamış
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t" data-testid={`timeline-${onboardingId}`}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h3 className="font-semibold text-sm">Onboarding Zaman Çizelgesi</h3>
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t: any) => t.status === "completed").length}/{tasks.length} tamamlandı
        </span>
      </div>
      <div className="relative flex flex-col gap-0">
        {(Array.isArray(tasks) ? tasks : []).map((task: any, idx: number) => {
          const isCompleted = task.status === "completed";
          const isInProgress = task.status === "in_progress";
          const isLast = idx === tasks.length - 1;

          return (
            <div key={task.id} className="flex gap-3 relative" data-testid={`timeline-item-${task.id}`}>
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2
                  ${isCompleted ? "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400" : ""}
                  ${isInProgress ? "bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400" : ""}
                  ${!isCompleted && !isInProgress ? "bg-muted border-muted-foreground/30" : ""}
                `}>
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {isInProgress && <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  {!isCompleted && !isInProgress && <CircleDot className="h-4 w-4 text-muted-foreground" />}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${isCompleted ? "bg-green-300 dark:bg-green-700" : "bg-border"}`} />
                )}
              </div>
              <div className={`pb-6 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span
                      className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                      data-testid={`text-task-name-${task.id}`}
                    >
                      {task.taskName}
                    </span>
                    {task.description && (
                      <span className="text-xs text-muted-foreground">{task.description}</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-task-type-${task.id}`}>
                        {taskTypeLabels[task.taskType] || task.taskType}
                      </Badge>
                      {isCompleted && (
                        <Badge variant="default" className="text-xs">Tamamlandı</Badge>
                      )}
                      {task.verifiedAt && (
                        <Badge variant="default" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Dogrulandi
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-task-due-${task.id}`}>
                          {format(new Date(task.dueDate), "d MMM yyyy", { locale: tr })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeTaskMutation.mutate(task.id)}
                        disabled={completeTaskMutation.isPending}
                        data-testid={`button-complete-task-${task.id}`}
                      >
                        Tamamla
                      </Button>
                    )}
                    {isCompleted && !task.verifiedAt && canVerify && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyTaskMutation.mutate(task.id)}
                        disabled={verifyTaskMutation.isPending}
                        data-testid={`button-verify-task-${task.id}`}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Dogrula
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartOnboardingDialog({
  open,
  onOpenChange,
  employees,
  branches,
  templates,
  mentorEmployees,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: User[];
  branches: any[];
  templates: any[];
  mentorEmployees: User[];
  onSubmit: (data: StartOnboardingForm) => void;
  isLoading: boolean;
}) {
  const form = useForm<StartOnboardingForm>({
    resolver: zodResolver(startOnboardingSchema),
    defaultValues: {
      userId: "",
      branchId: "",
      templateId: "",
      mentorId: "",
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Onboarding Başlat</DialogTitle>
          <DialogDescription>Personel icin onboarding sureci baslatmak uzere bilgileri girin</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-employee">
                        <SelectValue placeholder="Personel seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Array.isArray(employees) ? employees : []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} {e.role ? `(${e.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şube</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-branch">
                        <SelectValue placeholder="Şube seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Array.isArray(branches) ? branches : []).map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şablon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Şablon seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} ({t.targetRole})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mentorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor (opsiyonel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mentor">
                        <SelectValue placeholder="Mentor seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Mentor atanmasin</SelectItem>
                      {mentorEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlangıç Tarihi</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-start-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} data-testid="button-submit-onboarding" className="gap-2">
              <Users className="h-4 w-4" />
              Başlat
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MentorNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MentorNoteForm) => void;
  isLoading: boolean;
}) {
  const form = useForm<MentorNoteForm>({
    resolver: zodResolver(mentorNoteSchema),
    defaultValues: { note: "", rating: "" },
  });

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mentor Notu Ekle</DialogTitle>
          <DialogDescription>Mentee hakkinda not ve degerlendirme ekleyin</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Not</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Notunuzu yazin..." data-testid="textarea-mentor-note" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Değerlendirme (1-5)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-rating">
                        <SelectValue placeholder="Puan seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["1", "2", "3", "4", "5"].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} data-testid="button-submit-note" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Kaydet
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
