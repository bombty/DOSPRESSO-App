import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, hasPermission, type TrainingModule, type UserRoleType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleGallery } from "@/components/ModuleGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, BookOpen, Users, Trash2, Plus, GraduationCap, Upload, FileText, Image, Edit2, BarChart3, TrendingUp, Award, Activity, Sparkles, Brain, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const quizSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const assignmentSchema = z.object({
  quizId: z.string().min(1, "Quiz seçin"),
  assignTo: z.enum(["user", "branch", "role"]),
  targetId: z.string().min(1, "Hedef seçin"),
});

const questionSchema = z.object({
  quizId: z.number().min(1, "Quiz seçin"),
  question: z.string().min(5, "Soru en az 5 karakter olmalı"),
  options: z.array(z.string()).min(2, "En az 2 seçenek gerekli"),
  correctAnswerIndex: z.number().min(0),
});

const trainingModuleSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  scope: z.enum(["branch", "factory", "both"]).default("branch"),
  estimatedDuration: z.number().min(1),
  isPublished: z.boolean().default(false),
  requiredForRole: z.array(z.string()).default([]),
});

interface GeneratedModulePreview {
  title?: string;
  description?: string;
  estimatedDuration?: number;
  learningObjectives?: string[];
  steps?: { stepNumber: number; title: string; content: string }[];
  quiz?: { questionText: string; options?: string[]; correctOptionIndex?: number }[];
  scenarioTasks?: { title: string; description: string }[];
  supervisorChecklist?: { title: string; description: string }[];
}

interface QuizItem {
  id: number;
  title_tr?: string;
  description_tr?: string;
}

interface ExamItem {
  id: number;
  userId: string;
  targetRoleId: string;
  status: string;
  supervisorNotes?: string;
}

const ACADEMY_MODULES = [
  { id: 1, name: "Akademi", path: "/akademi", status: "active" },
  { id: 2, name: "Yönetim", path: "/akademi-hq", status: "active" },
  { id: 3, name: "Supervisor", path: "/akademi-supervisor", status: "active" },
  { id: 4, name: "Analitik", path: "/akademi-analytics", status: "active" },
  { id: 5, name: "Rozetler", path: "/akademi-badges", status: "active" },
  { id: 6, name: "Sıralama", path: "/akademi-leaderboard", status: "active" },
  { id: 7, name: "Yollar", path: "/akademi-learning-paths", status: "active" },
  { id: 8, name: "Sertifikalar", path: "/akademi-certificates", status: "active" },
  { id: 9, name: "Başarılar", path: "/akademi-achievements", status: "active" },
  { id: 10, name: "İlerleme", path: "/akademi-progress-overview", status: "active" },
  { id: 11, name: "Seri", path: "/akademi-streak-tracker", status: "active" },
  { id: 12, name: "AI Asistan", path: "/akademi-ai-assistant", status: "active" },
];

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

