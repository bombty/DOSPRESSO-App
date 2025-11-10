import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, LogIn, LogOut, Coffee, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: activeShift, isLoading: activeLoading } = useQuery<any>({
    queryKey: ["/api/shift-attendance/active"],
    queryFn: async () => {
      const res = await fetch("/api/shift-attendance");
      if (!res.ok) throw new Error(res.statusText);
      const allShifts = await res.json();
      return allShifts.find((s: any) => !s.checkOutTime);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: attendanceHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/shift-attendance"],
    queryFn: async () => {
      const res = await fetch("/api/shift-attendance");
      if (!res.ok) throw new Error(res.statusText);
      const allShifts = await res.json();
      return allShifts.filter((s: any) => s.checkOutTime).slice(0, 10);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeShift || !activeShift.checkInTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const checkInTime = new Date(activeShift.checkInTime).getTime();
      let elapsed = now - checkInTime;

      if (activeShift.breakStartTime && !activeShift.breakEndTime) {
        const breakStart = new Date(activeShift.breakStartTime).getTime();
        elapsed -= (now - breakStart);
      } else if (activeShift.breakStartTime && activeShift.breakEndTime) {
        const breakStart = new Date(activeShift.breakStartTime).getTime();
        const breakEnd = new Date(activeShift.breakEndTime).getTime();
        elapsed -= (breakEnd - breakStart);
      }

      setElapsedTime(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeShift]);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/shift-attendance", {
        shiftDate: new Date().toISOString(),
        checkInTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Vardiyaya giriş yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest("PATCH", `/api/shift-attendance/${activeShift.id}`, {
        checkOutTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Vardiyadan çıkış yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Çıkış yapılamadı",
        variant: "destructive",
      });
    },
  });

  const startBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest("PATCH", `/api/shift-attendance/${activeShift.id}`, {
        breakStartTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mola başlatıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mola başlatılamadı",
        variant: "destructive",
      });
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest("PATCH", `/api/shift-attendance/${activeShift.id}`, {
        breakEndTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Mola sonlandırıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mola sonlandırılamadı",
        variant: "destructive",
      });
    },
  });

  const isOnBreak = activeShift?.breakStartTime && !activeShift?.breakEndTime;
  const canStartBreak = activeShift && !activeShift.breakStartTime;
  const canEndBreak = isOnBreak;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Devam Takibi</h1>
        <p className="text-muted-foreground">Vardiya giriş/çıkış ve mola yönetimi</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {activeShift ? "Aktif Vardiya" : "Vardiya Durumu"}
            </CardTitle>
            <CardDescription>
              {activeShift
                ? "Vardiyada çalışıyorsunuz"
                : "Vardiyaya giriş yapmadınız"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : activeShift ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Giriş Saati</span>
                    <span className="font-medium" data-testid="text-checkin-time">
                      {format(new Date(activeShift.checkInTime), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Geçen Süre</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-elapsed-time">
                      {formatElapsedTime(elapsedTime)}
                    </span>
                  </div>
                  {isOnBreak && (
                    <Badge variant="secondary" className="w-full justify-center" data-testid="badge-on-break">
                      <Coffee className="mr-2 h-3 w-3" />
                      Molada
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {canStartBreak && (
                    <Button
                      onClick={() => startBreakMutation.mutate()}
                      disabled={startBreakMutation.isPending}
                      variant="outline"
                      data-testid="button-start-break"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Mola Başlat
                    </Button>
                  )}
                  {canEndBreak && (
                    <Button
                      onClick={() => endBreakMutation.mutate()}
                      disabled={endBreakMutation.isPending}
                      variant="outline"
                      data-testid="button-end-break"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Mola Bitir
                    </Button>
                  )}
                  <Button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    variant="destructive"
                    data-testid="button-checkout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-checkin"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Vardiyaya Giriş
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bu Hafta
            </CardTitle>
            <CardDescription>Toplam çalışma süresi özeti</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Vardiya</span>
                  <span className="text-2xl font-bold" data-testid="text-total-shifts">
                    {attendanceHistory.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam Çalışma</span>
                  <span className="font-medium" data-testid="text-total-worked">
                    {formatElapsedTime(
                      attendanceHistory.reduce((sum, s) => sum + (s.totalWorkedMinutes || 0), 0) * 60000
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devam Geçmişi</CardTitle>
          <CardDescription>Son 10 vardiya kaydı</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Giriş</TableHead>
                  <TableHead>Çıkış</TableHead>
                  <TableHead>Çalışma Süresi</TableHead>
                  <TableHead>Mola Süresi</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Devam kaydı bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceHistory.map((record) => (
                    <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <TableCell className="font-medium">
                        {format(new Date(record.shiftDate), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        {record.checkInTime
                          ? format(new Date(record.checkInTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.totalWorkedMinutes
                          ? `${Math.floor(record.totalWorkedMinutes / 60)}s ${record.totalWorkedMinutes % 60}d`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.totalBreakMinutes
                          ? `${Math.floor(record.totalBreakMinutes / 60)}s ${record.totalBreakMinutes % 60}d`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" data-testid={`badge-status-${record.id}`}>
                          Tamamlandı
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
