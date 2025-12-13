import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Download, FileText, Sparkles, CalendarIcon, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import dospressoNavyLogo from "@assets/IMG_5044_1765665383658.jpeg";

interface Branch {
  id: number;
  name: string;
}

const reportFormSchema = z.object({
  title: z.string().min(3, "Rapor adı en az 3 karakter olmalı"),
  reportType: z.enum(["branch_comparison", "trend_analysis", "performance"]),
  branchIds: z.array(z.number()).min(1, "En az bir şube seçin"),
  dateStart: z.date({ required_error: "Başlangıç tarihi seçin" }),
  dateEnd: z.date({ required_error: "Bitiş tarihi seçin" }),
  metrics: z.array(z.string()).min(1, "En az bir metrik seçin"),
  chartType: z.string().optional(),
  includeAISummary: z.boolean().optional(),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

const METRIC_OPTIONS = [
  { id: "faults", label: "Arızalar" },
  { id: "tasks", label: "Görevler" },
  { id: "equipment", label: "Ekipman" },
  { id: "health", label: "Sağlık Puanı" },
  { id: "attendance", label: "Devam Durumu" },
  { id: "sales", label: "Satışlar" },
];

const REPORT_TYPES = [
  { value: "branch_comparison", label: "Şube Karşılaştırması" },
  { value: "trend_analysis", label: "Trend Analizi" },
  { value: "performance", label: "Performans Raporu" },
];

interface DetailedReport {
  id: number;
  title: string;
  reportType: string;
  branchIds: number[];
  dateRange: { start: string; end: string };
  metrics: string[];
  chartType?: string;
  includeAISummary?: boolean;
  createdAt: string;
  createdById: string;
}

export default function Raporlar() {
  const [selectedTab, setSelectedTab] = useState("comparison");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [trendStartDate, setTrendStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [trendEndDate, setTrendEndDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery<DetailedReport[]>({
    queryKey: ["/api/detailed-reports"],
  });

  // Fetch branches for form
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Form setup
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      reportType: "branch_comparison",
      branchIds: [],
      metrics: [],
      chartType: "bar",
      includeAISummary: false,
    },
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const payload = {
        title: data.title,
        reportType: data.reportType,
        branchIds: data.branchIds,
        dateRange: {
          start: format(data.dateStart, "yyyy-MM-dd"),
          end: format(data.dateEnd, "yyyy-MM-dd"),
        },
        metrics: data.metrics,
        chartType: data.chartType || "bar",
        includeAISummary: data.includeAISummary || false,
      };
      const response = await apiRequest("POST", "/api/detailed-reports", payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/detailed-reports"] });
      toast({
        title: "Başarılı",
        description: "Rapor başarıyla oluşturuldu",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Rapor oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    createReportMutation.mutate(data);
  };

  const toggleBranch = (branchId: number) => {
    const current = form.getValues("branchIds");
    if (current.includes(branchId)) {
      form.setValue("branchIds", current.filter((id) => id !== branchId));
    } else {
      form.setValue("branchIds", [...current, branchId]);
    }
  };

  const toggleMetric = (metricId: string) => {
    const current = form.getValues("metrics");
    if (current.includes(metricId)) {
      form.setValue("metrics", current.filter((id) => id !== metricId));
    } else {
      form.setValue("metrics", [...current, metricId]);
    }
  };

  // AI summary mutation
  const aiSummaryMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("POST", "/api/ai-summary-report", {
        reportId,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "AI özeti oluşturuldu",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "AI özeti oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  // Fetch all tasks for comparison
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch all faults for comparison
  const { data: allFaults = [] } = useQuery<any[]>({
    queryKey: ["/api/faults"],
  });

  // Fetch all equipment for health scores
  const { data: allEquipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  // Build comparison data from real API data
  const comparisonData = branches.map((branch) => {
    const branchTasks = allTasks.filter((t: any) => t.branchId === branch.id);
    const branchFaults = allFaults.filter((f: any) => f.branchId === branch.id);
    const branchEquipment = allEquipment.filter((e: any) => e.branchId === branch.id);
    const avgHealth = branchEquipment.length > 0
      ? Math.round(branchEquipment.reduce((acc: number, e: any) => acc + (e.healthScore || 100), 0) / branchEquipment.length)
      : 100;
    return {
      branch: branch.name,
      faults: branchFaults.length,
      tasks: branchTasks.length,
      equipment: branchEquipment.length,
      health: avgHealth,
    };
  }).slice(0, 10);

  // Build trend data from tasks/faults based on selected date range
  const trendData = (() => {
    const days: { date: string; faults: number; tasks: number }[] = [];
    const start = new Date(trendStartDate);
    const end = new Date(trendEndDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayStr = format(d, "dd MMM", { locale: tr });
      const dateStr = format(d, "yyyy-MM-dd");
      const dayFaults = allFaults.filter((f: any) => f.createdAt?.startsWith(dateStr)).length;
      const dayTasks = allTasks.filter((t: any) => t.createdAt?.startsWith(dateStr)).length;
      days.push({ date: dayStr, faults: dayFaults, tasks: dayTasks });
    }
    return days;
  })();

  // Professional PDF export with logo and branding
  const exportProfessionalPDF = async (
    reportTitle: string,
    reportType: string,
    dateRange: { start?: string; end?: string } | null,
    chartData: any[],
    aiSummary?: string
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Add navy logo
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dospressoNavyLogo;
      });
      doc.addImage(img, "JPEG", margin, yPos, 50, 25);
    } catch (e) {
      console.log("Logo yüklenemedi");
    }

    // Header - Date
    const today = new Date().toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(today, pageWidth - margin, yPos + 10, { align: "right" });

    yPos += 35;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 82);
    doc.text(reportTitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Subtitle - Report Type
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(reportType, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // Date Range
    if (dateRange?.start || dateRange?.end) {
      doc.setFontSize(10);
      doc.text(
        `Dönem: ${dateRange.start || "-"} - ${dateRange.end || "-"}`,
        pageWidth / 2,
        yPos,
        { align: "center" }
      );
      yPos += 5;
    }

    // Divider line
    yPos += 5;
    doc.setDrawColor(30, 41, 82);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Data Table
    if (chartData && chartData.length > 0) {
      const headers = Object.keys(chartData[0]);
      const tableData: RowInput[] = chartData.map((row) =>
        Object.values(row).map((val) => String(val ?? ""))
      );

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [30, 41, 82],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // AI Summary section
    if (aiSummary) {
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 82);
      doc.text("AI Özet ve Öneriler", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(60);
      const splitText = doc.splitTextToSize(aiSummary, pageWidth - margin * 2);
      doc.text(splitText, margin, yPos);
      yPos += splitText.length * 5 + 10;
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("DOSPRESSO Franchise Management System", pageWidth / 2, footerY, {
      align: "center",
    });
    doc.text(`Sayfa 1`, pageWidth - margin, footerY, { align: "right" });

    doc.save(`${reportTitle.replace(/\s+/g, "_")}_Rapor.pdf`);
    toast({
      title: "Başarılı",
      description: "Profesyonel PDF raporu indirildi",
    });
  };

  // Simple chart export
  const exportChartToPDF = (chartName: string, chartData: any[]) => {
    exportProfessionalPDF(chartName, "Analiz Raporu", null, chartData);
  };

  const exportReportsToExcel = () => {
    if (reports.length === 0) {
      toast({
        title: "Hata",
        description: "İndirilecek rapor yok",
        variant: "destructive",
      });
      return;
    }

    const data = reports.map((report) => ({
      "Rapor Adı": report.title,
      "Rapor Tipi": report.reportType,
      "Şube Sayısı": report.branchIds?.length || 0,
      "Başlangıç": report.dateRange?.start || "",
      "Bitiş": report.dateRange?.end || "",
      "Oluşturulma Tarihi": new Date(report.createdAt).toLocaleDateString(
        "tr-TR"
      ),
      "AI Özeti": report.includeAISummary ? "Evet" : "Hayır",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raporlar");
    XLSX.writeFile(wb, "Raporlar.xlsx");

    toast({
      title: "Başarılı",
      description: "Raporlar Excel olarak indirildi",
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Şube performansı ve analitik raporları</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-report">
              <Plus className="h-4 w-4" />
              Yeni Rapor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Rapor Oluştur</DialogTitle>
              <DialogDescription>
                Şube performans raporu için gerekli bilgileri doldurun
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rapor Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Aylık Performans Raporu" {...field} data-testid="input-report-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rapor Tipi</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-type">
                            <SelectValue placeholder="Rapor tipi seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REPORT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Şubeler</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                        {form.watch("branchIds").length === 0 ? (
                          <span className="text-sm text-muted-foreground">Şube seçmek için tıklayın</span>
                        ) : (
                          form.watch("branchIds").map((id) => {
                            const branch = branches.find((b) => b.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                                {branch?.name || `Şube ${id}`}
                                <button type="button" onClick={() => toggleBranch(id)} className="hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {branches.map((branch) => (
                          <div
                            key={branch.id}
                            className={`p-2 border rounded-md cursor-pointer text-sm transition-colors ${
                              form.watch("branchIds").includes(branch.id)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => toggleBranch(branch.id)}
                            data-testid={`branch-select-${branch.id}`}
                          >
                            {branch.name}
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Tarihi</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                data-testid="button-date-start"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "dd MMM yyyy", { locale: tr }) : "Tarih seçin"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={tr}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Tarihi</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                data-testid="button-date-end"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "dd MMM yyyy", { locale: tr }) : "Tarih seçin"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={tr}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="metrics"
                  render={() => (
                    <FormItem>
                      <FormLabel>Metrikler</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {METRIC_OPTIONS.map((metric) => (
                          <div
                            key={metric.id}
                            className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer text-sm transition-colors ${
                              form.watch("metrics").includes(metric.id)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => toggleMetric(metric.id)}
                            data-testid={`metric-select-${metric.id}`}
                          >
                            <Checkbox
                              checked={form.watch("metrics").includes(metric.id)}
                              onCheckedChange={() => toggleMetric(metric.id)}
                            />
                            {metric.label}
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeAISummary"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-ai-summary"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">AI özeti dahil et</FormLabel>
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createReportMutation.isPending} data-testid="button-submit-report">
                    {createReportMutation.isPending ? "Oluşturuluyor..." : "Rapor Oluştur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Şube Karşılaştırması</TabsTrigger>
          <TabsTrigger value="trends">Trend Analizi</TabsTrigger>
          <TabsTrigger value="list">Raporlar</TabsTrigger>
        </TabsList>

        {/* Şube Karşılaştırması */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Şube Performans Karşılaştırması</CardTitle>
                <CardDescription>Şubeler arası metrik karşılaştırması</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportChartToPDF("Şube Karşılaştırması", comparisonData)
                }
                data-testid="button-export-comparison-pdf"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="faults" fill="#ef4444" name="Arızalar" />
                  <Bar dataKey="tasks" fill="#3b82f6" name="Görevler" />
                  <Bar dataKey="health" fill="#10b981" name="Sağlık Puanı" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analizi */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Trend Analizi</CardTitle>
                  <CardDescription>Seçilen tarih aralığındaki arıza ve görev trendi</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportChartToPDF("Trend Analizi", trendData)}
                  data-testid="button-export-trends-pdf"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Başlangıç:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-trend-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(trendStartDate, "dd MMM yyyy", { locale: tr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={trendStartDate}
                        onSelect={(d) => d && setTrendStartDate(d)}
                        locale={tr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Bitiş:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-trend-end">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(trendEndDate, "dd MMM yyyy", { locale: tr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={trendEndDate}
                        onSelect={(d) => d && setTrendEndDate(d)}
                        locale={tr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="faults" stroke="#ef4444" name="Arızalar" />
                  <Line type="monotone" dataKey="tasks" stroke="#3b82f6" name="Görevler" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raporlar Listesi */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Raporlar yükleniyor...
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Henüz rapor oluşturulmamış. Yeni rapor oluşturmak için butona tıklayın.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportReportsToExcel}
                  data-testid="button-export-reports-excel"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Excel İndir
                </Button>
              </div>
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle>{report.title}</CardTitle>
                      <CardDescription>
                        {report.reportType} • {new Date(report.createdAt).toLocaleDateString('tr-TR')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportProfessionalPDF(
                            report.title,
                            report.reportType,
                            report.dateRange,
                            [
                              {
                                Metrik: "Şube Sayısı",
                                Değer: report.branchIds?.length || 0,
                              },
                              {
                                Metrik: "Başlangıç",
                                Değer: report.dateRange?.start || "-",
                              },
                              {
                                Metrik: "Bitiş",
                                Değer: report.dateRange?.end || "-",
                              },
                              {
                                Metrik: "Oluşturulma",
                                Değer: new Date(report.createdAt).toLocaleDateString("tr-TR"),
                              },
                            ]
                          )
                        }
                        data-testid={`button-pdf-report-${report.id}`}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => aiSummaryMutation.mutate(report.id)}
                        disabled={aiSummaryMutation.isPending}
                        data-testid={`button-ai-summary-${report.id}`}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {aiSummaryMutation.isPending ? "Hazırlanıyor..." : "AI Özeti"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Dönem</p>
                        <p className="font-semibold">
                          {report.dateRange?.start} - {report.dateRange?.end}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Şubeler</p>
                        <p className="font-semibold">{report.branchIds?.length || 0} şube</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
