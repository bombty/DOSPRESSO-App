import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Wrench } from "lucide-react";

interface ManagerDashboardProps {
  branchName?: string;
  completedTasks: number;
  pendingTasks: number;
  openFaults: number;
  completionRate: number;
  teamPerformance?: any[];
  isLoading: boolean;
}

export function ManagerDashboard({
  branchName,
  completedTasks,
  pendingTasks,
  openFaults,
  completionRate,
  teamPerformance,
  isLoading,
}: ManagerDashboardProps) {
  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header with branch name */}
      {branchName && (
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-2xl font-bold text-blue-900">{branchName}</h2>
          <Badge variant="outline" className="text-xs">Şube Müdürü</Badge>
        </div>
      )}

      {/* KPI Cards - Manager View */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-600 cursor-pointer hover-elevate">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-700">{completedTasks}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Tamamlanan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 cursor-pointer hover-elevate">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-700">{pendingTasks}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Beklemede</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 cursor-pointer hover-elevate">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-red-700">{openFaults}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Arızalar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-amber-700">%{completionRate}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Oran</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {teamPerformance && teamPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-5 w-5" />
              Takım Performansı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamPerformance.slice(0, 5).map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-semibold text-sm">{member.firstName} {member.lastName?.charAt(0)}.</p>
                    <p className="text-xs text-muted-foreground">{member.username}</p>
                  </div>
                  <Badge variant={member.averageScore >= 80 ? "default" : "secondary"}>
                    {member.averageScore.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}
    </div>
  );
}
