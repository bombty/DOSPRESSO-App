import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Award,
  Target
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

interface AgentPerformance {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  branchName?: string;
  stats: {
    resolved: number;
    avgResolutionTime: number;
    slaCompliance: number;
    taskRating: number;
    checklistCompletion: number;
    compositeScore: number;
  };
}

interface PerformanceData {
  agents: AgentPerformance[];
  teamStats: {
    totalResolved: number;
    avgResolutionTime: number;
    avgSlaCompliance: number;
    avgTaskRating: number;
  };
  weeklyComparison: { name: string; thisWeek: number; lastWeek: number }[];
}

export default function CRMPerformance() {
  const { data: performance, isLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/crm/performance"],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Performans verileri yüklenemedi
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-testid="stat-total-resolved">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{performance.teamStats.totalResolved}</p>
                  <p className="text-xs text-muted-foreground">Toplam Çözülen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-avg-time">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{performance.teamStats.avgResolutionTime}s</p>
                  <p className="text-xs text-muted-foreground">Ort. Çözüm Süresi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-sla">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{performance.teamStats.avgSlaCompliance}%</p>
                  <p className="text-xs text-muted-foreground">SLA Uyumu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-rating">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{performance.teamStats.avgTaskRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Ort. Değerlendirme</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="chart-weekly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Haftalık Karşılaştırma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.weeklyComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }} 
                  />
                  <Bar dataKey="lastWeek" fill="#94a3b8" name="Geçen Hafta" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="thisWeek" fill="#22c55e" name="Bu Hafta" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="table-agents">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personel Performansı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performance.agents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz veri yok</p>
              ) : (
                performance.agents.map((agent, index) => (
                  <div 
                    key={agent.id} 
                    className="p-3 rounded-lg bg-muted/30 space-y-2"
                    data-testid={`agent-performance-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.role} {agent.branchName && `• ${agent.branchName}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{agent.stats.compositeScore.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Genel Skor</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Çözülen</p>
                        <p className="font-medium">{agent.stats.resolved}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ort. Süre</p>
                        <p className="font-medium">{agent.stats.avgResolutionTime}s</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SLA</p>
                        <p className="font-medium">{agent.stats.slaCompliance}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Checklist</p>
                        <p className="font-medium">{agent.stats.checklistCompletion}%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">Performans</span>
                      <Progress value={agent.stats.compositeScore * 20} className="flex-1 h-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
