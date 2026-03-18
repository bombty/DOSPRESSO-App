import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Award, Printer, Eye, ArrowRight, FileText, Settings, ChevronDown, Trash2, RotateCcw } from "lucide-react";
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
  const [branchName, setBranchName] = useState("");
  const [certificateId, setCertificateId] = useState(generateCertId());
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [signer1Name, setSigner1Name] = useState("Yavuz Kolakan");
  const [signer1Title, setSigner1Title] = useState("Coach");
  const [signer2Name, setSigner2Name] = useState("Ece Trainer");
  const [signer2Title, setSigner2Title] = useState("Eğitim Müdürü");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSigner1Name, setSettingsSigner1Name] = useState("");
  const [settingsSigner1Title, setSettingsSigner1Title] = useState("");
  const [settingsSigner2Name, setSettingsSigner2Name] = useState("");
  const [settingsSigner2Title, setSettingsSigner2Title] = useState("");

  const { data: certSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/certificate-settings"],
    enabled: !!user,
  });

  const { data: issuedCerts = [] } = useQuery<any[]>({
    queryKey: ["/api/certificates"],
    enabled: !!user && isHQRole(user.role as any),
  });

  useEffect(() => {
    if (certSettings) {
      const s1n = certSettings["signer1_name"] || "Yavuz Kolakan";
      const s1t = certSettings["signer1_title"] || "Coach";
      const s2n = certSettings["signer2_name"] || "Ece Trainer";
      const s2t = certSettings["signer2_title"] || "Eğitim Müdürü";
      setSigner1Name(s1n);
      setSigner1Title(s1t);
      setSigner2Name(s2n);
      setSigner2Title(s2t);
      setSettingsSigner1Name(s1n);
      setSettingsSigner1Title(s1t);
      setSettingsSigner2Name(s2n);
      setSettingsSigner2Title(s2t);
    }
  }, [certSettings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PATCH", `/api/certificate-settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-settings"] });
    },
  });

  const saveIssuedCertMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/certificates", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sertifika kayıt edildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    },
    onError: () => {
      toast({ title: "Kayıt başarısız", variant: "destructive" });
    },
  });

  const deleteIssuedCertMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/certificates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Sertifika iptal edildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    },
  });

  const saveSettings = () => {
    const updates = [
      { key: "signer1_name", value: settingsSigner1Name },
      { key: "signer1_title", value: settingsSigner1Title },
      { key: "signer2_name", value: settingsSigner2Name },
      { key: "signer2_title", value: settingsSigner2Title },
    ];
    updates.forEach((u) => {
      if (u.value.trim()) updateSettingMutation.mutate(u);
    });
    toast({ title: "İmza ayarları kaydedildi" });
  };

  const openCreate = (tmpl: CertificateTemplate) => {
    setSelectedTemplate(tmpl);
    setRecipientName("");
    setModuleName("");
    setBranchName("");
    setCustomTitle(tmpl.title);
    setCustomDescription(tmpl.description);
    setCertificateId(generateCertId());
    if (certSettings) {
      setSigner1Name(certSettings["signer1_name"] || "Yavuz Kolakan");
      setSigner1Title(certSettings["signer1_title"] || "Coach");
      setSigner2Name(certSettings["signer2_name"] || "Ece Trainer");
      setSigner2Title(certSettings["signer2_title"] || "Eğitim Müdürü");
    }
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
    printCertificate(buildCertProps());
  };

  const handleSaveAndPrint = () => {
    if (!selectedTemplate || !recipientName.trim()) {
      toast({ title: "Lütfen alıcı adını girin", variant: "destructive" });
      return;
    }
    saveIssuedCertMutation.mutate({
      type: selectedTemplate.fromRole ? "role_transition" : "module_completion",
      templateKey: selectedTemplate.id,
      certificateNo: certificateId,
      recipientName,
      title: customTitle || selectedTemplate.title,
      description: customDescription || selectedTemplate.description,
      branchName: branchName || null,
      moduleName: moduleName || null,
      signer1Name,
      signer1Title,
      signer2Name,
      signer2Title,
    });
    handlePrint();
    setIsCreateOpen(false);
  };

  const buildCertProps = (): CertificateProps => ({
    template: selectedTemplate!,
    recipientName: recipientName || "Ad Soyad",
    issueDate: formatTurkishDate(new Date()),
    certificateId,
    moduleName: moduleName || undefined,
    branchName: branchName || undefined,
    signer1Name,
    signer1Title,
    signer2Name,
    signer2Title,
    customTitle: customTitle || undefined,
    customDescription: customDescription || undefined,
  });

  const canEditSettings = user && ['admin', 'ceo', 'coach', 'trainer'].includes(user.role as string);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold" data-testid="text-cert-header">Sertifika Yönetimi</h2>
          <p className="text-xs text-muted-foreground">Kademe geçişleri ve eğitim tamamlama sertifikaları</p>
        </div>
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
                  <div style={{ width: "30px", height: "2px", background: "linear-gradient(90deg, transparent, #d4af37)" }} />
                  <Award className="w-5 h-5" style={{ color: "#d4af37" }} />
                  <div style={{ width: "30px", height: "2px", background: "linear-gradient(90deg, #d4af37, transparent)" }} />
                </div>
                <p className="text-center text-xs font-semibold" style={{ color: "white", fontFamily: "Georgia, serif" }}>
                  {tmpl.title}
                </p>
                <p className="text-center text-[10px] mt-0.5" style={{ color: "#d4af37" }}>
                  {tmpl.subtitle}
                </p>
              </div>

              <h3 className="text-sm font-semibold mb-1">{tmpl.title}</h3>

              {tmpl.fromRole && tmpl.toRole ? (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
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

              <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>

              <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5 text-xs" data-testid={`btn-create-cert-${tmpl.id}`}>
                <FileText className="w-3 h-3" /> Sertifika Oluştur
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {canEditSettings && (
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" data-testid="btn-toggle-settings">
              <Settings className="w-3.5 h-3.5" />
              İmza Ayarları
              <ChevronDown className={`w-3 h-3 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Varsayılan imza bilgileri. Tüm yeni sertifikalarda otomatik kullanılır.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">İmzalayan 1</p>
                    <Input
                      placeholder="Ad Soyad"
                      value={settingsSigner1Name}
                      onChange={(e) => setSettingsSigner1Name(e.target.value)}
                      data-testid="input-settings-s1-name"
                    />
                    <Input
                      placeholder="Unvan"
                      value={settingsSigner1Title}
                      onChange={(e) => setSettingsSigner1Title(e.target.value)}
                      data-testid="input-settings-s1-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">İmzalayan 2</p>
                    <Input
                      placeholder="Ad Soyad"
                      value={settingsSigner2Name}
                      onChange={(e) => setSettingsSigner2Name(e.target.value)}
                      data-testid="input-settings-s2-name"
                    />
                    <Input
                      placeholder="Unvan"
                      value={settingsSigner2Title}
                      onChange={(e) => setSettingsSigner2Title(e.target.value)}
                      data-testid="input-settings-s2-title"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={saveSettings} disabled={updateSettingMutation.isPending} data-testid="btn-save-settings">
                  Kaydet
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {issuedCerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" data-testid="text-issued-header">Düzenlenen Sertifikalar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium text-muted-foreground">Tarih</th>
                  <th className="py-2 pr-3 font-medium text-muted-foreground">Alıcı</th>
                  <th className="py-2 pr-3 font-medium text-muted-foreground">Sertifika</th>
                  <th className="py-2 pr-3 font-medium text-muted-foreground">No</th>
                  <th className="py-2 font-medium text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {issuedCerts.map((cert: any) => (
                  <tr key={cert.id} className="border-b" data-testid={`row-cert-${cert.id}`}>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {cert.issuedAt ? formatTurkishDate(new Date(cert.issuedAt)) : "-"}
                    </td>
                    <td className="py-2 pr-3 font-medium">{cert.recipientName}</td>
                    <td className="py-2 pr-3">{cert.title || cert.templateKey}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{cert.certificateNo}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const tmpl = CERTIFICATE_TEMPLATES.find(t => t.id === cert.templateKey) || CERTIFICATE_TEMPLATES[4];
                            printCertificate({
                              template: tmpl,
                              recipientName: cert.recipientName,
                              issueDate: cert.issuedAt ? formatTurkishDate(new Date(cert.issuedAt)) : formatTurkishDate(new Date()),
                              certificateId: cert.certificateNo,
                              moduleName: cert.moduleName || undefined,
                              branchName: cert.branchName || undefined,
                              signer1Name: cert.signer1Name,
                              signer1Title: cert.signer1Title,
                              signer2Name: cert.signer2Name,
                              signer2Title: cert.signer2Title,
                              customTitle: cert.title || undefined,
                              customDescription: cert.description || undefined,
                            });
                          }}
                          data-testid={`btn-reprint-${cert.id}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteIssuedCertMutation.mutate(cert.id)}
                          data-testid={`btn-revoke-${cert.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {customTitle || selectedTemplate.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#d4af37" }}>
                  {selectedTemplate.subtitle}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Sertifika Başlığı</label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  data-testid="input-cert-custom-title"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Alıcı Adı Soyadı *</label>
                <Input
                  placeholder="Mehmet Yılmaz"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  data-testid="input-cert-recipient"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Şube Adı</label>
                <Input
                  placeholder="Işıklar Şubesi"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  data-testid="input-cert-branch"
                />
              </div>

              {selectedTemplate.id === "module-completion" && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Modül Adı</label>
                  <Input
                    placeholder="Barista Temel Eğitimi"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    data-testid="input-cert-module"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block">Açıklama Metni</label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                  className="text-xs"
                  data-testid="input-cert-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">İmzalayan 1</label>
                  <Input
                    value={signer1Name}
                    onChange={(e) => setSigner1Name(e.target.value)}
                    data-testid="input-cert-s1-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Unvan 1</label>
                  <Input
                    value={signer1Title}
                    onChange={(e) => setSigner1Title(e.target.value)}
                    data-testid="input-cert-s1-title"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">İmzalayan 2</label>
                  <Input
                    value={signer2Name}
                    onChange={(e) => setSigner2Name(e.target.value)}
                    data-testid="input-cert-s2-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Unvan 2</label>
                  <Input
                    value={signer2Title}
                    onChange={(e) => setSigner2Title(e.target.value)}
                    data-testid="input-cert-s2-title"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Sertifika No</label>
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
                  onClick={handleSaveAndPrint}
                  disabled={saveIssuedCertMutation.isPending}
                  data-testid="btn-print-cert"
                >
                  <Printer className="w-3.5 h-3.5" /> Kaydet ve Yazdır
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
          {selectedTemplate && (
            <div className="flex justify-center overflow-auto py-4">
              <div style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
                <CertificateRenderer {...buildCertProps()} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
