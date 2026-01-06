import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Camera, 
  ChevronLeft, 
  AlertTriangle,
  Trophy,
  Timer,
  Send,
  ImageIcon,
  Loader2,
  BrainCircuit,
  XCircle,
  CheckCircle
} from "lucide-react";

interface ChecklistTask {
  id: number;
  taskDescription: string;
  requiresPhoto: boolean;
  taskTimeStart: string | null;
  taskTimeEnd: string | null;
  order: number;
  aiVerificationType: string | null;
  tolerancePercent: number | null;
  referencePhotoUrl: string | null;
}

interface TaskCompletion {
  id: number;
  taskId: number;
  isCompleted: boolean;
  completedAt: string | null;
  photoUrl: string | null;
  notes: string | null;
  isLate: boolean;
  taskOrder: number;
  aiVerificationResult: string | null;
  aiSimilarityScore: number | null;
}

interface Checklist {
  id: number;
  title: string;
  description: string | null;
  frequency: string;
  category: string | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
}

interface ChecklistCompletion {
  id: number;
  assignmentId: number;
  checklistId: number;
  userId: string;
  status: string;
  scheduledDate: string;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  startedAt: string | null;
  completedAt: string | null;
  isLate: boolean;
  lateMinutes: number;
  totalTasks: number;
  completedTasks: number;
  score: number;
  taskCompletions: TaskCompletion[];
  checklist: Checklist;
  tasks: ChecklistTask[];
}

