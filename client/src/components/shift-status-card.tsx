import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Shift {
  id: number;
  startTime: string;
  endTime: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: string;
}

export function ShiftStatusCard() {
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/my"],
  });

  // Get today's shift
  const today = new Date().toISOString().split("T")[0];
  const todayShift = shifts?.find(
    (s) => s.date === today || new Date(s.date).toISOString().split("T")[0] === today
  );

  if (!todayShift) return null;

  const isCheckedIn = !!todayShift.checkInTime;
  const isCheckedOut = !!todayShift.checkOutTime;
  const startTime = todayShift.startTime ? new Date(`${todayShift.date}T${todayShift.startTime}`) : null;
  const checkInTime = todayShift.checkInTime ? new Date(todayShift.checkInTime) : null;
  const checkOutTime = todayShift.checkOutTime ? new Date(todayShift.checkOutTime) : null;

  // Calculate hours worked
  let hoursWorked = 0;
  if (checkInTime && checkOutTime) {
    hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  }

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            Bugünün Vardiyası
          </CardTitle>
          <Badge variant={isCheckedOut ? "outline" : isCheckedIn ? "default" : "secondary"}>
            {isCheckedOut ? "Çıkış Yapılmış" : isCheckedIn ? "Çalışıyor" : "Henüz Girmedi"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Shift Time */}
        {startTime && (
          <div className="flex items-center justify-between text-xs p-2 bg-background/50 rounded border border-primary/10">
            <span className="text-muted-foreground">Vardiya Saati:</span>
            <span className="font-medium">{format(startTime, "HH:mm", { locale: tr })}</span>
          </div>
        )}

        {/* Check-in Status */}
        <div className="flex items-center justify-between text-xs p-2 bg-background/50 rounded border border-primary/10">
          <span className="text-muted-foreground flex items-center gap-1">
            <LogIn className="h-3 w-3" /> Giriş:
          </span>
          <span className={`font-medium ${isCheckedIn ? "text-primary" : "text-muted-foreground"}`}>
            {isCheckedIn && checkInTime ? format(checkInTime, "HH:mm") : "—"}
          </span>
        </div>

        {/* Check-out Status */}
        {isCheckedIn && (
          <div className="flex items-center justify-between text-xs p-2 bg-background/50 rounded border border-primary/10">
            <span className="text-muted-foreground flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Çıkış:
            </span>
            <span className={`font-medium ${isCheckedOut ? "text-primary" : "text-orange-500"}`}>
              {isCheckedOut && checkOutTime ? format(checkOutTime, "HH:mm") : "Aktif"}
            </span>
          </div>
        )}

        {/* Hours Worked */}
        {hoursWorked > 0 && (
          <div className="flex items-center justify-between text-xs p-2 bg-success/10 rounded border border-success/20">
            <span className="text-muted-foreground">Çalışma Süresi:</span>
            <span className="font-bold text-success">{hoursWorked.toFixed(1)} saat</span>
          </div>
        )}

        {/* QR Check-in Prompt */}
        {!isCheckedIn && (
          <div className="text-xs text-muted-foreground text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
            QR Tarayıcı'yı kullanarak giriş yapınız
          </div>
        )}
      </CardContent>
    </Card>
  );
}
