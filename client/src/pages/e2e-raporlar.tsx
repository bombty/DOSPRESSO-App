import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type UserRoleType } from "@shared/schema";
import { Link } from "wouter";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createPDFWithHeader, addSection, addTable, savePDF, checkPageBreak } from "@/lib/pdfHelper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  Download,
  FileText,
  Wrench,
  AlertTriangle,
  GraduationCap,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  Coffee,
  Star,
  Clock,
  Target,
} from "lucide-react";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface Branch {
  id: number;
  name: string;
}

interface Equipment {
  id: number;
  name: string;
  status: string;
  branchId: number;
  healthScore: number;
  type: string;
}

interface Fault {
  id: number;
  equipmentId: number;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  branchId: number;
}

interface PerformanceMetric {
  id: number;
  branchId: number;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  compositeScore: number;
  checklistScore: number;
  attendanceScore: number;
  slaComplianceScore: number;
  customerSatisfactionScore: number;
}

interface ChecklistTask {
  id: number;
  title: string;
  status: string;
  branchId: number;
  completedAt?: string;
  dueDate?: string;
}

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function E2EReportsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("overview");

  const isHQ = isHQRole((user?.role || "") as UserRoleType);
  const effectiveBranchId = isHQ ? (selectedBranchId !== "all" ? parseInt(selectedBranchId) : undefined) : user?.branchId;

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isHQ,
  });

  const { data: equipment = [], isLoading: isLoadingEquipment, isError: isErrorEquipment } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: faultsResponse, isLoading: isLoadingFaults, isError: isErrorFaults } = useQuery<{ data: Fault[] } | Fault[]>({
    queryKey: ["/api/faults"],
  });
  const faults: Fault[] = useMemo(() => {
    if (!faultsResponse) return [];
    if (Array.isArray(faultsResponse)) return faultsResponse;
    if (Array.isArray((faultsResponse as any).data)) return (faultsResponse as any).data;
    return [];
  }, [faultsResponse]);

  const performanceQueryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (effectiveBranchId) {
      params.append("branchId", effectiveBranchId.toString());
    }
    const queryStr = params.toString();
    return `/api/performance${queryStr ? `?${queryStr}` : ""}`;
  }, [effectiveBranchId]);

  const { data: performanceMetrics = [], isLoading: isLoadingPerformance, isError: isErrorPerformance } = useQuery<PerformanceMetric[]>({
    queryKey: [performanceQueryKey],
  });

  const { data: checklistTasks = [], isLoading: isLoadingChecklists, isError: isErrorChecklists } = useQuery<ChecklistTask[]>({
    queryKey: ["/api/checklist-tasks"],
  });

  const filteredEquipment = useMemo(() => {
    if (!effectiveBranchId) return equipment;
    return equipment.filter((e) => e.branchId === effectiveBranchId);
  }, [equipment, effectiveBranchId]);

  const filteredFaults = useMemo(() => {
    let filtered = faults;
    if (effectiveBranchId) {
      filtered = filtered.filter((f) => f.branchId === effectiveBranchId);
    }
    filtered = filtered.filter((f) => {
      const createdDate = new Date(f.createdAt);
      return createdDate >= new Date(dateFrom) && createdDate <= new Date(dateTo);
    });
    return filtered;
  }, [faults, effectiveBranchId, dateFrom, dateTo]);

  const filteredChecklists = useMemo(() => {
    let filtered = checklistTasks;
    if (effectiveBranchId) {
      filtered = filtered.filter((c) => c.branchId === effectiveBranchId);
    }
    if (dateFrom && dateTo) {
      filtered = filtered.filter((c) => {
        if (c.completedAt) {
          const completedDate = new Date(c.completedAt);
          return completedDate >= new Date(dateFrom) && completedDate <= new Date(dateTo);
        }
        if (c.dueDate) {
          const dueDate = new Date(c.dueDate);
          return dueDate >= new Date(dateFrom) && dueDate <= new Date(dateTo);
        }
        return true;
      });
    }
    return filtered;
  }, [checklistTasks, effectiveBranchId, dateFrom, dateTo]);

  const equipmentStats = useMemo(() => {
    const total = filteredEquipment.length;
    const operational = filteredEquipment.filter((e) => e.status === "operational").length;
    const maintenance = filteredEquipment.filter((e) => e.status === "maintenance").length;
    const faulty = filteredEquipment.filter((e) => e.status === "faulty").length;
    const avgHealth = total > 0 ? filteredEquipment.reduce((sum, e) => sum + (e.healthScore || 0), 0) / total : 0;
    
    const byType = filteredEquipment.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, operational, maintenance, faulty, avgHealth, byType };
  }, [filteredEquipment]);

  const faultStats = useMemo(() => {
    const total = filteredFaults.length;
    const open = filteredFaults.filter((f) => f.status === "open").length;
    const inProgress = filteredFaults.filter((f) => f.status === "in_progress").length;
    const resolved = filteredFaults.filter((f) => f.status === "resolved").length;
    
    const byPriority = filteredFaults.reduce((acc, f) => {
      acc[f.priority] = (acc[f.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgResolutionTime = resolved > 0 
      ? filteredFaults
          .filter((f) => f.resolvedAt)
          .reduce((sum, f) => {
            const created = new Date(f.createdAt);
            const resolved = new Date(f.resolvedAt!);
            return sum + differenceInDays(resolved, created);
          }, 0) / resolved
      : 0;

    return { total, open, inProgress, resolved, byPriority, avgResolutionTime };
  }, [filteredFaults]);

  const checklistStats = useMemo(() => {
    const total = filteredChecklists.length;
    const completed = filteredChecklists.filter((c) => c.status === "completed").length;
    const pending = filteredChecklists.filter((c) => c.status === "pending").length;
    const overdue = filteredChecklists.filter((c) => {
      if (c.status === "completed") return false;
      if (!c.dueDate) return false;
      return new Date(c.dueDate) < new Date();
    }).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [filteredChecklists]);

  const performanceStats = useMemo(() => {
    if (performanceMetrics.length === 0) {
      return { avgComposite: 0, avgChecklist: 0, avgAttendance: 0, avgSLA: 0, avgCustomer: 0 };
    }
    const relevant = effectiveBranchId 
      ? performanceMetrics.filter((p) => p.branchId === effectiveBranchId)
      : performanceMetrics;
    
    if (relevant.length === 0) {
      return { avgComposite: 0, avgChecklist: 0, avgAttendance: 0, avgSLA: 0, avgCustomer: 0 };
    }

    return {
      avgComposite: relevant.reduce((sum, p) => sum + (p.compositeScore || 0), 0) / relevant.length,
      avgChecklist: relevant.reduce((sum, p) => sum + (p.checklistScore || 0), 0) / relevant.length,
      avgAttendance: relevant.reduce((sum, p) => sum + (p.attendanceScore || 0), 0) / relevant.length,
      avgSLA: relevant.reduce((sum, p) => sum + (p.slaComplianceScore || 0), 0) / relevant.length,
      avgCustomer: relevant.reduce((sum, p) => sum + (p.customerSatisfactionScore || 0), 0) / relevant.length,
    };
  }, [performanceMetrics, effectiveBranchId]);

  const equipmentChartData = useMemo(() => {
    return Object.entries(equipmentStats.byType).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  }, [equipmentStats.byType]);

  const faultStatusChartData = useMemo(() => [
    { name: "Açık", value: faultStats.open, color: "#ef4444" },
    { name: "İşlemde", value: faultStats.inProgress, color: "#f59e0b" },
    { name: "Çözüldü", value: faultStats.resolved, color: "#22c55e" },
  ], [faultStats]);

  const faultPriorityChartData = useMemo(() => {
    return Object.entries(faultStats.byPriority).map(([priority, count]) => ({
      name: priority === "critical" ? "Kritik" : priority === "high" ? "Yüksek" : priority === "medium" ? "Orta" : "Düşük",
      value: count,
    }));
  }, [faultStats.byPriority]);

  const performanceChartData = useMemo(() => [
    { name: "Genel", value: performanceStats.avgComposite },
    { name: "Checklist", value: performanceStats.avgChecklist },
    { name: "Devamlılık", value: performanceStats.avgAttendance },
    { name: "SLA", value: performanceStats.avgSLA },
    { name: "Müşteri", value: performanceStats.avgCustomer },
  ], [performanceStats]);

  const isLoading = isLoadingEquipment || isLoadingFaults || isLoadingPerformance || isLoadingChecklists;

  const generatePDF = () => {
    if (isLoading) {
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const selectedBranch = branches.find((b) => b.id === effectiveBranchId);
    const branchName = selectedBranch?.name || "Tüm Şubeler";
    
    doc.setFontSize(20);
    doc.setTextColor(139, 69, 19);
    doc.text("DOSPRESSO E2E Raporu", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Şube: ${branchName}`, 14, 35);
    doc.text(`Tarih Aralığı: ${format(new Date(dateFrom), "dd MMM yyyy", { locale: tr })} - ${format(new Date(dateTo), "dd MMM yyyy", { locale: tr })}`, 14, 42);
    doc.text(`Rapor Tarihi: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: tr })}`, 14, 49);
    
    let yPos = 60;
    
    doc.setFontSize(14);
    doc.setTextColor(139, 69, 19);
    doc.text("Genel Bakış Özeti", 14, yPos);
    yPos += 8;
    
    const overviewTableData = [
      ["Toplam Ekipman", equipmentStats.total.toString()],
      ["Aktif Arıza Sayısı", faultStats.open.toString()],
      ["Tamamlanan Görevler", checklistStats.completed.toString()],
      ["Performans Skoru", `${Number(performanceStats.avgComposite ?? 0).toFixed(1)}%`],
    ];
    
    (doc as any).autoTable({
      startY: yPos,
      head: [["Metrik", "Değer"]],
      body: overviewTableData,
      theme: "striped",
      headStyles: { fillColor: [139, 69, 19] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(139, 69, 19);
    doc.text("Ekipman Durumu", 14, yPos);
    yPos += 8;
    
    const equipmentTableData = [
      ["Toplam Ekipman", equipmentStats.total.toString()],
      ["Çalışır Durumda", equipmentStats.operational.toString()],
      ["Bakımda", equipmentStats.maintenance.toString()],
      ["Arızalı", equipmentStats.faulty.toString()],
      ["Ortalama Sağlık Skoru", `${Number(equipmentStats.avgHealth ?? 0).toFixed(1)}%`],
    ];
    
    (doc as any).autoTable({
      startY: yPos,
      head: [["Metrik", "Değer"]],
      body: equipmentTableData,
      theme: "striped",
      headStyles: { fillColor: [139, 69, 19] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(139, 69, 19);
    doc.text("Arıza İstatistikleri", 14, yPos);
    yPos += 8;
    
    const faultTableData = [
      ["Toplam Arıza", faultStats.total.toString()],
      ["Açık", faultStats.open.toString()],
      ["İşlemde", faultStats.inProgress.toString()],
      ["Çözüldü", faultStats.resolved.toString()],
      ["Ort. Çözüm Süresi", `${Number(faultStats.avgResolutionTime ?? 0).toFixed(1)} gün`],
    ];
    
    (doc as any).autoTable({
      startY: yPos,
      head: [["Metrik", "Değer"]],
      body: faultTableData,
      theme: "striped",
      headStyles: { fillColor: [139, 69, 19] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(139, 69, 19);
    doc.text("Checklist Durumu", 14, yPos);
    yPos += 8;
    
    const checklistTableData = [
      ["Toplam Görev", checklistStats.total.toString()],
      ["Tamamlanan", checklistStats.completed.toString()],
      ["Bekleyen", checklistStats.pending.toString()],
      ["Gecikmiş", checklistStats.overdue.toString()],
      ["Tamamlanma Oranı", `${Number(checklistStats.completionRate ?? 0).toFixed(1)}%`],
    ];
    
    (doc as any).autoTable({
      startY: yPos,
      head: [["Metrik", "Değer"]],
      body: checklistTableData,
      theme: "striped",
      headStyles: { fillColor: [139, 69, 19] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(139, 69, 19);
    doc.text("Performans Metrikleri", 14, yPos);
    yPos += 8;
    
    const performanceTableData = [
      ["Genel Skor", `${Number(performanceStats.avgComposite ?? 0).toFixed(1)}%`],
      ["Checklist Skoru", `${Number(performanceStats.avgChecklist ?? 0).toFixed(1)}%`],
      ["Devamlılık Skoru", `${Number(performanceStats.avgAttendance ?? 0).toFixed(1)}%`],
      ["SLA Uyum Skoru", `${Number(performanceStats.avgSLA ?? 0).toFixed(1)}%`],
      ["Müşteri Memnuniyeti", `${Number(performanceStats.avgCustomer ?? 0).toFixed(1)}%`],
    ];
    
    (doc as any).autoTable({
      startY: yPos,
      head: [["Metrik", "Skor"]],
      body: performanceTableData,
      theme: "striped",
      headStyles: { fillColor: [139, 69, 19] },
    });
    
    const fileName = `DOSPRESSO_E2E_Rapor_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">E2E Raporlar</h1>
          </div>
          <div className="ml-auto">
            <Button onClick={generatePDF} className="gap-2" data-testid="button-export-pdf">
              <Download className="h-4 w-4" />
              PDF İndir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rapor Filtreleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Bitiş Tarihi</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
              {isHQ && (
                <div className="space-y-2">
                  <Label>Şube Seçimi</Label>
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger data-testid="select-branch">
                      <SelectValue placeholder="Şube seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Şubeler</SelectItem>
                      {(Array.isArray(branches) ? branches : []).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover-elevate cursor-pointer" data-testid="stat-card-equipment">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Ekipman</p>
                  <p className="text-2xl font-bold" data-testid="text-equipment-count">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : equipmentStats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="stat-card-faults">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Açık Arızalar</p>
                  <p className="text-2xl font-bold" data-testid="text-open-faults">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : faultStats.open}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="stat-card-checklists">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamamlanan Görevler</p>
                  <p className="text-2xl font-bold" data-testid="text-completed-tasks">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : checklistStats.completed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" data-testid="stat-card-performance">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Performans Skoru</p>
                  <p className="text-2xl font-bold" data-testid="text-performance-score">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : `${Number(performanceStats.avgComposite ?? 0).toFixed(0)}%`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Genel Bakış</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-2" data-testid="tab-equipment">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Ekipman</span>
            </TabsTrigger>
            <TabsTrigger value="faults" className="gap-2" data-testid="tab-faults">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Arızalar</span>
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2" data-testid="tab-checklists">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2" data-testid="tab-performance">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Performans</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-muted-foreground">Veriler yükleniyor...</p>
                </div>
              </div>
            ) : (isErrorFaults || isErrorEquipment || isErrorPerformance || isErrorChecklists) ? (
              <Card className="border-destructive">
                <CardContent className="py-10 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
                  <p className="text-destructive font-medium">Veriler yüklenirken hata oluştu</p>
                  <p className="text-sm text-muted-foreground mt-2">Lütfen sayfayı yenileyiniz</p>
                </CardContent>
              </Card>
            ) : (
            <>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Arıza Durumu Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {faultStatusChartData.every(d => d.value === 0) ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      Arıza verisi bulunmuyor
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={faultStatusChartData.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {faultStatusChartData.filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performans Metrikleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b4513" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Özet İstatistikler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="text-right">Aktif/Tamamlanan</TableHead>
                      <TableHead className="text-right">Oran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Ekipman</TableCell>
                      <TableCell className="text-right">{equipmentStats.total}</TableCell>
                      <TableCell className="text-right">{equipmentStats.operational}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={equipmentStats.operational / equipmentStats.total > 0.8 ? "default" : "destructive"}>
                          {equipmentStats.total > 0 ? ((equipmentStats.operational / equipmentStats.total) * 100).toFixed(0) : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Arızalar</TableCell>
                      <TableCell className="text-right">{faultStats.total}</TableCell>
                      <TableCell className="text-right">{faultStats.resolved}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={faultStats.resolved / faultStats.total > 0.7 ? "default" : "destructive"}>
                          {faultStats.total > 0 ? ((faultStats.resolved / faultStats.total) * 100).toFixed(0) : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Checklist Görevleri</TableCell>
                      <TableCell className="text-right">{checklistStats.total}</TableCell>
                      <TableCell className="text-right">{checklistStats.completed}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={checklistStats.completionRate > 80 ? "default" : "destructive"}>
                          {Number(checklistStats.completionRate ?? 0).toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
            </>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ekipman Durumu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <span>Çalışır Durumda</span>
                    <Badge variant="default">{equipmentStats.operational}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <span>Bakımda</span>
                    <Badge variant="secondary">{equipmentStats.maintenance}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <span>Arızalı</span>
                    <Badge variant="destructive">{equipmentStats.faulty}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ekipman Türlerine Göre Dağılım</CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={equipmentChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {equipmentChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Ekipman verisi bulunamadı
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sağlık Skoru Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-primary">
                      {Number(equipmentStats.avgHealth ?? 0).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Ortalama Ekipman Sağlık Skoru</p>
                  </div>
                  <div className="w-32 h-32 relative">
                    <svg className="w-32 h-32 -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(equipmentStats.avgHealth / 100) * 351.86} 351.86`}
                        className="text-primary"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faults" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Öncelik Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {faultPriorityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={faultPriorityChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b4513" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Arıza verisi bulunamadı
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Çözüm Süresi Analizi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <div className="text-5xl font-bold text-primary">
                      {Number(faultStats.avgResolutionTime ?? 0).toFixed(1)}
                    </div>
                    <p className="text-muted-foreground mt-2">Ortalama Çözüm Süresi (Gün)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-semibold text-red-600">{faultStats.open}</div>
                      <p className="text-xs text-muted-foreground">Açık</p>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-yellow-600">{faultStats.inProgress}</div>
                      <p className="text-xs text-muted-foreground">İşlemde</p>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-green-600">{faultStats.resolved}</div>
                      <p className="text-xs text-muted-foreground">Çözüldü</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{checklistStats.completed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{checklistStats.pending}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gecikmiş</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{checklistStats.overdue}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tamamlanma Oranı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">İlerleme</span>
                    <span className="font-semibold">{Number(checklistStats.completionRate ?? 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${checklistStats.completionRate}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {checklistStats.completed} / {checklistStats.total} görev tamamlandı
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performans Skorları</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${Number(value ?? 0).toFixed(1)}%`, "Skor"]} />
                    <Bar dataKey="value" fill="#8b4513" radius={[4, 4, 0, 0]}>
                      {performanceChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.value >= 80 ? "#22c55e" : entry.value >= 60 ? "#f59e0b" : "#ef4444"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Genel Skor", value: performanceStats.avgComposite, icon: Target },
                { label: "Checklist", value: performanceStats.avgChecklist, icon: CheckSquare },
                { label: "Devamlılık", value: performanceStats.avgAttendance, icon: Users },
                { label: "SLA Uyum", value: performanceStats.avgSLA, icon: Clock },
                { label: "Müşteri Memnuniyeti", value: performanceStats.avgCustomer, icon: Star },
              ].map((metric, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <metric.icon className={`h-8 w-8 mb-2 ${metric.value >= 80 ? "text-green-600" : metric.value >= 60 ? "text-yellow-600" : "text-red-600"}`} />
                      <div className={`text-2xl font-bold ${metric.value >= 80 ? "text-green-600" : metric.value >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                        {Number(metric.value ?? 0).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
