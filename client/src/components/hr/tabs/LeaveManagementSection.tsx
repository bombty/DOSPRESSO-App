/**
 * LeaveManagementSection — İzin Yönetimi
 * Extracted from ik.tsx for maintainability
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Calendar, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function LeaveManagementSection({ employees }: { employees: User[] }) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // İzin bakiyeleri
  const { data: leaveBalances = [], isLoading: isLoadingLeaves } = useQuery<any[]>({
    queryKey: ['/api/employee-leaves', selectedYear],
  });

  // Resmi tatiller
  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<any[]>({
    queryKey: ['/api/public-holidays', selectedYear],
  });

  const leaveTypeLabels: Record<string, string> = {
    annual: "Yıllık İzin",
    sick: "Hastalık",
    maternity: "Doğum",
    paternity: "Babalık",
    marriage: "Evlilik",
    bereavement: "Vefat",
    unpaid: "Ücretsiz",
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* İzin Bakiyeleri */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>İzin Bakiyeleri</CardTitle>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]" data-testid="select-leave-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
              <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoadingLeaves ? (
            <ListSkeleton count={3} variant="row" />
          ) : leaveBalances.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="İzin bakiyesi yok"
              description="İzin bakiyesi bulunamadı."
              data-testid="empty-state-leaves"
            />
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {leaveBalances.map((item: any) => {
                const emp = item.users || {};
                const leave = item.employee_leaves || {};
                const usedPercent = leave.totalDays > 0 ? Math.round((leave.usedDays / leave.totalDays) * 100) : 0;
                return (
                  <Card key={leave.id || `${emp.id}-${leave.leaveType}`} className="p-3 hover-elevate" data-testid={`leave-card-${leave.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{leaveTypeLabels[leave.leaveType] || leave.leaveType}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant={leave.remainingDays > 5 ? "default" : leave.remainingDays > 0 ? "secondary" : "destructive"}>
                            {leave.remainingDays} gün kaldı
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {leave.usedDays}/{leave.totalDays} kullanıldı
                          {leave.carriedOver > 0 && ` (+${leave.carriedOver} devir)`}
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${usedPercent > 80 ? 'bg-destructive' : usedPercent > 50 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resmi Tatiller */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <CardTitle>Resmi Tatiller - {selectedYear}</CardTitle>
          </div>
          <Badge variant="outline">{holidays.length} tatil</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoadingHolidays ? (
            <ListSkeleton count={3} variant="row" />
          ) : holidays.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Tatil tanımlı değil"
              description={`${selectedYear} için resmi tatil tanımlı değil.`}
              data-testid="empty-state-holidays"
            />
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {holidays.map((holiday: any) => {
                const holidayDate = new Date(holiday.date);
                const today = new Date();
                const isPast = holidayDate < today;
                const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Card 
                    key={holiday.id} 
                    className={`p-3 hover-elevate ${isPast ? 'opacity-60' : ''}`}
                    data-testid={`holiday-card-${holiday.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(holidayDate, "dd MMMM yyyy")}
                          {holiday.isHalfDay && " (Yarım Gün)"}
                        </p>
                      </div>
                      <div>
                        {isPast ? (
                          <Badge variant="outline" className="text-muted-foreground">Geçti</Badge>
                        ) : daysUntil === 0 ? (
                          <Badge>Bugün!</Badge>
                        ) : daysUntil <= 7 ? (
                          <Badge variant="secondary">{daysUntil} gün kaldı</Badge>
                        ) : (
                          <Badge variant="outline">{daysUntil} gün</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
