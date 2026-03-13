import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Wrench, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import { GaugeCard, KPICard, PerformanceRow } from "./shared-dashboard-components";
import { calculateAverageScore } from "./dashboard-utils";

interface ManagerDashboardProps {
  completedTasks: number;
  pendingTasks: number;
  openFaults: number;
  completionRate: number;
  teamPerformance?: any[];
  isLoading: boolean;
}

export function ManagerDashboard({
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
  const avgTeamPerf = calculateAverageScore(teamPerformance?.map(m => m.averageScore) || []);
  const healthScore = Math.max(0, 100 - (openFaults * 10));

  // Chart data for team distribution - ALL members
  const chartData = teamPerformance?.map(m => ({
    name: `${m.firstName} ${m.lastName?.charAt(0) || ''}`.trim(),
    score: m.averageScore,
  })) || [];

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Performance Gauges */}
      {!isLoading && (
        <div className="grid gap-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <GaugeCard label="Görev" value={completionRate} icon={CheckCircle} />
          <GaugeCard label="Takım" value={avgTeamPerf} icon={Users} />
          <GaugeCard label="Sağlık" value={healthScore} icon={Zap} />
        </div>
      )}

      {/* KPI Cards - Manager View */}
      <div className="grid gap-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <KPICard icon={CheckCircle} label="Tamamlanan" value={`${completedTasks}/${totalTasks}`} color="green" onClick={() => navigate('/gorevler')} testId="card-completed-tasks" />
        <KPICard icon={Clock} label="Beklemede" value={`${pendingTasks}/${totalTasks}`} color="blue" onClick={() => navigate('/gorevler')} testId="card-pending-tasks" />
        <KPICard icon={AlertTriangle} label="Arızalar" value={openFaults} color="red" onClick={() => navigate('/ariza')} testId="card-faults" />
        <KPICard icon={TrendingUp} label="Oran" value={completionRate} suffix="%" color="amber" onClick={() => navigate('/gorevler')} testId="card-completion-rate" />
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
                <PerformanceRow 
                  key={member.userId}
                  name={`${member.firstName} ${member.lastName?.charAt(0) || ''}.`}
                  score={member.averageScore}
                  onClick={() => navigate(`/personel-detay/${member.userId}`)}
                  testId={`row-employee-${member.userId}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}
    </div>
  );
}
