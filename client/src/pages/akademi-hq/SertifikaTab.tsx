import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Plus, Pencil, Trash2 } from "lucide-react";

export function SertifikaTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [certForm, setCertForm] = useState({
    transitionFrom: 'stajyer',
    transitionTo: 'bar_buddy',
    certificateTitle: 'Başarı Sertifikası',
    subtitle: '',
    primaryColor: '#1e3a5f',
    secondaryColor: '#c9a96e',
    templateLayout: 'classic',
    signatureLabel: 'DOSPRESSO Eğitim Müdürü',
    footerText: '',
  });

  const { data: certDesigns = [] } = useQuery<any[]>({
    queryKey: ['/api/certificate-designs'],
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
      toast({ title: editingCert ? "Sertifika tasarımı güncellendi" : "Sertifika tasarımı oluşturuldu" });
      setIsCertDialogOpen(false);
      setEditingCert(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-designs'] });
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
      toast({ title: "Sertifika tasarımı silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-designs'] });
    },
  });

  const resetForm = () => {
    setCertForm({
      transitionFrom: 'stajyer', transitionTo: 'bar_buddy', certificateTitle: 'Başarı Sertifikası',
      subtitle: '', primaryColor: '#1e3a5f', secondaryColor: '#c9a96e', templateLayout: 'classic',
      signatureLabel: 'DOSPRESSO Eğitim Müdürü', footerText: '',
    });
  };

  const openEditCert = (cert: any) => {
    setEditingCert(cert);
    setCertForm({
      transitionFrom: cert.transitionFrom, transitionTo: cert.transitionTo,
      certificateTitle: cert.certificateTitle || 'Başarı Sertifikası', subtitle: cert.subtitle || '',
      primaryColor: cert.primaryColor || '#1e3a5f', secondaryColor: cert.secondaryColor || '#c9a96e',
      templateLayout: cert.templateLayout || 'classic', signatureLabel: cert.signatureLabel || 'DOSPRESSO Eğitim Müdürü',
      footerText: cert.footerText || '',
    });
    setIsCertDialogOpen(true);
  };

  const roleLabels: Record<string, string> = {
    stajyer: "Stajyer", bar_buddy: "Bar Buddy", barista: "Barista",
    supervisor_buddy: "Supervisor Buddy", supervisor: "Supervisor",
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Sertifika ve Rozet Yönetimi</h2>
        <Button size="sm" onClick={() => { resetForm(); setEditingCert(null); setIsCertDialogOpen(true); }} data-testid="button-create-cert">
          <Plus className="w-3 h-3 mr-1" /> Yeni Sertifika Tasarımı
        </Button>
      </div>

      {certDesigns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-no-certs">Henüz sertifika tasarımı oluşturulmadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {certDesigns.map((cert: any) => (
            <Card key={cert.id} data-testid={`cert-card-${cert.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex-shrink-0" style={{ background: `linear-gradient(135deg, ${cert.primaryColor}, ${cert.secondaryColor})` }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cert.certificateTitle || 'Sertifika'}</p>
                      <p className="text-xs text-muted-foreground">{cert.templateLayout || 'classic'}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEditCert(cert)} data-testid={`btn-edit-cert-${cert.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCertDesignMutation.mutate(cert.id)} data-testid={`btn-delete-cert-${cert.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Badge variant="outline" className="text-xs">{roleLabels[cert.transitionFrom] || cert.transitionFrom}</Badge>
                  <span className="text-muted-foreground">{'\u2192'}</span>
                  <Badge variant="outline" className="text-xs">{roleLabels[cert.transitionTo] || cert.transitionTo}</Badge>
                </div>
                {cert.subtitle && <p className="text-xs text-muted-foreground mt-1">{cert.subtitle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCertDialogOpen} onOpenChange={(open) => { setIsCertDialogOpen(open); if (!open) { setEditingCert(null); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Award className="w-5 h-5" />
              {editingCert ? 'Sertifika Tasarımını Düzenle' : 'Yeni Sertifika Tasarımı'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Geçiş: Mevcut Statü</label>
                <Select value={certForm.transitionFrom} onValueChange={(v) => setCertForm(p => ({ ...p, transitionFrom: v }))}>
                  <SelectTrigger data-testid="select-cert-from"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Yeni Statü</label>
                <Select value={certForm.transitionTo} onValueChange={(v) => setCertForm(p => ({ ...p, transitionTo: v }))}>
                  <SelectTrigger data-testid="select-cert-to"><SelectValue /></SelectTrigger>
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
              <label className="text-xs font-medium mb-1 block">Sertifika Başlığı</label>
              <Input value={certForm.certificateTitle} onChange={(e) => setCertForm(p => ({ ...p, certificateTitle: e.target.value }))} data-testid="input-cert-title" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alt Başlık</label>
              <Input value={certForm.subtitle} onChange={(e) => setCertForm(p => ({ ...p, subtitle: e.target.value }))} data-testid="input-cert-subtitle" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Ana Renk</label>
                <div className="flex gap-1 items-center">
                  <input type="color" value={certForm.primaryColor} onChange={(e) => setCertForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={certForm.primaryColor} onChange={(e) => setCertForm(p => ({ ...p, primaryColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">İkincil Renk</label>
                <div className="flex gap-1 items-center">
                  <input type="color" value={certForm.secondaryColor} onChange={(e) => setCertForm(p => ({ ...p, secondaryColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={certForm.secondaryColor} onChange={(e) => setCertForm(p => ({ ...p, secondaryColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Şablon Düzeni</label>
              <Select value={certForm.templateLayout} onValueChange={(v) => setCertForm(p => ({ ...p, templateLayout: v }))}>
                <SelectTrigger data-testid="select-cert-layout"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Klasik</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">İmza Etiketi</label>
              <Input value={certForm.signatureLabel} onChange={(e) => setCertForm(p => ({ ...p, signatureLabel: e.target.value }))} data-testid="input-cert-signature" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alt Bilgi Metni</label>
              <Input value={certForm.footerText} onChange={(e) => setCertForm(p => ({ ...p, footerText: e.target.value }))} data-testid="input-cert-footer" />
            </div>
            <Button className="w-full" onClick={() => saveCertDesignMutation.mutate(certForm)} disabled={saveCertDesignMutation.isPending} data-testid="btn-save-cert-design">
              {saveCertDesignMutation.isPending ? "Kaydediliyor..." : (editingCert ? "Güncelle" : "Oluştur")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
