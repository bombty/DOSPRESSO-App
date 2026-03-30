import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type UserRoleType } from "@shared/schema";
import { MobileFilterCollapse } from "@/components/mobile-filter-collapse";
import { CompactKPIStrip, type KPIItem } from "@/components/shared/UnifiedKPI";
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
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3,
  Download, 
  Users, 
  Clock, 
  Coffee, 
  TrendingUp, 
  AlertCircle,
  FileText,
  BookOpen,
  ArrowLeft
} from "lucide-react";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface ShiftAttendance {
  id: number;
  shiftId: number;
  userId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalBreakMinutes: number;
  totalWorkedMinutes: number;
  status: string;
  notes: string | null;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchId?: number;
}

interface Branch {
  id: number;
  name: string;
}

export default function HRReportsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [reportType, setReportType] = useState<"attendance" | "personnel" | "training">("attendance");

  const { data: attendanceRecords = [], isLoading: isLoadingAttendance, isError, refetch } = useQuery<ShiftAttendance[]>({
    queryKey: ['/api/shift-attendance', { dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await fetch(`/api/shift-attendance?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ['/api/employees'],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    enabled: isHQRole((user?.role || "") as UserRoleType),
  });

  const filteredAttendance = useMemo(() => {
    if (selectedBranchId === "all") return attendanceRecords;
    const branchEmployeeIds = employees
      .filter(emp => emp.branchId === parseInt(selectedBranchId))
      .map(emp => emp.id);
    return attendanceRecords.filter(record => branchEmployeeIds.includes(record.userId));
  }, [attendanceRecords, employees, selectedBranchId]);

  // Attendance Stats
  const attendanceStats = useMemo(() => {
    const totalRecords = filteredAttendance.length;
    const totalMinutesWorked = filteredAttendance.reduce((sum, r) => sum + r.totalWorkedMinutes, 0);
    const totalBreakMinutes = filteredAttendance.reduce((sum, r) => sum + r.totalBreakMinutes, 0);
    const totalHoursWorked = totalMinutesWorked / 60;
    const avgHoursPerShift = totalRecords > 0 ? totalHoursWorked / totalRecords : 0;
    const lateArrivals = filteredAttendance.filter(r => r.notes?.includes("late")).length;
    
    return {
      totalRecords,
      totalHoursWorked,
      avgHoursPerShift,
      totalBreakMinutes,
      lateArrivals,
    };
  }, [filteredAttendance]);

  const employeeBreakdown = useMemo(() => {
    const breakdown = new Map<string, {
      userId: string;
      name: string;
      shiftCount: number;
      totalHours: number;
      totalBreakMinutes: number;
      avgPerShift: number;
    }>();
    
    filteredAttendance.forEach(record => {
      const employee = employees.find(emp => emp.id === record.userId);
      if (!employee) return;
      
      const existing = breakdown.get(record.userId) || {
        userId: record.userId,
        name: `${employee.firstName} ${employee.lastName}`,
        shiftCount: 0,
        totalHours: 0,
        totalBreakMinutes: 0,
        avgPerShift: 0,
      };
      
      existing.shiftCount++;
      existing.totalHours += record.totalWorkedMinutes / 60;
      existing.totalBreakMinutes += record.totalBreakMinutes;
      existing.avgPerShift = existing.totalHours / existing.shiftCount;
      
      breakdown.set(record.userId, existing);
    });
    
    return Array.from(breakdown.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredAttendance, employees]);

  const exportToCSV = () => {
    const headers = ["Çalışan Adı", "Vardiya Sayısı", "Toplam Saat", "Toplam Mola (dk)", "Ortalama Saat/Vardiya"];
    const rows = employeeBreakdown.map(emp => [
      emp.name,
      emp.shiftCount.toString(),
      Number(emp.totalHours ?? 0).toFixed(2),
      emp.totalBreakMinutes.toString(),
      Number(emp.avgPerShift ?? 0).toFixed(2),
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ik-raporu-${dateFrom}-${dateTo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isLoadingAttendance || isLoadingEmployees;

  
  if (isLoadingAttendance) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              İK Raporları
            </h1>
            <p className="text-muted-foreground">
              Kapsamlı devam, personel ve performans raporları
            </p>
          </div>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={employeeBreakdown.length === 0}
          data-testid="button-export-csv"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          CSV İndir
        </Button>
      </div>

      {/* Filter Card */}
      <MobileFilterCollapse activeFilterCount={selectedBranchId !== "all" ? 1 : 0} testId="hr-filter">
      <Card>
        <CardHeader>
          <CardTitle>Filtreler ve Dönem</CardTitle>
          <CardDescription>Tarih aralığı ve şube seçin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 min-h-9 border border-input rounded-md bg-background"
              data-testid="input-date-from"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 min-h-9 border border-input rounded-md bg-background"
              data-testid="input-date-to"
            />
          </div>
          {isHQRole((user?.role || "") as UserRoleType) && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Şube</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[200px]" data-testid="select-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {(Array.isArray(branches) ? branches : []).map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      </MobileFilterCollapse>

      {/* Stats Cards */}
      <CompactKPIStrip
        items={[
          { label: "Vardiya", value: isLoading ? "..." : attendanceStats.totalRecords, icon: <Users className="h-4 w-4 text-primary" />, color: "info" },
          { label: "Toplam", value: isLoading ? "..." : `${Number(attendanceStats.totalHoursWorked ?? 0).toFixed(1)}h`, icon: <Clock className="h-4 w-4 text-success" />, color: "success" },
          { label: "Ortalama", value: isLoading ? "..." : `${Number(attendanceStats.avgHoursPerShift ?? 0).toFixed(1)}h`, icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />, color: "default" },
          { label: "Mola", value: isLoading ? "..." : `${attendanceStats.totalBreakMinutes}m`, icon: <Coffee className="h-4 w-4 text-warning" />, color: "warning" },
          { label: "Geç", value: isLoading ? "..." : attendanceStats.lateArrivals, icon: <AlertCircle className="h-4 w-4 text-destructive" />, color: attendanceStats.lateArrivals > 0 ? "danger" : "default" },
        ]}
        desktopColumns={5}
      />

      {/* Detailed Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Çalışan Bazında Detaylı Rapor
          </CardTitle>
          <CardDescription>
            {dateFrom && dateTo ? `${format(new Date(dateFrom), 'dd MMM yyyy', { locale: tr })} - ${format(new Date(dateTo), 'dd MMM yyyy', { locale: tr })}` : "Tüm zamanlar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : employeeBreakdown.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Devam kaydı yok"
              description="Seçili tarih aralığında devam kaydı bulunamadı."
              data-testid="empty-state-hr-reports"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Çalışan Adı</TableHead>
                    <TableHead className="text-right">Vardiya Sayısı</TableHead>
                    <TableHead className="text-right">Toplam Saat</TableHead>
                    <TableHead className="text-right">Toplam Mola (dk)</TableHead>
                    <TableHead className="text-right">Ort. Saat/Vardiya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeBreakdown.map((emp, idx) => (
                    <TableRow key={emp.userId} data-testid={`row-employee-${emp.userId}`}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{emp.shiftCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{Number(emp.totalHours ?? 0).toFixed(2)}h</TableCell>
                      <TableCell className="text-right">{emp.totalBreakMinutes}m</TableCell>
                      <TableCell className="text-right">{Number(emp.avgPerShift ?? 0).toFixed(2)}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg">Özet</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Raporlanan Dönem:</span>
            <span className="font-medium">{format(new Date(dateFrom), 'dd MMM yyyy', { locale: tr })} - {format(new Date(dateTo), 'dd MMM yyyy', { locale: tr })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toplam Çalışan:</span>
            <span className="font-medium">{employeeBreakdown.length} kişi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toplam Çalışılan Saat:</span>
            <span className="font-medium">{Number(attendanceStats.totalHoursWorked ?? 0).toFixed(1)} saat</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ortalama/Çalışan:</span>
            <span className="font-medium">{(attendanceStats.totalHoursWorked / (employeeBreakdown.length || 1)).toFixed(1)} saat</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
