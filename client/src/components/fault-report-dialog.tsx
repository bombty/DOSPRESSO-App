import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Equipment, EQUIPMENT_METADATA, EquipmentFault } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle, CheckCircle, Wrench, Upload, History, DollarSign, Clock,
  Building2, Store, Mail, Download, FileText, Shield, ExternalLink, CalendarClock
} from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from "jspdf";

const createFaultSchema = z.object({
  description: z.string().min(10, "Arıza açıklaması en az 10 karakter olmalı"),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  estimatedCost: z.string().optional(),
});

type CreateFaultInput = z.infer<typeof createFaultSchema>;

interface FaultReportDialogProps {
  equipment: Equipment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TroubleshootingStep {
  id: number;
  description: string;
  requiresPhoto: boolean;
  isRequired: boolean;
}

interface FaultOutcome {
  type: 'hq_escalation' | 'branch_service';
  title: string;
  message: string;
  details?: any;
}

const sanitizeTurkish = (text: string): string => {
  return text
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G');
};

export function FaultReportDialog({ equipment, isOpen, onOpenChange }: FaultReportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const hasTroubleshooting = equipment.faultProtocol === 'hq_teknik';
  const [step, setStep] = useState<'troubleshooting' | 'report' | 'outcome'>(hasTroubleshooting ? 'troubleshooting' : 'report');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});
  const [outcome, setOutcome] = useState<FaultOutcome | null>(null);
  const [createdFault, setCreatedFault] = useState<EquipmentFault | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'detailed'>('quick');
  const [notificationDate, setNotificationDate] = useState('');
  const [notificationTime, setNotificationTime] = useState('');
  const [notificationSaved, setNotificationSaved] = useState(false);
  const [savedFormNotes, setSavedFormNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [immediateImpact, setImmediateImpact] = useState(false);
  const [safetyHazard, setSafetyHazard] = useState(false);

  const metadata = EQUIPMENT_METADATA[equipment.equipmentType as keyof typeof EQUIPMENT_METADATA];
  const isHQResponsible = equipment.faultProtocol === 'hq_teknik' || (equipment as any).maintenanceResponsible === 'hq';

  const { data: troubleshootingSteps = [] } = useQuery<TroubleshootingStep[]>({
    queryKey: ['/api/troubleshooting', equipment.equipmentType],
    enabled: isOpen && hasTroubleshooting,
  });

  const { data: pastFaults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ['/api/faults', 'equipment', equipment.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/faults?equipmentId=${equipment.id}`);
        if (!response.ok) return [];
        const data = await response.json();
        const faults = Array.isArray(data) ? data : (data?.data || []);
        return faults.slice(0, 10).reverse();
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const openFaults = pastFaults.filter(f =>
    f.currentStage !== 'kapatildi' && f.currentStage !== 'cozuldu'
  );
  const hasOpenFault = openFaults.length > 0;

  const form = useForm<CreateFaultInput>({
    resolver: zodResolver(createFaultSchema),
    defaultValues: {
      description: '',
      priority: 'orta',
      notes: '',
      estimatedCost: '',
    },
  });

  const createFaultMutation = useMutation({
    mutationFn: async (data: CreateFaultInput) => {
      const troubleshootingData = Array.from(completedSteps).map(stepId => ({
        stepId,
        completedAt: new Date().toISOString(),
        notes: stepNotes[stepId] || undefined,
      }));

      setSavedFormNotes(data.notes || '');
      const response = await apiRequest('POST', '/api/faults', {
        equipmentId: equipment.id,
        branchId: equipment.branchId,
        equipmentName: metadata?.nameTr || equipment.equipmentType || 'Ekipman',
        description: data.description + (data.notes ? `\n\nEk Notlar: ${data.notes}` : ''),
        priority: data.priority,
        photoUrl: uploadedPhotoUrl || data.photoUrl,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
        troubleshootingCompleted: hasTroubleshooting ? completedSteps.size > 0 : false,
        completedTroubleshootingSteps: troubleshootingData.length > 0 ? troubleshootingData : undefined,
        responsibleParty: isHQResponsible ? 'hq' : 'branch',
        faultReportDetails: (selectedSymptoms.length > 0 || selectedAreas.length > 0 || immediateImpact || safetyHazard) ? {
          symptoms: selectedSymptoms,
          affectedAreas: selectedAreas,
          immediateImpact,
          safetyHazard,
          partsIdentified: [],
          notes: data.notes || '',
        } : undefined,
      });
      const fault = await response.json();
      return fault as EquipmentFault;
    },
    onSuccess: (fault: EquipmentFault) => {
      setCreatedFault(fault);
      if (isHQResponsible) {
        setOutcome({
          type: 'hq_escalation',
          title: 'Merkez Teknik Ekibine İletildi',
          message: 'Arıza raporunuz Merkez Teknik Ekibine iletilmiştir. PDF rapor HQ Dashboard\'da hazır beklemektedir.',
          details: { faultId: fault.id },
        });
      } else {
        setOutcome({
          type: 'branch_service',
          title: 'Arıza Raporu Oluşturuldu',
          message: 'Arıza kaydınız başarıyla oluşturuldu. Teknik servise bildirmek için aşağıdaki adımları takip edin.',
          details: { faultId: fault.id },
        });
      }
      setStep('outcome');
      queryClient.invalidateQueries({ queryKey: ['/api/faults'] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Arıza raporu oluşturulamadı';
      toast({
        title: 'Hata',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const saveNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!createdFault || !notificationDate || !notificationTime) return;
      const dateTime = new Date(`${notificationDate}T${notificationTime}`);
      await apiRequest('POST', `/api/faults/${createdFault.id}/service-notification`, {
        serviceNotificationDate: dateTime.toISOString(),
        serviceNotificationMethod: 'email',
      });
    },
    onSuccess: () => {
      setNotificationSaved(true);
      toast({ title: 'Bildirim tarihi kaydedildi' });
      queryClient.invalidateQueries({ queryKey: ['/api/faults'] });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Bildirim tarihi kaydedilemedi', variant: 'destructive' });
    },
  });

  const handleStepComplete = (stepId: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const allRequiredStepsComplete = troubleshootingSteps.length === 0 ||
    troubleshootingSteps
      .filter(s => s.isRequired)
      .every(s => completedSteps.has(s.id));

  const handleClose = () => {
    onOpenChange(false);
    setStep(hasTroubleshooting ? 'troubleshooting' : 'report');
    setCompletedSteps(new Set());
    setStepNotes({});
    setOutcome(null);
    setCreatedFault(null);
    setUploadedPhotoUrl(null);
    setActiveTab('quick');
    setNotificationDate('');
    setNotificationTime('');
    setNotificationSaved(false);
    setSavedFormNotes('');
    setSelectedSymptoms([]);
    setSelectedAreas([]);
    setImmediateImpact(false);
    setSafetyHazard(false);
    form.reset();
  };

  const handlePhotoUpload = (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful?.[0]) {
      const photoUrl = result.successful[0].uploadURL;
      setUploadedPhotoUrl(photoUrl);
      form.setValue('photoUrl', photoUrl);
      toast({ title: 'Fotoğraf yüklendi' });
    }
  };

  const generateFaultPDF = () => {
    if (!createdFault) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO", pw / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeTurkish("Arıza Raporu"), pw / 2, 28, { align: "center" });
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pw - 14, 35);

    let y = 45;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeTurkish(`Arıza #${createdFault.id}`), 14, y); y += 10;

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const addField = (l: string, v: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(sanitizeTurkish(l) + ":", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(sanitizeTurkish(v || "-"), 65, y);
      y += 8;
    };

    addField("Ekipman", metadata?.nameTr || equipment.equipmentType);
    addField("Seri No", equipment.serialNumber || "-");
    addField("Sorumlu", isHQResponsible ? "Merkez Teknik Ekip" : "Şube Sorumlusu");
    addField("Öncelik", createdFault.priority === 'yuksek' ? 'Yüksek' : createdFault.priority === 'dusuk' ? 'Düşük' : 'Orta');
    addField("Rapor Tarihi", createdFault.createdAt ? format(new Date(createdFault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : format(new Date(), "dd MMM yyyy HH:mm", { locale: tr }));
    addField("Raporlayan", user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Bilinmiyor');

    if (createdFault.estimatedCost) {
      addField("Tahmini Maliyet", `${createdFault.estimatedCost} TL`);
    }

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pw - 14, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text(sanitizeTurkish("Açıklama:"), 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    const desc = createdFault.description || "Açıklama girilmedi";
    const splitDesc = doc.splitTextToSize(sanitizeTurkish(desc), pw - 28);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 6 + 8;

    if (savedFormNotes) {
      doc.setFont("helvetica", "bold");
      doc.text(sanitizeTurkish("Ek Notlar:"), 14, y); y += 7;
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(sanitizeTurkish(savedFormNotes), pw - 28);
      doc.text(splitNotes, 14, y);
      y += splitNotes.length * 6 + 8;
    }

    if (completedSteps.size > 0 && troubleshootingSteps.length > 0) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text(sanitizeTurkish("Tamamlanan Sorun Giderme Adımları:"), 14, y); y += 7;
      doc.setFont("helvetica", "normal");
      troubleshootingSteps.forEach((s) => {
        if (completedSteps.has(s.id)) {
          const stepText = sanitizeTurkish(`[x] ${s.description}`);
          const splitStep = doc.splitTextToSize(stepText, pw - 28);
          doc.text(splitStep, 14, y);
          y += splitStep.length * 6 + 2;
          if (stepNotes[s.id]) {
            doc.setTextColor(120, 120, 120);
            doc.text(sanitizeTurkish(`   Not: ${stepNotes[s.id]}`), 14, y);
            y += 6;
            doc.setTextColor(80, 80, 80);
          }
        }
      });
    }

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`DOSPRESSO - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

    doc.save(`DOSPRESSO_Ariza_${createdFault.id}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast({ title: "PDF indirildi" });
  };

  const generateMailBody = () => {
    if (!createdFault) return '';
    const lines = [
      `DOSPRESSO ARIZA RAPORU - #${createdFault.id}`,
      '',
      `Ekipman: ${metadata?.nameTr || equipment.equipmentType}`,
      `Seri No: ${equipment.serialNumber || '-'}`,
      `Öncelik: ${createdFault.priority === 'yuksek' ? 'Yüksek' : createdFault.priority === 'dusuk' ? 'Düşük' : 'Orta'}`,
      `Rapor Tarihi: ${format(new Date(), "dd.MM.yyyy HH:mm")}`,
      '',
      `Açıklama: ${createdFault.description}`,
    ];
    if (savedFormNotes) {
      lines.push(`Ek Notlar: ${savedFormNotes}`);
    }
    if (createdFault.estimatedCost) {
      lines.push(`Tahmini Maliyet: ${createdFault.estimatedCost} TL`);
    }
    lines.push('', '---', 'Bu rapor DOSPRESSO Franchise Yönetim Sistemi tarafından oluşturulmuştur.');
    return lines.join('\n');
  };

  const openMailClient = () => {
    const subject = encodeURIComponent(`DOSPRESSO Arıza Bildirimi - ${metadata?.nameTr || equipment.equipmentType} #${createdFault?.id || ''}`);
    const body = encodeURIComponent(generateMailBody());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    toast({ title: 'Mail uygulamanız açılıyor', description: 'Teknik servis adresini ekleyip gönderin' });
  };

  const ResponsiblePartyCard = () => (
    <Card className={isHQResponsible ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20"}>
      <CardContent className="flex items-center gap-3 pt-4 pb-3">
        {isHQResponsible ? (
          <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
        ) : (
          <Store className="h-5 w-5 text-amber-600 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">
              {isHQResponsible ? "Merkez Teknik Ekip Sorumlu" : "Şube Sorumlusu İlgilenecek"}
            </p>
            <Badge variant={isHQResponsible ? "default" : "secondary"}>
              {isHQResponsible ? "HQ" : "Şube"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isHQResponsible
              ? "Bu arıza kaydı oluşturulduktan sonra otomatik olarak Merkez Teknik Ekibine iletilecek ve PDF rapor hazırlanacaktır."
              : "Bu arıza kaydı oluşturulduktan sonra teknik servise mail ile bildirmeniz gerekecektir. Bildirim tarih ve saatini kaydetmeniz beklenmektedir."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const ReportForm = ({ variant }: { variant: 'quick' | 'detailed' }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createFaultMutation.mutate(data))} className="space-y-4">
        <ResponsiblePartyCard />

        {variant === 'detailed' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Fotoğraf Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploadedPhotoUrl ? (
                <div className="space-y-2">
                  <img
                    src={uploadedPhotoUrl}
                    alt="Yüklenen Fotoğraf"
                    className="h-32 w-32 object-cover rounded border"
                    data-testid="img-uploaded-photo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedPhotoUrl(null);
                      form.setValue('photoUrl', '');
                    }}
                  >
                    Değiştir
                  </Button>
                </div>
              ) : (
                <ObjectUploader
                  onGetUploadParameters={async () => {
                    try {
                      const response = await apiRequest('/api/upload-url', 'POST', {
                        fileName: `fault-${equipment.id}-${Date.now()}.jpg`,
                        fileType: 'image/jpeg',
                      });
                      return response as unknown as { method: "PUT"; url: string };
                    } catch (err) {
                      toast({ title: 'Hata', description: 'Upload URL alınamadı', variant: 'destructive' });
                      throw err;
                    }
                  }}
                  onComplete={handlePhotoUpload}
                  buttonClassName="w-full"
                >
                  Fotoğraf Yükle
                </ObjectUploader>
              )}
            </CardContent>
          </Card>
        )}

        {variant === 'detailed' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Arıza Detayları
              </CardTitle>
              <CardDescription>Arıza ile ilgili belirtileri ve etkilenen alanları işaretleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Belirtiler</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Ses / titreşim sorunu', 'Sıcaklık problemi', 'Sızıntı / kaçak', 'Elektrik arızası', 'Mekanik hasar', 'Yazılım hatası', 'Basınç sorunu', 'Performans düşüklüğü'].map(symptom => (
                    <label key={symptom} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-symptom-${symptom.replace(/\s/g, '-')}`}>
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(symptom)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSymptoms(prev => [...prev, symptom]);
                          else setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
                        }}
                        className="rounded border-border"
                      />
                      {symptom}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Etkilenen Alanlar</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Bar alanı', 'Mutfak', 'Depo', 'Müşteri alanı', 'Ofis', 'Dış mekan'].map(area => (
                    <label key={area} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-area-${area.replace(/\s/g, '-')}`}>
                      <input
                        type="checkbox"
                        checked={selectedAreas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedAreas(prev => [...prev, area]);
                          else setSelectedAreas(prev => prev.filter(a => a !== area));
                        }}
                        className="rounded border-border"
                      />
                      {area}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="checkbox-immediate-impact">
                  <input
                    type="checkbox"
                    checked={immediateImpact}
                    onChange={(e) => setImmediateImpact(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="font-medium">Üretim / hizmet etkileniyor</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="checkbox-safety-hazard">
                  <input
                    type="checkbox"
                    checked={safetyHazard}
                    onChange={(e) => setSafetyHazard(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="font-medium text-destructive">Güvenlik riski var</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {variant === 'detailed' && (
          <FormField
            control={form.control}
            name="estimatedCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tahmini Maliyet (TL)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    data-testid="input-estimated-cost"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arıza Açıklaması *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Sorun nedir? Hangi semptomlar gözleniyor?"
                  {...field}
                  data-testid="input-fault-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Öncelik</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="dusuk">Düşük</SelectItem>
                  <SelectItem value="orta">Orta</SelectItem>
                  <SelectItem value="yuksek">Yüksek</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ek Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ek bilgiler veya gözlemler"
                  {...field}
                  data-testid="input-fault-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {variant === 'detailed' && pastFaults.length > 0 && (
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Geçmiş Arızalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pastFaults.map((fault) => (
                <div key={fault.id} className="flex items-start justify-between gap-2 p-2 bg-background rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{fault.description?.substring(0, 50)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fault.createdAt ? format(new Date(fault.createdAt), 'dd MMM yyyy HH:mm', { locale: tr }) : '-'}
                    </p>
                  </div>
                  <Badge
                    variant={fault.priority === 'yuksek' ? 'destructive' : fault.priority === 'orta' ? 'default' : 'secondary'}
                  >
                    {fault.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-destructive">
          * Zorunlu adımları tamamlamadan arıza raporu oluşturamazsınız.
        </p>

        <div className="flex gap-2 pt-4 flex-wrap">
          {hasTroubleshooting && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('troubleshooting')}
            >
              Geri Dön
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            İptal
          </Button>
          {variant === 'quick' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab('detailed')}
            >
              Detayları Ekle
            </Button>
          )}
          {variant === 'detailed' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab('quick')}
            >
              Geri
            </Button>
          )}
          <Button
            type="submit"
            disabled={createFaultMutation.isPending}
            className="ml-auto"
            data-testid="button-create-fault"
          >
            {createFaultMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && step !== 'outcome') {
        handleClose();
      } else if (!open && step === 'outcome') {
        handleClose();
      } else {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Arıza Bildirimi - {metadata?.nameTr || equipment.equipmentType}
          </DialogTitle>
          <DialogDescription>
            S/N: {equipment.serialNumber}
          </DialogDescription>
        </DialogHeader>

        {hasOpenFault && step !== 'outcome' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm font-semibold text-destructive">
                  Bu cihaz için açık arıza kaydı var
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {openFaults.map(f => `#${f.id}`).join(', ')} numaralı arıza kayıtları hala açık durumda.
                Yeni arıza kaydı açmak yerine mevcut arızayı güncellemeniz önerilir.
              </p>
              <div className="flex gap-2 flex-wrap">
                {openFaults.slice(0, 3).map(f => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/ariza-detay/${f.id}`, '_blank')}
                    data-testid={`button-view-open-fault-${f.id}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Arıza #{f.id}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'troubleshooting' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Adım 1</Badge>
              <p className="text-sm font-medium">Sorun Giderme İşlemleri</p>
            </div>

            {troubleshootingSteps.length === 0 ? (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Bu ekipman türü için sorun giderme adımı tanımlanmamış. Doğrudan arıza raporu oluşturabilirsiniz.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {troubleshootingSteps.map((s) => (
                  <Card key={s.id} className={completedSteps.has(s.id) ? 'border-green-500/30 bg-green-50 dark:bg-green-950/30' : ''}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm">{s.description}</p>
                            {s.isRequired && <Badge variant="destructive" className="text-xs">Zorunlu</Badge>}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={completedSteps.has(s.id) ? 'default' : 'outline'}
                          onClick={() => handleStepComplete(s.id)}
                          data-testid={`button-complete-step-${s.id}`}
                        >
                          {completedSteps.has(s.id) ? 'Tamamlandı' : 'Tamamla'}
                        </Button>
                      </div>
                      {completedSteps.has(s.id) && (
                        <Input
                          placeholder="Not (opsiyonel)"
                          value={stepNotes[s.id] || ''}
                          onChange={(e) => setStepNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                          className="text-sm"
                          data-testid={`input-step-note-${s.id}`}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button
                onClick={() => setStep('report')}
                disabled={!allRequiredStepsComplete}
                className="ml-auto"
                data-testid="button-continue-to-report"
              >
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Adım 2</Badge>
              <p className="text-sm font-medium">Arıza Raporu</p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'quick' | 'detailed')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">Hızlı Raporlama</TabsTrigger>
                <TabsTrigger value="detailed">Detaylı Bilgiler</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <ReportForm variant="quick" />
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <ReportForm variant="detailed" />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'outcome' && outcome && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {outcome.type === 'hq_escalation' ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              <h3 className="font-semibold">{outcome.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{outcome.message}</p>

            {outcome.type === 'hq_escalation' && (
              <div className="space-y-3">
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Merkez Teknik Ekibe İletildi
                    </CardTitle>
                    <CardDescription>
                      Arıza raporu #{createdFault?.id} otomatik olarak HQ Dashboard'a düştü.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-medium">Ekipman:</span> {metadata?.nameTr}</div>
                      <div><span className="font-medium">Seri No:</span> {equipment.serialNumber}</div>
                      <div><span className="font-medium">Öncelik:</span> {createdFault?.priority === 'yuksek' ? 'Yüksek' : createdFault?.priority === 'dusuk' ? 'Düşük' : 'Orta'}</div>
                      <div><span className="font-medium">Durum:</span> Beklemede</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={generateFaultPDF} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    PDF İndir
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (createdFault) {
                      window.open(`/ariza-detay/${createdFault.id}`, '_blank');
                    }
                  }} data-testid="button-view-fault-detail">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Arıza Detayı
                  </Button>
                </div>
              </div>
            )}

            {outcome.type === 'branch_service' && (
              <div className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Servis Bildirim Adımları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 flex-shrink-0">1</Badge>
                        <p>PDF raporu indirin veya doğrudan mail gönderin</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 flex-shrink-0">2</Badge>
                        <p>Teknik servise arıza bildirimini mail ile iletin</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 flex-shrink-0">3</Badge>
                        <p>Bildirim tarih ve saatini aşağıya kaydedin</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={generateFaultPDF} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    PDF İndir
                  </Button>
                  <Button onClick={openMailClient} data-testid="button-send-mail">
                    <Mail className="h-4 w-4 mr-2" />
                    Teknik Servise Mail Gönder
                  </Button>
                </div>

                <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-amber-600" />
                      Servis Bildirim Kaydı
                    </CardTitle>
                    <CardDescription>
                      Teknik servise bildirimi yaptıktan sonra tarih ve saati buraya kaydedin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Bildirim Tarihi</label>
                        <Input
                          type="date"
                          value={notificationDate}
                          onChange={(e) => setNotificationDate(e.target.value)}
                          data-testid="input-notification-date"
                          disabled={notificationSaved}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Bildirim Saati</label>
                        <Input
                          type="time"
                          value={notificationTime}
                          onChange={(e) => setNotificationTime(e.target.value)}
                          data-testid="input-notification-time"
                          disabled={notificationSaved}
                        />
                      </div>
                    </div>
                    {notificationSaved ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Bildirim tarihi kaydedildi - İlk adım başlatıldı</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => saveNotificationMutation.mutate()}
                        disabled={!notificationDate || !notificationTime || saveNotificationMutation.isPending}
                        className="w-full"
                        data-testid="button-save-notification"
                      >
                        {saveNotificationMutation.isPending ? 'Kaydediliyor...' : 'Bildirim Tarihini Kaydet ve İlk Adımı Başlat'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => {
                    if (createdFault) {
                      window.open(`/ariza-detay/${createdFault.id}`, '_blank');
                    }
                  }} data-testid="button-view-fault-detail">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Arıza Detayı
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleClose} variant="outline" className="w-full" data-testid="button-close-dialog">
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
