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
  Building2, Store, Mail, Download, FileText, Shield, ExternalLink, CalendarClock,
  ChevronRight, Loader2
} from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  createPDFWithHeader, addSection, addKeyValue, addParagraph, addFooter,
  savePDF, sanitizeText, checkPageBreak, loadLogo
} from "@/lib/pdfHelper";

const createFaultSchema = z.object({
  description: z.string().min(10, "Arıza açıklaması en az 10 karakter olmalı"),
  priority: z.enum(['low', 'medium', 'high']),
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

export function FaultReportDialog({ equipment, isOpen, onOpenChange }: FaultReportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const hasTroubleshooting = equipment.faultProtocol === 'hq_teknik';
  const [wizardStep, setWizardStep] = useState<'troubleshooting' | 'report' | 'creating' | 'outcome' | 'notification' | 'complete'>(hasTroubleshooting ? 'troubleshooting' : 'report');
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
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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

  const { data: branchInfo } = useQuery<{id: number, name: string, address: string, phoneNumber: string, managerName: string}>({
    queryKey: ['/api/branches', equipment.branchId],
    staleTime: 300000,
    enabled: isOpen && !!equipment.branchId,
  });

  const openFaults = pastFaults.filter(f =>
    f.currentStage !== 'kapatildi' && f.currentStage !== 'cozuldu'
  );
  const hasOpenFault = openFaults.length > 0;

  const totalSteps = isHQResponsible
    ? (hasTroubleshooting ? 4 : 3)
    : (hasTroubleshooting ? 5 : 4);

  const getCurrentStepIndex = () => {
    if (wizardStep === 'troubleshooting') return 0;
    if (wizardStep === 'report' || wizardStep === 'creating') return hasTroubleshooting ? 1 : 0;
    if (wizardStep === 'outcome') return hasTroubleshooting ? 2 : 1;
    if (wizardStep === 'notification') return hasTroubleshooting ? 3 : 2;
    if (wizardStep === 'complete') return totalSteps;
    return 0;
  };

  const StepProgress = ({ currentStep }: { currentStep: number; totalSteps: number }) => {
    const filteredSteps = isHQResponsible
      ? (hasTroubleshooting ? ['Sorun Giderme', 'Rapor', 'Sonuç', 'Tamamlandı'] : ['Rapor', 'Sonuç', 'Tamamlandı'])
      : (hasTroubleshooting ? ['Sorun Giderme', 'Rapor', 'Sonuç', 'Bildirim', 'Tamamlandı'] : ['Rapor', 'Sonuç', 'Bildirim', 'Tamamlandı']);

    return (
      <div className="flex items-center justify-center gap-1 mb-4">
        {filteredSteps.map((label, idx) => (
          <div key={label + idx} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              idx < currentStep ? 'bg-primary text-primary-foreground' :
              idx === currentStep ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
              'bg-muted text-muted-foreground'
            }`}>
              {idx < currentStep ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${idx === currentStep ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {idx < filteredSteps.length - 1 && <div className={`w-6 h-0.5 ${idx < currentStep ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>
    );
  };

  const form = useForm<CreateFaultInput>({
    resolver: zodResolver(createFaultSchema),
    defaultValues: {
      description: '',
      priority: 'medium',
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
      setWizardStep('outcome');
      queryClient.invalidateQueries({ queryKey: ['/api/faults'] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Arıza raporu oluşturulamadı';
      setWizardStep('report');
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
    setWizardStep(hasTroubleshooting ? 'troubleshooting' : 'report');
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
    setPdfGenerated(false);
    setEmailSent(false);
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

  const generateFaultPDF = async () => {
    if (!createdFault) return;

    const { doc, yPos: startY } = await createPDFWithHeader({
      title: 'ARIZA RAPORU',
      subtitle: `Rapor No: #${createdFault.id}`,
      branchName: branchInfo?.name || 'Şube',
      reportDate: new Date(createdFault.createdAt || Date.now()),
    });

    const pw = doc.internal.pageSize.getWidth();
    let y = startY;

    y = addSection(doc, 'Şube Bilgileri', y);
    y = addKeyValue(doc, 'Şube', sanitizeText(branchInfo?.name || '-'), y);
    y = addKeyValue(doc, 'Adres', sanitizeText(branchInfo?.address || '-'), y);
    y = addKeyValue(doc, 'Telefon', branchInfo?.phoneNumber || '-', y);
    y = addKeyValue(doc, 'Müdür', sanitizeText(branchInfo?.managerName || '-'), y);
    y += 5;

    y = addSection(doc, 'Cihaz Bilgileri', y);
    y = addKeyValue(doc, 'Ekipman', sanitizeText(metadata?.nameTr || equipment.equipmentType), y);
    y = addKeyValue(doc, 'Seri No', equipment.serialNumber || '-', y);
    y = addKeyValue(doc, 'Marka', sanitizeText((equipment as any).brand || '-'), y);
    y = addKeyValue(doc, 'Model', sanitizeText((equipment as any).model || '-'), y);
    y += 5;

    y = addSection(doc, 'Arıza Detayları', y);
    y = addKeyValue(doc, 'Arıza No', `#${createdFault.id}`, y);
    y = addKeyValue(doc, 'Sorumlu', isHQResponsible ? 'Merkez Teknik Ekip' : 'Şube Sorumlusu', y);
    y = addKeyValue(doc, 'Öncelik', (createdFault.priority === 'high' || createdFault.priority === 'yuksek') ? 'Yüksek' : (createdFault.priority === 'low' || createdFault.priority === 'dusuk') ? 'Düşük' : 'Orta', y);
    y = addKeyValue(doc, 'Raporlayan', sanitizeText(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Bilinmiyor'), y);
    if (createdFault.estimatedCost) {
      y = addKeyValue(doc, 'Tahmini Maliyet', `${createdFault.estimatedCost} TL`, y);
    }
    y += 5;

    y = checkPageBreak(doc, y, 30);
    y = addSection(doc, 'Açıklama', y);
    y = addParagraph(doc, createdFault.description || 'Açıklama girilmedi', y);

    if (selectedSymptoms.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = addSection(doc, 'Belirtiler', y);
      y = addParagraph(doc, selectedSymptoms.join(', '), y);
    }
    if (selectedAreas.length > 0) {
      y = checkPageBreak(doc, y, 20);
      y = addSection(doc, 'Etkilenen Alanlar', y);
      y = addParagraph(doc, selectedAreas.join(', '), y);
    }
    if (immediateImpact) {
      y = addKeyValue(doc, 'Uretim Etkisi', 'Evet - Uretim / hizmet etkileniyor', y);
    }
    if (safetyHazard) {
      y = addKeyValue(doc, 'Guvenlik Riski', 'EVET - Guvenlik riski mevcut', y);
    }

    if (completedSteps.size > 0 && troubleshootingSteps.length > 0) {
      y = checkPageBreak(doc, y, 30);
      y = addSection(doc, 'Sorun Giderme Adimlari', y);
      troubleshootingSteps.forEach(s => {
        if (completedSteps.has(s.id)) {
          y = addParagraph(doc, `[x] ${s.description}`, y);
          if (stepNotes[s.id]) {
            y = addKeyValue(doc, '  Not', stepNotes[s.id], y);
          }
        }
      });
    }

    y = checkPageBreak(doc, y, 30);
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(sanitizeText(`Arıza Referans: DOSPRESSO-F${createdFault.id}`), pw / 2, y, { align: 'center' });
    doc.text(sanitizeText(`Hızlı Erişim: /ariza-detay/${createdFault.id}`), pw / 2, y + 5, { align: 'center' });

    savePDF(doc, `DOSPRESSO_Ariza_${createdFault.id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setPdfGenerated(true);
    toast({ title: 'PDF indirildi' });
  };

  const generateMailBody = () => {
    if (!createdFault) return '';
    const lines = [
      `DOSPRESSO ARIZA RAPORU - #${createdFault.id}`,
      '',
      `Ekipman: ${metadata?.nameTr || equipment.equipmentType}`,
      `Seri No: ${equipment.serialNumber || '-'}`,
      `Öncelik: ${(createdFault.priority === 'high' || createdFault.priority === 'yuksek') ? 'Yüksek' : (createdFault.priority === 'low' || createdFault.priority === 'dusuk') ? 'Düşük' : 'Orta'}`,
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
    setEmailSent(true);
    toast({ title: 'Mail uygulamanız açılıyor', description: 'Teknik servis adresini ekleyip gönderin' });
  };

  const handleFormSubmit = (data: CreateFaultInput) => {
    setWizardStep('creating');
    createFaultMutation.mutate(data);
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
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                    loading="lazy"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    variant={(fault.priority === 'high' || fault.priority === 'yuksek' || fault.priority === 'critical') ? 'destructive' : (fault.priority === 'medium' || fault.priority === 'orta') ? 'default' : 'secondary'}
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
              onClick={() => setWizardStep('troubleshooting')}
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
      if (!open) {
        if (wizardStep === 'complete' || wizardStep === 'troubleshooting' || wizardStep === 'report') {
          handleClose();
        }
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

        {hasOpenFault && (wizardStep === 'troubleshooting' || wizardStep === 'report') && (
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

        {wizardStep === 'troubleshooting' && (
          <div className="space-y-4">
            <StepProgress currentStep={0} totalSteps={totalSteps} />

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
                onClick={() => setWizardStep('report')}
                disabled={!allRequiredStepsComplete}
                className="ml-auto"
                data-testid="button-continue-to-report"
              >
                Devam Et
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {wizardStep === 'report' && (
          <div className="space-y-4">
            <StepProgress currentStep={hasTroubleshooting ? 1 : 0} totalSteps={totalSteps} />

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

        {wizardStep === 'creating' && (
          <div className="space-y-4">
            <StepProgress currentStep={hasTroubleshooting ? 1 : 0} totalSteps={totalSteps} />
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Arıza raporu oluşturuluyor...</p>
            </div>
          </div>
        )}

        {wizardStep === 'outcome' && outcome && (
          <div className="space-y-4">
            <StepProgress currentStep={hasTroubleshooting ? 2 : 1} totalSteps={totalSteps} />

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><span className="font-medium">Ekipman:</span> {metadata?.nameTr}</div>
                      <div><span className="font-medium">Seri No:</span> {equipment.serialNumber}</div>
                      <div><span className="font-medium">Öncelik:</span> {(createdFault?.priority === 'high' || createdFault?.priority === 'yuksek') ? 'Yüksek' : (createdFault?.priority === 'low' || createdFault?.priority === 'dusuk') ? 'Düşük' : 'Orta'}</div>
                      <div><span className="font-medium">Durum:</span> Beklemede</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={generateFaultPDF} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    PDF Oluştur ve İndir
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (createdFault) {
                      window.open(`/ariza-detay/${createdFault.id}`, '_blank');
                    }
                  }} data-testid="button-view-fault-detail">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Arıza Detayı Görüntüle
                  </Button>
                </div>
              </div>
            )}

            {outcome.type === 'branch_service' && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-2 text-sm pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><span className="font-medium">Ekipman:</span> {metadata?.nameTr}</div>
                      <div><span className="font-medium">Seri No:</span> {equipment.serialNumber}</div>
                      <div><span className="font-medium">Öncelik:</span> {(createdFault?.priority === 'high' || createdFault?.priority === 'yuksek') ? 'Yüksek' : (createdFault?.priority === 'low' || createdFault?.priority === 'dusuk') ? 'Düşük' : 'Orta'}</div>
                      <div><span className="font-medium">Arıza No:</span> #{createdFault?.id}</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={generateFaultPDF} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    PDF Oluştur ve İndir
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (createdFault) {
                      window.open(`/ariza-detay/${createdFault.id}`, '_blank');
                    }
                  }} data-testid="button-view-fault-detail">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Arıza Detayı Görüntüle
                  </Button>
                  <Button onClick={openMailClient} data-testid="button-send-mail">
                    <Mail className="h-4 w-4 mr-2" />
                    Teknik Servise Mail Gönder
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (isHQResponsible) {
                    setWizardStep('complete');
                  } else {
                    setWizardStep('notification');
                  }
                }}
                className="w-full"
                data-testid="button-continue-outcome"
              >
                Devam Et
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {wizardStep === 'notification' && (
          <div className="space-y-4">
            <StepProgress currentStep={hasTroubleshooting ? 3 : 2} totalSteps={totalSteps} />

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <span>Bildirim tarihi kaydedildi</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => saveNotificationMutation.mutate()}
                    disabled={!notificationDate || !notificationTime || saveNotificationMutation.isPending}
                    className="w-full"
                    data-testid="button-save-notification"
                  >
                    {saveNotificationMutation.isPending ? 'Kaydediliyor...' : 'Bildirim Tarihini Kaydet'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setWizardStep('complete')}
                data-testid="button-skip-notification"
              >
                Atla
              </Button>
              <Button
                onClick={() => setWizardStep('complete')}
                className="ml-auto"
                data-testid="button-continue-notification"
              >
                Devam Et
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {wizardStep === 'complete' && (
          <div className="space-y-4">
            <StepProgress currentStep={totalSteps} totalSteps={totalSteps} />
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h3 className="font-semibold">Arıza Kaydı Tamamlandı</h3>
            </div>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Arıza raporu #{createdFault?.id} oluşturuldu</span>
                  </div>
                  {pdfGenerated && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>PDF rapor oluşturuldu ve indirildi</span>
                    </div>
                  )}
                  {emailSent && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Teknik servise mail gönderildi</span>
                    </div>
                  )}
                  {notificationSaved && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Servis bildirim tarihi kaydedildi</span>
                    </div>
                  )}
                  {isHQResponsible && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Merkez teknik ekibe otomatik iletildi</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleClose} className="w-full" data-testid="button-close-dialog">
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
