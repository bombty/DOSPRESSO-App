import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type UserRoleType } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Download, Users, Clock, Coffee, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";

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
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
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

  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useQuery<ShiftAttendance[]>({
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

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<Branch[]>({
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

  const stats = useMemo(() => {
    const totalRecords = filteredAttendance.length;
    const totalMinutesWorked = filteredAttendance.reduce((sum, r) => sum + r.totalWorkedMinutes, 0);
    const totalBreakMinutes = filteredAttendance.reduce((sum, r) => sum + r.totalBreakMinutes, 0);
    const totalHoursWorked = totalMinutesWorked / 60;
    const avgHoursPerShift = totalRecords > 0 ? totalHoursWorked / totalRecords : 0;
    
    return {
      totalRecords,
      totalHoursWorked,
      avgHoursPerShift,
      totalBreakMinutes,
    };
  }, [filteredAttendance]);

  const employeeBreakdown = useMemo(() => {
    const breakdown = new Map<string, {
      userId: string;
      name: string;
      shiftCount: number;
      totalHours: number;
      totalBreakMinutes: number;
    }>();
    
    filteredAttendance.forEach(record => {
      const employee = employees.find(emp => emp.id === record.userId);
      if (!employee) return;
      
      const existing = breakdown.get(record.userId) || {
        userId: record.userId,
        name: employee.name,
        shiftCount: 0,
        totalHours: 0,
        totalBreakMinutes: 0,
      };
      
      existing.shiftCount++;
      existing.totalHours += record.totalWorkedMinutes / 60;
      existing.totalBreakMinutes += record.totalBreakMinutes;
      
      breakdown.set(record.userId, existing);
    });
    
    return Array.from(breakdown.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredAttendance, employees]);

  const exportToCSV = () => {
    const headers = ["Çalışan Adı", "Vardiya Sayısı", "Toplam Saat", "Toplam Mola (dk)", "Ortalama Saat/Vardiya"];
    const rows = employeeBreakdown.map(emp => [
      emp.name,
      emp.shiftCount.toString(),
      emp.totalHours.toFixed(2),
      emp.totalBreakMinutes.toString(),
      (emp.totalHours / emp.shiftCount).toFixed(2),
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `devam-raporu-${dateFrom}-${dateTo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isLoadingAttendance || isLoadingEmployees || isLoadingBranches;

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-hr-reports">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Devam Raporları
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Çalışan devam kayıtları ve istatistikler
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={employeeBreakdown.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4 mr-2" />
          CSV İndir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Tarih aralığı ve şube seçin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="date-from" className="text-sm font-medium">Başlangıç Tarihi</label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 min-h-9 border border-input rounded-md bg-background"
              data-testid="input-date-from"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="date-to" className="text-sm font-medium">Bitiş Tarihi</label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 min-h-9 border border-input rounded-md bg-background"
              data-testid="input-date-to"
            />
          </div>
          {isHQRole((user?.role || "") as UserRoleType) && (
            <div className="flex flex-col gap-2">
              <label htmlFor="branch-select" className="text-sm font-medium">Şube</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[200px]" data-testid="select-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map(branch => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-records">
                {stats.totalRecords}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Saat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-hours">
                {stats.totalHoursWorked.toFixed(1)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ort. Saat/Vardiya</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-avg-hours">
                {stats.avgHoursPerShift.toFixed(1)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Mola (dk)</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-break">
                {stats.totalBreakMinutes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Çalışan Bazında Detay</CardTitle>
          <CardDescription>
            {dateFrom && dateTo ? `${format(new Date(dateFrom), 'dd/MM/yyyy')} - ${format(new Date(dateTo), 'dd/MM/yyyy')}` : "Tüm zamanlar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : employeeBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-data">
              Seçili tarih aralığında devam kaydı bulunamadı
            </div>
          ) : (
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
                {employeeBreakdown.map((emp) => (
                  <TableRow key={emp.userId} data-testid={`row-employee-${emp.userId}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${emp.userId}`}>
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-shift-count-${emp.userId}`}>
                      {emp.shiftCount}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-total-hours-${emp.userId}`}>
                      {emp.totalHours.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-break-minutes-${emp.userId}`}>
                      {emp.totalBreakMinutes}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-avg-hours-${emp.userId}`}>
                      {(emp.totalHours / emp.shiftCount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
