import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, EmployeeDocument, DisciplinaryReport, EmployeeOnboarding, EmployeeOnboardingTask } from "@shared/schema";
import { isHQRole } from "@shared/schema";
import { CreateDisciplinaryDialog, AddResponseDialog, ResolveDialog } from "@/components/hr/DisciplinaryDialogs";
import { OnboardingTaskDialog } from "@/components/hr/OnboardingTaskDialog";

export default function PersonelDetay() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
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

  const { data: employee, isLoading: employeeLoading } = useQuery<User>({
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
  const { data: trainingProgress, isLoading: trainingLoading } = useQuery<any>({
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    return (
      <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
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

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    muhasebe: "Muhasebe",
    satinalma: "Satınalma",
    coach: "Coach",
    teknik: "Teknik",
    destek: "Destek",
    fabrika: "Fabrika",
    yatirimci_hq: "Yatırımcı (HQ)",
    supervisor: "Supervisor",
    supervisor_buddy: "Supervisor Buddy",
    barista: "Barista",
    bar_buddy: "Bar Buddy",
    stajyer: "Stajyer",
    yatirimci: "Yatırımcı",
  };

  return (
    <div className="container mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(employee.firstName || "", employee.lastName || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ad Soyad</p>
                <p className="font-medium">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <Badge>{roleLabels[employee.role] || employee.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-posta</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{employee.phoneNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Acil Durum İletişim</p>
                <p className="font-medium">{employee.emergencyContactName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                {employee.isActive ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pasif
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="documents" data-testid="tab-documents" className="text-xs px-2 py-1.5">
            <FileText className="h-3 w-3 mr-1" />
            Özlük
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance" className="text-xs px-2 py-1.5">
            <Clock className="h-3 w-3 mr-1" />
            Vardiya
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance" className="text-xs px-2 py-1.5">
            <TrendingUp className="h-3 w-3 mr-1" />
            Performans
          </TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training" className="text-xs px-2 py-1.5">
            <Award className="h-3 w-3 mr-1" />
            Eğitim
          </TabsTrigger>
          <TabsTrigger value="leave" data-testid="tab-leave" className="text-xs px-2 py-1.5">
            <CalendarDays className="h-3 w-3 mr-1" />
            İzin/Mesai
          </TabsTrigger>
          <TabsTrigger value="disciplinary" data-testid="tab-disciplinary" className="text-xs px-2 py-1.5">
            <Shield className="h-3 w-3 mr-1" />
            Disiplin
          </TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding" className="text-xs px-2 py-1.5">
            <GraduationCap className="h-3 w-3 mr-1" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-assign-task" className="text-xs px-2 py-1.5">
            <ListTodo className="h-3 w-3 mr-1" />
            Görev
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-send-message" className="text-xs px-2 py-1.5">
            <Send className="h-3 w-3 mr-1" />
            Mesaj
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              {documents && documents.length > 0 ? (
                <div className="rounded-md border">
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
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Onaylı
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
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
                                onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                disabled={deleteDocumentMutation.isPending}
                                data-testid={`button-delete-document-${doc.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

        <TabsContent value="attendance" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Vardiya Geçmişi
              </CardTitle>
              <CardDescription>Personelin giriş-çıkış kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : attendanceHistory && attendanceHistory.length > 0 ? (
                <div className="rounded-md border">
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
                      {attendanceHistory.slice(0, 20).map((record: any) => (
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
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz vardiya kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performans Skorları
              </CardTitle>
              <CardDescription>Personelin performans değerlendirmeleri</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : performanceScores && performanceScores.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {performanceScores.slice(0, 4).map((score: any, idx: number) => (
                      <Card key={idx} className="text-center p-4">
                        <p className="text-2xl font-bold text-primary">{score.overallScore || score.score || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(score.periodStart || score.createdAt).toLocaleDateString("tr-TR")}
                        </p>
                      </Card>
                    ))}
                  </div>
                  <div className="rounded-md border">
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
                        {performanceScores.map((score: any) => (
                          <TableRow key={score.id} data-testid={`row-performance-${score.id}`}>
                            <TableCell className="font-medium">
                              {new Date(score.periodStart || score.createdAt).toLocaleDateString("tr-TR")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={score.overallScore >= 80 ? "outline" : "default"} className={score.overallScore >= 80 ? "bg-green-50 text-green-700" : ""}>
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
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz performans kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Eğitim Durumu
              </CardTitle>
              <CardDescription>Personelin eğitim ilerlemesi ve sertifikaları</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : trainingProgress && trainingProgress.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {trainingProgress.map((progress: any) => {
                    const module = trainingModules?.find((m: any) => m.id === progress.moduleId);
                    return (
                      <Card key={progress.id} data-testid={`training-progress-${progress.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
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
                            <Badge variant={progress.status === "completed" ? "outline" : "default"} className={progress.status === "completed" ? "bg-green-50 text-green-700" : ""}>
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

        <TabsContent value="leave" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                İzin & Fazla Mesai Talepleri
              </CardTitle>
              <CardDescription>Personelin izin ve fazla mesai geçmişi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    İzin Talepleri
                  </h3>
                  {leaveLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : leaveRequests && leaveRequests.length > 0 ? (
                    <div className="rounded-md border">
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
                          {leaveRequests.map((leave: any) => (
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
                                <Badge variant={leave.status === "approved" ? "outline" : leave.status === "rejected" ? "destructive" : "default"} className={leave.status === "approved" ? "bg-green-50 text-green-700" : ""}>
                                  {leave.status === "pending" ? "Bekliyor" : leave.status === "approved" ? "Onaylandı" : "Reddedildi"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">İzin talebi bulunmuyor</p>
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
                          {overtimeRequests.map((ot: any) => (
                            <TableRow key={ot.id} data-testid={`row-overtime-${ot.id}`}>
                              <TableCell className="font-medium">
                                {new Date(ot.date).toLocaleDateString("tr-TR")}
                              </TableCell>
                              <TableCell>{ot.hours || ot.totalHours} saat</TableCell>
                              <TableCell className="max-w-xs truncate">{ot.reason || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={ot.status === "approved" ? "outline" : ot.status === "rejected" ? "destructive" : "default"} className={ot.status === "approved" ? "bg-green-50 text-green-700" : ""}>
                                  {ot.status === "pending" ? "Bekliyor" : ot.status === "approved" ? "Onaylandı" : "Reddedildi"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Fazla mesai talebi bulunmuyor</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : disciplinaryReports && disciplinaryReports.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {disciplinaryReports.map((report) => (
                    <Card key={report.id} className="border-l-4" data-testid={`disciplinary-report-${report.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
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
                        <div className="grid grid-cols-1 gap-3 text-sm">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : onboarding ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : onboardingTasks && onboardingTasks.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        {onboardingTasks.map((task) => (
                          <Card key={task.id} data-testid={`onboarding-task-${task.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
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
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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

        <TabsContent value="disciplinary" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Eğitim Durumu
              </CardTitle>
              <CardDescription>Atanan ve tamamlanan eğitimler</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : trainingProgress ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Toplam</p>
                      <p className="text-2xl font-bold">{trainingProgress.summary?.total || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Tamamlanan</p>
                      <p className="text-2xl font-bold text-green-600">{trainingProgress.summary?.completed || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Devam Eden</p>
                      <p className="text-2xl font-bold text-blue-600">{trainingProgress.summary?.inProgress || 0}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Geciken</p>
                      <p className="text-2xl font-bold text-orange-600">{trainingProgress.summary?.overdue || 0}</p>
                    </div>
                  </div>

                  {trainingProgress.averageScore > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <p className="text-sm text-muted-foreground mb-1">Ortalama Başarı Oranı</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{width: `${trainingProgress.averageScore}%`}}
                          />
                        </div>
                        <span className="font-bold">{trainingProgress.averageScore}%</span>
                      </div>
                    </div>
                  )}

                  {trainingProgress.assignments && trainingProgress.assignments.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Atanan Eğitimler</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {trainingProgress.assignments.slice(0, 6).map((a: any) => (
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

        <TabsContent value="onboarding" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Görev Ata
              </CardTitle>
              <CardDescription>Bu personele yeni görev atayın</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    } catch (error: any) {
                      toast({ title: "Hata", description: error.message || "Görev atanırken hata oluştu", variant: "destructive" });
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

        <TabsContent value="tasks" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Mesaj Gönder
              </CardTitle>
              <CardDescription>Bu personele mesaj gönderin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    } catch (error: any) {
                      toast({ title: "Hata", description: error.message || "Mesaj gönderilemedi", variant: "destructive" });
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
    </div>
  );
}
