import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  PlayCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Star,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  Hand,
  Undo2,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import { StarRating } from "@/components/star-rating";
import type { Task, User as UserType, TaskStatusHistory, TaskRating, TaskStep } from "@shared/schema";
import { ListChecks, Plus, Trash2, Users, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface RatingResponse extends TaskRating {}

export default function GorevDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [failureNote, setFailureNote] = useState("");
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [checkerNote, setCheckerNote] = useState("");
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [showApproveClosureDialog, setShowApproveClosureDialog] = useState(false);
  const [approverNote, setApproverNote] = useState("");
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [showSubmitApprovalDialog, setShowSubmitApprovalDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: assignedUser } = useQuery<UserType>({
    queryKey: ["/api/users", task?.assignedToId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${task!.assignedToId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task?.assignedToId,
  });

  const { data: assignedByUser } = useQuery<UserType>({
    queryKey: ["/api/users", task?.assignedById],
    queryFn: async () => {
      const response = await fetch(`/api/users/${task!.assignedById}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task?.assignedById,
  });

  // Checker user query
  const { data: checkerUser } = useQuery<UserType>({
    queryKey: ["/api/users", task?.checkerId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${task!.checkerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!(task as any)?.checkerId,
  });

  const { data: taskHistory } = useQuery<TaskStatusHistory[]>({
    queryKey: ["/api/tasks", id, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/history`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const { data: ratingData } = useQuery<RatingResponse | undefined>({
    queryKey: ["/api/tasks", id, "rating"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/rating`);
      if (!response.ok) return undefined;
      return response.json();
    },
    enabled: !!id,
  });

  // Task Steps Query
  const { data: taskSteps = [] } = useQuery<TaskStep[]>({
    queryKey: ["/api/tasks", id, "steps"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/steps`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Participant Statuses Query
  const { data: participantStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", id, "participant-statuses"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/participant-statuses`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const myParticipantStatus = participantStatuses.find((p: any) => p.userId === currentUser?.id);
  const taskAssigneesList = (task as any)?.assignees || [];
  const isInAssigneesList = taskAssigneesList.some((a: any) => a.userId === currentUser?.id);
  const isPrimaryAssigneeEarly = currentUser?.id === task?.assignedToId;
  const isAdditionalAssignee = !isPrimaryAssigneeEarly && (!!myParticipantStatus || isInAssigneesList);
  const myStarted = !!myParticipantStatus?.startedAt;

  // Task Steps Mutations
  const addStepMutation = useMutation({
    mutationFn: async (title: string) => {
      const maxOrder = taskSteps.reduce((max, s) => Math.max(max, s.order), 0);
      return apiRequest("POST", `/api/tasks/${id}/steps`, { 
        title, 
        order: maxOrder + 1,
        status: "pending"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "steps"] });
      setNewStepTitle("");
      toast({ title: "Başarılı", description: "Adım eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Adım eklenemedi", variant: "destructive" });
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, completed }: { stepId: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/task-steps/${stepId}`, { 
        status: completed ? "completed" : "pending",
        completedAt: completed ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "steps"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Adım güncellenemedi", variant: "destructive" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      return apiRequest("DELETE", `/api/task-steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "steps"] });
      toast({ title: "Başarılı", description: "Adım silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Adım silinemedi", variant: "destructive" });
    },
  });

  const claimStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      return apiRequest("POST", `/api/tasks/${id}/steps/${stepId}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "steps"] });
      toast({ title: "Başarılı", description: "Adım sahiplenildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Adım alınamadı", variant: "destructive" });
    },
  });

  const unclaimStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      return apiRequest("POST", `/api/tasks/${id}/steps/${stepId}/unclaim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "steps"] });
      toast({ title: "Başarılı", description: "Adım bırakıldı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Adım bırakılamadı", variant: "destructive" });
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/rating`, { rating, feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      setShowRatingDialog(false);
      setRatingValue(0);
      setRatingFeedback("");
      toast({ title: "Başarılı", description: "Görev puanlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Puanlama başarısız", variant: "destructive" });
    },
  });

  const handleSubmitRating = () => {
    if (ratingValue < 1) {
      toast({ title: "Hata", description: "Lütfen bir puan seçin (1-5)", variant: "destructive" });
      return;
    }
    ratingMutation.mutate({ rating: ratingValue, feedback: ratingFeedback || undefined });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tasks/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev görüldü olarak işaretlendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowFailureDialog(false);
      setFailureNote("");
      toast({ title: "Başarılı", description: "Görev durumu güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest("POST", `/api/tasks/${id}/note`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setNewNote("");
      toast({ title: "Başarılı", description: "Not eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Not eklenemedi", variant: "destructive" });
    },
  });

  // Checker request - assignee requests verification from checker
  const requestCheckMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${id}/request-check`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Kontrol talebi gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kontrol talebi gönderilemedi", variant: "destructive" });
    },
  });

  // Checker verify - checker approves the task
  const checkerVerifyMutation = useMutation({
    mutationFn: async (note?: string) => {
      return apiRequest("POST", `/api/tasks/${id}/checker-verify`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev kontrol edildi ve onaylandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kontrol onayı başarısız", variant: "destructive" });
    },
  });

  // Checker reject - checker rejects the task back to assignee
  const checkerRejectMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest("POST", `/api/tasks/${id}/checker-reject`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev düzeltme için geri gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Kontrol reddi başarısız", variant: "destructive" });
    },
  });

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      return apiRequest("POST", `/api/tasks/${id}/ask-question`, { question });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setShowQuestionDialog(false);
      setQuestionText("");
      toast({ title: "Başarılı", description: "Soru gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Soru gönderilemedi", variant: "destructive" });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: async (answer: string) => {
      return apiRequest("POST", `/api/tasks/${id}/answer-question`, { answer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setShowAnswerDialog(false);
      setAnswerText("");
      toast({ title: "Başarılı", description: "Cevap gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Cevap gönderilemedi", variant: "destructive" });
    },
  });

  const requestExtensionMutation = useMutation({
    mutationFn: async ({ reason, requestedDueDate }: { reason: string; requestedDueDate: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/request-extension`, { reason, requestedDueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setShowExtensionDialog(false);
      setExtensionReason("");
      setExtensionDate("");
      toast({ title: "Başarılı", description: "Süre uzatma talebi gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Talep gönderilemedi", variant: "destructive" });
    },
  });

  const approveExtensionMutation = useMutation({
    mutationFn: async ({ approved, note, newDueDate }: { approved: boolean; note?: string; newDueDate?: string }) => {
      return apiRequest("POST", `/api/tasks/${id}/approve-extension`, { approved, note, newDueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      toast({ title: "Başarılı", description: "Süre uzatma talebi yanıtlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (note?: string) => {
      return apiRequest("POST", `/api/tasks/${id}/submit-for-approval`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setShowSubmitApprovalDialog(false);
      toast({ title: "Başarılı", description: "Görev onaya gönderildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const approveClosureMutation = useMutation({
    mutationFn: async (note?: string) => {
      return apiRequest("POST", `/api/tasks/${id}/approve-closure`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      setShowApproveClosureDialog(false);
      setApproverNote("");
      toast({ title: "Başarılı", description: "Görev kapatma onaylandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (reason?: string) => {
      return apiRequest("POST", `/api/tasks/${id}/reactivate`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "history"] });
      toast({ title: "Başarılı", description: "Görev tekrar aktif edildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  const handleMarkFailed = () => {
    if (!failureNote.trim()) {
      toast({ title: "Hata", description: "Başarısızlık nedeni girilmelidir", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({ status: "basarisiz", note: failureNote });
  };

  // Auto-acknowledge task when opened
  useEffect(() => {
    if (task && currentUser) {
      const isAssignee = currentUser.id === task.assignedToId;
      const canAutoAck = isAssignee && !task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz";
      
      if (canAutoAck) {
        acknowledgeMutation.mutate();
      }
    }
  }, [task?.id, currentUser?.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 pb-32">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4 p-3 pb-32">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Görev bulunamadı</p>
            <Link href="/gorevler">
              <Button className="mt-4">Geri Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    beklemede: "Bekliyor",
    goruldu: "Görüldü",
    devam_ediyor: "Devam Ediyor",
    foto_bekleniyor: "Fotoğraf Bekleniyor",
    kontrol_bekliyor: "Kontrol Bekliyor",
    tamamlandi: "Tamamlandı - Onay Bekliyor",
    incelemede: "İncelemede",
    onaylandi: "Onaylandı",
    reddedildi: "Reddedildi",
    basarisiz: "Başarısız",
    "gecikmiş": "Gecikmiş",
    ek_bilgi_bekleniyor: "Ek Bilgi Bekleniyor",
    cevap_bekliyor: "Cevap Bekliyor",
    onay_bekliyor: "Onay Bekliyor",
    sure_uzatma_talebi: "Süre Uzatma Talebi",
    zamanlanmis: "Zamanlanmış",
    iptal_edildi: "İptal Edildi",
  };

  const priorityLabels: Record<string, string> = {
    "düşük": "Düşük",
    orta: "Orta",
    "yüksek": "Yüksek",
    acil: "Acil",
    kritik: "Kritik",
  };

  const isPrimaryAssignee = currentUser?.id === task.assignedToId;
  const isAssignee = isPrimaryAssignee || isAdditionalAssignee;
  const isAssigner = currentUser?.id === task.assignedById;
  const isHQ = currentUser?.role && !['barista', 'senior_barista', 'supervisor', 'supervisor_buddy'].includes(currentUser.role);
  
  const canAcknowledge = isAssignee && !task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz";
  const myNeedsStart = isAdditionalAssignee && !myStarted && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canStartProgress = (isPrimaryAssignee && (task.status === "beklemede" || task.status === "goruldu" || task.status === "ek_bilgi_bekleniyor")) || myNeedsStart;
  const canMarkFailed = isPrimaryAssignee && task.status !== "onaylandi" && task.status !== "basarisiz";
  const canComplete = isPrimaryAssignee && (task.status === "devam_ediyor" || task.status === "beklemede");
  
  // Assigner/HQ can approve, reject, or request additional info
  const canApprove = (isAssigner || isHQ) && (task.status === "tamamlandi" || task.status === "incelemede");
  const canReject = (isAssigner || isHQ) && (task.status === "tamamlandi" || task.status === "incelemede");
  const canRequestInfo = (isAssigner || isHQ) && ["devam_ediyor", "tamamlandi", "incelemede"].includes(task.status);
  const canProvideInfo = isAssignee && task.status === "ek_bilgi_bekleniyor";
  const canRate = (isAssigner || isHQ) && task.status === "onaylandi";
  const canAskQuestion = isAssignee && (task.status === "devam_ediyor" || task.status === "beklemede" || task.status === "goruldu");
  const canAnswerQuestion = (isAssigner || isHQ) && task.status === "cevap_bekliyor";
  const canRequestExtension = isAssignee && (task.status === "devam_ediyor" || task.status === "beklemede" || task.status === "goruldu");
  const canApproveExtension = (isAssigner || isHQ) && task.status === "sure_uzatma_talebi";
  const canSubmitForApproval = isAssignee && (task.status === "devam_ediyor" || task.status === "goruldu" || task.status === "beklemede");
  const canApproveClosure = (isAssigner || isHQ) && task.status === "onay_bekliyor";
  const canCancel = (isAssigner || isHQ) && !['onaylandi', 'iptal_edildi'].includes(task.status);
  const canReactivate = isAssignee && task.status === "onay_bekliyor" && !(task as any).approvedByAssignerId;

  // Checker permissions
  const taskExt = task as any; // Extended task with checker fields
  const isChecker = currentUser?.id === taskExt.checkerId;
  const hasChecker = !!taskExt.checkerId;
  const isOnboarding = !!taskExt.isOnboarding;
  
  // Assignee can request check when task is in progress or completed and has a checker assigned
  // This allows requesting check at any point after starting the task
  const canRequestCheck = isAssignee && hasChecker && 
    (task.status === "devam_ediyor" || task.status === "tamamlandi");
  
  // Checker can verify or reject when task is awaiting check
  const canCheckerVerify = isChecker && task.status === "kontrol_bekliyor";
  const canCheckerReject = isChecker && task.status === "kontrol_bekliyor";
  
  // For onboarding tasks with checker, hide direct complete button to enforce checker path
  const mustUseCheckerPath = isOnboarding && hasChecker;

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-task-title">
              {task.description || `Görev #${task.id}`}
            </h1>
            <p className="text-sm text-muted-foreground">ID: {task.id}</p>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Onboarding badge */}
          {isOnboarding && (
            <Badge className="bg-blue-500/10 text-blue-600 gap-1">
              <GraduationCap className="h-3 w-3" />
              Onboarding
            </Badge>
          )}
          
          {/* Kontrol Bekliyor badge */}
          {task.status === "kontrol_bekliyor" && (
            <Badge className="bg-amber-500/10 text-amber-600 gap-1">
              <ClipboardCheck className="h-3 w-3" />
              Kontrol Bekliyor
            </Badge>
          )}
          
          {/* Acknowledgment indicator */}
          {task.acknowledgedAt ? (
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              Görüldü
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              Görülmedi
            </Badge>
          )}
        </div>
      </div>

      {/* Compact Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Durum</span>
          <div className="mt-1">
            <Badge variant={task.status === "onaylandi" ? "default" : task.status === "basarisiz" ? "destructive" : "secondary"} className="text-xs">
              {statusLabels[task.status] || task.status}
            </Badge>
          </div>
        </div>
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground" data-testid="label-assigned-to">Atanan</span>
          <p className="font-medium mt-1 truncate" data-testid="text-assigned-to-name">
            {(task as any).assignedToName || (assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "-")}
          </p>
        </div>
        {task.status === "onaylandi" && task.completedAt ? (
          <>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Tamamlandı</span>
              <p className="font-medium mt-1">
                {new Date(task.completedAt).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground" data-testid="label-assigned-by">Atayan</span>
              <p className="font-medium mt-1 truncate" data-testid="text-assigned-by-name">
                {(task as any).assignedByName || (assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : "-")}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Son Tarih</span>
              <p className="font-medium mt-1">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>
            <div className="p-2 rounded-lg border bg-card">
              <span className="text-muted-foreground">Öncelik</span>
              <div className="mt-1">
                <Badge variant={task.priority === "kritik" || task.priority === "acil" ? "destructive" : task.priority === "yüksek" ? "secondary" : "outline"} className="text-xs">
                  {priorityLabels[task.priority || "orta"] || task.priority}
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>

      {task.status === "cevap_bekliyor" && (task as any).questionText && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              Soru - Cevap Bekliyor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Soru:</p>
              <p className="text-sm">{(task as any).questionText}</p>
            </div>
            {canAnswerQuestion && (
              <Button onClick={() => setShowAnswerDialog(true)} data-testid="button-answer-question">
                <MessageSquare className="h-4 w-4 mr-2" />
                Cevap Ver
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {task.status === "sure_uzatma_talebi" && (
        <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Süre Uzatma Talebi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(task as any).extensionReason && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Neden:</p>
                <p className="text-sm">{(task as any).extensionReason}</p>
              </div>
            )}
            {(task as any).requestedDueDate && (
              <p className="text-sm">
                <span className="text-muted-foreground">Talep Edilen Tarih:</span>{" "}
                {new Date((task as any).requestedDueDate).toLocaleDateString("tr-TR")}
              </p>
            )}
            {canApproveExtension && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => approveExtensionMutation.mutate({ approved: true, newDueDate: (task as any).requestedDueDate })} disabled={approveExtensionMutation.isPending} data-testid="button-approve-extension">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Uzatmayı Onayla
                </Button>
                <Button variant="destructive" onClick={() => approveExtensionMutation.mutate({ approved: false, note: "Uzatma talebi reddedildi" })} disabled={approveExtensionMutation.isPending} data-testid="button-reject-extension">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {task.status === "onay_bekliyor" && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Kapatma Onayı Bekliyor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Atanan kişi görevi tamamladı ve kapatma onayınızı bekliyor.
            </p>
            {canApproveClosure && (
              <Button onClick={() => setShowApproveClosureDialog(true)} data-testid="button-open-approve-closure">
                <CheckCircle className="h-4 w-4 mr-2" />
                Onayla ve Kapat
              </Button>
            )}
            {canReactivate && (
              <Button variant="outline" onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending} data-testid="button-reactivate-task">
                <PlayCircle className="h-4 w-4 mr-2" />
                Tekrar Aktif Et
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview & Action Section */}
      {isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz" && (
        <>
          {/* Katıl / Başla Button for participants */}
          {(canAcknowledge || canStartProgress) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {isPrimaryAssignee ? (
                    <><PlayCircle className="h-4 w-4" /> Görevi Başlat</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Göreve Katıl</>
                  )}
                </CardTitle>
                {!isPrimaryAssignee && (
                  <p className="text-xs text-muted-foreground">
                    Bu göreve ek katılımcı olarak atandınız. Katıl butonuna basarak çalışmaya başlayabilirsiniz.
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {canStartProgress && (
                  <Button
                    onClick={async () => {
                      try {
                        await apiRequest("POST", `/api/tasks/${id}/start`);
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "participant-statuses"] });
                        toast({ 
                          title: "Başarılı", 
                          description: isPrimaryAssignee ? "Göreve başladınız" : "Göreve katıldınız, çalışmaya başlayabilirsiniz"
                        });
                      } catch (error: any) {
                        toast({ title: "Hata", description: error.message || "İşlem başarısız", variant: "destructive" });
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-progress"
                  >
                    {isPrimaryAssignee ? (
                      <><PlayCircle className="h-4 w-4 mr-2" /> Başla</>
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-2" /> Katıl</>
                    )}
                  </Button>
                )}
                {isAdditionalAssignee && myStarted && (
                  <Badge variant="secondary" className="gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Çalışıyorsunuz
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photo Upload Section - shows after task is started */}
          {task.status === "devam_ediyor" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Fotoğraf
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ObjectUploader 
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  testId="task-photo"
                  onGetUploadParameters={async () => {
                    const response = await fetch("/api/objects/upload", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    if (!response.ok) throw new Error("Upload başarısız");
                    return response.json();
                  }}
                  onComplete={async (result) => {
                    if (result.successful && result.successful.length > 0) {
                      const photoUrl = result.successful[0].uploadURL;
                      try {
                        const saveResponse = await fetch(`/api/tasks/${id}/photo`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ photoUrl }),
                        });
                        if (!saveResponse.ok) {
                          throw new Error("Fotoğraf kaydedilemedi");
                        }
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
                        toast({ title: "Başarılı", description: "Fotoğraf başarıyla yüklendi" });
                      } catch (error: any) {
                        console.error("Error saving photo:", error);
                        toast({ 
                          title: "Hata", 
                          description: error.message || "Fotoğraf kaydedilemedi",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                >
                  <Button variant="outline" size="sm" type="button" className="w-full" data-testid="button-upload-photo">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Fotoğraf Yükle
                  </Button>
                </ObjectUploader>
              </CardContent>
            </Card>
          )}

          {/* Completion Section */}
          {task.status === "devam_ediyor" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Görev Tamamla
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {/* For onboarding tasks with checker: show Kontrole Gönder instead of Tamamlandı */}
                {mustUseCheckerPath ? (
                  <>
                    <Button
                      onClick={() => requestCheckMutation.mutate()}
                      disabled={requestCheckMutation.isPending}
                      data-testid="button-request-check"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Kontrole Gönder
                    </Button>
                    <p className="text-xs text-muted-foreground w-full mt-1">
                      Bu onboarding görevi için kontrol edici onayı gereklidir.
                    </p>
                  </>
                ) : (
                  <>
                    {/* Request Check button - shown when checker is assigned but not required */}
                    {canRequestCheck && (
                      <Button
                        variant="outline"
                        onClick={() => requestCheckMutation.mutate()}
                        disabled={requestCheckMutation.isPending}
                        data-testid="button-request-check"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Kontrole Gönder
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => setShowSubmitApprovalDialog(true)}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-complete-task"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Onaya Gönder
                    </Button>
                  </>
                )}
                
                {canAskQuestion && (
                  <Button variant="outline" onClick={() => setShowQuestionDialog(true)} data-testid="button-ask-question">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Soru Sor
                  </Button>
                )}
                {canRequestExtension && (
                  <Button variant="outline" onClick={() => setShowExtensionDialog(true)} data-testid="button-request-extension">
                    <Clock className="h-4 w-4 mr-2" />
                    Süre Uzatma
                  </Button>
                )}
                
                <Button
                  variant="destructive"
                  onClick={() => setShowFailureDialog(true)}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-mark-failed"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Tamamlanamadı
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Cancel Task Section - Shows for assigner/creator */}
      {canCancel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Görevi İptal Et
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={updateStatusMutation.isPending}
              data-testid="button-cancel-task"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Görevi İptal Et
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Request Check Section - Shows for assignee when task is completed and has checker */}
      {isAssignee && hasChecker && task.status === "tamamlandi" && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-500" />
              {isOnboarding ? "Onboarding Kontrolü" : "Kontrol Talebi"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Görev tamamlandı. Kontrol edici onayı için gönderin.
            </p>
            <Button
              onClick={() => requestCheckMutation.mutate()}
              disabled={requestCheckMutation.isPending}
              data-testid="button-request-check-completed"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Kontrole Gönder
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Checker Verification Section - Shows for checker when task is awaiting check */}
      {(canCheckerVerify || canCheckerReject) && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              Kontrol Bekliyor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Atanan kişi'} tarafından gönderilen {isOnboarding ? "onboarding görevi" : "görev"} kontrolünüzü bekliyor.
            </p>
            <Textarea
              placeholder="Kontrol notu ekleyin (opsiyonel)..."
              value={checkerNote}
              onChange={(e) => setCheckerNote(e.target.value)}
              className="min-h-[60px] max-h-[100px] resize-none text-sm"
              data-testid="input-checker-note"
            />
            <div className="flex flex-wrap gap-2">
              {canCheckerVerify && (
                <Button
                  onClick={() => {
                    checkerVerifyMutation.mutate(checkerNote || undefined);
                    setCheckerNote("");
                  }}
                  disabled={checkerVerifyMutation.isPending}
                  data-testid="button-checker-verify"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Onayla
                </Button>
              )}
              {canCheckerReject && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    checkerRejectMutation.mutate(checkerNote || "Düzeltme gerekli");
                    setCheckerNote("");
                  }}
                  disabled={checkerRejectMutation.isPending || !checkerNote.trim()}
                  data-testid="button-checker-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Düzeltme İste
                </Button>
              )}
            </div>
            {canCheckerReject && !checkerNote.trim() && (
              <p className="text-xs text-muted-foreground">
                Düzeltme istemek için not girilmelidir
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checker Info Card - Shows when task has a checker assigned */}
      {hasChecker && checkerUser && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Kontrol Edici</p>
                <p className="text-sm text-muted-foreground">
                  {checkerUser.firstName} {checkerUser.lastName}
                </p>
              </div>
              {taskExt.checkedAt && (
                <Badge variant="outline" className="ml-auto gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Kontrol Edildi - {new Date(taskExt.checkedAt).toLocaleDateString("tr-TR")}
                </Badge>
              )}
            </div>
            {taskExt.checkerNote && (
              <p className="mt-2 text-sm text-muted-foreground border-l-2 border-blue-300 pl-2">
                {taskExt.checkerNote}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assigner/HQ Approval Section - Shows when task is completed */}
      {(canApprove || canReject) && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Onay Bekliyor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Atanan kişi görevi tamamladı. Onaylamanız veya düzeltme için reddetmeniz gerekiyor.
            </p>
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <Button
                  onClick={() => updateStatusMutation.mutate({ status: "onaylandi", note: "Görev onaylandı" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-approve-task"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Onayla
                </Button>
              )}
              {canReject && (
                <Button
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ status: "reddedildi", note: "Görev reddedildi, düzeltme gerekli" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-reject-task"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
              )}
              {canRequestInfo && (
                <Button
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ status: "ek_bilgi_bekleniyor", note: "Ek bilgi istendi" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-request-info"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ek Bilgi İste
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Info Action - For assignee when additional info is requested */}
      {canProvideInfo && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Ek Bilgi İstendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Atayan kişi bu görev için ek bilgi talep etti. Notlar bölümünden açıklama ekleyip devam edebilirsiniz.
            </p>
            <Button
              onClick={() => updateStatusMutation.mutate({ status: "devam_ediyor", note: "Ek bilgi sağlandı" })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-provide-info"
            >
              <Send className="h-4 w-4 mr-2" />
              Bilgi Sağla ve Devam Et
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Request Info for assigner when task is in progress (separate card when not in approval state) */}
      {canRequestInfo && !canApprove && (
        <Card className="border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">Atanan kişiden ek bilgi talep edebilirsiniz</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatusMutation.mutate({ status: "ek_bilgi_bekleniyor", note: "Ek bilgi istendi" })}
                disabled={updateStatusMutation.isPending}
                data-testid="button-request-info-standalone"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ek Bilgi İste
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Note Display */}
      {task.failureNote && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Başarısızlık Nedeni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{task.failureNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Task Details - Compact 2-column grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Durum */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Durum</p>
              <Badge 
                variant={
                  task.status === "onaylandi" ? "outline" : 
                  task.status === "basarisiz" ? "destructive" : 
                  "default"
                }
              >
                {statusLabels[task.status] || task.status}
              </Badge>
            </div>

            {/* Öncelik */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Öncelik</p>
              <Badge variant={task.priority === "kritik" || task.priority === "acil" ? "destructive" : task.priority === "yüksek" ? "secondary" : "outline"}>
                {task.priority ? (priorityLabels[task.priority] || task.priority) : "-"}
              </Badge>
            </div>

            {/* Oluşturulma Tarihi */}
            <div>
              <p className="text-xs text-muted-foreground">Oluşturulma</p>
              <p className="font-medium text-sm">
                {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>

            {/* Teslim Tarihi */}
            <div>
              <p className="text-xs text-muted-foreground">Teslim</p>
              <p className="font-medium text-sm">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "-"}
              </p>
            </div>

            {/* Atanan Kişi */}
            <div>
              <p className="text-xs text-muted-foreground">Atanan</p>
              {(task as any).assignedToName || assignedUser ? (
                <Link href={`/personel-detay/${task.assignedToId}`}>
                  <p className="font-medium text-sm hover:underline cursor-pointer text-primary" data-testid="text-detail-assigned-to">
                    {(task as any).assignedToName || `${assignedUser?.firstName} ${assignedUser?.lastName}`}
                  </p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>

            {/* Atayan Kişi */}
            <div>
              <p className="text-xs text-muted-foreground">Atayan</p>
              {(task as any).assignedByName || assignedByUser ? (
                <Link href={`/personel-detay/${task.assignedById}`}>
                  <p className="font-medium text-sm hover:underline cursor-pointer text-primary" data-testid="text-detail-assigned-by">
                    {(task as any).assignedByName || `${assignedByUser?.firstName} ${assignedByUser?.lastName}`}
                  </p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {/* Group Participants - Assignees + Checker with active status */}
          {((task as any).assignees && (task as any).assignees.length > 1) || hasChecker ? (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Katılımcılar
                {participantStatuses.filter((p: any) => p.startedAt).length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                    {participantStatuses.filter((p: any) => p.startedAt).length}/{participantStatuses.length} aktif
                  </Badge>
                )}
              </p>
              <div className="space-y-1.5">
                {(task as any).assignees?.map((a: any) => {
                  const pStatus = participantStatuses.find((p: any) => p.userId === a.userId);
                  const isActive = !!pStatus?.startedAt;
                  const isPrimary = a.userId === task.assignedToId;
                  return (
                    <div key={a.userId} className="flex items-center gap-2" data-testid={`participant-row-${a.userId}`}>
                      <Link href={`/personel-detay/${a.userId}`} className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={a.userProfileImage} />
                            <AvatarFallback className="text-[8px]">
                              {a.userName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                            isActive ? 'bg-green-500' : 'bg-muted-foreground/40'
                          }`} />
                        </div>
                        <span className="text-xs truncate">{a.userName}</span>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPrimary && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">Sorumlu</Badge>
                        )}
                        {isActive ? (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Çalışıyor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
                            Bekliyor
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hasChecker && checkerUser && (
                  <div className="flex items-center gap-2">
                    <Link href={`/personel-detay/${taskExt.checkerId}`} className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={checkerUser.profileImageUrl || (checkerUser as any).profilePhoto} />
                        <AvatarFallback className="text-[8px]">
                          {(checkerUser.firstName?.[0] || '') + (checkerUser.lastName?.[0] || checkerUser.username?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">
                        {checkerUser.firstName ? `${checkerUser.firstName} ${checkerUser.lastName || ''}` : checkerUser.username}
                      </span>
                    </Link>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-amber-500/50 text-amber-700 dark:text-amber-400">
                      <Shield className="h-2.5 w-2.5" />
                      Denetçi
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Task Steps - Cowork Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Alt Görevler
            {taskSteps.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {taskSteps.filter(s => s.status === "completed").length}/{taskSteps.length}
              </Badge>
            )}
          </CardTitle>
          {taskSteps.length > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div 
                className="bg-primary rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${(taskSteps.filter(s => s.status === "completed").length / taskSteps.length) * 100}%` }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {taskSteps.length > 0 ? (
            <div className="space-y-2">
              {taskSteps.map((step: any, idx: number) => {
                const stepClaimedByMe = step.assignedToId === currentUser?.id;
                const stepClaimed = !!step.assignedToId;
                const isTaskCompleted = task.status === "onaylandi" || task.status === "basarisiz";
                const canClaim = isAssignee && !stepClaimed && step.status !== "completed" && !isTaskCompleted;
                const canUnclaim = stepClaimedByMe && step.status !== "completed" && !isTaskCompleted;
                const canComplete = (stepClaimedByMe || isAssignee) && step.status !== "completed" && !isTaskCompleted;

                return (
                  <div 
                    key={step.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      step.status === "completed" 
                        ? "bg-muted/40 border-muted" 
                        : stepClaimedByMe 
                          ? "bg-primary/5 border-primary/30" 
                          : "bg-card"
                    }`}
                    data-testid={`task-step-${step.id}`}
                  >
                    <div className="pt-0.5">
                      <Checkbox
                        checked={step.status === "completed"}
                        onCheckedChange={(checked) => 
                          toggleStepMutation.mutate({ stepId: step.id, completed: !!checked })
                        }
                        disabled={!canComplete || toggleStepMutation.isPending}
                        data-testid={`checkbox-step-${step.id}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${step.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {step.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {stepClaimed && step.assignedUser && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={step.assignedUser?.profilePhoto} />
                              <AvatarFallback className="text-[7px]">
                                {(step.assignedUser?.firstName?.[0] || '') + (step.assignedUser?.lastName?.[0] || step.assignedUser?.username?.[0] || '')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {step.assignedUser?.firstName 
                                ? `${step.assignedUser.firstName} ${step.assignedUser.lastName || ''}`
                                : step.assignedUser?.username}
                            </span>
                          </div>
                        )}
                        {step.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.completedAt).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                        {step.claimedAt && step.status !== "completed" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            {new Date(step.claimedAt).toLocaleDateString("tr-TR")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canClaim && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => claimStepMutation.mutate(step.id)}
                          disabled={claimStepMutation.isPending}
                          data-testid={`button-claim-step-${step.id}`}
                        >
                          <Hand className="h-3 w-3 mr-1" />
                          Al
                        </Button>
                      )}
                      {canUnclaim && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unclaimStepMutation.mutate(step.id)}
                          disabled={unclaimStepMutation.isPending}
                          data-testid={`button-unclaim-step-${step.id}`}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Bırak
                        </Button>
                      )}
                      {isAssignee && !isTaskCompleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => requestDelete(step.id, step.title || "Adım")}
                          data-testid={`button-delete-step-${step.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Henüz alt görev eklenmedi
            </p>
          )}

          {/* Add Step Form - Only for assignee when task is not completed */}
          {isAssignee && task.status !== "onaylandi" && task.status !== "basarisiz" && (
            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Yeni adım ekle..."
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStepTitle.trim()) {
                    addStepMutation.mutate(newStepTitle.trim());
                  }
                }}
                className="flex-1 h-8 text-sm"
                data-testid="input-new-step"
              />
              <Button
                size="sm"
                onClick={() => newStepTitle.trim() && addStepMutation.mutate(newStepTitle.trim())}
                disabled={addStepMutation.isPending || !newStepTitle.trim()}
                data-testid="button-add-step"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ekle
              </Button>
            </div>
          )}

          {/* Progress Bar */}
          {taskSteps.length > 0 && (
            <div className="pt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${(taskSteps.filter(s => s.status === "completed").length / taskSteps.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Görev Mesajlaşma - Ticket Thread */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Görev İletişimi
            {taskHistory && taskHistory.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">{taskHistory.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Görev oluşturuldu - {task.createdAt ? new Date(task.createdAt).toLocaleDateString("tr-TR", {day:'numeric',month:'short'}) + ' ' + new Date(task.createdAt).toLocaleTimeString("tr-TR", {hour:'2-digit',minute:'2-digit'}) : "-"}
              </span>
            </div>

            {task.acknowledgedAt && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  <Eye className="h-3 w-3 inline mr-1" />
                  Görüldü - {new Date(task.acknowledgedAt).toLocaleDateString("tr-TR", {day:'numeric',month:'short'}) + ' ' + new Date(task.acknowledgedAt).toLocaleTimeString("tr-TR", {hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
            )}

            {(() => {
              const senderColors = ['text-blue-600 dark:text-blue-400', 'text-emerald-600 dark:text-emerald-400', 'text-orange-600 dark:text-orange-400', 'text-purple-600 dark:text-purple-400', 'text-rose-600 dark:text-rose-400', 'text-cyan-600 dark:text-cyan-400'];
              const senderColorMap: Record<string, string> = {};
              let colorIdx = 0;
              const getSenderColor = (senderId: string) => {
                if (!senderColorMap[senderId]) {
                  senderColorMap[senderId] = senderColors[colorIdx % senderColors.length];
                  colorIdx++;
                }
                return senderColorMap[senderId];
              };
              const isGroupTask = ((task as any).assignees && (task as any).assignees.length > 1) || hasChecker;

              return taskHistory && taskHistory.map((entry: any, idx: number) => {
                const isStatusChange = entry.previousStatus && entry.previousStatus !== entry.newStatus;
                const isSystemMessage = isStatusChange && !entry.note;
                const isCurrentUser = entry.changedById === currentUser?.id;
                const senderName = entry.changedByName || 'Sistem';

                if (isSystemMessage) {
                  return (
                    <div key={entry.id || idx} className="flex items-center justify-center" data-testid={`thread-event-${entry.id}`}>
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {senderName}: {statusLabels[entry.newStatus] || entry.newStatus} - {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("tr-TR", {day:'numeric',month:'short'}) + ' ' + new Date(entry.createdAt).toLocaleTimeString("tr-TR", {hour:'2-digit',minute:'2-digit'}) : ""}
                      </span>
                    </div>
                  );
                }

                const senderInitials = senderName.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                const isCheckerSender = entry.changedById === taskExt.checkerId;
                const assigneeData = isGroupTask 
                  ? (isCheckerSender && checkerUser 
                      ? { userId: checkerUser.id, userProfileImage: checkerUser.profileImageUrl || (checkerUser as any).profilePhoto }
                      : (task as any).assignees?.find((a: any) => a.userId === entry.changedById))
                  : null;

                return (
                  <div
                    key={entry.id || idx}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} gap-2`}
                    data-testid={`thread-message-${entry.id}`}
                  >
                    {!isCurrentUser && isGroupTask && (
                      <Avatar className="h-6 w-6 mt-1 shrink-0">
                        <AvatarImage src={assigneeData?.userProfileImage} />
                        <AvatarFallback className="text-[8px]">{senderInitials}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      isCurrentUser 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-semibold ${isGroupTask ? getSenderColor(entry.changedById || '') : 'text-foreground'}`}>
                            {senderName}
                          </span>
                        </div>
                      )}
                      {isStatusChange && (
                        <p className={`text-xs mb-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {statusLabels[entry.newStatus] || entry.newStatus}
                        </p>
                      )}
                      {entry.note && (
                        <p className="text-sm break-words">{entry.note}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isCurrentUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("tr-TR", {day:'numeric',month:'short'}) + ' ' + new Date(entry.createdAt).toLocaleTimeString("tr-TR", {hour:'2-digit',minute:'2-digit'}) : ""}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}

            {task.status === "onaylandi" && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-success bg-success/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Görev Tamamlandı {task.completedAt ? `- ${new Date(task.completedAt).toLocaleDateString("tr-TR", {day:'numeric',month:'short'})} ${new Date(task.completedAt).toLocaleTimeString("tr-TR", {hour:'2-digit',minute:'2-digit'})}` : ""}
                </span>
              </div>
            )}

            {task.status === "basarisiz" && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Tamamlanamadı
                </span>
              </div>
            )}
          </div>

          {task.status === "onaylandi" && ratingData?.rawRating && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-sm">Puan:</span>
              <StarRating value={ratingData.finalRating} readonly size="sm" />
              <span className="text-sm font-medium">{ratingData.finalRating}/5</span>
              {ratingData.penaltyApplied === 1 && (
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              )}
            </div>
          )}

          {task.status === "onaylandi" && !ratingData?.rawRating && canRate && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowRatingDialog(true)} data-testid="button-rate-task">
                <Star className="h-4 w-4 mr-2" />
                Görevi Puanla
              </Button>
            </div>
          )}

          {task.status !== "onaylandi" && task.status !== "basarisiz" && (
            <div className="mt-3 pt-3 border-t flex gap-2">
              <Textarea
                placeholder="Mesaj yaz..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[40px] max-h-[80px] resize-none flex-1 text-sm"
                data-testid="input-thread-message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newNote.trim()) {
                    e.preventDefault();
                    addNoteMutation.mutate(newNote.trim());
                  }
                }}
              />
              <Button
                size="icon"
                onClick={() => newNote.trim() && addNoteMutation.mutate(newNote.trim())}
                disabled={addNoteMutation.isPending || !newNote.trim()}
                data-testid="button-send-thread-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Section */}
      {task.photoUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Yüklenen Fotoğraf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={task.photoUrl} 
              alt="Görev fotoğrafı" 
              className="w-full h-auto rounded-md border"
              data-testid="img-task-photo"
            />
          </CardContent>
        </Card>
      )}

      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Tamamlamak Emin misin?</DialogTitle>
            <DialogDescription>
              Görev tamamlandı olarak işaretlenecek ve atayan kişinin onayına gönderilecek.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCompleteDialog(false)}
              data-testid="button-cancel-complete"
            >
              İptal
            </Button>
            <Button 
              onClick={() => {
                updateStatusMutation.mutate({ status: "tamamlandi", note: "Görev tamamlandı, onay bekleniyor" });
                setShowCompleteDialog(false);
              }}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {updateStatusMutation.isPending ? "Kaydediliyor..." : "Tamamlandı"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure Dialog */}
      <Dialog open={showFailureDialog} onOpenChange={setShowFailureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Neden Tamamlanamadı?</DialogTitle>
            <DialogDescription>
              Lütfen görevin neden tamamlanamadığını açıklayın. Bu bilgi atayan kişiye bildirilecektir.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Başarısızlık nedeni..."
            value={failureNote}
            onChange={(e) => setFailureNote(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-failure-note"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFailureDialog(false)}
              data-testid="button-cancel-failure"
            >
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleMarkFailed}
              disabled={updateStatusMutation.isPending || !failureNote.trim()}
              data-testid="button-confirm-failure"
            >
              {updateStatusMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Görevi Puanla
            </DialogTitle>
            <DialogDescription>
              Görevin tamamlanma kalitesini değerlendirin (1-5 yıldız).
              {ratingData?.isLate && (
                <span className="mt-2 text-orange-500 text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Görev geç teslim edildi.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <StarRating
              value={ratingValue}
              onChange={setRatingValue}
              maxRating={5}
              size="lg"
              showValue
            />
            
            <Textarea
              placeholder="Yorum ekle (isteğe bağlı)..."
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-rating-feedback"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRatingDialog(false);
                setRatingValue(0);
                setRatingFeedback("");
              }}
              data-testid="button-cancel-rating"
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmitRating}
              disabled={ratingMutation.isPending || ratingValue < 1}
              data-testid="button-confirm-rating"
            >
              {ratingMutation.isPending ? "Kaydediliyor..." : "Puanla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soru Sor</DialogTitle>
            <DialogDescription>Atayan kişiye bir soru gönderin. Görev durumu "Cevap Bekliyor" olarak değişecektir.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Sorunuzu yazın..." value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="min-h-[80px]" data-testid="input-question-text" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>İptal</Button>
            <Button onClick={() => { if (questionText.trim()) askQuestionMutation.mutate(questionText); }} disabled={askQuestionMutation.isPending || !questionText.trim()} data-testid="button-send-question">
              <Send className="h-4 w-4 mr-2" />
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soruyu Yanıtla</DialogTitle>
            <DialogDescription>Soruyu cevaplayın. Görev durumu "Devam Ediyor" olarak değişecektir.</DialogDescription>
          </DialogHeader>
          {(task as any).questionText && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Soru:</p>
              <p className="text-sm">{(task as any).questionText}</p>
            </div>
          )}
          <Textarea placeholder="Cevabınızı yazın..." value={answerText} onChange={(e) => setAnswerText(e.target.value)} className="min-h-[80px]" data-testid="input-answer-text" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnswerDialog(false)}>İptal</Button>
            <Button onClick={() => { if (answerText.trim()) answerQuestionMutation.mutate(answerText); }} disabled={answerQuestionMutation.isPending || !answerText.trim()} data-testid="button-send-answer">
              <Send className="h-4 w-4 mr-2" />
              Cevapla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Süre Uzatma Talebi</DialogTitle>
            <DialogDescription>Neden süre uzatma istediğinizi ve yeni tarihi belirtin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Neden</label>
              <Textarea placeholder="Süre uzatma nedeninizi yazın..." value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="min-h-[60px]" data-testid="input-extension-reason" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Yeni Tarih</label>
              <Input type="date" value={extensionDate} onChange={(e) => setExtensionDate(e.target.value)} data-testid="input-extension-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtensionDialog(false)}>İptal</Button>
            <Button onClick={() => { if (extensionReason.trim() && extensionDate) requestExtensionMutation.mutate({ reason: extensionReason, requestedDueDate: new Date(extensionDate).toISOString() }); }} disabled={requestExtensionMutation.isPending || !extensionReason.trim() || !extensionDate} data-testid="button-send-extension">
              <Clock className="h-4 w-4 mr-2" />
              Talep Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitApprovalDialog} onOpenChange={setShowSubmitApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Onaya Gönder</DialogTitle>
            <DialogDescription>Görevi tamamladığınızı belirtecek ve atayan kişinin onayına göndereceksiniz. Emin misiniz?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitApprovalDialog(false)}>İptal</Button>
            <Button onClick={() => submitForApprovalMutation.mutate()} disabled={submitForApprovalMutation.isPending} data-testid="button-confirm-submit-approval">
              <CheckCircle className="h-4 w-4 mr-2" />
              Evet, Onaya Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveClosureDialog} onOpenChange={setShowApproveClosureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Kapatma Onayı</DialogTitle>
            <DialogDescription>Görevi onaylayıp kapatmak üzeresiniz. Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Onay notu (isteğe bağlı)..." value={approverNote} onChange={(e) => setApproverNote(e.target.value)} className="min-h-[60px]" data-testid="input-approver-note" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveClosureDialog(false)}>İptal</Button>
            <Button onClick={() => approveClosureMutation.mutate(approverNote || undefined)} disabled={approveClosureMutation.isPending} data-testid="button-confirm-approve-closure">
              <CheckCircle className="h-4 w-4 mr-2" />
              Onayla ve Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Task Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi İptal Et</DialogTitle>
            <DialogDescription>
              Görevi iptal etmek istediğinize emin misiniz? Lütfen iptal sebebini belirtin.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="İptal sebebi..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-cancel-reason"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
              data-testid="button-dismiss-cancel"
            >
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                updateStatusMutation.mutate({ status: "iptal_edildi", note: cancelReason.trim() || "Görev iptal edildi" });
                setShowCancelDialog(false);
                setCancelReason("");
              }}
              disabled={updateStatusMutation.isPending || !cancelReason.trim()}
              data-testid="button-confirm-cancel-task"
            >
              {updateStatusMutation.isPending ? "Kaydediliyor..." : "Görevi İptal Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id !== null) deleteStepMutation.mutate(id as number);
        }}
        title="Adımı Sil"
        description={`"${deleteState.itemName || ''}" adımını silmek istediğinize emin misiniz?`}
      />
    </div>
  );
}
