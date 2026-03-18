import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Award, BarChart3, GraduationCap, Sparkles } from "lucide-react";

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
  draftModules?: number;
  activePrograms?: number;
  totalEnrollments?: number;
  avgCompletionRate?: number;
  recentQuizResults?: { userId: string; userName?: string; quizTitle?: string; score: number; completedAt?: string }[];
  personnelProgress?: { userId: string; userName?: string; completedModules: number; totalModules: number; avgScore: number }[];
}

interface RoleDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onCertSettings?: () => void;
  onOpenAiOnboarding?: () => void;
  onOpenAiProgram?: () => void;
}

export function RoleDashboard({ onNavigateTab, onCertSettings, onOpenAiOnboarding, onOpenAiProgram }: RoleDashboardProps) {
  const { user } = useAuth();
  const role = user?.role || '';

  const { data: branchAnalytics = [], isLoading: branchLoading } = useQuery<BranchAnalytics[]>({
    queryKey: ["/api/academy/branch-analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/branch-analytics`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: trainingStats = null, isLoading: statsLoading } = useQuery<TrainingStats | null>({
    queryKey: ["/api/training/stats"],
    queryFn: async () => {
      const res = await fetch(`/api/training/stats`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const isLoading = branchLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="role-dashboard-loading">
        <div className="h-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const isCeoOrCgo = role === 'ceo' || role === 'cgo';
  const isCoach = role === 'coach';
  const isTrainer = role === 'trainer';
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-3" data-testid="role-dashboard-section">
      <div className="flex flex-wrap gap-2" data-testid="quick-actions">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="btn-create-onboarding" onClick={() => { onNavigateTab?.("training"); onOpenAiOnboarding?.(); }}>
          <Sparkles className="w-3 h-3" /> Onboarding
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="btn-view-reports" onClick={() => onNavigateTab?.("stats")}>
          <BarChart3 className="w-3 h-3" /> Eğitim Raporu
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="btn-cert-settings" onClick={() => { onNavigateTab?.("certs"); onCertSettings?.(); }}>
          <Award className="w-3 h-3" /> Sertifikalar
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="btn-ai-generate" onClick={() => { onNavigateTab?.("training"); onOpenAiProgram?.(); }}>
          <GraduationCap className="w-3 h-3" /> AI Modül Üret
        </Button>
      </div>

      {(isCeoOrCgo || isAdmin) && branchAnalytics.length > 0 && (
        <Card data-testid="branch-metrics-table">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <BarChart3 className="w-4 h-4" />
              Şube Eğitim Metrikleri
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Şube</TableHead>
                    <TableHead className="text-xs text-right">Aktif Öğrenci</TableHead>
                    <TableHead className="text-xs text-right">Ort. Puan</TableHead>
                    <TableHead className="text-xs text-right">Tamamlanma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchAnalytics.slice(0, 10).map((branch) => (
                    <TableRow key={branch.branchId} data-testid={`row-branch-${branch.branchId}`}>
                      <TableCell className="text-xs font-medium">{branch.branchName}</TableCell>
                      <TableCell className="text-xs text-right">{branch.activeStudents}</TableCell>
                      <TableCell className="text-xs text-right">{branch.avgScore != null ? Number(branch.avgScore).toFixed(1) : '\u2014'}</TableCell>
                      <TableCell className="text-xs text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={branch.completionRate || 0} className="w-16 h-1.5" />
                          <span>%{branch.completionRate || 0}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isCoach && trainingStats?.personnelProgress && trainingStats.personnelProgress.length > 0 && (
        <Card data-testid="personnel-progress-table">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4" />
              Personel İlerleme Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
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
                  {trainingStats.personnelProgress.map((person, idx) => {
                    const progressPct = person.totalModules > 0
                      ? Math.round((person.completedModules / person.totalModules) * 100)
                      : 0;
                    return (
                      <TableRow key={person.userId || idx} data-testid={`row-personnel-${idx}`}>
                        <TableCell className="text-xs font-medium">{person.userName || person.userId}</TableCell>
                        <TableCell className="text-xs text-right">{person.completedModules}/{person.totalModules}</TableCell>
                        <TableCell className="text-xs text-right">{person.avgScore != null ? Number(person.avgScore).toFixed(1) : '\u2014'}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={progressPct} className="w-16 h-1.5" />
                            <span>%{progressPct}</span>
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

      {isTrainer && trainingStats?.recentQuizResults && trainingStats.recentQuizResults.length > 0 && (
        <Card data-testid="recent-quiz-results">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <BarChart3 className="w-4 h-4" />
              Son Quiz Sonuçları
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kullanıcı</TableHead>
                    <TableHead className="text-xs">Quiz</TableHead>
                    <TableHead className="text-xs text-right">Puan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingStats.recentQuizResults.slice(0, 10).map((result, idx) => (
                    <TableRow key={idx} data-testid={`row-quiz-result-${idx}`}>
                      <TableCell className="text-xs">{result.userName || result.userId}</TableCell>
                      <TableCell className="text-xs">{result.quizTitle || '\u2014'}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant={result.score >= 70 ? "default" : "destructive"} className="text-xs">
                          {result.score}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
