import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Clock,
  CheckCircle2,
  ClipboardList,
  ListTodo,
  AlertCircle,
  Timer,
  ArrowRight,
} from "lucide-react";
import logoUrl from "@assets/IMG_6637_1765138781125.png";

interface EmployeeDashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId: number | null;
  };
  myShifts: Array<{
    id: number;
    shiftDate: string;
    startTime: string;
    endTime: string;
    shiftType: string;
    status: string;
  }>;
  myChecklists: Array<{
    id: number;
    checklistId: number;
    status: string;
    completedTasks: number;
    totalTasks: number;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    isLate: boolean | null;
    checklistTitle: string | null;
    checklistCategory: string | null;
  }>;
  myTasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
}

const REDIRECT_SECONDS = 10;

const SHIFT_TYPE_LABELS: Record<string, string> = {
  morning: "Sabah Vardiyası",
  evening: "Akşam Vardiyası",
  night: "Gece Vardiyası",
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [paused, setPaused] = useState(false);

  const userId = user?.id;

  const { data, isLoading } = useQuery<EmployeeDashboardData>({
    queryKey: ["/api/employee-dashboard", userId],
    queryFn: async () => {
      const res = await fetch(`/api/employee-dashboard/${userId}`);
      if (!res.ok) throw new Error("Veri alınamadı");
      return res.json();
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) {
      setLocation("/login");
      return;
    }
  }, [userId, setLocation]);

  useEffect(() => {
    if (paused || !user?.branchId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/sube/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paused, user?.branchId, setLocation]);

  if (!userId) return null;

  const today = new Date();
  const pendingChecklists = data?.myChecklists.filter(
    (c) => c.status !== "completed" && c.status !== "submitted" && c.status !== "reviewed"
  ) || [];
  const completedChecklists = data?.myChecklists.filter(
    (c) => c.status === "completed" || c.status === "submitted" || c.status === "reviewed"
  ) || [];
  const pendingTasks = data?.myTasks.filter(
    (t) => t.status !== "completed" && t.status !== "verified" && t.status !== "cancelled"
  ) || [];
  const completedTasksList = data?.myTasks.filter(
    (t) => t.status === "completed" || t.status === "verified"
  ) || [];

  const hasPendingItems = pendingChecklists.length > 0 || pendingTasks.length > 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-red-600";
      case "high": return "text-orange-600";
      case "medium": return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-3 py-2">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="DOSPRESSO" className="h-7 cursor-pointer" onClick={() => setLocation("/")} />
            <div>
              <h1 className="text-sm font-bold" data-testid="text-employee-name">
                {data?.user?.firstName || user?.firstName || ""} {data?.user?.lastName || user?.lastName || ""}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          </div>

          {user?.branchId && (
            <div
              className="flex items-center gap-1.5 cursor-pointer"
              onClick={() => {
                if (paused) {
                  setCountdown(REDIRECT_SECONDS);
                  setPaused(false);
                } else {
                  setPaused(true);
                }
              }}
              data-testid="countdown-control"
            >
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(countdown / REDIRECT_SECONDS) * 94.2} 94.2`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" data-testid="text-countdown">
                  {paused ? "||" : countdown}
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {data?.myShifts && data.myShifts.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bugünkü Vardiya</p>
                      <p className="text-sm font-bold" data-testid="text-today-shift">
                        {SHIFT_TYPE_LABELS[data.myShifts[0].shiftType] || data.myShifts[0].shiftType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.myShifts[0].startTime?.slice(0, 5)} - {data.myShifts[0].endTime?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasPendingItems && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Bekleyen Görevlerin Var
                  </p>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400/80">
                  {pendingChecklists.length > 0 && `${pendingChecklists.length} checklist`}
                  {pendingChecklists.length > 0 && pendingTasks.length > 0 && " ve "}
                  {pendingTasks.length > 0 && `${pendingTasks.length} görev`}
                  {" "}tamamlanmayı bekliyor
                </p>
              </div>
            )}

            {pendingChecklists.length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
                    Bekleyen Checklistler
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {pendingChecklists.map((cl) => (
                    <div
                      key={cl.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5"
                      data-testid={`my-checklist-pending-${cl.id}`}
                    >
                      <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{cl.checklistTitle || "Checklist"}</p>
                        {cl.timeWindowStart && (
                          <p className="text-[10px] text-muted-foreground">
                            <Timer className="h-3 w-3 inline mr-0.5" />
                            {cl.timeWindowStart?.slice(0, 5)} - {cl.timeWindowEnd?.slice(0, 5)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Progress value={cl.totalTasks > 0 ? (cl.completedTasks / cl.totalTasks) * 100 : 0} className="w-12 h-1.5" />
                        <span className="text-[10px] text-muted-foreground">{cl.completedTasks}/{cl.totalTasks}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {pendingTasks.length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <ListTodo className="h-3.5 w-3.5 text-orange-600" />
                    Bekleyen Görevler
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border"
                      data-testid={`my-task-pending-${task.id}`}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        task.priority === "critical" ? "bg-red-500" :
                        task.priority === "high" ? "bg-orange-500" :
                        task.priority === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title || "Görev"}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                        {task.priority === "critical" ? "Kritik" :
                         task.priority === "high" ? "Yüksek" :
                         task.priority === "medium" ? "Orta" : "Normal"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {completedChecklists.length > 0 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tamamlanan ({completedChecklists.length + completedTasksList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {completedChecklists.map((cl) => (
                    <div key={cl.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 text-xs" data-testid={`my-checklist-done-${cl.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="truncate text-muted-foreground">{cl.checklistTitle || "Checklist"}</span>
                      <Badge variant="default" className="text-[10px] bg-green-600 ml-auto shrink-0">{cl.completedTasks}/{cl.totalTasks}</Badge>
                    </div>
                  ))}
                  {completedTasksList.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 text-xs" data-testid={`my-task-done-${task.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span className="truncate text-muted-foreground line-through">{task.title || "Görev"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {!hasPendingItems && completedChecklists.length === 0 && completedTasksList.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-70" />
                  <p className="text-sm font-medium">Bugün atanmış görev bulunmuyor</p>
                  <p className="text-xs text-muted-foreground mt-1">Harika bir gün!</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
