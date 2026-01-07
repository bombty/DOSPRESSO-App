import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Building, Calendar, Users, 
  TrendingUp, Award, ClipboardCheck, Loader2, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createPDFWithHeader,
  addTable,
  addSection,
  addKeyValue,
  savePDF,
  checkPageBreak,
  sanitizeText
} from "@/lib/pdfHelper";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from "recharts";

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"
];

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

export default function AdvancedReportsPage() {
  const { toast } = useToast();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [generating, setGenerating] = useState<string | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: rankings } = useQuery({
    queryKey: ["/api/employee-of-month/rankings", selectedMonth, selectedYear, selectedBranchId],
  });

  const performanceData = (rankings as any[])?.slice(0, 10).map((r: any) => ({
    name: `${r.employee?.firstName?.substring(0, 8) || ""}`,
    puan: r.totalScore?.toFixed(1) || 0,
    devam: r.attendanceScore?.toFixed(1) || 0,
    checklist: r.checklistScore?.toFixed(1) || 0,
  })) || [];

  const categoryData = [
    { name: "Devam", value: 20, color: CHART_COLORS[0] },
    { name: "Checklist", value: 20, color: CHART_COLORS[1] },
    { name: "Gorevler", value: 15, color: CHART_COLORS[2] },
    { name: "Musteri", value: 15, color: CHART_COLORS[3] },
    { name: "Yonetici", value: 20, color: CHART_COLORS[4] },
    { name: "Izin", value: 10, color: CHART_COLORS[5] },
  ];

  const generatePerformanceReport = async () => {
    setGenerating("performance");
    try {
      const branchName = selectedBranchId === "all" 
        ? "Tum Subeler" 
        : (branches as any[])?.find(b => b.id.toString() === selectedBranchId)?.name || "";
      
      const { doc, yPos: startY } = await createPDFWithHeader({
        title: "Aylik Performans Raporu",
        subtitle: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
        branchName,
        orientation: "portrait"
      });

      let yPos = startY;

      // Summary section
      yPos = addSection(doc, "Ozet Bilgiler", yPos);
      yPos = addKeyValue(doc, "Toplam Personel", `${(rankings as any[])?.length || 0} kisi`, yPos);
      
      const avgScore = (rankings as any[])?.length > 0
        ? ((rankings as any[]).reduce((sum, r) => sum + (r.totalScore || 0), 0) / (rankings as any[]).length).toFixed(2)
        : "0";
      yPos = addKeyValue(doc, "Ortalama Puan", avgScore, yPos);
      
      if ((rankings as any[])?.length > 0) {
        const top = (rankings as any[])[0];
        yPos = addKeyValue(doc, "En Iyi Performans", `${top.employee?.firstName} ${top.employee?.lastName} (${top.totalScore?.toFixed(1)} puan)`, yPos);
      }
      
      yPos += 10;

      // Rankings table
      yPos = checkPageBreak(doc, yPos, 60);
      yPos = addSection(doc, "Performans Siralamasi", yPos);
      
      const tableData = (rankings as any[])?.map((r: any, i: number) => [
        (i + 1).toString(),
        `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`,
        r.branch?.name || "",
        r.attendanceScore?.toFixed(1) || "0",
        r.checklistScore?.toFixed(1) || "0",
        r.taskScore?.toFixed(1) || "0",
        r.customerRatingScore?.toFixed(1) || "0",
        r.managerRatingScore?.toFixed(1) || "0",
        r.totalScore?.toFixed(1) || "0"
      ]) || [];

      yPos = addTable(doc, {
        head: [["#", "Personel", "Sube", "Devam", "Check.", "Gorev", "Must.", "Yon.", "Toplam"]],
        body: tableData
      }, yPos);

      savePDF(doc, `performans-raporu-${selectedYear}-${selectedMonth}.pdf`);
      toast({ title: "Basarili", description: "PDF raporu indirildi" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({ title: "Hata", description: "PDF olusturulamadi", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateEmployeeReport = async () => {
    setGenerating("employee");
    try {
      const { doc, yPos: startY } = await createPDFWithHeader({
        title: "Personel Listesi Raporu",
        subtitle: `Guncel Durum`,
        orientation: "landscape"
      });

      let yPos = startY;
      
      const activeUsers = (users as any[])?.filter(u => u.isActive) || [];
      
      yPos = addSection(doc, "Aktif Personel", yPos);
      yPos = addKeyValue(doc, "Toplam Aktif", `${activeUsers.length} kisi`, yPos);
      yPos += 5;

      const tableData = activeUsers.map((u: any, i: number) => [
        (i + 1).toString(),
        `${u.firstName || ""} ${u.lastName || ""}`,
        u.email || "",
        u.role || "",
        (branches as any[])?.find(b => b.id === u.branchId)?.name || "-",
        u.phone || "-"
      ]);

      yPos = addTable(doc, {
        head: [["#", "Ad Soyad", "E-posta", "Rol", "Sube", "Telefon"]],
        body: tableData
      }, yPos);

      savePDF(doc, `personel-listesi-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Basarili", description: "PDF raporu indirildi" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({ title: "Hata", description: "PDF olusturulamadi", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateBranchReport = async () => {
    setGenerating("branch");
    try {
      const { doc, yPos: startY } = await createPDFWithHeader({
        title: "Sube Performans Raporu",
        subtitle: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
        orientation: "portrait"
      });

      let yPos = startY;

      const branchStats = (branches as any[])?.map((branch: any) => {
        const branchRankings = (rankings as any[])?.filter(r => r.branchId === branch.id) || [];
        const avgScore = branchRankings.length > 0
          ? branchRankings.reduce((sum, r) => sum + (r.totalScore || 0), 0) / branchRankings.length
          : 0;
        return {
          name: branch.name,
          personelSayisi: branchRankings.length,
          ortPuan: avgScore.toFixed(2)
        };
      }) || [];

      yPos = addSection(doc, "Sube Bazli Ozet", yPos);

      const tableData = branchStats.map((s: any, i: number) => [
        (i + 1).toString(),
        s.name,
        s.personelSayisi.toString(),
        s.ortPuan
      ]);

      yPos = addTable(doc, {
        head: [["#", "Sube Adi", "Personel Sayisi", "Ort. Puan"]],
        body: tableData
      }, yPos);

      savePDF(doc, `sube-raporu-${selectedYear}-${selectedMonth}.pdf`);
      toast({ title: "Basarili", description: "PDF raporu indirildi" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({ title: "Hata", description: "PDF olusturulamadi", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Gelismis Raporlar
          </h1>
          <p className="text-muted-foreground">
            Detayli PDF raporlar ve grafikler
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]" data-testid="select-month">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[160px]" data-testid="select-branch">
              <Building className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Tum subeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Subeler</SelectItem>
              {(branches as any[])?.map((b: any) => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Performans Raporu
            </CardTitle>
            <CardDescription>
              Aylik personel performans siralamasi ve detaylari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={generatePerformanceReport}
              disabled={generating !== null}
              data-testid="button-performance-report"
            >
              {generating === "performance" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF Indir
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-500" />
              Personel Listesi
            </CardTitle>
            <CardDescription>
              Tum aktif personel bilgileri ve iletisim detaylari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={generateEmployeeReport}
              disabled={generating !== null}
              data-testid="button-employee-report"
            >
              {generating === "employee" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF Indir
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-purple-500" />
              Sube Raporu
            </CardTitle>
            <CardDescription>
              Sube bazli performans karsilastirmasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={generateBranchReport}
              disabled={generating !== null}
              data-testid="button-branch-report"
            >
              {generating === "branch" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF Indir
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Preview */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performans
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Award className="mr-2 h-4 w-4" />
            Kategoriler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>En Iyi 10 Performans</CardTitle>
              <CardDescription>
                {MONTHS[selectedMonth - 1]} {selectedYear} performans siralamasI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={(el) => chartRefs.current["performance"] = el}
                className="h-80"
              >
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="puan" name="Toplam Puan" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Veri bulunamadi
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Puanlama Kategorileri</CardTitle>
              <CardDescription>
                Toplam puandaki kategori dagilimi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={(el) => chartRefs.current["categories"] = el}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: %${value}`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
