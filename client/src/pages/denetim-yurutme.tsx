import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  ArrowLeft, CheckCircle2, Camera, FileText, Star,
  Save, Send, AlertCircle, Loader2, XCircle, 
  Award, TrendingUp, TrendingDown, Target, ClipboardList,
  AlertTriangle, Eye, Download, ChevronLeft, ChevronRight, List
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from "jspdf";
import { createPDFWithHeader, addSection, addKeyValue, addTable, savePDF, checkPageBreak } from "@/lib/pdfHelper";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

type AuditTemplateItem = {
  id: number;
  itemText: string;
  itemType: string | null;
  weight: number | null;
  requiresPhoto: boolean | null;
  aiCheckEnabled: boolean | null;
  aiPrompt: string | null;
  sortOrder: number;
  options: string[] | null; // For multiple choice questions
  correctAnswer: string | null; // Correct answer for test questions
};

type AuditInstanceItem = {
  id: number;
  instanceId: number;
  templateItemId: number;
  response: string | null;
  score: number | null;
  notes: string | null;
  photoUrl: string | null;
  aiAnalysisStatus: string | null;
  templateItem: AuditTemplateItem;
};

type AuditInstance = {
  id: number;
  templateId: number;
  auditType: string;
  branchId: number | null;
  userId: string | null;
  auditorId: string;
  auditDate: string;
  status: string;
  totalScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  grade: string | null;
  notes: string | null;
  completedAt: string | null;
  template: {
    id: number;
    title: string;
    description: string | null;
    category: string;
  };
  items: AuditInstanceItem[];
  branch?: { id: number; name: string };
  auditor?: { id: string; firstName: string; lastName: string };
};

type CorrectiveAction = {
  id: number;
  auditInstanceId: number;
  branchId: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "pending_review" | "closed" | "escalated";
  dueDate: string | null;
  createdAt: string;
};