export default function ChecklistExecutionPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ completionId: string }>();
  const completionId = params.completionId ? parseInt(params.completionId) : null;
  
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<number, string>>({});
  const [taskPhotos, setTaskPhotos] = useState<Record<number, string>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { data: completion, isLoading, refetch } = useQuery<ChecklistCompletion>({
    queryKey: ['/api/checklist-completions', completionId],
    queryFn: async () => {
      const res = await fetch(`/api/checklist-completions/${completionId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!completionId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (completion?.startedAt) {
      const startTime = new Date(completion.startedAt).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [completion?.startedAt]);

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, photoUrl, notes }: { taskId: number; photoUrl?: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/checklist-completions/${completionId}/tasks/${taskId}/complete`, {
        photoUrl,
        notes
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-completions', completionId] });
      
      const completedCount = (completion?.completedTasks || 0) + 1;
      const totalCount = completion?.totalTasks || 1;
      
      if (completedCount === totalCount) {
        setShowConfetti(true);
        toast({
          title: "Tebrikler! 🎉",
          description: "Tüm görevleri tamamladınız!",
        });
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        toast({
          title: "Görev Tamamlandı ✓",
          description: `${completedCount}/${totalCount} görev tamamlandı`,
        });
      }
      
      setExpandedTaskId(null);
      setTaskNotes(prev => ({ ...prev, [variables.taskId]: '' }));
      setTaskPhotos(prev => ({ ...prev, [variables.taskId]: '' }));
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Görev tamamlanamadı",
        variant: "destructive",
      });
    },
  });

  const submitChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/checklist-completions/${completionId}/submit`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Başarılı! 🏆",
        description: `Checklist tamamlandı. Puanınız: ${data.score}/100`,
      });
      setTimeout(() => {
        setLocation('/sube/dashboard');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Checklist gönderilemedi",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isTaskLate = (task: ChecklistTask) => {
    if (!task.taskTimeEnd) return false;
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    return currentTime > task.taskTimeEnd;
  };

  const getTaskCompletion = (taskId: number) => {
    return completion?.taskCompletions.find(tc => tc.taskId === taskId);
  };

  const handleCompleteTask = (taskId: number, requiresPhoto: boolean) => {
    const photoUrl = taskPhotos[taskId];
    const notes = taskNotes[taskId];
    
    if (requiresPhoto && !photoUrl) {
      toast({
        title: "Fotoğraf Gerekli",
        description: "Bu görev için fotoğraf yüklemeniz zorunludur.",
        variant: "destructive",
      });
      return;
    }
    
    completeTaskMutation.mutate({ taskId, photoUrl, notes });
  };

  if (!completionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Geçersiz checklist ID</p>
            <Button className="mt-4" onClick={() => setLocation('/sube/dashboard')}>
              Dashboard'a Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!completion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Checklist bulunamadı</p>
            <Button className="mt-4" onClick={() => setLocation('/sube/dashboard')}>
              Dashboard'a Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = completion.totalTasks > 0 
    ? Math.round((completion.completedTasks / completion.totalTasks) * 100) 
    : 0;

  const allTasksCompleted = completion.completedTasks === completion.totalTasks;

  return (
    <div className="min-h-screen bg-background pb-24">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/sube/dashboard')}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold text-lg" data-testid="text-checklist-title">
                {completion.checklist.title}
              </h1>
              {completion.checklist.category && (
                <Badge variant="secondary" className="text-xs">
                  {completion.checklist.category}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
            {completion.timeWindowEnd && (
              <div className={`flex items-center gap-1 ${completion.isLate ? 'text-destructive' : ''}`}>
                <Clock className="w-4 h-4" />
                <span>Bitiş: {completion.timeWindowEnd}</span>
                {completion.isLate && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    Geç
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{completion.completedTasks}/{completion.totalTasks} görev</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-3">
        {completion.tasks.map((task, index) => {
          const taskCompletion = getTaskCompletion(task.id);
          const isCompleted = taskCompletion?.isCompleted || false;
          const isExpanded = expandedTaskId === task.id;
          const isLate = isTaskLate(task);
          const canComplete = !isCompleted;

          return (
            <Card 
              key={task.id} 
              className={`transition-all ${isCompleted ? 'bg-muted/50 border-green-500/30' : ''} ${isLate && !isCompleted ? 'border-amber-500' : ''}`}
              data-testid={`card-task-${task.id}`}
            >
              <CardContent className="p-4">
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => canComplete && setExpandedTaskId(isExpanded ? null : task.id)}
                >
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className={`w-6 h-6 ${isLate ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-medium">
                        {index + 1}.
                      </span>
                      <p className={`flex-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {task.taskDescription}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {task.taskTimeStart && task.taskTimeEnd && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.taskTimeStart} - {task.taskTimeEnd}
                        </Badge>
                      )}
                      {task.requiresPhoto && (
                        <Badge variant="outline" className="text-xs">
                          <Camera className="w-3 h-3 mr-1" />
                          Fotoğraf zorunlu
                        </Badge>
                      )}
                      {task.aiVerificationType && task.aiVerificationType !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          <BrainCircuit className="w-3 h-3 mr-1" />
                          AI kontrol
                        </Badge>
                      )}
                      {isLate && !isCompleted && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Süre aşıldı
                        </Badge>
                      )}
                      {taskCompletion?.isLate && isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          Geç tamamlandı
                        </Badge>
                      )}
                    </div>

                    {isCompleted && taskCompletion?.photoUrl && (
                      <div className="mt-2 space-y-2">
                        <img 
                          src={taskCompletion.photoUrl} 
                          alt="Görev fotoğrafı" 
                          className="h-20 w-20 object-cover rounded-md"
                        />
                        {taskCompletion.aiVerificationResult && (
                          <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                            taskCompletion.aiVerificationResult === 'passed' 
                              ? 'bg-green-500/10 text-green-600' 
                              : taskCompletion.aiVerificationResult === 'failed'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-muted'
                          }`}>
                            {taskCompletion.aiVerificationResult === 'passed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : taskCompletion.aiVerificationResult === 'failed' ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <BrainCircuit className="h-4 w-4" />
                            )}
                            <span>
                              AI: %{taskCompletion.aiSimilarityScore || 0} benzerlik
                              {taskCompletion.aiVerificationResult === 'passed' ? ' ✓' : 
                               taskCompletion.aiVerificationResult === 'failed' ? ' ✗' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && canComplete && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {task.requiresPhoto && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          <Camera className="w-4 h-4 inline mr-1" />
                          Fotoğraf {task.requiresPhoto ? '(Zorunlu)' : '(Opsiyonel)'}
                        </label>
                        {taskPhotos[task.id] ? (
                          <div className="relative inline-block">
                            <img 
                              src={taskPhotos[task.id]} 
                              alt="Yüklenen fotoğraf" 
                              className="h-32 w-32 object-cover rounded-md"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                              onClick={() => setTaskPhotos(prev => ({ ...prev, [task.id]: '' }))}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <ObjectUploader
                            onGetUploadParameters={async () => {
                              const res = await fetch('/api/objects/upload', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' }
                              });
                              const data = await res.json();
                              return { method: 'PUT' as const, url: data.url };
                            }}
                            onComplete={(result) => {
                              if (result.successful.length > 0) {
                                setTaskPhotos(prev => ({ ...prev, [task.id]: result.successful[0].uploadURL }));
                              }
                            }}
                          >
                            <Button variant="outline" className="w-full">
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Fotoğraf Yükle
                            </Button>
                          </ObjectUploader>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Not (Opsiyonel)
                      </label>
                      <Textarea
                        placeholder="Varsa not ekleyin..."
                        value={taskNotes[task.id] || ''}
                        onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleCompleteTask(task.id, task.requiresPhoto)}
                      disabled={completeTaskMutation.isPending}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      {completeTaskMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Görevi Tamamla
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
        <div className="container mx-auto">
          {allTasksCompleted ? (
            <Button
              className="w-full h-12 text-lg"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitChecklistMutation.isPending}
              data-testid="button-submit-checklist"
            >
              {submitChecklistMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              Checklistı Tamamla ve Gönder
            </Button>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Tüm görevleri tamamlayın</p>
              <p className="text-sm">Kalan: {completion.totalTasks - completion.completedTasks} görev</p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Checklistı Gönder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tüm görevler tamamlandı! Checklistı göndermek istediğinize emin misiniz?
              {completion.isLate && (
                <span className="mt-2 text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Checklist geç tamamlandı. Bu puanınızı etkileyebilir.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitChecklistMutation.mutate()}>
              Gönder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
