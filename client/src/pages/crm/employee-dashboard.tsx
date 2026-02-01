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
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function EmployeeDashboard() {
  const { data, isLoading, error } = useQuery<MyStatsData>({
    queryKey: ['/api/crm/my-stats'],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Veriler Yüklenemedi</h3>
          <p className="text-muted-foreground text-sm">
            Kişisel istatistiklerinizi yüklerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
          </p>
        </Card>
      </div>
    );
  }

  const { user, attendance, leave, training, tasks, performance } = data;

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-employee-name">
            Merhaba, {user.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {user.branchName} - {user.role}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <TrendingUp className="w-3 h-3 mr-1" />
          Performans: %{performance.compositeScore || 0}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card data-testid="card-on-time-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Zamanında Gelme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">%{attendance.onTimeRate}</div>
            <p className="text-xs text-muted-foreground">
              Son 30 günde {attendance.totalShifts} vardiya
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-remaining-leave">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              Kalan İzin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{leave.remainingDays} gün</div>
            <p className="text-xs text-muted-foreground">
              Kullanılan: {leave.usedDays} gün
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-training-progress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Eğitim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{training.completedModules}</div>
            <p className="text-xs text-muted-foreground">
              Tamamlanan modül
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-task-completion">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-orange-600" />
              Görev Tamamlama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">%{tasks.completionRate}</div>
            <p className="text-xs text-muted-foreground">
              {tasks.completed}/{tasks.completed + tasks.pending + tasks.inProgress} görev
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-performance-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Puan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{performance.taskRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Görev değerlendirmesi
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Devam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-between items-center text-sm">
              <span>Geç</span>
              <Badge variant={attendance.lateArrivals > 3 ? "destructive" : "secondary"} className="text-xs">
                {attendance.lateArrivals}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Erken Çıkış</span>
              <Badge variant={attendance.earlyDepartures > 3 ? "destructive" : "secondary"} className="text-xs">
                {attendance.earlyDepartures}
              </Badge>
            </div>
            <Progress value={attendance.onTimeRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Eğitim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-between items-center text-sm">
              <span>Modül</span>
              <Badge variant="default" className="text-xs">{training.completedModules}/{training.totalModules}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Quiz</span>
              <Badge variant="secondary" className="text-xs">{training.passedQuizzes}/{training.totalQuizAttempts}</Badge>
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
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              İzin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-between items-center text-sm">
              <span>Kalan</span>
              <Badge variant="default" className="text-xs">{leave.remainingDays} gün</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Bekleyen</span>
              <Badge variant={leave.pendingRequests > 0 ? "secondary" : "outline"} className="text-xs">
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
