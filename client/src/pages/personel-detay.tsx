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

  const { data: employee, isLoading: employeeLoading } = useQuery<User>({
    queryKey: ["/api/users", id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
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
      <div className="container mx-auto p-6 space-y-6">
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
            <Button className="mt-4" onClick={() => navigate("/personel-yonetimi")}>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/personel-yonetimi">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
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
              <AvatarImage src={employee.profilePhotoUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(employee.firstName, employee.lastName)}
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
                <p className="font-medium">{employee.emergencyContact || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                {employee.status === "active" ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {employee.status === "pending" ? "Onay Bekliyor" : "Pasif"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Özlük Dosyası
          </TabsTrigger>
          <TabsTrigger value="disciplinary" data-testid="tab-disciplinary">
            <Shield className="h-4 w-4 mr-2" />
            Disiplin İşlemleri
          </TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">
            <GraduationCap className="h-4 w-4 mr-2" />
            Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
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
                    <div className="space-y-4">
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
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : disciplinaryReports && disciplinaryReports.length > 0 ? (
                <div className="space-y-4">
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
                        <div className="space-y-3 text-sm">
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
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : onboarding ? (
                <div className="space-y-6">
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
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : onboardingTasks && onboardingTasks.length > 0 ? (
                      <div className="space-y-3">
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
      </Tabs>
    </div>
  );
}
