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
import type { User, EmployeeDocument } from "@shared/schema";
import { isHQRole } from "@shared/schema";

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

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/employee-documents", {
        method: "POST",
        body: JSON.stringify(data),
      });
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
      return apiRequest(`/api/employee-documents/${documentId}/verify`, {
        method: "POST",
      });
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
      return apiRequest(`/api/employee-documents/${documentId}`, {
        method: "DELETE",
      });
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

  const isLoading = employeeLoading || documentsLoading;

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
                              {doc.documentUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  data-testid={`button-download-document-${doc.id}`}
                                >
                                  <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
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
            <CardHeader>
              <CardTitle>Disiplin İşlemleri</CardTitle>
              <CardDescription>
                Personelin disiplin kayıtları, uyarılar ve tutanaklar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Disiplin modülü yakında eklenecek</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Personel Onboarding</CardTitle>
              <CardDescription>
                Yeni personel işe alım ve eğitim süreci takibi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Onboarding modülü yakında eklenecek</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
