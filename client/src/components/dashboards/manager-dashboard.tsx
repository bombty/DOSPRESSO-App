import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Wrench, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";

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
  const [, navigate] = useLocation();
  // Calculate metrics
  const totalTasks = completedTasks + pendingTasks;
  const avgTeamPerf = teamPerformance?.length ? 
    Math.round(teamPerformance.reduce((sum, m) => sum + m.averageScore, 0) / teamPerformance.length) : 0;
  const healthScore = Math.max(0, 100 - (openFaults * 10)); // Fault-based health

  // Chart data for team distribution - ALL members
  const chartData = teamPerformance?.map(m => ({
    name: `${m.firstName} ${m.lastName?.charAt(0) || ''}`.trim(),
    score: m.averageScore,
  })) || [];

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header with branch name */}
      {branchName && (
        <div className="flex items-center gap-2">
          <h2 className="text-lg md:text-2xl font-bold text-blue-900">{branchName}</h2>
          <Badge variant="outline" className="text-xs">Şube Müdürü</Badge>
        </div>
      )}

      {/* Performance Gauges */}
      {!isLoading && (
        <div className="grid gap-0.5 grid-cols-3">
          {[
            { label: 'Görev', value: completionRate, icon: CheckCircle, color: 'green' },
            { label: 'Takım', value: avgTeamPerf, icon: Users, color: 'blue' },
            { label: 'Sağlık', value: healthScore, icon: Zap, color: healthScore >= 70 ? 'green' : healthScore >= 50 ? 'yellow' : 'red' }
          ].map((gauge) => (
            <Card key={gauge.label}>
              <CardContent className="pt-1.5 pb-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">{gauge.label}</span>
                  <gauge.icon className={`h-2.5 w-2.5 text-${gauge.color}-600`} />
                </div>
                <div className={`text-base font-bold text-${gauge.color}-700`}>{gauge.value}%</div>
                <Progress value={gauge.value} className="h-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards - Manager View */}
      <div className="grid gap-0.5 grid-cols-4">
        <Card className="border-l-4 border-l-green-600 cursor-pointer hover-elevate" onClick={() => navigate('/tasks')} data-testid="card-completed-tasks">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div className="text-sm font-bold text-green-700">{completedTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 cursor-pointer hover-elevate" onClick={() => navigate('/tasks')} data-testid="card-pending-tasks">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-700">{pendingTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Beklemede</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 cursor-pointer hover-elevate" onClick={() => navigate('/faults')} data-testid="card-faults">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="text-sm font-bold text-red-700">{openFaults}</div>
            <p className="text-xs text-muted-foreground">Arızalar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600 cursor-pointer hover-elevate" onClick={() => navigate('/tasks')} data-testid="card-completion-rate">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-sm font-bold text-amber-700">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">Oran</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Chart - ALL Members */}
      {!isLoading && chartData.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-sm">Takım Performans Grafiği - Tüm Personeller ({chartData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: chartData.length > 10 ? 400 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: chartData.length > 8 ? 100 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={chartData.length > 8 ? -45 : 0}
                    textAnchor={chartData.length > 8 ? "end" : "middle"}
                  />
                  <YAxis domain={[0, 100]} />
                  <Legend />
                  <Bar dataKey="score" fill="#1F3A93" name="Skor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Performance List */}
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
                <div key={member.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{member.firstName} {member.lastName?.charAt(0)}.</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          member.averageScore >= 80 ? 'bg-green-600' : member.averageScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${member.averageScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <Badge variant={member.averageScore >= 80 ? "default" : "secondary"} className="flex-shrink-0">
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
