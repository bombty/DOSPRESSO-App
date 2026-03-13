import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  Plus,
  Shield,
  GraduationCap,
  Send,
  ListTodo,
  Clock,
  Calendar,
  TrendingUp,
  Award,
  Briefcase,
  CalendarDays,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StarRating } from "@/components/star-rating";
import type { User, EmployeeDocument, DisciplinaryReport, EmployeeOnboarding, EmployeeOnboardingTask, UserRoleType } from "@shared/schema";
import { isHQRole } from "@shared/schema";
import { CreateDisciplinaryDialog, AddResponseDialog, ResolveDialog } from "@/components/hr/DisciplinaryDialogs";
import { OnboardingTaskDialog } from "@/components/hr/OnboardingTaskDialog";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function PersonelDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [, navigate] = useLocation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [messageText, setMessageText] = useState("");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: employee, isLoading: employeeLoading, isError, refetch } = useQuery<User>({
    queryKey: ["/api/personnel", id],
    queryFn: async () => {
      const response = await fetch(`/api/personnel/${id}`);
      if (!response.ok) throw new Error("Failed to fetch employee");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<EmployeeDocument[]>({
    queryKey: ["/api/employee-documents", id],
    queryFn: async () => {
      const response = await fetch(`/api/employee-documents/${id}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: disciplinaryReports, isLoading: disciplinaryLoading } = useQuery<DisciplinaryReport[]>({
    queryKey: ["/api/disciplinary-reports", id],
    queryFn: async () => {
      const response = await fetch(`/api/disciplinary-reports?userId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch disciplinary reports");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: onboarding, isLoading: onboardingLoading } = useQuery<EmployeeOnboarding | null>({
    queryKey: ["/api/employee-onboarding", id],
    queryFn: async () => {
      const response = await fetch(`/api/employee-onboarding/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch onboarding");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: onboardingTasks, isLoading: onboardingTasksLoading } = useQuery<EmployeeOnboardingTask[]>({
    queryKey: ["/api/onboarding-tasks", onboarding?.id],
    queryFn: async () => {
      const response = await fetch(`/api/onboarding-tasks/${onboarding!.id}`);
      if (!response.ok) throw new Error("Failed to fetch onboarding tasks");
      return response.json();
    },
    enabled: !!onboarding?.id,
  });

  // Vardiya/Mesai Geçmişi
  const { data: attendanceHistory, isLoading: attendanceLoading } = useQuery<any[]>({
    queryKey: ["/api/shift-attendance", id],
    queryFn: async () => {
      const response = await fetch(`/api/shift-attendance?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Performans Skorları
  const { data: performanceScores, isLoading: performanceLoading } = useQuery<any[]>({
    queryKey: ["/api/performance", id],
    queryFn: async () => {
      const response = await fetch(`/api/performance/${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Eğitim İlerlemesi
  const { data: trainingProgress, isLoading: trainingLoading } = useQuery<unknown>({
    queryKey: ["/api/training/progress", id],
    queryFn: async () => {
      const response = await fetch(`/api/training/progress/${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Eğitim Modülleri
  const { data: trainingModules } = useQuery<any[]>({
    queryKey: ["/api/training/modules"],
    enabled: !!id,
  });

  // İzin Talepleri
  const { data: leaveRequests, isLoading: leaveLoading } = useQuery<any[]>({
    queryKey: ["/api/leave-requests", id],
    queryFn: async () => {
      const response = await fetch(`/api/leave-requests?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Fazla Mesai Talepleri
  const { data: overtimeRequests, isLoading: overtimeLoading } = useQuery<any[]>({
    queryKey: ["/api/overtime-requests", id],
    queryFn: async () => {
      const response = await fetch(`/api/overtime-requests?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Atanan Görevler
  const { data: assignedTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", "assigned", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?assignedToId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Görev Memnuniyet Skoru
  const { data: satisfactionScore, isLoading: satisfactionLoading } = useQuery<{
    overallScore: number | null;
    taskAverage: number | null;
    taskCount: number;
    checklistAverage: number | null;
    checklistCount: number;
    recentRatings: Array<{
      id: number;
      taskId: number;
      finalRating: number;
      feedback?: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/users", id, "satisfaction-score"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}/satisfaction-score`);
      if (!response.ok) return { 
        overallScore: null, 
        taskAverage: null, 
        taskCount: 0, 
        checklistAverage: null, 
        checklistCount: 0,
        recentRatings: [] 
      };
      return response.json();
    },
    enabled: !!id,
  });

  // Kendine Verilen Yıldızlar
  const { data: receivedRatings, isLoading: receivedRatingsLoading } = useQuery<Array<{
    id: number;
    taskId: number;
    finalRating: number;
    feedback?: string;
    createdAt: string;
    raterUser?: { id: string; fullName?: string; username: string };
    task?: { id: number; description?: string };
  }>>({
    queryKey: ["/api/users", id, "received-ratings"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}/received-ratings`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Şifre sıfırlama mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; password: string }) => {
      return apiRequest("POST", `/api/employees/${data.userId}/reset-password`, { password: data.password });
    },
    onSuccess: () => {
      setResetPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Şifre değiştirildi",
        description: "Personelin şifresi başarıyla güncellendi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Şifre değiştirilemedi",
        variant: "destructive",
      });
    },
  });

  useBreadcrumb(employee?.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : '');

  // Yetki kontrolü - HQ rolleri ve admin şifre sıfırlayabilir
  const canManage = currentUser && (isHQRole(currentUser.role as any) || currentUser.role === "admin");

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }
    if (id) {
      resetPasswordMutation.mutate({ userId: id, password: newPassword });
    }
  };

  const createOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.branchId) {
        throw new Error("Personel şube bilgisi eksik. Lütfen personel kaydını kontrol edin.");
      }
      return apiRequest("POST", "/api/employee-onboarding", {
        userId: id!,
        branchId: employee.branchId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding", id] });
      toast({
        title: "Onboarding başlatıldı",
        description: "Personel için onboarding süreci başlatıldı",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Onboarding başlatılamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/employee-documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-documents", id] });
      setUploadDialogOpen(false);
      setDocumentType("");
      setDocumentName("");
      setDocumentUrl("");
      setDocumentNotes("");
      toast({
        title: "Belge eklendi",
        description: "Belge başarıyla yüklendi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Belge eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const verifyDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("POST", `/api/employee-documents/${documentId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-documents", id] });
      toast({
        title: "Belge onaylandı",
        description: "Belge başarıyla onaylandı",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Belge onaylanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("DELETE", `/api/employee-documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-documents", id] });
      toast({
        title: "Belge silindi",
        description: "Belge başarıyla silindi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Belge silinirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const completeOnboardingTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/onboarding-tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboarding?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding", id] });
      toast({
        title: "Görev tamamlandı",
        description: "Görev başarıyla tamamlandı",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev tamamlanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const verifyOnboardingTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("POST", `/api/onboarding-tasks/${taskId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboarding?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding", id] });
      toast({
        title: "Görev doğrulandı",
        description: "Görev başarıyla doğrulandı",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev doğrulanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleUploadDocument = () => {
    if (!documentType || !documentName) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen belge türü ve adı girin",
        variant: "destructive",
      });
      return;
    }

    uploadDocumentMutation.mutate({
      userId: id,
      documentType,
      documentName,
      documentUrl: documentUrl || null,
      notes: documentNotes || null,
    });
  };

  const isLoading = employeeLoading;

  if (isLoading) {
    
  if (employeeLoading) return <LoadingState />;

  return (
      <div className="container mx-auto p-3">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Personel bulunamadı</p>
            <Button className="mt-4" onClick={() => navigate("/ik")}>
              Geri Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const documentTypeLabels: Record<string, string> = {
    cv: "CV / Özgeçmiş",
    diploma: "Diploma",
    certificate: "Sertifika",
    id_card: "Kimlik Fotokopisi",
    health_report: "Sağlık Raporu",
    contract: "İş Sözleşmesi",
    reference: "Referans Mektubu",
    other: "Diğer",
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
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
            <h1 className="text-3xl font-bold">Personel Detayı</h1>
            <p className="text-muted-foreground mt-1">
              {employee.firstName} {employee.lastName} - Özlük Dosyası & Bilgiler
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/personel-duzenle/${employee.id}`}>
              <Button variant="outline" size="sm" data-testid="button-edit-employee">
                <Edit className="h-4 w-4 mr-1" />
                Düzenle
              </Button>
            </Link>
            <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-reset-password">
                  <Shield className="h-4 w-4 mr-1" />
                  Şifre Sıfırla
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Şifre Sıfırlama</DialogTitle>
                  <DialogDescription>
                    {employee.firstName} {employee.lastName} için yeni şifre oluşturun.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="En az 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Şifreyi tekrar girin"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setResetPasswordDialogOpen(false)}
                    data-testid="button-cancel-password"
                  >
                    İptal
                  </Button>
                  <Button 
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-confirm-password"
                  >
                    {resetPasswordMutation.isPending ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={employee.profileImageUrl || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials(employee.firstName || "", employee.lastName || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Ad Soyad</p>
                <p className="font-medium">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rol</p>
                <Badge className="text-xs">{ROLE_LABELS[employee.role] || employee.role}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">E-posta</p>
                <p className="font-medium text-xs">{employee.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefon</p>
                <p className="font-medium text-xs">{employee.phoneNumber || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Acil Durum</p>
                <p className="font-medium text-xs">{employee.emergencyContactName || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Durum</p>
                {employee.isActive ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs h-6">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-background text-foreground border-border text-xs h-6">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pasif
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skor Özeti Kartı - HQ rolleri ve kendi profilini görüntüleyen kullanıcılar için */}
      {(currentUser && (isHQRole(currentUser.role as UserRoleType) || currentUser.id === id)) && (
        <Card data-testid="card-score-summary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Skor Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(satisfactionLoading || performanceLoading || receivedRatingsLoading) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" data-testid="score-summary-loading">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (satisfactionScore && (satisfactionScore.overallScore !== null || satisfactionScore.taskCount > 0)) || (receivedRatings && receivedRatings.length > 0) || (performanceScores && performanceScores.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="text-center p-3 rounded-md border" data-testid="score-overall">
                  <p className="text-2xl font-bold text-primary">
                    {satisfactionScore?.overallScore !== null && satisfactionScore?.overallScore !== undefined
                      ? satisfactionScore.overallScore.toFixed(0)
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Memnuniyet / 100</p>
                </div>
                <div className="text-center p-3 rounded-md border" data-testid="score-task-rating">
                  <div className="flex items-center justify-center gap-1">
                    {satisfactionScore?.taskAverage !== null && satisfactionScore?.taskAverage !== undefined ? (
                      <StarRating value={Math.round(satisfactionScore.taskAverage)} readonly size="sm" />
                    ) : (
                      <span className="text-2xl font-bold">-</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Görev Puanı ({satisfactionScore?.taskCount || 0})
                  </p>
                </div>
                <div className="text-center p-3 rounded-md border" data-testid="score-received-stars">
                  <p className="text-2xl font-bold text-amber-500">
                    {receivedRatings && receivedRatings.length > 0
                      ? (receivedRatings.reduce((sum, r) => sum + r.finalRating, 0) / receivedRatings.length).toFixed(1)
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Yıldız Ort. ({receivedRatings?.length || 0})
                  </p>
                </div>
                <div className="text-center p-3 rounded-md border" data-testid="score-performance">
                  <p className="text-2xl font-bold text-primary">
                    {performanceScores && performanceScores.length > 0
                      ? (performanceScores[0].overallScore ?? performanceScores[0].score ?? "-")
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Performans Skoru</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground" data-testid="score-summary-empty">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Henüz skor verisi bulunmuyor</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(() => {
        const userRole = currentUser?.role as string;
        const allTabs = ['documents', 'attendance', 'performance', 'training', 'leave', 'disciplinary', 'onboarding', 'tasks', 'messages'];
        const roleTabMap: Record<string, string[]> = {
          supervisor: ['documents', 'attendance', 'performance', 'tasks'],
          supervisor_buddy: ['documents', 'attendance', 'performance', 'tasks'],
          muhasebe: ['documents', 'leave', 'onboarding'],
        };
        const visibleTabs = roleTabMap[userRole] || allTabs;
        return (
      <Tabs defaultValue={visibleTabs[0] || "documents"} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {visibleTabs.includes('documents') && (
          <TabsTrigger value="documents" data-testid="tab-documents" className="text-xs px-2 py-1.5">
            <FileText className="h-3 w-3 mr-1" />
            Özlük
          </TabsTrigger>
          )}
          {visibleTabs.includes('attendance') && (
          <TabsTrigger value="attendance" data-testid="tab-attendance" className="text-xs px-2 py-1.5">
            <Clock className="h-3 w-3 mr-1" />
            Vardiya
          </TabsTrigger>
          )}
          {visibleTabs.includes('performance') && (
          <TabsTrigger value="performance" data-testid="tab-performance" className="text-xs px-2 py-1.5">
            <TrendingUp className="h-3 w-3 mr-1" />
            Performans
          </TabsTrigger>
          )}
          {visibleTabs.includes('training') && (
          <TabsTrigger value="training" data-testid="tab-training" className="text-xs px-2 py-1.5">
            <Award className="h-3 w-3 mr-1" />
            Eğitim
          </TabsTrigger>
          )}
          {visibleTabs.includes('leave') && (
          <TabsTrigger value="leave" data-testid="tab-leave" className="text-xs px-2 py-1.5">
            <CalendarDays className="h-3 w-3 mr-1" />
            İzin/Mesai
          </TabsTrigger>
          )}
          {visibleTabs.includes('disciplinary') && (
          <TabsTrigger value="disciplinary" data-testid="tab-disciplinary" className="text-xs px-2 py-1.5">
            <Shield className="h-3 w-3 mr-1" />
            Disiplin
          </TabsTrigger>
          )}
          {visibleTabs.includes('onboarding') && (
          <TabsTrigger value="onboarding" data-testid="tab-onboarding" className="text-xs px-2 py-1.5">
            <GraduationCap className="h-3 w-3 mr-1" />
            Onboarding
          </TabsTrigger>
          )}
          {visibleTabs.includes('tasks') && (
          <TabsTrigger value="tasks" data-testid="tab-assign-task" className="text-xs px-2 py-1.5">
            <ListTodo className="h-3 w-3 mr-1" />
            Görev
          </TabsTrigger>
          )}
          {visibleTabs.includes('messages') && (
          <TabsTrigger value="messages" data-testid="tab-send-message" className="text-xs px-2 py-1.5">
            <Send className="h-3 w-3 mr-1" />
            Mesaj
          </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="documents" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personel Belgeleri</CardTitle>
                  <CardDescription>
                    Personelin özlük dosyasındaki tüm belgeler
                  </CardDescription>
                </div>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-document">
                      <Plus className="h-4 w-4 mr-2" />
                      Belge Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-add-document">
                    <DialogHeader>
                      <DialogTitle>Yeni Belge Ekle</DialogTitle>
                      <DialogDescription>
                        Personelin özlük dosyasına yeni belge ekleyin
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="document-type">Belge Türü *</Label>
                        <Select value={documentType} onValueChange={setDocumentType}>
                          <SelectTrigger id="document-type" data-testid="select-document-type">
                            <SelectValue placeholder="Belge türü seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(documentTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="document-name">Belge Adı *</Label>
                        <Input
                          id="document-name"
                          data-testid="input-document-name"
                          placeholder="Örn: CV - Ahmet Yılmaz"
                          value={documentName}
                          onChange={(e) => setDocumentName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="document-url">Belge URL (Opsiyonel)</Label>
                        <Input
                          id="document-url"
                          data-testid="input-document-url"
                          placeholder="https://..."
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="document-notes">Notlar (Opsiyonel)</Label>
                        <Textarea
                          id="document-notes"
                          data-testid="textarea-document-notes"
                          placeholder="Belge hakkında notlar..."
                          value={documentNotes}
                          onChange={(e) => setDocumentNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setUploadDialogOpen(false)}
                        data-testid="button-cancel-document"
                      >
                        İptal
                      </Button>
                      <Button
                        onClick={handleUploadDocument}
                        disabled={uploadDocumentMutation.isPending}
                        data-testid="button-save-document"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadDocumentMutation.isPending ? "Ekleniyor..." : "Belge Ekle"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Belge Türü</TableHead>
                        <TableHead>Belge Adı</TableHead>
                        <TableHead>Ekleyen</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell>
                            <Badge variant="outline">
                              {documentTypeLabels[doc.documentType] || doc.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{doc.documentName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.uploadedById}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell>
                            {doc.isVerified ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Onaylı
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Bekliyor
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {doc.fileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  data-testid={`button-download-document-${doc.id}`}
                                >
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {!doc.isVerified && isHQRole(currentUser?.role as any) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => verifyDocumentMutation.mutate(doc.id)}
                                  disabled={verifyDocumentMutation.isPending}
                                  data-testid={`button-verify-document-${doc.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => requestDelete(doc.id, doc.documentName || "Belge")}
                                data-testid={`button-delete-document-${doc.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz belge eklenmemiş</p>
                  <p className="text-sm mt-2">Üstteki "Belge Ekle" butonunu kullanarak belge ekleyebilirsiniz</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Vardiya Geçmişi
              </CardTitle>
              <CardDescription>Personelin giriş-çıkış kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : attendanceHistory && attendanceHistory.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Giriş</TableHead>
                        <TableHead>Çıkış</TableHead>
                        <TableHead>Toplam Süre</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceHistory.slice(0, 20).map((record) => (
                        <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                          <TableCell className="font-medium">
                            {new Date(record.date).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.totalMinutes ? `${Math.floor(record.totalMinutes / 60)}s ${record.totalMinutes % 60}dk` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.status === "checked_out" ? "outline" : "default"}>
                              {record.status === "checked_in" ? "Aktif" : record.status === "checked_out" ? "Çıkış Yapıldı" : record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz vardiya kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="flex flex-col gap-3">
          {/* Aldığı Yıldızlar Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                Kendine Verilen Yıldızlar
              </CardTitle>
              <CardDescription>Diğer personeller tarafından verilen puanlar</CardDescription>
            </CardHeader>
            <CardContent>
              {receivedRatingsLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : receivedRatings && receivedRatings.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Görev</TableHead>
                        <TableHead>Puan</TableHead>
                        <TableHead>Puanlayan</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivedRatings.map((rating) => (
                        <TableRow key={rating.id} data-testid={`row-received-rating-${rating.id}`}>
                          <TableCell className="font-medium text-sm">
                            <Link href={`/gorev/${rating.taskId}`} className="text-primary hover:underline">
                              {rating.task?.description || `Görev #${rating.taskId}`}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StarRating value={rating.finalRating} readonly size="sm" />
                          </TableCell>
                          <TableCell className="text-sm">
                            {rating.raterUser?.fullName || rating.raterUser?.username || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(rating.createdAt).toLocaleDateString("tr-TR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz puanlama alınmadı</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Görev Memnuniyeti Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                Görev Memnuniyeti
              </CardTitle>
              <CardDescription>Personelin tamamladığı görevlerin puanları</CardDescription>
            </CardHeader>
            <CardContent>
              {satisfactionLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : satisfactionScore && (satisfactionScore.taskCount > 0 || satisfactionScore.checklistCount > 0) ? (
                <div className="flex flex-col gap-4">
                  {/* Özet Kartları */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {/* Genel Skor */}
                    <Card className="text-center p-3">
                      <p className="text-2xl font-bold text-primary">
                        {satisfactionScore.overallScore !== null ? satisfactionScore.overallScore.toFixed(0) : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Genel Skor / 100</p>
                    </Card>
                    
                    {/* Görev Puanı */}
                    <Card className="text-center p-3">
                      <div className="flex items-center justify-center gap-1">
                        {satisfactionScore.taskAverage !== null ? (
                          <StarRating value={Math.round(satisfactionScore.taskAverage)} readonly size="sm" />
                        ) : (
                          <span className="text-2xl font-bold">-</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Görev Puanı ({satisfactionScore.taskCount})
                      </p>
                    </Card>
                    
                    {/* Checklist Puanı */}
                    <Card className="text-center p-3">
                      <div className="flex items-center justify-center gap-1">
                        {satisfactionScore.checklistAverage !== null ? (
                          <StarRating value={Math.round(satisfactionScore.checklistAverage)} readonly size="sm" />
                        ) : (
                          <span className="text-2xl font-bold">-</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Checklist ({satisfactionScore.checklistCount})
                      </p>
                    </Card>
                    
                    {/* Toplam Değerlendirme */}
                    <Card className="text-center p-3">
                      <p className="text-2xl font-bold text-muted-foreground">
                        {satisfactionScore.taskCount + satisfactionScore.checklistCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Toplam Değerlendirme</p>
                    </Card>
                  </div>
                  
                  {/* Son Puanlamalar */}
                  {satisfactionScore.recentRatings && satisfactionScore.recentRatings.length > 0 && (
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Görev ID</TableHead>
                            <TableHead>Puan</TableHead>
                            <TableHead>Yorum</TableHead>
                            <TableHead>Tarih</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {satisfactionScore.recentRatings.slice(0, 5).map((rating) => (
                            <TableRow key={rating.id} data-testid={`row-rating-${rating.id}`}>
                              <TableCell className="font-medium">
                                <Link href={`/gorev/${rating.taskId}`} className="text-primary hover:underline">
                                  #{rating.taskId}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <StarRating value={rating.finalRating} readonly size="sm" />
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {rating.feedback || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(rating.createdAt).toLocaleDateString("tr-TR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz görev puanlaması bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performans Skorları Kartı */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performans Skorları
              </CardTitle>
              <CardDescription>Personelin performans değerlendirmeleri</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : performanceScores && performanceScores.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {performanceScores.slice(0, 4).map((score, idx: number) => (
                      <Card key={idx} className="text-center p-3">
                        <p className="text-2xl font-bold text-primary">{score.overallScore || score.score || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(score.periodStart || score.createdAt).toLocaleDateString("tr-TR")}
                        </p>
                      </Card>
                    ))}
                  </div>
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dönem</TableHead>
                          <TableHead>Puan</TableHead>
                          <TableHead>Değerlendiren</TableHead>
                          <TableHead>Notlar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceScores.map((score) => (
                          <TableRow key={score.id} data-testid={`row-performance-${score.id}`}>
                            <TableCell className="font-medium">
                              {new Date(score.periodStart || score.createdAt).toLocaleDateString("tr-TR")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={score.overallScore >= 80 ? "outline" : "default"} className={score.overallScore >= 80 ? "bg-success/10 text-success" : ""}>
                                {score.overallScore || score.score || 0}/100
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {score.evaluatorId || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {score.notes || score.feedback || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz performans kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Eğitim Durumu
              </CardTitle>
              <CardDescription>Personelin eğitim ilerlemesi ve sertifikaları</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : Array.isArray(trainingProgress) && trainingProgress.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {trainingProgress.map((progress: any) => {
                    const module = trainingModules?.find((m) => m.id === progress.moduleId);
                    return (
                      <Card key={progress.id} data-testid={`training-progress-${progress.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="flex-1">
                              <p className="font-medium">{module?.title || `Modül ${progress.moduleId}`}</p>
                              <p className="text-sm text-muted-foreground">{module?.description || ""}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${progress.progress || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{progress.progress || 0}%</span>
                              </div>
                            </div>
                            <Badge variant={progress.status === "completed" ? "outline" : "default"} className={progress.status === "completed" ? "bg-success/10 text-success" : ""}>
                              {progress.status === "completed" ? "Tamamlandı" : progress.status === "in_progress" ? "Devam Ediyor" : "Başlamadı"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz eğitim kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                İzin & Fazla Mesai Talepleri
              </CardTitle>
              <CardDescription>Personelin izin ve fazla mesai geçmişi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    İzin Talepleri
                  </h3>
                  {leaveLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : leaveRequests && leaveRequests.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih Aralığı</TableHead>
                            <TableHead>Tür</TableHead>
                            <TableHead>Gün</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveRequests.map((leave) => (
                            <TableRow key={leave.id} data-testid={`row-leave-${leave.id}`}>
                              <TableCell className="font-medium">
                                {new Date(leave.startDate).toLocaleDateString("tr-TR")} - {new Date(leave.endDate).toLocaleDateString("tr-TR")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {leave.leaveType === "annual" ? "Yıllık" : leave.leaveType === "sick" ? "Hastalık" : leave.leaveType === "unpaid" ? "Ücretsiz" : leave.leaveType}
                                </Badge>
                              </TableCell>
                              <TableCell>{leave.totalDays || 1} gün</TableCell>
                              <TableCell>
                                <Badge variant={leave.status === "approved" ? "outline" : leave.status === "rejected" ? "destructive" : "default"} className={leave.status === "approved" ? "bg-success/10 text-success" : ""}>
                                  {leave.status === "pending" ? "Bekliyor" : leave.status === "approved" ? "Onaylandı" : "Reddedildi"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">İzin talebi bulunmuyor</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Fazla Mesai Talepleri
                  </h3>
                  {overtimeLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : overtimeRequests && overtimeRequests.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Saat</TableHead>
                            <TableHead>Sebep</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overtimeRequests.map((ot) => (
                            <TableRow key={ot.id} data-testid={`row-overtime-${ot.id}`}>
                              <TableCell className="font-medium">
                                {new Date(ot.date).toLocaleDateString("tr-TR")}
                              </TableCell>
                              <TableCell>{ot.hours || ot.totalHours} saat</TableCell>
                              <TableCell className="max-w-xs truncate">{ot.reason || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={ot.status === "approved" ? "outline" : ot.status === "rejected" ? "destructive" : "default"} className={ot.status === "approved" ? "bg-success/10 text-success" : ""}>
                                  {ot.status === "pending" ? "Bekliyor" : ot.status === "approved" ? "Onaylandı" : "Reddedildi"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">Fazla mesai talebi bulunmuyor</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disciplinary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Disiplin İşlemleri</CardTitle>
                <CardDescription>
                  Personelin disiplin kayıtları, uyarılar ve tutanaklar
                </CardDescription>
              </div>
              {employee && <CreateDisciplinaryDialog userId={id!} branchId={employee.branchId!} />}
            </CardHeader>
            <CardContent>
              {disciplinaryLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : disciplinaryReports && disciplinaryReports.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {disciplinaryReports.map((report) => (
                    <Card key={report.id} className="border-l-4 hover-elevate active-elevate-2 cursor-pointer" data-testid={`disciplinary-report-${report.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-base">{report.subject}</CardTitle>
                              <Badge variant={report.severity === 'critical' ? 'destructive' : report.severity === 'high' ? 'destructive' : 'outline'}>
                                {report.severity === 'critical' ? 'Kritik' : report.severity === 'high' ? 'Yüksek' : report.severity === 'medium' ? 'Orta' : 'Düşük'}
                              </Badge>
                              <Badge variant={report.status === 'resolved' ? 'outline' : 'default'}>
                                {report.status === 'open' ? 'Açık' : report.status === 'under_review' ? 'İnceleniyor' : report.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                              </Badge>
                            </div>
                            <CardDescription>
                              {report.reportType === 'warning' ? 'Uyarı' : report.reportType === 'investigation' ? 'Soruşturma' : report.reportType === 'defense' ? 'Savunma' : 'Toplantı Tutanağı'} • {new Date(report.incidentDate).toLocaleDateString('tr-TR')}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 text-sm">
                          <div>
                            <p className="font-medium mb-1">Açıklama:</p>
                            <p className="text-muted-foreground">{report.description}</p>
                          </div>
                          {report.employeeResponse && (
                            <div>
                              <p className="font-medium mb-1">Personel Yanıtı:</p>
                              <p className="text-muted-foreground">{report.employeeResponse}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(report.employeeResponseDate!).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          )}
                          {report.resolution && (
                            <div>
                              <p className="font-medium mb-1">Çözüm:</p>
                              <p className="text-muted-foreground">{report.resolution}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                            {!report.employeeResponse && (
                              <AddResponseDialog reportId={report.id} userId={id!} />
                            )}
                            {report.status !== 'resolved' && report.status !== 'closed' && (
                              <ResolveDialog reportId={report.id} userId={id!} />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz disiplin kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Personel Onboarding</CardTitle>
                <CardDescription>
                  Yeni personel işe alım ve eğitim süreci takibi
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {onboardingLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : onboarding ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Durum</p>
                      <Badge className="mt-1" variant={onboarding.status === 'completed' ? 'outline' : 'default'}>
                        {onboarding.status === 'not_started' ? 'Başlamadı' : onboarding.status === 'in_progress' ? 'Devam Ediyor' : 'Tamamlandı'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tamamlanma</p>
                      <p className="text-2xl font-bold mt-1">{onboarding.completionPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Başlangıç Tarihi</p>
                      <p className="mt-1">{new Date(onboarding.startDate).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tahmini Bitiş</p>
                      <p className="mt-1">{onboarding.expectedCompletionDate ? new Date(onboarding.expectedCompletionDate).toLocaleDateString('tr-TR') : '-'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Onboarding Görevleri</h3>
                      {onboarding && <OnboardingTaskDialog onboardingId={onboarding.id} userId={id!} />}
                    </div>
                    {onboardingTasksLoading ? (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : onboardingTasks && onboardingTasks.length > 0 ? (
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {onboardingTasks.map((task) => (
                          <Card key={task.id} className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`onboarding-task-${task.id}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium">{task.taskName}</p>
                                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'outline'} className="text-xs">
                                      {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                                    </Badge>
                                    <Badge variant={task.status === 'completed' ? 'outline' : 'default'} className="text-xs">
                                      {task.status === 'pending' ? 'Bekliyor' : task.status === 'in_progress' ? 'Devam Ediyor' : task.status === 'completed' ? 'Tamamlandı' : 'Atlandı'}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground">{task.description}</p>
                                  )}
                                  {task.dueDate && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Bitiş: {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {task.status !== 'completed' && task.status !== 'skipped' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => completeOnboardingTaskMutation.mutate(task.id)}
                                      disabled={completeOnboardingTaskMutation.isPending}
                                      data-testid={`button-complete-task-${task.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {task.status === 'completed' && !task.verifiedAt && isHQRole(currentUser?.role as any) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => verifyOnboardingTaskMutation.mutate(task.id)}
                                      disabled={verifyOnboardingTaskMutation.isPending}
                                      data-testid={`button-verify-task-${task.id}`}
                                    >
                                      Doğrula
                                    </Button>
                                  )}
                                  {task.verifiedAt && (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Doğrulandı
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <p>Henüz görev eklenmemiş</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Bu personel için onboarding süreci başlatılmamış</p>
                  <Button 
                    onClick={() => createOnboardingMutation.mutate()}
                    disabled={createOnboardingMutation.isPending || !employee}
                    data-testid="button-start-onboarding"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Onboarding Başlat
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disciplinary" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Eğitim Durumu
              </CardTitle>
              <CardDescription>Atanan ve tamamlanan eğitimler</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : trainingProgress && typeof trainingProgress === 'object' && !Array.isArray(trainingProgress) ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Toplam</p>
                      <p className="text-2xl font-bold">{(trainingProgress as any).summary?.total || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Tamamlanan</p>
                      <p className="text-2xl font-bold text-success">{(trainingProgress as any).summary?.completed || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Devam Eden</p>
                      <p className="text-2xl font-bold text-primary">{(trainingProgress as any).summary?.inProgress || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Geciken</p>
                      <p className="text-2xl font-bold text-warning">{(trainingProgress as any).summary?.overdue || 0}</p>
                    </div>
                  </div>

                  {(trainingProgress as any).averageScore > 0 && (
                    <div className="border rounded-lg p-3 bg-primary/10">
                      <p className="text-sm text-muted-foreground mb-1">Ortalama Başarı Oranı</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-accent rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{width: `${(trainingProgress as any).averageScore}%`}}
                          />
                        </div>
                        <span className="font-bold">{(trainingProgress as any).averageScore}%</span>
                      </div>
                    </div>
                  )}

                  {(trainingProgress as any).assignments && (trainingProgress as any).assignments.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Atanan Eğitimler</h4>
                      <div className="flex flex-col gap-3 sm:gap-4 gap-2">
                        {(trainingProgress as any).assignments.slice(0, 6).map((a: any) => (
                          <div key={a.id} className="p-2 border rounded-lg text-center">
                            <p className="font-medium text-xs line-clamp-1">{a.materialId}</p>
                            <Badge variant={a.status === 'completed' ? 'default' : 'outline'} className="mt-1 text-xs">
                              {a.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz eğitim atanmamış</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Görev Ata
              </CardTitle>
              <CardDescription>Bu personele yeni görev atayın</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="task-title">Görev Adı *</Label>
                  <Input
                    id="task-title"
                    data-testid="input-task-title"
                    placeholder="Örn: Raporları Güncelle"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="task-description">Açıklama</Label>
                  <Textarea
                    id="task-description"
                    data-testid="textarea-task-description"
                    placeholder="Görev detayları..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="min-h-24"
                  />
                </div>
                <div>
                  <Label htmlFor="task-due-date">Bitiş Tarihi</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    data-testid="input-task-due-date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  data-testid="button-assign-task"
                  onClick={async () => {
                    if (!taskTitle) {
                      toast({ title: "Hata", description: "Görev adı gerekli", variant: "destructive" });
                      return;
                    }
                    try {
                      await apiRequest("POST", "/api/tasks", {
                        title: taskTitle,
                        description: taskDescription || null,
                        dueDate: taskDueDate || null,
                        assignedToId: id,
                        priority: "medium",
                        status: "pending"
                      });
                      toast({ title: "Başarılı", description: "Görev atandı" });
                      setTaskTitle("");
                      setTaskDescription("");
                      setTaskDueDate("");
                      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                    } catch (error) {
                      toast({ title: "Hata", description: (error as any)?.message || "Görev atanırken hata oluştu", variant: "destructive" });
                    }
                  }}
                >
                  <ListTodo className="h-4 w-4 mr-2" />
                  Görevi Ata
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Mesaj Gönder
              </CardTitle>
              <CardDescription>Bu personele mesaj gönderin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="message">Mesaj *</Label>
                  <Textarea
                    id="message"
                    data-testid="textarea-message"
                    placeholder="Mesajınız..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="min-h-32"
                  />
                </div>
                <Button 
                  className="w-full" 
                  data-testid="button-send-message"
                  onClick={async () => {
                    if (!messageText) {
                      toast({ title: "Hata", description: "Mesaj yazın", variant: "destructive" });
                      return;
                    }
                    try {
                      await apiRequest("POST", "/api/messages", {
                        content: messageText,
                        recipientId: id,
                        threadType: "direct"
                      });
                      toast({ title: "Başarılı", description: "Mesaj gönderildi" });
                      setMessageText("");
                      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                    } catch (error) {
                      toast({ title: "Hata", description: (error as any)?.message || "Mesaj gönderilemedi", variant: "destructive" });
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mesajı Gönder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        );
      })()}

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id !== null) deleteDocumentMutation.mutate(id as number);
        }}
        title="Belgeyi Sil"
        description={`"${deleteState.itemName || ''}" belgesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