export default function DenetimYurutmePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const auditId = parseInt(id || "0");
  const [overallNotes, setOverallNotes] = useState("");
  const [overallActionItems, setOverallActionItems] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [wizardStep, setWizardStep] = useState(0);
  const [viewMode, setViewMode] = useState<"wizard" | "list">("wizard");

  // Fetch audit instance
  const { data: audit, isLoading, isError, refetch } = useQuery<AuditInstance>({
    queryKey: ['/api/audit-instances', auditId],
    queryFn: () => fetch(`/api/audit-instances/${auditId}`, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Denetim yüklenemedi');
      return res.json();
    }),
    enabled: !!auditId,
  });

  // Fetch related CAPA actions for completed audits
  const { data: capaActions } = useQuery<CorrectiveAction[]>({
    queryKey: ['/api/corrective-actions', { auditInstanceId: auditId }],
    queryFn: () => fetch(`/api/corrective-actions?auditInstanceId=${auditId}`, { credentials: 'include' }).then(res => {
      if (!res.ok) return [];
      return res.json();
    }),
    enabled: !!auditId,
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ templateItemId, updates }: { templateItemId: number; updates: any }) => {
      return await apiRequest('PATCH', `/api/audit-instances/${auditId}/items/${templateItemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-instances', auditId] });
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Madde güncellenemedi",
        variant: "destructive"
      });
    },
  });

  // Complete audit mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/audit-instances/${auditId}/complete`, {
        notes: overallNotes || null,
        actionItems: overallActionItems || null,
        followUpRequired: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Denetim tamamlandı", description: "Denetim başarıyla kaydedildi." });
      setLocation('/denetimler');
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Denetim tamamlanamadı",
        variant: "destructive"
      });
    },
  });

  const handleResponseChange = (templateItemId: number, response: string, itemType: string, weight?: number | null, correctAnswer?: string | null) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;

    // Calculate base score (0-100) based on response and item type
    let baseScore: number = 0;
    if (itemType === 'checkbox') {
      baseScore = response === 'yes' ? 100 : 0;
    } else if (itemType === 'rating') {
      const rating = parseInt(response);
      baseScore = (rating / 5) * 100;
    } else if (itemType === 'multiple_choice') {
      // For multiple choice: 100 if correct, 0 if incorrect
      baseScore = response === correctAnswer ? 100 : 0;
    } else {
      // For text/photo responses, default to neutral score
      baseScore = 50;
    }

    // Store percentage score (0-100)
    // Weighted aggregation is handled by backend completeAuditInstance using leftJoin on template weights
    // Weight parameter is available for future client-side preview features
    const score = baseScore;

    updateItemMutation.mutate({
      templateItemId,
      updates: { response, score },
    });
  };

  const handleNotesChange = (templateItemId: number, notes: string) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;
    
    updateItemMutation.mutate({
      templateItemId,
      updates: { notes },
    });
  };

  const handlePhotoUpload = (templateItemId: number, uploadURL: string) => {
    // Guard: Block mutations on completed audits
    if (isCompleted) return;
    
    updateItemMutation.mutate({
      templateItemId,
      updates: { photoUrl: uploadURL },
    });
  };

  // PDF Export function for audit reports
  const generateAuditReportPDF = () => {
    if (!audit) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Kalite Denetim Raporu", pageWidth / 2, 28, { align: "center" });
    
    // Divider
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pageWidth - 14, 35);
    
    let yPos = 45;
    
    // Audit Info
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Denetim #${audit.id}`, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxValueWidth = pageWidth - 75; // Space for value text
    
    const checkPageBreak = (neededHeight: number) => {
      if (yPos + neededHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
    };
    
    const addField = (label: string, value: string) => {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 14, yPos);
      doc.setFont("helvetica", "normal");
      // Truncate long values to fit
      const displayValue = value || "-";
      const truncated = displayValue.length > 50 ? displayValue.substring(0, 47) + "..." : displayValue;
      doc.text(truncated, 65, yPos);
      yPos += 8;
    };
    
    addField("Şablon", audit.template?.title || "-");
    addField("Şube", audit.branch?.name || "-");
    addField("Denetçi", audit.auditor ? `${audit.auditor.firstName} ${audit.auditor.lastName}` : "-");
    addField("Tarih", audit.auditDate ? format(new Date(audit.auditDate), "dd MMM yyyy HH:mm", { locale: tr }) : "-");
    addField("Durum", audit.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor');
    
    yPos += 5;
    
    // Score section
    if (audit.percentageScore !== null) {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Sonuç", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      addField("Puan", `${audit.percentageScore}%`);
      addField("Not", audit.grade || "-");
      addField("Toplam Puan", `${audit.totalScore || 0} / ${audit.maxScore || 0}`);
    }
    
    // Items section
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Denetim Maddeleri", 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    audit.items.forEach((item, index) => {
      // Calculate required height for this item
      const itemText = `${index + 1}. ${item.templateItem?.itemText || 'Bilinmiyor'}`;
      const splitText = doc.splitTextToSize(itemText, pageWidth - 28);
      let itemHeight = splitText.length * 5 + 10; // base height
      if (item.score !== null) itemHeight += 5;
      if (item.notes) {
        const notesLines = doc.splitTextToSize(`   Not: ${item.notes}`, pageWidth - 28);
        itemHeight += notesLines.length * 5;
      }
      
      // Check BEFORE writing if we need a new page
      checkPageBreak(itemHeight);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(splitText, 14, yPos);
      yPos += splitText.length * 5;
      
      doc.setFont("helvetica", "normal");
      const responseText = item.response === 'yes' ? 'Evet' : item.response === 'no' ? 'Hayır' : (item.response || '-');
      doc.text(`   Cevap: ${responseText}`, 14, yPos);
      yPos += 5;
      
      if (item.score !== null) {
        doc.text(`   Puan: ${item.score}%`, 14, yPos);
        yPos += 5;
      }
      
      if (item.notes) {
        const notesText = doc.splitTextToSize(`   Not: ${item.notes}`, pageWidth - 28);
        doc.text(notesText, 14, yPos);
        yPos += notesText.length * 5;
      }
      
      yPos += 3;
    });
    
    // Notes section
    if (audit.notes) {
      const notesText = doc.splitTextToSize(audit.notes, pageWidth - 28);
      const notesHeight = 25 + notesText.length * 5;
      checkPageBreak(notesHeight);
      
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Genel Notlar", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(notesText, 14, yPos);
    }
    
    // Footer (already declared above)
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`DOSPRESSO Franchise Management System - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    // Save file
    const fileName = `DOSPRESSO_Denetim_${audit.id}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
    
    toast({ title: "PDF İndirildi", description: fileName });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Yükleniyor...</div>;
  }

  if (!audit) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="flex flex-col items-center justify-center h-full grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <p className="text-lg text-muted-foreground">Denetim bulunamadı</p>
        <Link href="/denetimler">
          <Button>Denetimlere Dön</Button>
        </Link>
      </div>
    );
  }

  // Check if audit is completed (read-only mode)
  const isCompleted = audit.status === 'completed';

  // Calculate progress
  const answeredItems = audit.items.filter(item => item.response !== null).length;
  const totalItems = audit.items.length;
  const progress = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;

  // Calculate current weighted average score (matches backend completeAuditInstance logic)
  const scoresWithValues = audit.items.filter(item => item.score !== null);
  let currentScore = 0;
  
  if (scoresWithValues.length > 0) {
    const weightedSum = scoresWithValues.reduce((sum, item) => {
      const weight = item.templateItem.weight ?? 1; // Default weight to 1 if null
      return sum + (item.score || 0) * weight;
    }, 0);
    
    const totalWeight = scoresWithValues.reduce((sum, item) => {
      return sum + (item.templateItem.weight ?? 1);
    }, 0);
    
    currentScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  // Helper functions for summary view
  const getGradeInfo = (grade: string | null, score: number) => {
    const gradeMap: Record<string, { color: string; bgColor: string; label: string }> = {
      'A': { color: 'text-green-600', bgColor: 'bg-green-500', label: 'Mükemmel' },
      'B': { color: 'text-blue-600', bgColor: 'bg-blue-500', label: 'İyi' },
      'C': { color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: 'Orta' },
      'D': { color: 'text-orange-600', bgColor: 'bg-orange-500', label: 'Zayıf' },
      'F': { color: 'text-red-600', bgColor: 'bg-red-500', label: 'Başarısız' },
    };
    const calculated = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    return gradeMap[grade || calculated] || gradeMap['F'];
  };

  const finalScore = isCompleted ? (audit.percentageScore ?? currentScore) : currentScore;
  const gradeInfo = getGradeInfo(audit.grade, finalScore);
  
  // Categorize items for summary
  const passedItems = audit.items.filter(item => (item.score ?? 0) >= 70);
  const failedItems = audit.items.filter(item => item.score !== null && item.score < 70);
  const strengths = passedItems.filter(item => (item.score ?? 0) >= 90).slice(0, 3);
  const weaknesses = failedItems.slice(0, 5);

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-foreground',
      'low': 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      'critical': 'Kritik',
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük',
    };
    return <Badge className={colors[priority]}>{labels[priority]}</Badge>;
  };

  const getCapaStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; label: string }> = {
      'open': { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Açık' },
      'in_progress': { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', label: 'İşlemde' },
      'pending_review': { className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'İncelemede' },
      'closed': { className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Kapatıldı' },
      'escalated': { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Eskalasyon' },
    };
    const style = styles[status] || styles['open'];
    return <Badge className={style.className}>{style.label}</Badge>;
  };

  // Render Summary View for completed audits
  const renderSummaryView = () => (
    <div className="space-y-4">
      {/* Score Card */}
      <Card data-testid="card-score-summary">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Grade Circle */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${gradeInfo.bgColor} flex items-center justify-center shrink-0`}>
              <span className="text-3xl sm:text-4xl font-bold text-white">{finalScore === 0 && totalItems === 0 ? '—' : (audit.grade || (finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : finalScore >= 60 ? 'D' : 'F'))}</span>
            </div>
            <div className="flex-1">
              <p className="text-3xl sm:text-4xl font-bold">{finalScore}%</p>
              <p className={`text-lg font-medium ${gradeInfo.color}`}>{gradeInfo.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalItems === 0 ? 'Denetim henüz tamamlanmadı' : `${passedItems.length}/${totalItems} madde başarılı`}
              </p>
              {audit.completedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tamamlanma: {format(new Date(audit.completedAt), "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch & Auditor Info */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Şube</p>
            <p className="font-medium">{audit.branch?.name || `Şube #${audit.branchId}`}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Denetçi</p>
            <p className="font-medium">{audit.auditor ? `${audit.auditor.firstName} ${audit.auditor.lastName}` : audit.auditorId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Denetim Tarihi</p>
            <p className="font-medium">{format(new Date(audit.auditDate), "d MMM yyyy", { locale: tr })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kategori</p>
            <p className="font-medium">{audit.template.category || 'Genel'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Güçlü Yönler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengths.length > 0 ? strengths.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                <span className="text-sm line-clamp-1 flex-1">{item.templateItem.itemText}</span>
                <Badge className="bg-green-500 text-white shrink-0 ml-2">{item.score}%</Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Öne çıkan yüksek puanlı madde yok</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              İyileştirme Gereken
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weaknesses.length > 0 ? weaknesses.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/30">
                <span className="text-sm line-clamp-1 flex-1">{item.templateItem.itemText}</span>
                <Badge variant="destructive" className="shrink-0 ml-2">{item.score}%</Badge>
              </div>
            )) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{totalItems === 0 ? 'Henüz değerlendirme yapılmadı' : 'Tüm maddeler başarılı!'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CAPA Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Düzeltici Aksiyonlar (CAPA)
          </CardTitle>
          <CardDescription>Bu denetimden oluşturulan aksiyon öğeleri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {capaActions && capaActions.length > 0 ? capaActions.map((capa) => (
            <div key={capa.id} className="flex items-center justify-between p-3 rounded-md border hover-elevate">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{capa.title}</p>
                {capa.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Son tarih: {format(new Date(capa.dueDate), "d MMM yyyy", { locale: tr })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getPriorityBadge(capa.priority)}
                {getCapaStatusBadge(capa.status)}
              </div>
            </div>
          )) : (
            <div className="text-center py-4 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz düzeltici aksiyon oluşturulmadı</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes if any */}
      {audit.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Denetim Notları</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{audit.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Section labels for grouping items
  const sectionLabels: Record<string, string> = {
    gida_guvenligi: 'Gıda Güvenliği',
    urun_standardi: 'Ürün Standardı',
    servis: 'Servis Kalitesi',
    operasyon: 'Operasyon',
    marka: 'Marka Standartları',
    ekipman: 'Ekipman',
    general: 'Genel'
  };

  // Group items by section for wizard view (only if audit is loaded)
  const groupedItems = (audit?.items || []).reduce((acc, item) => {
    const section = (item.templateItem as any).section || 'general';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof audit.items>);

  const sections = Object.keys(groupedItems);
  const currentSection = sections[wizardStep] || sections[0];
  const currentSectionItems = groupedItems[currentSection] || [];
  const totalSections = sections.length;

  // Calculate section completion status
  const getSectionProgress = (sectionKey: string) => {
    const items = groupedItems[sectionKey] || [];
    const answered = items.filter(item => item.response !== null && item.response !== '').length;
    return { answered, total: items.length, complete: answered === items.length };
  };

  // Wizard mode: render single section at a time with step navigation
  const renderWizardView = () => {
    const sectionProgress = getSectionProgress(currentSection);
    
    return (
      <div className="w-full space-y-4">
        {/* Section Navigation Steps */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {sections.map((section, idx) => {
            const progress = getSectionProgress(section);
            const isActive = idx === wizardStep;
            const isComplete = progress.complete;
            return (
              <Button
                key={section}
                variant={isActive ? "default" : isComplete ? "secondary" : "outline"}
                size="sm"
                onClick={() => setWizardStep(idx)}
                className={`shrink-0 ${isActive ? "" : ""}`}
                data-testid={`wizard-step-${idx}`}
              >
                {isComplete && <CheckCircle2 className="h-3 w-3 mr-1" />}
                <span className="text-xs">{idx + 1}. {sectionLabels[section] || section}</span>
              </Button>
            );
          })}
        </div>

        {/* Current Section Header */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{sectionLabels[currentSection] || currentSection}</h3>
                <p className="text-sm text-muted-foreground">
                  {sectionProgress.answered}/{sectionProgress.total} madde tamamlandı
                </p>
              </div>
              <Badge variant={sectionProgress.complete ? "default" : "secondary"}>
                {Math.round((sectionProgress.answered / sectionProgress.total) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section Items */}
        {currentSectionItems.map((item, index) => {
          const globalIndex = audit.items.indexOf(item);
          const itemType = item.templateItem.itemType || 'checkbox';
          const requiresPhoto = item.templateItem.requiresPhoto || false;

          return (
            <Card key={item.id} data-testid={`card-wizard-item-${globalIndex}`}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-muted-foreground">#{globalIndex + 1}</span>
                  {item.templateItem.itemText}
                  {requiresPhoto && (
                    <Badge variant="outline" className="ml-auto">
                      <Camera className="h-3 w-3 mr-1" />
                      Fotoğraf
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full space-y-3 pt-0">
                {itemType === 'checkbox' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`wiz-yes-${item.id}`} disabled={isCompleted} />
                      <Label htmlFor={`wiz-yes-${item.id}`}>Evet / Uygun</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`wiz-no-${item.id}`} disabled={isCompleted} />
                      <Label htmlFor={`wiz-no-${item.id}`}>Hayır / Uygun Değil</Label>
                    </div>
                  </RadioGroup>
                )}

                {itemType === 'rating' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                    className="flex gap-2 justify-between"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex flex-col items-center">
                        <RadioGroupItem value={String(rating)} id={`wiz-rating-${item.id}-${rating}`} disabled={isCompleted} className="h-8 w-8" />
                        <Label htmlFor={`wiz-rating-${item.id}-${rating}`} className="text-xs mt-1">{rating}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {itemType === 'text' && (
                  <Textarea
                    value={item.response || ''}
                    onChange={(e) => handleResponseChange(item.templateItemId, e.target.value, itemType, item.templateItem.weight)}
                    disabled={isCompleted}
                    placeholder="Cevabınızı girin..."
                  />
                )}

                {itemType === 'multiple_choice' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight, item.templateItem.correctAnswer)}
                  >
                    {(item.templateItem.options || []).map((option: string, optionIndex: number) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`wiz-opt-${item.id}-${optionIndex}`} disabled={isCompleted} />
                        <Label htmlFor={`wiz-opt-${item.id}-${optionIndex}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Notes */}
                <div>
                  <Label>Notlar (Opsiyonel)</Label>
                  <Textarea
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.templateItemId, e.target.value)}
                    disabled={isCompleted}
                    placeholder="Ekstra not..."
                    className="h-16"
                  />
                </div>

                {/* Score Display */}
                {item.score !== null && (
                  <Badge variant={item.score >= 70 ? 'default' : 'destructive'}>
                    Skor: {item.score}/100
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-background p-3 rounded-lg border">
          <Button
            variant="outline"
            onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
            disabled={wizardStep === 0}
            data-testid="button-prev-section"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Önceki
          </Button>
          <span className="text-sm text-muted-foreground">
            {wizardStep + 1} / {totalSections}
          </span>
          {wizardStep < totalSections - 1 ? (
            <Button
              onClick={() => setWizardStep(Math.min(totalSections - 1, wizardStep + 1))}
              data-testid="button-next-section"
            >
              Sonraki
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || answeredItems < totalItems}
              data-testid="button-complete-wizard"
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Tamamla
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render audit items form (for in-progress or detail view)
  const renderAuditItemsForm = () => (
    <div className="w-full space-y-2 sm:space-y-3">
      <h2 className="text-xl font-semibold">Denetim Maddeleri</h2>
        
        {audit.items.map((item, index) => {
          const itemType = item.templateItem.itemType || 'checkbox';
          const requiresPhoto = item.templateItem.requiresPhoto || false;

          return (
            <Card key={item.id} data-testid={`card-audit-item-${index}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  {item.templateItem.itemText}
                  {requiresPhoto && (
                    <Badge variant="outline" className="ml-auto">
                      <Camera className="h-3 w-3 mr-1" />
                      Fotoğraf Gerekli
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full space-y-2 sm:space-y-3">
                {/* Response Input */}
                {itemType === 'checkbox' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                    data-testid={`radio-group-${index}`}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`yes-${item.id}`} disabled={isCompleted} data-testid={`radio-yes-${index}`} />
                      <Label htmlFor={`yes-${item.id}`}>Evet / Uygun</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`no-${item.id}`} disabled={isCompleted} data-testid={`radio-no-${index}`} />
                      <Label htmlFor={`no-${item.id}`}>Hayır / Uygun Değil</Label>
                    </div>
                  </RadioGroup>
                )}

                {itemType === 'rating' && (
                  <RadioGroup
                    value={item.response || ''}
                    onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight)}
                    className="flex gap-1 sm:gap-2 justify-between"
                    data-testid={`rating-group-${index}`}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex flex-col items-center">
                        <RadioGroupItem 
                          value={String(rating)} 
                          id={`rating-${item.id}-${rating}`} 
                          disabled={isCompleted} 
                          data-testid={`rating-${index}-${rating}`}
                          className="h-8 w-8 sm:h-6 sm:w-6"
                        />
                        <Label htmlFor={`rating-${item.id}-${rating}`} className="text-xs mt-1">{rating}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {itemType === 'text' && (
                  <Textarea
                    value={item.response || ''}
                    onChange={(e) => handleResponseChange(item.templateItemId, e.target.value, itemType, item.templateItem.weight)}
                    disabled={isCompleted}
                    placeholder="Cevabınızı girin..."
                    data-testid={`textarea-response-${index}`}
                  />
                )}

                {itemType === 'multiple_choice' && (
                  <>
                    <RadioGroup
                      value={item.response || ''}
                      onValueChange={(value) => handleResponseChange(item.templateItemId, value, itemType, item.templateItem.weight, item.templateItem.correctAnswer)}
                      data-testid={`radio-group-mc-${index}`}
                    >
                      {(item.templateItem.options || []).map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option} 
                            id={`option-${item.id}-${optionIndex}`} 
                            disabled={isCompleted}
                            data-testid={`radio-option-${index}-${optionIndex}`} 
                          />
                          <Label htmlFor={`option-${item.id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {/* Feedback for completed audits */}
                    {isCompleted && item.response && item.templateItem.correctAnswer && (
                      <div className={`flex items-center gap-2 p-3 rounded-md ${
                        item.response === item.templateItem.correctAnswer 
                          ? 'bg-success/10 dark:bg-success/5/20' 
                          : 'bg-destructive/10 dark:bg-destructive/10'
                      }`} data-testid={`feedback-mc-${index}`}>
                        {item.response === item.templateItem.correctAnswer ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success dark:text-green-500" />
                            <span className="text-sm font-medium text-success dark:text-success">
                              Doğru cevap!
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-destructive dark:text-red-500" />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-destructive dark:text-destructive block">
                                Yanlış cevap
                              </span>
                              <span className="text-sm text-destructive dark:text-destructive">
                                Doğru cevap: <strong>{item.templateItem.correctAnswer}</strong>
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Photo Upload */}
                {requiresPhoto && !isCompleted && (
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Label>Fotoğraf {requiresPhoto && '*'}</Label>
                    <ObjectUploader
                      onGetUploadParameters={async () => {
                        const res = await fetch('/api/objects/upload', { 
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            fileName: `audit-${auditId}-item-${item.templateItemId}-${Date.now()}.jpg`,
                            contentType: 'image/jpeg',
                            path: '.private/audits'
                          })
                        });
                        const data = await res.json();
                        return { method: "PUT" as const, url: data.url };
                      }}
                      onComplete={(result) => {
                        const uploadURL = result.successful?.[0]?.uploadURL;
                        if (uploadURL) {
                          handlePhotoUpload(item.templateItemId, uploadURL);
                        }
                      }}
                      buttonClassName="w-full"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {item.photoUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
                    </ObjectUploader>
                  </div>
                )}
                {requiresPhoto && item.photoUrl && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Fotoğraf yüklendi
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label>Notlar (Opsiyonel)</Label>
                  <Textarea
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.templateItemId, e.target.value)}
                    disabled={isCompleted}
                    placeholder="Ekstra not veya açıklama..."
                    className="h-20"
                    data-testid={`textarea-notes-${index}`}
                  />
                </div>

                {/* Score Display */}
                {item.score !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={item.score >= 70 ? 'default' : item.score >= 40 ? 'secondary' : 'destructive'}>
                      Skor: {item.score}/100
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      
      {/* Overall Notes and Actions - only for in-progress */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>Genel Değerlendirme</CardTitle>
            <CardDescription>Denetim sonucu genel notlar ve aksiyon öğeleri</CardDescription>
          </CardHeader>
          <CardContent className="w-full space-y-2 sm:space-y-3">
            <div>
              <Label htmlFor="overall-notes">Genel Notlar</Label>
              <Textarea
                id="overall-notes"
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                placeholder="Denetim hakkında genel gözlemler..."
                className="h-24"
                data-testid="textarea-overall-notes"
              />
            </div>
            <div>
              <Label htmlFor="action-items">Aksiyon Öğeleri</Label>
              <Textarea
                id="action-items"
                value={overallActionItems}
                onChange={(e) => setOverallActionItems(e.target.value)}
                placeholder="Yapılması gerekenler (satır satır)..."
                className="h-24"
                data-testid="textarea-action-items"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - only for in-progress */}
      {!isCompleted && (
        <div className="flex gap-2 sm:gap-3 justify-end sticky bottom-4 bg-background p-3 rounded-lg border">
          <Link href="/denetimler">
            <Button variant="outline" data-testid="button-cancel">
              İptal
            </Button>
          </Link>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || answeredItems < totalItems}
            data-testid="button-complete"
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Denetimi Tamamla
              </>
            )}
          </Button>
        </div>
      )}

      {/* Warning if incomplete */}
      {answeredItems < totalItems && !isCompleted && (
        <Card className="border-orange-500">
          <CardContent className="flex items-center gap-2 py-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm">
              Denetimi tamamlamak için tüm maddeleri cevaplamanız gerekiyor.
              ({totalItems - answeredItems} madde kaldı)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Main return - use tabs for completed audits, direct form for in-progress
  return (
    <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/denetimler">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{audit.template.title}</h1>
          <p className="text-sm text-muted-foreground line-clamp-1">{audit.template.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateAuditReportPDF}
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-1.5" />
              PDF
            </Button>
          )}
          <Badge 
            variant={isCompleted ? 'default' : 'secondary'}
            data-testid="badge-status"
          >
            {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
          </Badge>
        </div>
      </div>

      {/* For completed audits: show tabbed view */}
      {isCompleted ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" data-testid="tab-summary">
              <Award className="w-4 h-4 mr-2" />
              Özet
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">
              <Eye className="w-4 h-4 mr-2" />
              Detaylar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4">
            {renderSummaryView()}
          </TabsContent>
          <TabsContent value="details" className="mt-4">
            {viewMode === "wizard" ? renderWizardView() : renderAuditItemsForm()}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Progress Card - Sticky on mobile */}
          <Card className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">İlerleme</p>
                    <p className="text-lg font-bold">{answeredItems}/{totalItems}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Skor</p>
                  <p className="text-lg font-bold text-primary">{currentScore}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 gap-3">
                <Progress value={progress} className="h-2 flex-1" data-testid="progress-audit" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "wizard" ? "list" : "wizard")}
                  data-testid="button-toggle-view"
                >
                  {viewMode === "wizard" ? (
                    <><List className="h-4 w-4 mr-1" />Liste</>
                  ) : (
                    <><Target className="h-4 w-4 mr-1" />Adım</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          {viewMode === "wizard" ? renderWizardView() : renderAuditItemsForm()}
        </>
      )}
    </div>
  );
}
