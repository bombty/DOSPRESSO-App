import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Download, FileText, Sparkles } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dospressoNavyLogo from "@assets/IMG_5044_1765665383658.jpeg";

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
  const { toast } = useToast();

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery<DetailedReport[]>({
    queryKey: ["/api/detailed-reports"],
  });

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

  // Sample data for branch comparison
  const comparisonData = [
    { branch: "Şube 1", faults: 5, tasks: 12, equipment: 45, health: 85 },
    { branch: "Şube 2", faults: 3, tasks: 8, equipment: 38, health: 92 },
    { branch: "Şube 3", faults: 7, tasks: 15, equipment: 52, health: 78 },
  ];

  // Sample data for trends
  const trendData = [
    { date: "01 Ara", faults: 5, tasks: 12 },
    { date: "02 Ara", faults: 4, tasks: 11 },
    { date: "03 Ara", faults: 6, tasks: 14 },
    { date: "04 Ara", faults: 3, tasks: 10 },
    { date: "05 Ara", faults: 8, tasks: 16 },
    { date: "06 Ara", faults: 5, tasks: 13 },
  ];

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Şube performansı ve analitik raporları</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Rapor
        </Button>
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
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Trend Analizi</CardTitle>
                <CardDescription>Son 6 günün arıza ve görev trendi</CardDescription>
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
