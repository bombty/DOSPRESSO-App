import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, MessageSquare, CheckCircle } from "lucide-react";

interface CreateDisciplinaryDialogProps {
  userId: string;
  branchId: number;
}

export function CreateDisciplinaryDialog({ userId, branchId }: CreateDisciplinaryDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    reportType: "",
    severity: "low",
    subject: "",
    description: "",
    incidentDate: "",
    incidentTime: "",
    location: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/disciplinary-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Disiplin kaydı oluşturulamadı");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      setOpen(false);
      setFormData({
        reportType: "",
        severity: "low",
        subject: "",
        description: "",
        incidentDate: "",
        incidentTime: "",
        location: "",
      });
      toast({
        title: "Disiplin kaydı oluşturuldu",
        description: "Kayıt başarıyla eklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Disiplin kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.reportType || !formData.subject || !formData.description || !formData.incidentDate) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen tüm gerekli alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      userId,
      branchId,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-disciplinary">
          <Plus className="h-4 w-4 mr-2" />
          Kayıt Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-disciplinary">
        <DialogHeader>
          <DialogTitle>Yeni Disiplin Kaydı</DialogTitle>
          <DialogDescription>
            Personel için disiplin kaydı oluşturun
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportType">Kayıt Türü *</Label>
              <Select value={formData.reportType} onValueChange={(value) => setFormData({ ...formData, reportType: value })}>
                <SelectTrigger id="reportType" data-testid="select-report-type">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Uyarı</SelectItem>
                  <SelectItem value="investigation">Soruşturma</SelectItem>
                  <SelectItem value="defense">Savunma</SelectItem>
                  <SelectItem value="meeting_minutes">Toplantı Tutanağı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="severity">Önem Derecesi *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger id="severity" data-testid="select-severity">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="critical">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="subject">Konu *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Örn: Geç kalma"
              data-testid="input-subject"
            />
          </div>
          <div>
            <Label htmlFor="description">Açıklama *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detaylı açıklama yazın"
              rows={4}
              data-testid="textarea-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="incidentDate">Olay Tarihi *</Label>
              <Input
                id="incidentDate"
                type="date"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                data-testid="input-incident-date"
              />
            </div>
            <div>
              <Label htmlFor="incidentTime">Olay Saati</Label>
              <Input
                id="incidentTime"
                type="time"
                value={formData.incidentTime}
                onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                data-testid="input-incident-time"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location">Konum</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Örn: Şube ana kasa"
              data-testid="input-location"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddResponseDialogProps {
  reportId: number;
  userId: string;
}

export function AddResponseDialog({ reportId, userId }: AddResponseDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [response, setResponse] = useState("");

  const addResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/disciplinary-reports/${reportId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Yanıt eklenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      setOpen(false);
      setResponse("");
      toast({
        title: "Yanıt eklendi",
        description: "Personel yanıtı başarıyla kaydedildi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Yanıt eklenemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!response.trim()) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen yanıt metnini girin",
        variant: "destructive",
      });
      return;
    }

    addResponseMutation.mutate({ employeeResponse: response });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-add-response-${reportId}`}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Yanıt Ekle
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-add-response-${reportId}`}>
        <DialogHeader>
          <DialogTitle>Personel Yanıtı Ekle</DialogTitle>
          <DialogDescription>
            Personelin bu disiplin kaydı hakkındaki yazılı savunmasını ekleyin
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="response">Yanıt Metni *</Label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Personelin yazılı savunmasını girin"
              rows={6}
              data-testid="textarea-response"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={addResponseMutation.isPending} data-testid="button-submit">
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ResolveDialogProps {
  reportId: number;
  userId: string;
}

export function ResolveDialog({ reportId, userId }: ResolveDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    resolution: "",
    actionTaken: "",
    followUpRequired: false,
    followUpDate: "",
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/disciplinary-reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kayıt çözümlenemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      setOpen(false);
      setFormData({
        resolution: "",
        actionTaken: "",
        followUpRequired: false,
        followUpDate: "",
      });
      toast({
        title: "Kayıt çözümlendi",
        description: "Disiplin kaydı başarıyla çözümlendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kayıt çözümlenemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.resolution.trim() || !formData.actionTaken) {
      toast({
        title: "Eksik bilgi",
        description: "Lütfen çözüm ve alınan aksiyonu girin",
        variant: "destructive",
      });
      return;
    }

    resolveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-resolve-${reportId}`}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Çözümle
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-resolve-${reportId}`}>
        <DialogHeader>
          <DialogTitle>Disiplin Kaydını Çözümle</DialogTitle>
          <DialogDescription>
            Bu disiplin kaydını sonuçlandırın ve alınan aksiyonu belirtin
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="resolution">Çözüm *</Label>
            <Textarea
              id="resolution"
              value={formData.resolution}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
              placeholder="Kaydın nasıl çözümlendiğini açıklayın"
              rows={4}
              data-testid="textarea-resolution"
            />
          </div>
          <div>
            <Label htmlFor="actionTaken">Alınan Aksiyon *</Label>
            <Select value={formData.actionTaken} onValueChange={(value) => setFormData({ ...formData, actionTaken: value })}>
              <SelectTrigger id="actionTaken" data-testid="select-action-taken">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verbal_warning">Sözlü Uyarı</SelectItem>
                <SelectItem value="written_warning">Yazılı Uyarı</SelectItem>
                <SelectItem value="suspension">Uzaklaştırma</SelectItem>
                <SelectItem value="termination">İş Akdi Feshi</SelectItem>
                <SelectItem value="cleared">Temize Çıkarıldı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={formData.followUpRequired}
              onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
              data-testid="checkbox-follow-up"
            />
            <Label htmlFor="followUpRequired">Takip gerekli mi?</Label>
          </div>
          {formData.followUpRequired && (
            <div>
              <Label htmlFor="followUpDate">Takip Tarihi</Label>
              <Input
                id="followUpDate"
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                data-testid="input-follow-up-date"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={resolveMutation.isPending} data-testid="button-submit">
            Çözümle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
