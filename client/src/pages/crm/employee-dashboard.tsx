import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Calendar, 
  GraduationCap, 
  CheckSquare, 
  TrendingUp,
  AlertCircle,
  Award,
  Target,
  BookOpen,
  ClipboardList
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface MyStatsData {
  user: {
    name: string;
    role: string;
    branchName: string;
  };
  attendance: {
    totalShifts: number;
    lateArrivals: number;
    earlyDepartures: number;
    onTimeRate: number;
  };
  leave: {
    usedDays: number;
    remainingDays: number;
    pendingRequests: number;
    approvedThisYear: number;
  };
  training: {
    completedModules: number;
    inProgressModules: number;
    totalModules: number;
    passedQuizzes: number;
    totalQuizAttempts: number;
  };
  tasks: {
    completed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
  };
  performance: {
    compositeScore: number;
    taskRating: number;
  };
}

function StatCardSkeleton() {
  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function EmployeeDashboard() {
  const { data, isLoading, error, isError, refetch } = useQuery<MyStatsData>({
    queryKey: ['/api/crm/my-stats'],
  });

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        <Skeleton className="h-8 w-48 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[400px]">
        <Card className="p-3 text-center max-w-md">
          <AlertCircle className="w-4 h-4 text-destructive mx-auto mb-4" />
          <h3 className="text-sm font-semibold mb-2">Veriler Yüklenemedi</h3>
          <p className="text-muted-foreground text-xs">
            Kişisel istatistiklerinizi yüklerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
          </p>
        </Card>
      </div>
    );
  }

  const { user, attendance, leave, training, tasks, performance } = data;

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold" data-testid="text-employee-name">
            Merhaba, {user.name}
          </h1>
          <p className="text-muted-foreground text-xs">
            {user.branchName} - {user.role}
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-[10px]">
          <TrendingUp className="w-3.5 h-3.5 mr-1" />
          Performans: %{performance.compositeScore || 0}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Card data-testid="card-on-time-rate">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Zamanında Gelme
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-primary">%{attendance.onTimeRate}</div>
            <p className="text-[10px] text-muted-foreground">
              Son 30 günde {attendance.totalShifts} vardiya
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-remaining-leave">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-green-600" />
              Kalan İzin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-green-600">{leave.remainingDays} gün</div>
            <p className="text-[10px] text-muted-foreground">
              Kullanılan: {leave.usedDays} gün
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-training-progress">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              Eğitim
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-blue-600">{training.completedModules}</div>
            <p className="text-[10px] text-muted-foreground">
              Tamamlanan modül
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-task-completion">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
              Görev Tamamlama
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-orange-600">%{tasks.completionRate}</div>
            <p className="text-[10px] text-muted-foreground">
              {tasks.completed}/{tasks.completed + tasks.pending + tasks.inProgress} görev
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-performance-score">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              Puan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-purple-600">{performance.taskRating.toFixed(1)}</div>
            <p className="text-[10px] text-muted-foreground">
              Görev değerlendirmesi
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Devam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="flex justify-between items-center text-xs">
              <span>Geç</span>
              <Badge variant={attendance.lateArrivals > 3 ? "destructive" : "secondary"} className="text-[10px]">
                {attendance.lateArrivals}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Erken Çıkış</span>
              <Badge variant={attendance.earlyDepartures > 3 ? "destructive" : "secondary"} className="text-[10px]">
                {attendance.earlyDepartures}
              </Badge>
            </div>
            <Progress value={attendance.onTimeRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Eğitim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="flex justify-between items-center text-xs">
              <span>Modül</span>
              <Badge variant="default" className="text-[10px]">{training.completedModules}/{training.totalModules}</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Quiz</span>
              <Badge variant="secondary" className="text-[10px]">{training.passedQuizzes}/{training.totalQuizAttempts}</Badge>
            </div>
            {training.totalModules > 0 && (
              <Progress 
                value={Math.round((training.completedModules / training.totalModules) * 100)} 
                className="h-1.5 mt-2" 
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <Target className="w-3.5 h-3.5" />
              İzin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="flex justify-between items-center text-xs">
              <span>Kalan</span>
              <Badge variant="default" className="text-[10px]">{leave.remainingDays} gün</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Bekleyen</span>
              <Badge variant={leave.pendingRequests > 0 ? "secondary" : "outline"} className="text-[10px]">
                {leave.pendingRequests}
              </Badge>
            </div>
            <Progress value={(leave.usedDays / 14) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
