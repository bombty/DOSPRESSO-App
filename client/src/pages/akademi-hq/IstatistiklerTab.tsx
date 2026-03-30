import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompactKPIStrip, type KPIItem } from "@/components/shared/UnifiedKPI";
import { BookOpen, Users, TrendingUp, Award, BarChart3 } from "lucide-react";
import type { TrainingModule } from "@shared/schema";

interface BranchAnalytics {
  branchId: number;
  branchName: string;
  activeStudents: number;
  completedQuizzes: number;
  avgScore: number;
  completionRate: number;
}

interface TrainingStats {
  totalModules?: number;
  publishedModules?: number;
  totalEnrollments?: number;
  avgCompletionRate?: number;
  personnelProgress?: { userId: string; userName?: string; completedModules: number; totalModules: number; avgScore: number }[];
}

export function IstatistiklerTab() {
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const { data: trainingModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch(`/api/training/modules`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: branchAnalytics = [] } = useQuery<BranchAnalytics[]>({
    queryKey: ["/api/academy/branch-analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/branch-analytics`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: trainingStats = null } = useQuery<TrainingStats | null>({
    queryKey: ["/api/training/stats"],
    queryFn: async () => {
      const res = await fetch(`/api/training/stats`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ["/api/academy/quizzes"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/quizzes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(`/api/users`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const totalModules = trainingModules.length;
  const publishedModules = trainingModules.filter(m => m.isPublished).length;
  const totalActiveStudents = branchAnalytics.reduce((sum, b) => sum + (b.activeStudents || 0), 0);
  const avgCompletionRate = branchAnalytics.length > 0
    ? Math.round(branchAnalytics.reduce((sum, b) => sum + (b.completionRate || 0), 0) / branchAnalytics.length)
    : 0;
  const avgQuizScore = branchAnalytics.length > 0
    ? Math.round(branchAnalytics.reduce((sum, b) => sum + (b.avgScore || 0), 0) / branchAnalytics.length)
    : 0;

  const kpiItems: KPIItem[] = [
    { label: "Aktif Öğrenci", value: totalActiveStudents, icon: <Users className="w-4 h-4" />, testId: "stat-active-learners" },
    { label: "Tamamlanma Oranı", value: `%${avgCompletionRate}`, icon: <TrendingUp className="w-4 h-4" />, testId: "stat-overall-completion" },
    { label: "Ort. Quiz Puanı", value: avgQuizScore, icon: <BarChart3 className="w-4 h-4" />, testId: "stat-avg-quiz-score" },
    { label: "Toplam Modül", value: totalModules, icon: <BookOpen className="w-4 h-4" />, subtitle: `${publishedModules} yayında`, testId: "stat-total-modules" },
  ];

  return (
    <div className="w-full space-y-3">
      <CompactKPIStrip items={kpiItems} desktopColumns={4} testId="stats-kpi" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Modül Bazlı İstatistikler</h2>
        <div className="flex gap-1 flex-wrap">
          {[
            { value: "all", label: "Tüm Zamanlar" },
            { value: "month", label: "Bu Ay" },
            { value: "week", label: "Bu Hafta" },
          ].map(f => (
            <Button key={f.value} size="sm" variant={periodFilter === f.value ? "default" : "outline"} onClick={() => setPeriodFilter(f.value)} data-testid={`filter-period-${f.value}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Modül</TableHead>
                  <TableHead className="text-xs">Seviye</TableHead>
                  <TableHead className="text-xs">Kapsam</TableHead>
                  <TableHead className="text-xs text-center">Durum</TableHead>
                  <TableHead className="text-xs text-right">Süre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingModules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Henüz modül yok
                    </TableCell>
                  </TableRow>
                ) : (
                  trainingModules.map((module) => (
                    <TableRow key={module.id} data-testid={`stat-module-row-${module.id}`}>
                      <TableCell className="text-xs font-medium max-w-48 truncate">{module.title}</TableCell>
                      <TableCell className="text-xs">
                        {module.level === 'beginner' ? 'Başlangıç' : module.level === 'intermediate' ? 'Orta' : 'İleri'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {(module as any).scope === 'factory' ? 'Fabrika' : (module as any).scope === 'both' ? 'Tümü' : 'Şube'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant={module.isPublished ? "default" : "secondary"} className="text-xs">
                          {module.isPublished ? "Yayında" : "Taslak"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">{module.estimatedDuration} dk</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {trainingStats?.personnelProgress && trainingStats.personnelProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4" />
              Personel İlerleme Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Personel</TableHead>
                    <TableHead className="text-xs text-right">Tamamlanan</TableHead>
                    <TableHead className="text-xs text-right">Ort. Puan</TableHead>
                    <TableHead className="text-xs text-right">İlerleme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingStats.personnelProgress?.map((person, idx) => {
                    const pct = person.totalModules > 0 ? Math.round((person.completedModules / person.totalModules) * 100) : 0;
                    return (
                      <TableRow key={person.userId || idx} data-testid={`personnel-stat-${idx}`}>
                        <TableCell className="text-xs font-medium">{person.userName || person.userId}</TableCell>
                        <TableCell className="text-xs text-right">{person.completedModules}/{person.totalModules}</TableCell>
                        <TableCell className="text-xs text-right">{person.avgScore != null ? Number(person.avgScore).toFixed(1) : '\u2014'}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={pct} className="w-16 h-1.5" />
                            <span>%{pct}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <BarChart3 className="w-4 h-4" />
            Genel Özet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-muted rounded text-center">
              <p className="text-2xl font-bold">{totalModules}</p>
              <p className="text-xs text-muted-foreground">Toplam Modül</p>
            </div>
            <div className="p-3 bg-muted rounded text-center">
              <p className="text-2xl font-bold">{publishedModules}</p>
              <p className="text-xs text-muted-foreground">Yayında</p>
            </div>
            <div className="p-3 bg-muted rounded text-center">
              <p className="text-2xl font-bold">{quizzes.length}</p>
              <p className="text-xs text-muted-foreground">Quiz Sayısı</p>
            </div>
            <div className="p-3 bg-muted rounded text-center">
              <p className="text-2xl font-bold">{allUsers.length}</p>
              <p className="text-xs text-muted-foreground">Kullanıcı</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
