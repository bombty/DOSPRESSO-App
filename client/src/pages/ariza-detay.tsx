import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentFault } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, DollarSign, User, FileDown, Copy, Download, Send } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
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
};

const updateFaultSchema = z.object({
  currentStage: z.string(),
  assignedTo: z.string().optional(),
  actualCost: z.string().optional(),
  notes: z.string().optional(),
});

const STAGE_COLORS: Record<string, string> = {
  bekliyor: "bg-secondary text-foreground dark:bg-gray-900",
  isleme_alindi: "bg-primary/10 text-primary dark:bg-primary/5",
  devam_ediyor: "bg-warning/20 text-warning dark:bg-warning/5",
  servis_cagrildi: "bg-warning/10 text-warning dark:bg-warning/5",
  kargoya_verildi: "bg-secondary/10 text-secondary dark:bg-secondary/5",
  kapatildi: "bg-success/10 text-success dark:bg-success/5",
};

const PRIORITY_COLORS: Record<string, string> = {
  kritik: "bg-destructive/10 text-destructive dark:bg-destructive/5",
  yuksek: "bg-warning/10 text-warning dark:bg-warning/5",
  normal: "bg-primary/10 text-primary dark:bg-primary/5",
};

export default function FaultDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showCards, setShowCards] = useState(true);
  
  const handleCardClick = () => {
    setIsEditDialogOpen(true);
    setShowCards(false);
  };

  const { data: fault, isLoading: faultLoading } = useQuery<EquipmentFault>({
    queryKey: ["/api/faults", id],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`/api/faults`);
      if (!response.ok) throw new Error("Failed to fetch faults");
      const data = await response.json();
      const faults = Array.isArray(data) ? data : (data.data || []);
      const found = faults.find((f: EquipmentFault) => f.id === parseInt(id || "0"));
      if (!found) throw new Error("Arıza bulunamadı");
      return found;
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: equipmentDetails } = useQuery<any>({
    queryKey: ["/api/equipment", fault?.equipmentId],
    enabled: !!fault?.equipmentId,
    queryFn: async () => {
      const response = await fetch(`/api/equipment`);
      if (!response.ok) return null;
      const data = await response.json();
      const equipmentList = Array.isArray(data) ? data : (data.data || []);
      return equipmentList.find((e: any) => e.id === fault?.equipmentId);
    },
  });

  const serviceEmailMutation = useMutation({
    mutationFn: async () => {
      if (!fault || !equipmentDetails?.serviceContactEmail) {
        throw new Error("Servis e-posta adresi bulunamadı");
      }
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #8B4513; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">DOSPRESSO</h1>
            <p style="margin: 5px 0 0 0;">Servis Talebi</p>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #8B4513; margin-top: 0;">Arıza Bilgileri</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Arıza ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">#${fault.id}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Ekipman:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${fault.equipmentName || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Model No:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${equipmentDetails?.modelNo || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Seri No:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${equipmentDetails?.serialNumber || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Şube:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(fault as any).branchName || '-'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Öncelik:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${fault.priority || 'Normal'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Durum:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${STAGE_LABELS[fault.currentStage] || fault.currentStage}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Bildirim Tarihi:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${fault.createdAt ? format(new Date(fault.createdAt), "dd.MM.yyyy HH:mm", { locale: tr }) : '-'}</td></tr>
            </table>
            
            <h3 style="color: #8B4513; margin-top: 20px;">Arıza Açıklaması</h3>
            <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${fault.description || 'Açıklama girilmemiş'}</p>
            
            ${(fault as any).notes ? `<h3 style="color: #8B4513;">Notlar</h3><p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${(fault as any).notes}</p>` : ''}
            
            <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
              <strong>İletişim:</strong> Bu arıza hakkında bilgi almak için lütfen DOSPRESSO Merkez Teknik Ekibi ile iletişime geçin.
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">Bu e-posta DOSPRESSO Franchise Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      `;
      
      return apiRequest("POST", "/api/service-request/send", {
        faultId: fault.id,
        equipmentId: fault.equipmentId,
        serviceEmail: equipmentDetails.serviceContactEmail,
        subject: `DOSPRESSO Servis Talebi - ${fault.equipmentName} - Arıza #${fault.id}`,
        body: emailBody,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Servis talebi e-posta ile iletildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Servis talebi gönderilemedi", 
        variant: "destructive" 
      });
    },
  });

  const form = useForm<z.infer<typeof updateFaultSchema>>({
    resolver: zodResolver(updateFaultSchema),
    defaultValues: {
      currentStage: fault?.currentStage || "bekliyor",
      assignedTo: fault?.assignedTo || undefined,
      actualCost: fault?.actualCost ? String(fault.actualCost) : undefined,
      notes: undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFaultSchema>) => {
      await apiRequest(`/api/faults/${id}`, "PATCH", {
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

  const generateFaultReportPDF = () => {
    if (!fault) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Arıza Raporu", pageWidth / 2, 28, { align: "center" });
    
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pageWidth - 14, 35);
    
    let yPos = 45;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Arıza #${fault.id}`, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    
    const addField = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", 60, yPos);
      yPos += 8;
    };
    
    addField("Ekipman", fault.equipmentName || "-");
    addField("Durum", STAGE_LABELS[fault.currentStage] || fault.currentStage);
    addField("Öncelik", fault.priority ? (PRIORITY_LABELS[fault.priority] || fault.priority) : "Normal");
    addField("Rapor Tarihi", fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-");
    addField("Atanan Kişi", fault.assignedTo || "Atanmadı");
    
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Açıklama:", 14, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    
    const description = fault.description || "Açıklama girilmedi";
    const splitDescription = doc.splitTextToSize(description, pageWidth - 28);
    doc.text(splitDescription, 14, yPos);
    yPos += splitDescription.length * 6 + 10;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Maliyet Bilgileri", 14, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    addField("Tahmini Maliyet", fault.estimatedCost ? `₺${typeof fault.estimatedCost === 'string' ? parseFloat(fault.estimatedCost).toFixed(2) : Number(fault.estimatedCost).toFixed(2)}` : "-");
    addField("Gerçek Maliyet", fault.actualCost ? `₺${typeof fault.actualCost === 'string' ? parseFloat(fault.actualCost).toFixed(2) : Number(fault.actualCost).toFixed(2)}` : "-");
    
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`DOSPRESSO Franchise Management System - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    const fileName = `DOSPRESSO_Ariza_${fault.id}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
    
    toast({ title: "PDF İndirildi", description: fileName });
  };

  const copyFaultReportToClipboard = () => {
    if (!fault) return;
    
    const reportText = `
═══════════════════════════════════════
       DOSPRESSO - ARIZA RAPORU
═══════════════════════════════════════

Arıza ID: #${fault.id}
Ekipman: ${fault.equipmentName || "-"}
Durum: ${STAGE_LABELS[fault.currentStage] || fault.currentStage}
Öncelik: ${fault.priority ? (PRIORITY_LABELS[fault.priority] || fault.priority) : "Normal"}

─────────────────────────────────────
TARİH BİLGİLERİ
─────────────────────────────────────
Rapor Tarihi: ${fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}

─────────────────────────────────────
ATAMA BİLGİLERİ
─────────────────────────────────────
Atanan Kişi: ${fault.assignedTo || "Atanmadı"}

─────────────────────────────────────
AÇIKLAMA
─────────────────────────────────────
${fault.description || "Açıklama girilmedi"}

─────────────────────────────────────
MALİYET BİLGİLERİ
─────────────────────────────────────
Tahmini Maliyet: ${fault.estimatedCost ? `₺${typeof fault.estimatedCost === 'string' ? parseFloat(fault.estimatedCost).toFixed(2) : Number(fault.estimatedCost).toFixed(2)}` : "-"}
Gerçek Maliyet: ${fault.actualCost ? `₺${typeof fault.actualCost === 'string' ? parseFloat(fault.actualCost).toFixed(2) : Number(fault.actualCost).toFixed(2)}` : "-"}

═══════════════════════════════════════
DOSPRESSO Franchise Management System
Rapor Tarihi: ${format(new Date(), "dd/MM/yyyy HH:mm")}
═══════════════════════════════════════
`.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      toast({ title: "Kopyalandı", description: "Arıza raporu panoya kopyalandı" });
    }).catch(() => {
      toast({ title: "Hata", description: "Kopyalama başarısız", variant: "destructive" });
    });
  };

  if (faultLoading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!fault) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        <Button variant="outline" onClick={() => setLocation("/ariza")}>
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

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <Button variant="outline" onClick={() => setLocation("/ariza")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Geri Dön
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{fault.equipmentName}</h1>
          <p className="text-muted-foreground mt-1">Arıza ID: #{fault.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={copyFaultReportToClipboard}
            data-testid="button-copy-report"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Kopyala
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={generateFaultReportPDF}
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4 mr-1.5" />
            PDF İndir
          </Button>
          {equipmentDetails?.serviceContactEmail && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => serviceEmailMutation.mutate()}
              disabled={serviceEmailMutation.isPending}
              data-testid="button-send-to-service"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {serviceEmailMutation.isPending ? "Gönderiliyor..." : "Servise İlet"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setLocation("/ariza-yeni")} data-testid="button-new-fault">
            Yeni Arıza
          </Button>
          <Button size="sm" onClick={() => setIsEditDialogOpen(true)} data-testid="button-update-fault">
            Güncelle
          </Button>
        </div>
      </div>

      {/* Compact Metric Cards - hide on click */}
      {showCards && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button 
            type="button"
            onClick={handleCardClick}
            className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
            data-testid="card-priority"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Öncelik</span>
            </div>
            <Badge className={fault.priority ? PRIORITY_COLORS[fault.priority] : PRIORITY_COLORS.normal}>
              {fault.priority ? (PRIORITY_LABELS[fault.priority] || fault.priority) : "Normal"}
            </Badge>
          </button>

          <button 
            type="button"
            onClick={handleCardClick}
            className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
            data-testid="card-stage"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Durum</span>
            </div>
            <Badge className={STAGE_COLORS[fault.currentStage] || "bg-secondary"}>
              {STAGE_LABELS[fault.currentStage] || fault.currentStage}
            </Badge>
          </button>

          <button 
            type="button"
            onClick={handleCardClick}
            className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
            data-testid="card-responsibility"
          >
            <div className="flex items-center gap-2 mb-1">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sorumluluk</span>
            </div>
            <p className="text-sm font-medium truncate">
              {(fault as any).maintenanceResponsible || (fault as any).faultProtocol || "-"}
            </p>
          </button>

          <button 
            type="button"
            onClick={handleCardClick}
            className="text-left p-3 rounded-lg border bg-card hover-elevate active-elevate-2 cursor-pointer"
            data-testid="card-cost"
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Maliyet</span>
            </div>
            <p className="text-sm font-medium">
              {fault.actualCost ? `₺${typeof fault.actualCost === 'string' ? parseFloat(fault.actualCost).toFixed(2) : Number(fault.actualCost).toFixed(2)}` : "-"}
            </p>
          </button>
        </div>
      )}
      
      {/* Show cards button when hidden */}
      {!showCards && (
        <Button variant="ghost" size="sm" onClick={() => setShowCards(true)} data-testid="button-show-cards">
          Kartları Göster
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detaylı Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="w-full space-y-2 sm:space-y-3">
          <div className="w-full space-y-2 sm:space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Açıklama</p>
              <p className="text-sm font-medium">{fault.description || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Raporlandığı Tarih</p>
              <p className="text-sm font-medium">
                {fault.createdAt ? format(new Date(fault.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tahmini Maliyet</p>
              <p className="text-sm font-medium">
                {fault.estimatedCost ? `₺${typeof fault.estimatedCost === 'string' ? parseFloat(fault.estimatedCost).toFixed(2) : (Number(fault.estimatedCost)).toFixed(2)}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fotoğraf</p>
              {fault.photoUrl ? (
                <a href={fault.photoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Fotoğrafı Görüntüle
                </a>
              ) : (
                <p className="text-sm font-medium">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Atanan Kişi</p>
              <p className="text-sm font-medium">{fault.assignedTo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durumu</p>
              <Badge variant={fault.currentStage === "kapatildi" ? "default" : "secondary"}>
                {fault.currentStage === "kapatildi" ? "Çözüldü" : "Açık"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arıza Güncelle</DialogTitle>
            <DialogDescription>
              Arıza detaylarını güncelleyebilirsiniz
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={form.control}
                name="currentStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Atama Kaldır</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
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
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                      <Textarea placeholder="..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
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