function RoleDashboardSection({
  role,
  branchAnalytics,
  trainingStats,
  trainingModules,
  pendingExams,
  isLoading,
  onCertSettings,
  certDesigns,
  onEditCert,
  onDeleteCert,
  onOpenAiOnboarding,
  onOpenAiProgram,
}: {
  role: string;
  branchAnalytics: BranchAnalytics[];
  trainingStats: TrainingStats | null;
  trainingModules: TrainingModule[];
  pendingExams: any[];
  isLoading: boolean;
  onCertSettings?: () => void;
  certDesigns?: any[];
  onEditCert?: (cert: any) => void;
  onDeleteCert?: (id: number) => void;
  onOpenAiOnboarding?: () => void;
  onOpenAiProgram?: () => void;
}) {
  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="role-dashboard-loading">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="h-4 bg-muted animate-pulse rounded mb-2" />
              <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isCeoOrCgo = role === 'ceo' || role === 'cgo';
  const isCoach = role === 'coach';
  const isTrainer = role === 'trainer';

  const totalModules = trainingModules.length;
  const publishedModules = trainingModules.filter((m) => m.isPublished).length;
  const draftModules = totalModules - publishedModules;
  const avgCompletionRate = branchAnalytics.length > 0
    ? Math.round(branchAnalytics.reduce((sum, b) => sum + (b.completionRate || 0), 0) / branchAnalytics.length)
    : 0;
  const totalActiveStudents = branchAnalytics.reduce((sum, b) => sum + (b.activeStudents || 0), 0);

  if (isCeoOrCgo) {
    return (
      <div className="space-y-3" data-testid="executive-dashboard-section">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card data-testid="stat-total-modules">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Toplam Modül</span>
              </div>
              <p className="text-xl font-bold">{totalModules}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="default" className="text-xs">{publishedModules} Yayında</Badge>
                <Badge variant="secondary" className="text-xs">{draftModules} Taslak</Badge>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-completion-rate">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tamamlanma Oranı</span>
              </div>
              <p className="text-xl font-bold">%{avgCompletionRate}</p>
              <Progress value={avgCompletionRate} className="mt-1 h-1.5" />
            </CardContent>
          </Card>
          <Card data-testid="stat-active-programs">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Aktif Öğrenci</span>
              </div>
              <p className="text-xl font-bold">{totalActiveStudents}</p>
              <span className="text-xs text-muted-foreground">{branchAnalytics.length} şubede</span>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-exams">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Bekleyen Sınav</span>
              </div>
              <p className="text-xl font-bold">{pendingExams.length}</p>
              {pendingExams.length > 0 && (
                <Badge variant="destructive" className="text-xs mt-1">Onay Bekliyor</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {branchAnalytics.length > 0 && (
          <Card data-testid="branch-metrics-table">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
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
                    {branchAnalytics.map((branch) => (
                      <TableRow key={branch.branchId} data-testid={`row-branch-${branch.branchId}`}>
                        <TableCell className="text-xs font-medium">{branch.branchName}</TableCell>
                        <TableCell className="text-xs text-right">{branch.activeStudents}</TableCell>
                        <TableCell className="text-xs text-right">{branch.avgScore?.toFixed(1) || '—'}</TableCell>
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
      </div>
    );
  }

  if (isCoach) {
    return (
      <div className="space-y-3" data-testid="coach-dashboard-section">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Card data-testid="stat-branch-compliance">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Eğitim Uyumu</span>
              </div>
              <p className="text-xl font-bold">%{avgCompletionRate}</p>
              <Progress value={avgCompletionRate} className="mt-1 h-1.5" />
            </CardContent>
          </Card>
          <Card data-testid="stat-active-students-coach">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Aktif Öğrenci</span>
              </div>
              <p className="text-xl font-bold">{totalActiveStudents}</p>
              <span className="text-xs text-muted-foreground">{branchAnalytics.length} şube</span>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-exams-coach">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Bekleyen Sınav</span>
              </div>
              <p className="text-xl font-bold">{pendingExams.length}</p>
            </CardContent>
          </Card>
        </div>

        {trainingStats?.personnelProgress && trainingStats.personnelProgress.length > 0 && (
          <Card data-testid="personnel-progress-table">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
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
                          <TableCell className="text-xs text-right">{person.avgScore?.toFixed(1) || '—'}</TableCell>
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

        {branchAnalytics.length > 0 && (
          <Card data-testid="coach-branch-overview">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Şube Eğitim Uyumu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex flex-col gap-2">
                {branchAnalytics.map((branch) => (
                  <div key={branch.branchId} className="flex items-center gap-3" data-testid={`coach-branch-${branch.branchId}`}>
                    <span className="text-xs font-medium w-24 truncate">{branch.branchName}</span>
                    <Progress value={branch.completionRate || 0} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-10 text-right">%{branch.completionRate || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="coach-quick-actions">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Hızlı İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-create-onboarding" onClick={() => onOpenAiOnboarding?.()}>
                <Plus className="w-3 h-3" /> Onboarding Şablonu
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-view-reports">
                <BarChart3 className="w-3 h-3" /> Eğitim Raporu
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-cert-settings" onClick={() => onCertSettings?.()}>
                <Award className="w-3 h-3" /> Sertifika Ayarları
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-ai-generate" onClick={() => onOpenAiProgram?.()}>
                <GraduationCap className="w-3 h-3" /> AI Modül Üret
              </Button>
            </div>
          </CardContent>
        </Card>

        {certDesigns && certDesigns.length > 0 && (
          <Card data-testid="cert-designs-list">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Sertifika Tasarımları
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {certDesigns.map((cert: any) => (
                  <div key={cert.id} className="flex items-center justify-between gap-2 p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: cert.primaryColor }} />
                      <span>{cert.transitionFrom} → {cert.transitionTo}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEditCert?.(cert)} data-testid={`btn-edit-cert-${cert.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteCert?.(cert.id)} data-testid={`btn-delete-cert-${cert.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (isTrainer) {
    return (
      <div className="space-y-3" data-testid="trainer-dashboard-section">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card data-testid="stat-published-modules">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Yayında</span>
              </div>
              <p className="text-xl font-bold">{publishedModules}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-draft-modules">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Taslak</span>
              </div>
              <p className="text-xl font-bold">{draftModules}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-modules-trainer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Toplam</span>
              </div>
              <p className="text-xl font-bold">{totalModules}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-exams-trainer">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Bekleyen Sınav</span>
              </div>
              <p className="text-xl font-bold">{pendingExams.length}</p>
            </CardContent>
          </Card>
        </div>

        {trainingStats?.recentQuizResults && trainingStats.recentQuizResults.length > 0 && (
          <Card data-testid="recent-quiz-results">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
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
                        <TableCell className="text-xs">{result.quizTitle || '—'}</TableCell>
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

        <Card data-testid="trainer-quick-actions">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Hızlı İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-trainer-create-module" onClick={() => onOpenAiOnboarding?.()}>
                <Plus className="w-3 h-3" /> Onboarding Şablonu
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-trainer-view-reports">
                <BarChart3 className="w-3 h-3" /> Eğitim Raporu
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-trainer-cert-settings" onClick={() => onCertSettings?.()}>
                <Award className="w-3 h-3" /> Sertifika Ayarları
              </Button>
              <Button size="sm" variant="outline" className="justify-start gap-2" data-testid="btn-trainer-ai-generate" onClick={() => onOpenAiProgram?.()}>
                <GraduationCap className="w-3 h-3" /> AI Modül Üret
              </Button>
            </div>
          </CardContent>
        </Card>

        {certDesigns && certDesigns.length > 0 && (
          <Card data-testid="cert-designs-list-trainer">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Sertifika Tasarımları
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {certDesigns.map((cert: any) => (
                  <div key={cert.id} className="flex items-center justify-between gap-2 p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ background: cert.primaryColor }} />
                      <span>{cert.transitionFrom} → {cert.transitionTo}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEditCert?.(cert)} data-testid={`btn-edit-cert-trainer-${cert.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteCert?.(cert.id)} data-testid={`btn-delete-cert-trainer-${cert.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

export default function AcademyHQ() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  
  const canManageTraining = user && hasPermission(user.role as UserRoleType, 'training', 'edit');
  if (user && !canManageTraining) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Yetkisiz Erişim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <Button onClick={() => window.location.href = "/"} className="mt-4 w-full">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(1);
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  
  // AI Module Generator States
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiWizardStep, setAiWizardStep] = useState<1 | 2 | 3>(1);
  const [aiInputText, setAiInputText] = useState("");
  const [aiRoleLevel, setAiRoleLevel] = useState("Stajyer");
  const [aiEstimatedMinutes, setAiEstimatedMinutes] = useState(15);
  const [generatedModule, setGeneratedModule] = useState<GeneratedModulePreview | null>(null);
  const [aiInputMode, setAiInputMode] = useState<"text" | "file">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [editingGalleryImages, setEditingGalleryImages] = useState<any[]>([]);
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  const [isAiOnboardingOpen, setIsAiOnboardingOpen] = useState(false);
  const [aiOnboardingRole, setAiOnboardingRole] = useState("stajyer");
  const [aiOnboardingScope, setAiOnboardingScope] = useState("branch");
  const [aiOnboardingDuration, setAiOnboardingDuration] = useState(60);
  const [aiOnboardingResult, setAiOnboardingResult] = useState<any>(null);

  const [isAiProgramOpen, setIsAiProgramOpen] = useState(false);
  const [aiProgramRole, setAiProgramRole] = useState("stajyer");
  const [aiProgramScope, setAiProgramScope] = useState("branch");
  const [aiProgramType, setAiProgramType] = useState("role_training");
  const [aiProgramResult, setAiProgramResult] = useState<any>(null);

  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [certForm, setCertForm] = useState({
    transitionFrom: 'stajyer',
    transitionTo: 'bar_buddy',
    certificateTitle: 'Başarı Sertifikası',
    subtitle: '',
    primaryColor: '#1e3a5f',
    secondaryColor: '#c9a96e',
    templateLayout: 'classic',
    signatureLabel: 'DOSPRESSO Eğitim Müdürü',
    footerText: '',
  });

  if (!user || !canManageTraining) {
    return <div className="p-6 text-center text-destructive">Erişim Reddedildi</div>;
  }

  const quizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "", description: "", difficulty: "medium" as const },
  });

  const trainingForm = useForm<z.infer<typeof trainingModuleSchema>>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", category: "", level: "beginner" as const, scope: "branch" as const, estimatedDuration: 30, isPublished: false, requiredForRole: [] },
  });

  const editTrainingForm = useForm<z.infer<typeof trainingModuleSchema>>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", category: "", level: "beginner" as const, scope: "branch" as const, estimatedDuration: 30, isPublished: false, requiredForRole: [] },
  });

  const assignForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { quizId: "", assignTo: "user" as const, targetId: "" },
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: { quizId: 1, question: "", options: ["", ""], correctAnswerIndex: 0 },
  });

  const { data: pendingExams = [], isError, refetch, isLoading } = useQuery({
    queryKey: ["/api/academy/exam-requests-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: approvedExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-approved"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=approved`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: certDesigns = [] } = useQuery<any[]>({
    queryKey: ['/api/certificate-designs'],
    enabled: !!user && isHQRole(user.role as any),
  });

  const saveCertDesignMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCert) {
        const res = await apiRequest("PUT", `/api/certificate-designs/${editingCert.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/certificate-designs", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editingCert ? "Sertifika tasarımı güncellendi" : "Sertifika tasarımı oluşturuldu" });
      setIsCertDialogOpen(false);
      setEditingCert(null);
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-designs'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kayıt başarısız", variant: "destructive" });
    },
  });

  const deleteCertDesignMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/certificate-designs/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Sertifika tasarımı silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-designs'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Sınav onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-approved"] });
      setSelectedExamId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Sınav reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      setSelectedExamId(null);
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quizSchema>) => {
      return apiRequest("POST", "/api/academy/quiz/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz oluşturuldu" });
      setIsCreateQuizOpen(false);
      quizForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/academy/quizzes"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const assignQuizMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return apiRequest("POST", "/api/academy/assignment/create", data);
    },
    onSuccess: () => {
      toast({ title: "Quiz atandı" });
      setIsAssignOpen(false);
      assignForm.reset();
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
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

  const { data: quizQuestions = [] } = useQuery({
    queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`],
    queryFn: async () => {
      if (!selectedQuizId) return [];
      const res = await fetch(`/api/academy/quiz/${selectedQuizId}/questions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedQuizId,
  });

  const { data: trainingModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch(`/api/training/modules`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: branchAnalytics = [], isLoading: branchAnalyticsLoading } = useQuery<BranchAnalytics[]>({
    queryKey: ["/api/academy/branch-analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/branch-analytics`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: trainingStatsData = null, isLoading: trainingStatsLoading } = useQuery<TrainingStats | null>({
    queryKey: ["/api/training/stats"],
    queryFn: async () => {
      const res = await fetch(`/api/training/stats`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const createTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trainingModuleSchema>) => {
      return apiRequest("POST", "/api/training/modules", { ...data, createdBy: user?.id });
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü oluşturuldu" });
      setIsAddTrainingOpen(false);
      trainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/training/modules/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trainingModuleSchema>) => {
      if (!editingModule) throw new Error("Module not selected");
      return apiRequest("PUT", `/api/training/modules/${editingModule.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Eğitim modülü güncellendi" });
      setIsEditTrainingOpen(false);
      setEditingModule(null);
      editTrainingForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // AI Module Generator Mutations
  const generateModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate", {
        inputText: aiInputText,
        roleLevel: aiRoleLevel,
        estimatedMinutes: aiEstimatedMinutes,
      });
      return await response.json() as { success: boolean; module: GeneratedModulePreview };
    },
    onSuccess: (data) => {
      setGeneratedModule(data.module);
      setAiWizardStep(2);
      toast({ title: "Modül başarıyla oluşturuldu! Önizlemeye geçiliyor..." });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "AI modül oluşturma başarısız",
        variant: "destructive"
      });
    },
  });

  const saveGeneratedModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/generate/save", {
        module: generatedModule,
        roleLevel: aiRoleLevel,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Modül veritabanına kaydedildi!" });
      setIsAiGeneratorOpen(false);
      resetAiWizard();
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: (error) => {
      toast({
        title: "Kaydetme Hatası",
        description: error.message || "Modül kaydedilemedi",
        variant: "destructive"
      });
    },
  });

  const resetAiWizard = () => {
    setAiWizardStep(1);
    setAiInputText("");
    setAiRoleLevel("Stajyer");
    setAiEstimatedMinutes(15);
    setGeneratedModule(null);
    setAiInputMode("text");
    setSelectedFile(null);
    setIsExtractingText(false);
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setIsExtractingText(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/training/generate/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Dosya işlenemedi');
      }
      
      const result = await response.json();
      setAiInputText(result.extractedText);
      toast({ title: `Metin çıkarıldı: ${result.fileName}` });
    } catch (error: unknown) {
      toast({
        title: "Dosya İşleme Hatası",
        description: (error as Error).message || "Dosyadan metin çıkarılamadı",
        variant: "destructive"
      });
      setSelectedFile(null);
    } finally {
      setIsExtractingText(false);
    }
  };

  const generateOnboardingMutation = useMutation({
    mutationFn: async (data: { targetRole: string; scope: string; durationDays: number }) => {
      const res = await apiRequest("POST", "/api/academy/ai-generate-onboarding", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAiOnboardingResult(data);
      toast({ title: "Onboarding şablonu oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const saveOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const templateRes = await apiRequest("POST", "/api/onboarding-templates", {
        name: data.name,
        description: data.description,
        targetRole: data.targetRole,
        scope: data.scope,
        durationDays: data.durationDays,
        isActive: true,
        createdById: user?.id,
      });
      const template = await templateRes.json();
      
      for (const step of data.steps || []) {
        await apiRequest("POST", `/api/onboarding-templates/${template.id}/steps`, {
          templateId: template.id,
          ...step,
        });
      }
      return template;
    },
    onSuccess: () => {
      toast({ title: "Onboarding şablonu kaydedildi" });
      setIsAiOnboardingOpen(false);
      setAiOnboardingResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-templates'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Şablon kaydedilemedi", variant: "destructive" });
    },
  });

  const generateProgramMutation = useMutation({
    mutationFn: async (data: { targetRole: string; scope: string; programType: string }) => {
      const res = await apiRequest("POST", "/api/academy/ai-generate-program", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAiProgramResult(data);
      toast({ title: "Eğitim programı oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Program oluşturulamadı", variant: "destructive" });
    },
  });

  const saveProgramModulesMutation = useMutation({
    mutationFn: async (modules: any[]) => {
      const results = [];
      for (const mod of modules) {
        const res = await apiRequest("POST", "/api/training/modules", {
          title: mod.title,
          description: mod.description,
          category: mod.category,
          level: mod.level || "beginner",
          estimatedDuration: mod.estimatedDuration || 30,
          requiredForRole: mod.requiredForRole || [],
          scope: mod.scope || "branch",
          learningObjectives: mod.learningObjectives || [],
          steps: (mod.steps || []).map((s: any, i: number) => ({
            stepNumber: s.stepNumber || i + 1,
            title: s.title,
            content: s.content,
          })),
          isPublished: false,
          generatedByAi: true,
          createdBy: user?.id,
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      toast({ title: "Modüller başarıyla kaydedildi" });
      setIsAiProgramOpen(false);
      setAiProgramResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/training/modules'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Modüller kaydedilemedi", variant: "destructive" });
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

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest("DELETE", `/api/academy/question/${questionId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Soru silindi" });
      queryClient.invalidateQueries({ queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`] });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionSchema>) => {
      return apiRequest("POST", "/api/academy/question", data);
    },
    onSuccess: () => {
      toast({ title: "Soru eklendi" });
      setIsAddQuestionOpen(false);
      questionForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/academy/quiz/${selectedQuizId}/questions`] });
    },
  });

  return (
    <div className="grid grid-cols-1 gap-2 p-3">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      
      <div>
        <h1 className="text-lg font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-2">Modül yönetimi, sınav talepleri ve atamalar</p>
      </div>

      <RoleDashboardSection
        role={user?.role || ''}
        branchAnalytics={branchAnalytics}
        trainingStats={trainingStatsData}
        trainingModules={trainingModules}
        pendingExams={pendingExams}
        isLoading={branchAnalyticsLoading || trainingStatsLoading}
        onCertSettings={() => setIsCertDialogOpen(true)}
        certDesigns={certDesigns}
        onEditCert={(cert) => {
          setEditingCert(cert);
          setCertForm({
            transitionFrom: cert.transitionFrom,
            transitionTo: cert.transitionTo,
            certificateTitle: cert.certificateTitle || 'Başarı Sertifikası',
            subtitle: cert.subtitle || '',
            primaryColor: cert.primaryColor || '#1e3a5f',
            secondaryColor: cert.secondaryColor || '#c9a96e',
            templateLayout: cert.templateLayout || 'classic',
            signatureLabel: cert.signatureLabel || 'DOSPRESSO Eğitim Müdürü',
            footerText: cert.footerText || '',
          });
          setIsCertDialogOpen(true);
        }}
        onDeleteCert={(id) => deleteCertDesignMutation.mutate(id)}
        onOpenAiOnboarding={() => setIsAiOnboardingOpen(true)}
        onOpenAiProgram={() => setIsAiProgramOpen(true)}
      />

      <Tabs defaultValue="training" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1">
          <TabsTrigger value="exams" className="flex-1 min-w-fit">
            <Clock className="w-4 h-4 mr-2" />
            Sınav Talepleri
          </TabsTrigger>
          <TabsTrigger value="training" className="flex-1 min-w-fit">
            <GraduationCap className="w-4 h-4 mr-2" />
            Modüller ({trainingModules.length})
          </TabsTrigger>
        </TabsList>

        {/* MODULES TAB - ANA SAYFA */}
        <TabsContent value="modules" className="w-full space-y-2 sm:space-y-3">
          <div className="w-full">
            {/* Modüller Listesi */}
            <Card>
              <CardHeader>
                <CardTitle>Akademi Modülleri (12)</CardTitle>
                <CardDescription>Modülleri seçip düzenle veya ata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {ACADEMY_MODULES.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModuleId(module.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedModuleId === module.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:border-border"
                      }`}
                      data-testid={`button-select-module-${module.id}`}
                    >
                      <p className="font-medium text-sm">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.path}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seçili Modül Detayı */}
            <div className="w-full">
              {selectedModuleId && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.name}</CardTitle>
                      <CardDescription>Modül yönetimi ve atama işlemleri</CardDescription>
                    </CardHeader>
                    <CardContent className="w-full space-y-2 sm:space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Yol:</p>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.path}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Durum:</p>
                        <Badge>Aktif</Badge>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" data-testid={`button-assign-module-${selectedModuleId}`}>
                            Bu Modülü Ata
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{ACADEMY_MODULES.find(m => m.id === selectedModuleId)?.name} - Atama</DialogTitle>
                          </DialogHeader>
                          <Form {...assignForm}>
                            <form onSubmit={assignForm.handleSubmit((data) => {
                              assignQuizMutation.mutate({
                                ...data,
                                quizId: selectedModuleId.toString(),
                              });
                            })} className="w-full space-y-2 sm:space-y-3">
                              <FormField
                                control={assignForm.control}
                                name="assignTo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Atama Türü</FormLabel>
                                    <FormControl>
                                      <select {...field} className="border rounded px-2 py-1 w-full" data-testid="select-assign-to">
                                        <option value="user">Kullanıcı</option>
                                        <option value="branch">Şube</option>
                                        <option value="role">Rol</option>
                                      </select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={assignForm.control}
                                name="targetId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Hedef ID</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder={
                                          assignForm.getValues("assignTo") as string === "user" 
                                            ? "Kullanıcı ID'si"
                                            : (assignForm.getValues("assignTo") as string) === "branch"
                                            ? "Şube ID'si"
                                            : "Rol Adı"
                                        }
                                        {...field}
                                        data-testid="input-target-id"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={assignQuizMutation.isPending} className="w-full" data-testid="button-assign-submit">
                                Ata
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>

                  {/* Quiz Management */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">Quiz Yönetimi</CardTitle>
                          <CardDescription>Bu modülle ilgili quizleri düzenle</CardDescription>
                        </div>
                        <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-create-quiz">
                              <Plus className="w-4 h-4 mr-1" />
                              Quiz Ekle
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Yeni Quiz</DialogTitle>
                            </DialogHeader>
                            <Form {...quizForm}>
                              <form onSubmit={quizForm.handleSubmit((data) => {
                                createQuizMutation.mutate(data);
                              })} className="w-full space-y-2 sm:space-y-3">
                                <FormField
                                  control={quizForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Başlık</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Quiz başlığı" data-testid="input-quiz-title" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={quizForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Açıklama (İsteğe Bağlı)</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} placeholder="Quiz açıklaması" data-testid="textarea-quiz-description" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={quizForm.control}
                                  name="difficulty"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Zorluk</FormLabel>
                                      <FormControl>
                                        <select {...field} className="border rounded px-2 py-1 w-full" data-testid="select-difficulty">
                                          <option value="easy">Kolay</option>
                                          <option value="medium">Orta</option>
                                          <option value="hard">Zor</option>
                                        </select>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" disabled={createQuizMutation.isPending} className="w-full" data-testid="button-quiz-create">
                                  Oluştur
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {quizzes.slice(0, 3).map((quiz: QuizItem) => (
                          <div key={quiz.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">{quiz.title_tr}</p>
                            <p className="text-xs text-muted-foreground">{quiz.description_tr}</p>
                          </div>
                        ))}
                        {quizzes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-3">Quiz yok</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Modül İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Toplam Modül</p>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
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
        </TabsContent>

        {/* EXAM REQUESTS TAB */}
        <TabsContent value="exams" className="w-full space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 col-span-2 md:col-span-3">
            {/* Pending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Beklemede ({pendingExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingExams.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Talep yok</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {pendingExams.map((exam: ExamItem) => (
                      <div key={exam.id} className="p-3 border rounded text-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{exam.userId}</p>
                            <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                          </div>
                          <Badge variant="outline">Beklemede</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => approveMutation.mutate(exam.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-exam-${exam.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Onayla
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ id: exam.id, reason: "Reddedildi" })}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-exam-${exam.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approved */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Onaylı ({approvedExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedExams.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Onay yok</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {approvedExams.map((exam: ExamItem) => (
                      <div key={exam.id} className="p-3 border rounded text-sm">
                        <p className="font-medium">{exam.userId}</p>
                        <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                        <Badge className="mt-2">Onaylı</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MODÜLLER TAB */}
        <TabsContent value="training" className="w-full space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold">Modülleri Yönet</h2>
            <div className="flex flex-wrap gap-2">
              <Dialog open={isAiGeneratorOpen} onOpenChange={(open) => {
                setIsAiGeneratorOpen(open);
                if (!open) resetAiWizard();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-ai-generator">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">AI ile Modül Oluştur</span>
                    <span className="sm:hidden">AI</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      AI Modül Oluşturucu
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                      <div className={`flex-1 h-1 ${aiWizardStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                      <div className={`flex-1 h-1 ${aiWizardStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${aiWizardStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Metin Gir</span>
                      <span>AI Önizleme</span>
                      <span>Kaydet</span>
                    </div>
                  </DialogHeader>
                  
                  {/* Step 1: Input Text or File */}
                  {aiWizardStep === 1 && (
                    <div className="w-full space-y-2 sm:space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg text-sm">
                        <p className="font-medium mb-1">Nasıl Çalışır?</p>
                        <p className="text-muted-foreground">Metin yapıştırın veya PDF/fotoğraf yükleyin. AI, içeriği otomatik olarak yapılandırılmış bir eğitim modülüne dönüştürecek.</p>
                      </div>
                      
                      {/* Input Mode Toggle */}
                      <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <Button
                          type="button"
                          variant={aiInputMode === "text" ? "default" : "ghost"}
                          className="flex-1"
                          onClick={() => setAiInputMode("text")}
                          data-testid="button-text-mode"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Metin Gir
                        </Button>
                        <Button
                          type="button"
                          variant={aiInputMode === "file" ? "default" : "ghost"}
                          className="flex-1"
                          onClick={() => setAiInputMode("file")}
                          data-testid="button-file-mode"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Dosya Yükle
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Hedef Rol</label>
                          <Select value={aiRoleLevel} onValueChange={setAiRoleLevel}>
                            <SelectTrigger data-testid="select-role-level">
                              <SelectValue placeholder="Rol seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Stajyer">Stajyer</SelectItem>
                              <SelectItem value="Bar Buddy">Bar Buddy</SelectItem>
                              <SelectItem value="Barista">Barista</SelectItem>
                              <SelectItem value="Supervisor Buddy">Supervisor Buddy</SelectItem>
                              <SelectItem value="Supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Tahmini Süre (dk)</label>
                          <Input 
                            type="number" 
                            value={aiEstimatedMinutes}
                            onChange={(e) => setAiEstimatedMinutes(Number(e.target.value) || 15)}
                            min={5}
                            max={120}
                            data-testid="input-estimated-duration"
                          />
                        </div>
                      </div>
                      
                      {/* File Upload Mode */}
                      {aiInputMode === "file" && (
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <label className="text-sm font-medium mb-1 block">PDF veya Fotoğraf Yükle</label>
                          <div 
                            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                            onClick={() => document.getElementById('file-upload-input')?.click()}
                          >
                            <input
                              id="file-upload-input"
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                              }}
                              data-testid="input-file-upload"
                            />
                            {isExtractingText ? (
                              <div className="flex flex-col items-center gap-2">
                                <Clock className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm font-medium">Metin çıkarılıyor...</p>
                                <p className="text-xs text-muted-foreground">PDF veya görsel işleniyor</p>
                              </div>
                            ) : selectedFile ? (
                              <div className="flex flex-col items-center gap-2">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(selectedFile.size / 1024).toFixed(1)} KB - Metin çıkarıldı
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFile(null);
                                    setAiInputText("");
                                  }}
                                >
                                  Dosyayı Kaldır
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-2">
                                  <FileText className="w-8 h-8 text-muted-foreground" />
                                  <Image className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium">PDF veya fotoğraf yüklemek için tıklayın</p>
                                <p className="text-xs text-muted-foreground">Maksimum 10 MB - PDF, JPEG, PNG desteklenir</p>
                              </div>
                            )}
                          </div>
                          
                          {aiInputText && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">Çıkarılan Metin (düzenleyebilirsiniz)</label>
                              <Textarea
                                value={aiInputText}
                                onChange={(e) => setAiInputText(e.target.value)}
                                className="h-40"
                                data-testid="textarea-extracted-ai-text"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {aiInputText.length} karakter
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Text Input Mode */}
                      {aiInputMode === "text" && (
                        <div>
                          <label className="text-sm font-medium mb-1 block">Eğitim İçeriği Metni</label>
                          <Textarea
                            placeholder="Eğitim konusu hakkında bir makale, prosedür veya herhangi bir metin yapıştırın... (en az 50 karakter)"
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            className="h-64"
                            data-testid="textarea-ai-input"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {aiInputText.length} karakter {aiInputText.length < 50 && "(min. 50 karakter gerekli)"}
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => generateModuleMutation.mutate()}
                        disabled={generateModuleMutation.isPending || aiInputText.length < 50 || isExtractingText}
                        className="w-full"
                        data-testid="button-generate-module"
                      >
                        {generateModuleMutation.isPending ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            AI Modül Oluşturuyor... (10-20 saniye)
                          </>
                        ) : (
                          <>
                            <GraduationCap className="w-4 h-4 mr-2" />
                            AI ile Modül Oluştur
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Step 2: Preview Generated Module */}
                  {aiWizardStep === 2 && generatedModule && (
                    <div className="w-full space-y-2 sm:space-y-3">
                      <div className="bg-success/10 dark:bg-success/10 p-3 rounded-lg border border-success/30 dark:border-success/40">
                        <p className="text-sm font-medium text-success dark:text-green-300">Modül başarıyla oluşturuldu!</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-96 overflow-y-auto">
                        <div>
                          <h4 className="font-semibold text-lg">{generatedModule.title}</h4>
                          <p className="text-sm text-muted-foreground">{generatedModule.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{aiRoleLevel}</Badge>
                            <Badge variant="outline">{generatedModule.estimatedDuration} dk</Badge>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Öğrenme Hedefleri ({generatedModule.learningObjectives?.length || 0})</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {generatedModule.learningObjectives?.map((obj: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{obj}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Eğitim Adımları ({generatedModule.steps?.length || 0})</h5>
                          <div className="flex flex-col gap-3 sm:gap-4">
                            {generatedModule.steps?.map((step, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{step.stepNumber}. {step.title}</p>
                                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{step.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Quiz Soruları ({generatedModule.quiz?.length || 0})</h5>
                          <div className="flex flex-col gap-3 sm:gap-4">
                            {generatedModule.quiz?.map((q, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{q.questionText}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {q.options?.map((opt: string, j: number) => (
                                    <Badge key={j} variant={j === q.correctOptionIndex ? "default" : "outline"} className="text-xs">
                                      {opt}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Senaryolar ({generatedModule.scenarioTasks?.length || 0})</h5>
                          <div className="flex flex-col gap-3 sm:gap-4">
                            {generatedModule.scenarioTasks?.map((s, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{s.title}</p>
                                <p className="text-muted-foreground text-xs">{s.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Denetçi Kontrol Listesi ({generatedModule.supervisorChecklist?.length || 0})</h5>
                          <div className="flex flex-col gap-3 sm:gap-4">
                            {generatedModule.supervisorChecklist?.map((c, i: number) => (
                              <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                <p className="font-medium">{c.title}</p>
                                <p className="text-muted-foreground text-xs">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setAiWizardStep(1)} className="flex-1" data-testid="button-back">
                          Geri Dön
                        </Button>
                        <Button 
                          onClick={() => saveGeneratedModuleMutation.mutate()}
                          disabled={saveGeneratedModuleMutation.isPending}
                          className="flex-1"
                          data-testid="button-save-module"
                        >
                          {saveGeneratedModuleMutation.isPending ? "Kaydediliyor..." : "Modülü Kaydet"}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Button size="sm" onClick={() => setLocation('/akademi-modul-editor')} data-testid="button-add-training">
                <Plus className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Yeni Modül</span>
                <span className="sm:hidden">Ekle</span>
              </Button>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Eğitim Modülünü Düzenle</DialogTitle>
              </DialogHeader>
              {editingModule && (
                <Form {...editTrainingForm}>
                  <form onSubmit={editTrainingForm.handleSubmit((data) => updateTrainingMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                    <FormField
                      control={editTrainingForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input placeholder="Modül başlığı" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editTrainingForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Açıklama</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Modül açıklaması" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <FormField
                        control={editTrainingForm.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seviye</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={editingModule?.level || "beginner"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Başlangıç</SelectItem>
                                <SelectItem value="intermediate">Orta</SelectItem>
                                <SelectItem value="advanced">İleri</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editTrainingForm.control}
                        name="scope"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kapsam</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "branch"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-module-scope-edit">
                                  <SelectValue placeholder="Kapsam seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="branch">Şube Eğitimi</SelectItem>
                                <SelectItem value="factory">Fabrika Eğitimi</SelectItem>
                                <SelectItem value="both">Her İkisi</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editTrainingForm.control}
                      name="estimatedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tahmini Süre (dk)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {editingModule.id && (
                      <ModuleGallery
                        moduleId={editingModule.id}
                        images={editingGalleryImages}
                        onImagesChange={setEditingGalleryImages}
                        disabled={updateTrainingMutation.isPending}
                      />
                    )}
                    <Button type="submit" disabled={updateTrainingMutation.isPending} className="w-full">
                      {updateTrainingMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          <div className="flex gap-1 flex-wrap mb-3">
            {[
              { value: "all", label: "Tümü" },
              { value: "branch", label: "Şube" },
              { value: "factory", label: "Fabrika" },
            ].map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={scopeFilter === f.value ? "default" : "outline"}
                onClick={() => setScopeFilter(f.value)}
                data-testid={`filter-scope-${f.value}`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {trainingModules.filter((m: any) => scopeFilter === "all" || m.scope === scopeFilter || m.scope === 'both').map((module: TrainingModule) => (
              <div 
                key={module.id}
                onClick={() => {
                  sessionStorage.setItem('academyReferrer', '/akademi-hq');
                  setLocation(`/akademi-modul/${module.id}`);
                }}
                className="cursor-pointer"
              >
                <Card className="hover-elevate h-full flex flex-col">
                  <CardHeader className="pb-2 pt-2 px-2 flex-1">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs font-semibold line-clamp-2 leading-tight">{module.title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {module.level === 'beginner' ? 'Başlangıç' : module.level === 'intermediate' ? 'Orta' : 'İleri'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/akademi-modul-editor/${module.id}`);
                          }}
                          title="Düzenle"
                          data-testid={`button-edit-module-${module.id}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(module.id, module.title || "");
                          }}
                          disabled={deleteTrainingMutation.isPending}
                          title="Sil"
                          data-testid={`button-delete-module-${module.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-1 text-xs p-3">
                    {module.description && <p className="text-muted-foreground line-clamp-1 text-xs">{module.description}</p>}
                    <div className="flex gap-1 flex-wrap">
                      {module.isPublished && <Badge variant="default" className="text-xs px-1.5 py-0">Yayında</Badge>}
                      {!module.isPublished && <Badge variant="secondary" className="text-xs px-1.5 py-0">Taslak</Badge>}
                      <Badge variant={(module as any).scope === 'factory' ? 'destructive' : (module as any).scope === 'both' ? 'outline' : 'secondary'} className="text-xs px-1.5 py-0">
                        {(module as any).scope === 'factory' ? 'Fabrika' : (module as any).scope === 'both' ? 'Tümü' : 'Şube'}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{module.estimatedDuration} dk</Badge>
                    </div>
                    {module.requiredForRole && module.requiredForRole.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Zorunlu Roller:</p>
                        <div className="flex gap-1 flex-wrap">
                          {module.requiredForRole.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {trainingModules.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Henüz eğitim modülü eklenmedi</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteTrainingMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" modülü silinecektir. Bu işlem geri alınamaz.`}
      />

      <Dialog open={isAiOnboardingOpen} onOpenChange={setIsAiOnboardingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Onboarding Şablon Üretici
            </DialogTitle>
          </DialogHeader>
          
          {!aiOnboardingResult ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Pozisyon</label>
                <Select value={aiOnboardingRole} onValueChange={setAiOnboardingRole}>
                  <SelectTrigger data-testid="select-onboarding-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="fabrika_personel">Fabrika Personeli</SelectItem>
                    <SelectItem value="uretim_sorumlusu">Üretim Sorumlusu</SelectItem>
                    <SelectItem value="kalite_kontrol">Kalite Kontrol</SelectItem>
                    <SelectItem value="depocu">Depocu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kapsam</label>
                <Select value={aiOnboardingScope} onValueChange={setAiOnboardingScope}>
                  <SelectTrigger data-testid="select-onboarding-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Şube</SelectItem>
                    <SelectItem value="factory">Fabrika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Süre (gün)</label>
                <Input 
                  type="number" 
                  value={aiOnboardingDuration} 
                  onChange={(e) => setAiOnboardingDuration(parseInt(e.target.value) || 60)}
                  data-testid="input-onboarding-duration"
                />
              </div>
              <Button 
                onClick={() => generateOnboardingMutation.mutate({ targetRole: aiOnboardingRole, scope: aiOnboardingScope, durationDays: aiOnboardingDuration })}
                disabled={generateOnboardingMutation.isPending}
                className="w-full"
                data-testid="btn-generate-onboarding"
              >
                {generateOnboardingMutation.isPending ? "Oluşturuluyor..." : "AI ile Şablon Oluştur"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-md border">
                <p className="font-medium text-sm">{aiOnboardingResult.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{aiOnboardingResult.description}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Adımlar ({aiOnboardingResult.steps?.length || 0})</p>
                {(aiOnboardingResult.steps || []).map((step: any, idx: number) => (
                  <div key={idx} className="p-2 rounded border text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{step.stepOrder || idx + 1}. {step.title}</span>
                      <Badge variant="outline" className="text-[10px]">Gün {step.startDay}-{step.endDay}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{step.description}</p>
                    <p className="mt-1">Mentör: <Badge variant="secondary" className="text-[10px]">{step.mentorRoleType}</Badge></p>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setAiOnboardingResult(null)} 
                  className="flex-1"
                  data-testid="btn-regenerate-onboarding"
                >
                  Yeniden Oluştur
                </Button>
                <Button 
                  onClick={() => saveOnboardingMutation.mutate(aiOnboardingResult)}
                  disabled={saveOnboardingMutation.isPending}
                  className="flex-1"
                  data-testid="btn-save-onboarding"
                >
                  {saveOnboardingMutation.isPending ? "Kaydediliyor..." : "Şablonu Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAiProgramOpen} onOpenChange={setIsAiProgramOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Eğitim Programı Üretici
            </DialogTitle>
          </DialogHeader>
          
          {!aiProgramResult ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hedef Pozisyon</label>
                <Select value={aiProgramRole} onValueChange={setAiProgramRole}>
                  <SelectTrigger data-testid="select-program-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="fabrika_personel">Fabrika Personeli</SelectItem>
                    <SelectItem value="uretim_sorumlusu">Üretim Sorumlusu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kapsam</label>
                <Select value={aiProgramScope} onValueChange={setAiProgramScope}>
                  <SelectTrigger data-testid="select-program-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="branch">Şube</SelectItem>
                    <SelectItem value="factory">Fabrika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Program Türü</label>
                <Select value={aiProgramType} onValueChange={setAiProgramType}>
                  <SelectTrigger data-testid="select-program-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role_training">Temel Eğitim Programı</SelectItem>
                    <SelectItem value="machine_training">Makine Kullanım Eğitimi</SelectItem>
                    <SelectItem value="skill_upgrade">Yetkinlik Geliştirme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => generateProgramMutation.mutate({ targetRole: aiProgramRole, scope: aiProgramScope, programType: aiProgramType })}
                disabled={generateProgramMutation.isPending}
                className="w-full"
                data-testid="btn-generate-program"
              >
                {generateProgramMutation.isPending ? "Oluşturuluyor..." : "AI ile Program Oluştur"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-md border">
                <p className="font-medium text-sm">{aiProgramResult.programName}</p>
                <p className="text-xs text-muted-foreground">{aiProgramResult.modules?.length || 0} modül oluşturuldu</p>
              </div>
              
              <div className="space-y-2">
                {(aiProgramResult.modules || []).map((mod: any, idx: number) => (
                  <div key={idx} className="p-2 rounded border text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{mod.title}</span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px]">{mod.level || 'beginner'}</Badge>
                        <Badge variant="outline" className="text-[10px]">{mod.estimatedDuration || 30} dk</Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1">{mod.description}</p>
                    {mod.learningObjectives?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-muted-foreground">Hedefler: </span>
                        {mod.learningObjectives.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiProgramResult(null)} className="flex-1" data-testid="btn-regenerate-program">
                  Yeniden Oluştur
                </Button>
                <Button 
                  onClick={() => saveProgramModulesMutation.mutate(aiProgramResult.modules || [])}
                  disabled={saveProgramModulesMutation.isPending}
                  className="flex-1"
                  data-testid="btn-save-program"
                >
                  {saveProgramModulesMutation.isPending ? "Kaydediliyor..." : "Tüm Modülleri Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCertDialogOpen} onOpenChange={(open) => { setIsCertDialogOpen(open); if (!open) setEditingCert(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {editingCert ? 'Sertifika Tasarımını Düzenle' : 'Yeni Sertifika Tasarımı'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Geçiş: Mevcut Statü</label>
                <Select value={certForm.transitionFrom} onValueChange={(v) => setCertForm(p => ({...p, transitionFrom: v}))}>
                  <SelectTrigger data-testid="select-cert-from"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stajyer">Stajyer</SelectItem>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Yeni Statü</label>
                <Select value={certForm.transitionTo} onValueChange={(v) => setCertForm(p => ({...p, transitionTo: v}))}>
                  <SelectTrigger data-testid="select-cert-to"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                    <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Sertifika Başlığı</label>
              <Input value={certForm.certificateTitle} onChange={(e) => setCertForm(p => ({...p, certificateTitle: e.target.value}))} data-testid="input-cert-title" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alt Başlık</label>
              <Input value={certForm.subtitle} onChange={(e) => setCertForm(p => ({...p, subtitle: e.target.value}))} data-testid="input-cert-subtitle" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Ana Renk</label>
                <div className="flex gap-1 items-center">
                  <input type="color" value={certForm.primaryColor} onChange={(e) => setCertForm(p => ({...p, primaryColor: e.target.value}))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={certForm.primaryColor} onChange={(e) => setCertForm(p => ({...p, primaryColor: e.target.value}))} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">İkincil Renk</label>
                <div className="flex gap-1 items-center">
                  <input type="color" value={certForm.secondaryColor} onChange={(e) => setCertForm(p => ({...p, secondaryColor: e.target.value}))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={certForm.secondaryColor} onChange={(e) => setCertForm(p => ({...p, secondaryColor: e.target.value}))} className="flex-1" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Şablon Düzeni</label>
              <Select value={certForm.templateLayout} onValueChange={(v) => setCertForm(p => ({...p, templateLayout: v}))}>
                <SelectTrigger data-testid="select-cert-layout"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Klasik</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">İmza Etiketi</label>
              <Input value={certForm.signatureLabel} onChange={(e) => setCertForm(p => ({...p, signatureLabel: e.target.value}))} data-testid="input-cert-signature" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Alt Bilgi Metni</label>
              <Input value={certForm.footerText} onChange={(e) => setCertForm(p => ({...p, footerText: e.target.value}))} data-testid="input-cert-footer" />
            </div>

            <Button 
              className="w-full" 
              onClick={() => saveCertDesignMutation.mutate(certForm)}
              disabled={saveCertDesignMutation.isPending}
              data-testid="btn-save-cert-design"
            >
              {saveCertDesignMutation.isPending ? "Kaydediliyor..." : (editingCert ? "Güncelle" : "Oluştur")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
