import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Printer, Eye, ArrowRight, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import {
  CertificateRenderer,
  CERTIFICATE_TEMPLATES,
  ROLE_LABELS,
  printCertificate,
  type CertificateTemplate,
  type CertificateProps,
} from "@/components/certificate-renderer";

function generateCertId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CERT-${year}-${num}`;
}

function formatTurkishDate(date: Date): string {
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function SertifikaTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [signerName, setSignerName] = useState("DOSPRESSO");
  const [signerTitle, setSignerTitle] = useState("Eğitim Müdürü");
  const [certificateId, setCertificateId] = useState(generateCertId());

  const [isCustomDesignOpen, setIsCustomDesignOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [certForm, setCertForm] = useState({
    transitionFrom: "stajyer",
    transitionTo: "bar_buddy",
    certificateTitle: "Başarı Sertifikası",
    subtitle: "DOSPRESSO Donut & Coffee",
    primaryColor: "#122549",
    secondaryColor: "#d4af37",
    templateLayout: "classic",
    signatureLabel: "DOSPRESSO Eğitim Müdürü",
    footerText: "",
  });

  const { data: certDesigns = [] } = useQuery<any[]>({
    queryKey: ["/api/certificate-designs"],
    enabled: !!user && isHQRole(user.role as any),
  });

  const saveCertDesignMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCert) {
        const res = await apiRequest("PUT", `/api/certificate-designs/${editingCert.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/certificate-designs", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editingCert ? "Tasarım güncellendi" : "Tasarım oluşturuldu" });
      setIsCustomDesignOpen(false);
      setEditingCert(null);
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-designs"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kayıt başarısız", variant: "destructive" });
    },
  });

  const deleteCertDesignMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/certificate-designs/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Tasarım silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-designs"] });
    },
  });

  const openCreate = (tmpl: CertificateTemplate) => {
    setSelectedTemplate(tmpl);
    setRecipientName("");
    setModuleName("");
    setSignerName("DOSPRESSO");
    setSignerTitle("Eğitim Müdürü");
    setCertificateId(generateCertId());
    setIsCreateOpen(true);
  };

  const openPreview = () => {
    if (!recipientName.trim()) {
      toast({ title: "Lütfen alıcı adını girin", variant: "destructive" });
      return;
    }
    setIsCreateOpen(false);
    setIsPreviewOpen(true);
  };

  const handlePrint = () => {
    if (!selectedTemplate) return;
    printCertificate({
      template: selectedTemplate,
      recipientName,
      issueDate: formatTurkishDate(new Date()),
      certificateId,
      moduleName: moduleName || undefined,
      signerName,
      signerTitle,
    });
  };

  const openEditCert = (cert: any) => {
    setEditingCert(cert);
    setCertForm({
      transitionFrom: cert.transitionFrom,
      transitionTo: cert.transitionTo,
      certificateTitle: cert.certificateTitle || "Başarı Sertifikası",
      subtitle: cert.subtitle || "DOSPRESSO Donut & Coffee",
      primaryColor: cert.primaryColor || "#122549",
      secondaryColor: cert.secondaryColor || "#d4af37",
      templateLayout: cert.templateLayout || "classic",
      signatureLabel: cert.signatureLabel || "DOSPRESSO Eğitim Müdürü",
      footerText: cert.footerText || "",
    });
    setIsCustomDesignOpen(true);
  };

  const currentCertProps: CertificateProps | null = selectedTemplate
    ? {
        template: selectedTemplate,
        recipientName: recipientName || "Ad Soyad",
        issueDate: formatTurkishDate(new Date()),
        certificateId,
        moduleName: moduleName || undefined,
        signerName,
        signerTitle,
      }
    : null;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Sertifika Yönetimi</h2>
          <p className="text-xs text-muted-foreground">Kademe geçişleri ve eğitim tamamlama sertifikaları</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingCert(null);
            setCertForm({
              transitionFrom: "stajyer",
              transitionTo: "bar_buddy",
              certificateTitle: "Başarı Sertifikası",
              subtitle: "DOSPRESSO Donut & Coffee",
              primaryColor: "#122549",
              secondaryColor: "#d4af37",
              templateLayout: "classic",
              signatureLabel: "DOSPRESSO Eğitim Müdürü",
              footerText: "",
            });
            setIsCustomDesignOpen(true);
          }}
          data-testid="button-custom-cert"
        >
          <Plus className="w-3 h-3 mr-1" /> Özel Tasarım
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CERTIFICATE_TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.id}
            className="hover-elevate cursor-pointer"
            onClick={() => openCreate(tmpl)}
            data-testid={`cert-template-${tmpl.id}`}
          >
            <CardContent className="p-4">
              <div
                className="rounded-md mb-3 flex flex-col items-center justify-center py-4 px-3"
                style={{
                  background: "linear-gradient(135deg, #122549 0%, #1a3a6a 100%)",
                  border: "1px solid #d4af37",
                  minHeight: "100px",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    style={{
                      width: "30px",
                      height: "2px",
                      background: "linear-gradient(90deg, transparent, #d4af37)",
                    }}
                  />
                  <Award className="w-5 h-5" style={{ color: "#d4af37" }} />
                  <div
                    style={{
                      width: "30px",
                      height: "2px",
                      background: "linear-gradient(90deg, #d4af37, transparent)",
                    }}
                  />
                </div>
                <p
                  className="text-center text-xs font-semibold"
                  style={{ color: "white", fontFamily: "Georgia, serif" }}
                >
                  {tmpl.title}
                </p>
                <p className="text-center text-[10px] mt-0.5" style={{ color: "#d4af37" }}>
                  {tmpl.subtitle}
                </p>
              </div>

              <h3 className="text-sm font-semibold mb-1">{tmpl.title}</h3>

              {tmpl.fromRole && tmpl.toRole ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                    {ROLE_LABELS[tmpl.fromRole] || tmpl.fromRole}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">
                    {ROLE_LABELS[tmpl.toRole] || tmpl.toRole}
                  </Badge>
                </div>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-2 no-default-hover-elevate no-default-active-elevate">
                  Genel Eğitim
                </Badge>
              )}

              <p className="text-xs text-muted-foreground line-clamp-2">
                {tmpl.description}
              </p>

              <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5 text-xs" data-testid={`btn-create-cert-${tmpl.id}`}>
                <FileText className="w-3 h-3" /> Sertifika Oluştur
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {certDesigns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Özel Tasarımlar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certDesigns.map((cert: any) => (
              <Card key={cert.id} data-testid={`cert-custom-${cert.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${cert.primaryColor || "#122549"}, ${cert.secondaryColor || "#d4af37"})`,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {cert.certificateTitle || "Sertifika"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditCert(cert)}
                        data-testid={`btn-edit-cert-${cert.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteCertDesignMutation.mutate(cert.id)}
                        data-testid={`btn-delete-cert-${cert.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                      {ROLE_LABELS[cert.transitionFrom] || cert.transitionFrom}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                      {ROLE_LABELS[cert.transitionTo] || cert.transitionTo}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Award className="w-5 h-5" style={{ color: "#d4af37" }} />
              Sertifika Oluştur
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-3">
              <div
                className="p-3 rounded-md text-center"
                style={{
                  background: "linear-gradient(135deg, #122549, #1a3a6a)",
                  border: "1px solid #d4af37",
                }}
              >
                <p className="text-xs font-semibold" style={{ color: "white", fontFamily: "Georgia, serif" }}>
                  {selectedTemplate.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#d4af37" }}>
                  {selectedTemplate.subtitle}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Alıcı Adı Soyadı *
                </label>
                <Input
                  placeholder="Mehmet Yılmaz"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  data-testid="input-cert-recipient"
                />
              </div>

              {selectedTemplate.id === "module-completion" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Modül Adı
                  </label>
                  <Input
                    placeholder="Örn: Barista Temel Eğitimi"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    data-testid="input-cert-module"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    İmzalayan
                  </label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    data-testid="input-cert-signer"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Unvan
                  </label>
                  <Input
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    data-testid="input-cert-signer-title"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Sertifika No
                </label>
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  data-testid="input-cert-id"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={openPreview}
                  data-testid="btn-preview-cert"
                >
                  <Eye className="w-3.5 h-3.5" /> Önizleme
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    if (!recipientName.trim()) {
                      toast({ title: "Lütfen alıcı adını girin", variant: "destructive" });
                      return;
                    }
                    handlePrint();
                  }}
                  data-testid="btn-print-cert"
                >
                  <Printer className="w-3.5 h-3.5" /> Yazdır / PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> Sertifika Önizleme
              </span>
              <Button size="sm" className="gap-1.5" onClick={handlePrint} data-testid="btn-print-preview">
                <Printer className="w-3.5 h-3.5" /> Yazdır / PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {currentCertProps && (
            <div className="flex justify-center overflow-auto py-4">
              <div style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
                <CertificateRenderer {...currentCertProps} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCustomDesignOpen}
        onOpenChange={(open) => {
          setIsCustomDesignOpen(open);
          if (!open) setEditingCert(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Award className="w-5 h-5" />
              {editingCert ? "Tasarımı Düzenle" : "Özel Sertifika Tasarımı"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Mevcut Statü
                </label>
                <Select
                  value={certForm.transitionFrom}
                  onValueChange={(v) => setCertForm((p) => ({ ...p, transitionFrom: v }))}
                >
                  <SelectTrigger data-testid="select-cert-from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Yeni Statü
                </label>
                <Select
                  value={certForm.transitionTo}
                  onValueChange={(v) => setCertForm((p) => ({ ...p, transitionTo: v }))}
                >
                  <SelectTrigger data-testid="select-cert-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                Sertifika Başlığı
              </label>
              <Input
                value={certForm.certificateTitle}
                onChange={(e) => setCertForm((p) => ({ ...p, certificateTitle: e.target.value }))}
                data-testid="input-cert-title"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alt Başlık</label>
              <Input
                value={certForm.subtitle}
                onChange={(e) => setCertForm((p) => ({ ...p, subtitle: e.target.value }))}
                data-testid="input-cert-subtitle"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Ana Renk</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={certForm.primaryColor}
                    onChange={(e) => setCertForm((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={certForm.primaryColor}
                    onChange={(e) => setCertForm((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Aksan Renk</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={certForm.secondaryColor}
                    onChange={(e) => setCertForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={certForm.secondaryColor}
                    onChange={(e) => setCertForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                İmza Etiketi
              </label>
              <Input
                value={certForm.signatureLabel}
                onChange={(e) => setCertForm((p) => ({ ...p, signatureLabel: e.target.value }))}
                data-testid="input-cert-signature"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => saveCertDesignMutation.mutate(certForm)}
              disabled={saveCertDesignMutation.isPending}
              data-testid="btn-save-cert-design"
            >
              {saveCertDesignMutation.isPending
                ? "Kaydediliyor..."
                : editingCert
                  ? "Güncelle"
                  : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
