import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentFault, FaultComment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, AlertTriangle, Clock, CheckCircle2, DollarSign, User, Download, Send,
  Copy, MessageSquare, History, Wrench, Building2, Phone, Mail, Shield, Settings,
  ChevronRight, Loader2, Image as ImageIcon
} from "lucide-react";
import jsPDF from "jspdf";
import { format, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  bekliyor: "Beklemede",
  isleme_alindi: "İşleme Alındı",
  devam_ediyor: "Devam Ediyor",
  servis_cagrildi: "Servis Çağrıldı",
  kargoya_verildi: "Kargoya Verildi",
  kapatildi: "Kapatıldı",
};

const PRIORITY_LABELS: Record<string, string> = {
  kritik: "Kritik",
  yuksek: "Yüksek",
  normal: "Normal",
  orta: "Orta",
  dusuk: "Düşük",
};

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  actualCost: z.string().optional(),
  notes: z.string().optional(),
});

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-secondary text-foreground",
  isleme_alindi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  devam_ediyor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  servis_cagrildi: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  kargoya_verildi: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  kapatildi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  kritik: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  yuksek: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  orta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  dusuk: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const STAGE_ORDER = ["bekliyor", "isleme_alindi", "devam_ediyor", "servis_cagrildi", "kargoya_verildi", "kapatildi"];

interface FaultDetailData {
  fault: EquipmentFault & {
    reporterName: string;
    reporterRole: string;
    assigneeName: string | null;
    assigneeRole: string | null;
    branchName?: string;
  };
  equipment: any;
  history: any[];
  comments: (FaultComment & { userName: string; userRole: string })[];
}

function StageProgressBar({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGE_ORDER.map((stage, idx) => {
        const isActive = idx <= currentIdx;
        const isCurrent = stage === currentStage;
        return (
          <div key={stage} className="flex items-center gap-1 min-w-0">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
              isCurrent ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {idx + 1}. {STAGE_LABELS[stage]}
            </div>
            {idx < STAGE_ORDER.length - 1 && (
              <ChevronRight className={`h-3 w-3 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ServiceResponsibilityBadge({ equipment }: { equipment: any }) {
  if (!equipment) return null;
  const isHQ = equipment.maintenanceResponsible === "hq" || equipment.faultProtocol === "hq_teknik";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
      isHQ ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"
    }`}>
      <Shield className={`h-4 w-4 ${isHQ ? "text-primary" : "text-amber-600"}`} />
      <div>
        <p className="text-xs font-medium">{isHQ ? "Merkez Takip" : "Şube Takip"}</p>
        <p className="text-xs text-muted-foreground">
          {isHQ ? "HQ Teknik ekibi sorumlu" : "Şube yöneticisi sorumlu"}
        </p>
      </div>
    </div>
  );
}

export default function FaultDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: detailData, isLoading } = useQuery<FaultDetailData>({
    queryKey: ["/api/faults", id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/faults/${id}/detail`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const fault = detailData?.fault;
  const equipmentInfo = detailData?.equipment;
  const history = detailData?.history || [];
  const comments = detailData?.comments || [];

  const form = useForm<z.infer<typeof updateFaultSchema>>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: {
      currentStage: fault?.currentStage || "bekliyor",
      assignedTo: fault?.assignedTo || undefined,
      actualCost: fault?.actualCost ? String(fault.actualCost) : undefined,
      notes: undefined,
    },
  });

  useEffect(() => {
    if (fault) {
      form.reset({
        currentStage: fault.currentStage,
        assignedTo: fault.assignedTo || undefined,
        actualCost: fault.actualCost ? String(fault.actualCost) : undefined,
        notes: undefined,
      });
    }
  }, [fault, form]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFaultSchema>) => {
      await apiRequest("PATCH", `/api/faults/${id}`, {
        currentStage: data.currentStage,
        assignedTo: data.assignedTo || null,
        actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      toast({ title: "Başarılı", description: "Arıza güncellendi" });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/faults/${id}/comments`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults", id, "detail"] });
      setCommentText("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Mesaj gönderilemedi", variant: "destructive" });
    },
  });

  const serviceEmailMutation = useMutation({
    mutationFn: async () => {
      if (!fault || !equipmentInfo?.serviceContactEmail) {
        throw new Error("Servis e-posta adresi bulunamadı");
      }
      return apiRequest("POST", "/api/service-request/send", {
        faultId: fault.id,
        equipmentId: fault.equipmentId,
        serviceEmail: equipmentInfo.serviceContactEmail,
        subject: `DOSPRESSO Servis Talebi - ${fault.equipmentName} - Arıza #${fault.id}`,
        body: `<div><h2>Arıza #${fault.id}</h2><p>${fault.description}</p></div>`,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Servis talebi e-posta ile iletildi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Servis talebi gönderilemedi", variant: "destructive" });
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  const generatePDF = () => {
    if (!fault) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO", pw / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Arıza Raporu", pw / 2, 28, { align: "center" });
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pw - 14, 35);
    let y = 45;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Arıza #${fault.id}`, 14, y); y += 10;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const addField = (l: string, v: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${l}:`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(v || "-", 60, y);
      y += 8;
    };
    addField("Ekipman", fault.equipmentName || "-");
    addField("Durum", STAGE_LABELS[fault.currentStage] || fault.currentStage);
    addField("Oncelik", fault.priority ? (PRIORITY_LABELS[fault.priority] || fault.priority) : "Normal");
    addField("Rapor Tarihi", fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-");
    addField("Atanan Kisi", fault.assigneeName || "Atanmadi");
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pw - 14, y); y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Aciklama:", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    const desc = fault.description || "Aciklama girilmedi";
    const splitDesc = doc.splitTextToSize(desc, pw - 28);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 6 + 10;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`DOSPRESSO - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    doc.save(`DOSPRESSO_Ariza_${fault.id}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast({ title: "PDF indirildi" });
  };

  const copyReport = () => {
    if (!fault) return;
    const text = `DOSPRESSO ARIZA RAPORU\nArıza #${fault.id}\nEkipman: ${fault.equipmentName}\nDurum: ${STAGE_LABELS[fault.currentStage]}\nÖncelik: ${PRIORITY_LABELS[fault.priority || "normal"]}\nAçıklama: ${fault.description}\nTarih: ${fault.createdAt ? format(new Date(fault.createdAt), "dd.MM.yyyy HH:mm") : "-"}`;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Kopyalandı" });
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!fault) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 space-y-4">
        <Button variant="outline" onClick={() => setLocation("/ariza")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Arıza bulunamadı</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hoursOpen = fault.createdAt ? differenceInHours(new Date(), new Date(fault.createdAt)) : 0;
  const isClosed = fault.currentStage === "kapatildi";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/ariza")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-semibold truncate" data-testid="text-fault-title">
              Arıza #{fault.id}
            </h1>
            <Badge className={PRIORITY_COLORS[fault.priority || "normal"]}>
              {PRIORITY_LABELS[fault.priority || "normal"]}
            </Badge>
            <Badge className={STAGE_COLORS[fault.currentStage]}>
              {STAGE_LABELS[fault.currentStage]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{fault.equipmentName}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={copyReport} data-testid="button-copy-report">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={generatePDF} data-testid="button-export-pdf">
            <Download className="w-4 h-4" />
          </Button>
          {!isClosed && (
            <Button size="sm" onClick={() => setIsEditDialogOpen(true)} data-testid="button-update-fault">
              Güncelle
            </Button>
          )}
        </div>
      </div>

      <StageProgressBar currentStage={fault.currentStage} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-md border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Süre</span>
          </div>
          <p className="text-sm font-medium" data-testid="text-hours-open">
            {isClosed ? "Kapatıldı" : hoursOpen < 1 ? "< 1 saat" : hoursOpen < 24 ? `${hoursOpen} saat` : `${Math.floor(hoursOpen / 24)} gün`}
          </p>
        </div>

        <div className="p-3 rounded-md border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Atanan</span>
          </div>
          <p className="text-sm font-medium truncate" data-testid="text-assignee">
            {fault.assigneeName || "Atanmadı"}
          </p>
        </div>

        <div className="p-3 rounded-md border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Maliyet</span>
          </div>
          <p className="text-sm font-medium" data-testid="text-cost">
            {fault.actualCost ? `₺${Number(fault.actualCost).toFixed(2)}` : fault.estimatedCost ? `~₺${Number(fault.estimatedCost).toFixed(2)}` : "-"}
          </p>
        </div>

        <div className="p-3 rounded-md border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Şube</span>
          </div>
          <p className="text-sm font-medium truncate" data-testid="text-branch">
            {(fault as any).branchName || `Şube #${fault.branchId}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details" data-testid="tab-details">
            <Settings className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Detaylar
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Mesajlar
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{comments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Geçmiş
          </TabsTrigger>
          <TabsTrigger value="equipment" data-testid="tab-equipment">
            <Wrench className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
            Cihaz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Arıza Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Açıklama</p>
                <p className="text-sm" data-testid="text-description">{fault.description || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Bildiren</p>
                  <p className="text-sm font-medium">{fault.reporterName}</p>
                  <p className="text-xs text-muted-foreground">{fault.reporterRole}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarih</p>
                  <p className="text-sm font-medium">
                    {fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                  </p>
                </div>
              </div>
              {fault.photoUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fotoğraf</p>
                  <a href={fault.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ImageIcon className="w-4 h-4" />
                    Fotoğrafı Görüntüle
                  </a>
                </div>
              )}
              {fault.aiAnalysis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">AI Analizi</p>
                  <p className="text-sm bg-muted p-2 rounded-md">{fault.aiAnalysis}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tahmini Maliyet</p>
                  <p className="text-sm font-medium">
                    {fault.estimatedCost ? `₺${Number(fault.estimatedCost).toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gerçek Maliyet</p>
                  <p className="text-sm font-medium">
                    {fault.actualCost ? `₺${Number(fault.actualCost).toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ServiceResponsibilityBadge equipment={equipmentInfo} />

          {equipmentInfo?.serviceContactEmail && !isClosed && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Harici Servis</p>
                      <p className="text-xs text-muted-foreground truncate">{equipmentInfo.serviceContactEmail}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => serviceEmailMutation.mutate()}
                    disabled={serviceEmailMutation.isPending}
                    data-testid="button-send-service"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {serviceEmailMutation.isPending ? "..." : "Servise İlet"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mesajlar ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto mb-3 p-1">
                {comments.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Henüz mesaj yok. İlk mesajı gönderin.
                  </p>
                ) : (
                  comments.map((c) => {
                    const isOwn = c.userId === user?.id;
                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col gap-0.5 max-w-[85%] ${isOwn ? "ml-auto items-end" : "items-start"}`}
                        data-testid={`comment-${c.id}`}
                      >
                        <div className={`px-3 py-2 rounded-lg text-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}>
                          {c.message}
                        </div>
                        <div className="flex items-center gap-1 px-1">
                          <span className="text-xs text-muted-foreground">{c.userName}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {c.createdAt ? format(new Date(c.createdAt), "dd MMM HH:mm", { locale: tr }) : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {!isClosed && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Mesajınızı yazın..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[60px] resize-none flex-1"
                    data-testid="input-comment"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendComment}
                    disabled={commentMutation.isPending || !commentText.trim()}
                    data-testid="button-send-comment"
                  >
                    {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Durum Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Geçmiş kaydı yok</p>
              ) : (
                <div className="relative space-y-0">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                  {history.map((h: any, idx: number) => (
                    <div key={h.id || idx} className="relative pl-8 pb-4" data-testid={`history-item-${idx}`}>
                      <div className={`absolute left-1 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        idx === 0 ? "bg-primary border-primary" : "bg-background border-border"
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.fromStage && (
                            <>
                              <Badge variant="outline" className="text-xs">{STAGE_LABELS[h.fromStage] || h.fromStage}</Badge>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                          <Badge className={`text-xs ${STAGE_COLORS[h.toStage] || "bg-secondary"}`}>
                            {STAGE_LABELS[h.toStage] || h.toStage}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {h.changedAt ? format(new Date(h.changedAt), "dd MMM yyyy HH:mm", { locale: tr }) : ""}
                        </p>
                        {h.notes && <p className="text-xs mt-0.5">{h.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="mt-3">
          {equipmentInfo ? (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Cihaz Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Cihaz Adı</p>
                      <p className="text-sm font-medium">{equipmentInfo.name || equipmentInfo.equipmentType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Marka / Model</p>
                      <p className="text-sm font-medium">{equipmentInfo.brand || "-"} {equipmentInfo.modelNo || ""}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Seri No</p>
                      <p className="text-sm font-medium">{equipmentInfo.serialNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durum</p>
                      <Badge variant={equipmentInfo.status === "aktif" ? "default" : "secondary"}>
                        {equipmentInfo.status === "aktif" ? "Aktif" : equipmentInfo.status || "-"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ServiceResponsibilityBadge equipment={equipmentInfo} />

              {(equipmentInfo.serviceContactEmail || equipmentInfo.serviceContactPhone) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Servis İletişim</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {equipmentInfo.serviceProvider && (
                      <div>
                        <p className="text-xs text-muted-foreground">Servis Firması</p>
                        <p className="text-sm font-medium">{equipmentInfo.serviceProvider}</p>
                      </div>
                    )}
                    {equipmentInfo.serviceContactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{equipmentInfo.serviceContactEmail}</p>
                      </div>
                    )}
                    {equipmentInfo.serviceContactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{equipmentInfo.serviceContactPhone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-sm text-muted-foreground">
                  Bu arıza için cihaz bilgisi bağlantısı yok
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arıza Güncelle</DialogTitle>
            <DialogDescription>Arıza durumunu ve detaylarını güncelleyin</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-3">
              <FormField
                control={form.control}
                name="currentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stage">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atanan Kişi</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? null : val)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Atama Kaldır</SelectItem>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.name || `${u.firstName} ${u.lastName}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerçek Maliyet (₺)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-cost" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="..." {...field} data-testid="input-notes" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-update">
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
