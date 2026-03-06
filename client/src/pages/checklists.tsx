import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { isHQRole } from "@shared/schema";
import { offlineErrorHandler } from "@/hooks/useOfflineMutation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyStatePreset } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChecklistSchema, updateChecklistSchema, type Checklist, type InsertChecklist, type ChecklistTask, type UpdateChecklist, type UserRoleType } from "@shared/schema";
import { z } from "zod";
import { FileText, Plus, Camera, ChevronDown, Sparkles, Edit, Trash2, MoveUp, MoveDown, AlertTriangle, CheckCircle, Clock, Send, Loader2, X, Image } from "lucide-react";

const EditChecklistFormSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  category: z.string().optional(),
  isEditable: z.boolean().default(true),
  timeWindowStart: z.string().optional(),
  timeWindowEnd: z.string().optional(),
  tasks: z.array(z.object({
    id: z.number().optional(),
    taskDescription: z.string().min(1, "Görev açıklaması gerekli"),
    requiresPhoto: z.boolean(),
    tolerancePercent: z.number().default(70),
    aiVerificationType: z.enum(["none", "cleanliness", "arrangement", "machine_settings", "general"]).default("none"),
  })).min(1, "En az bir görev olmalı"),
});

type EditChecklistFormValues = z.infer<typeof EditChecklistFormSchema>;

interface ChecklistCompletion {
  id: number;
  checklistId: number;
  userId: string;
  status: 'in_progress' | 'completed' | 'reviewed';
  startedAt: string;
  completedAt?: string;
  taskCompletions?: TaskCompletion[];
  checklist?: Checklist;
  tasks?: ChecklistTask[];
}

interface TaskCompletion {
  id: number;
  completionId: number;
  taskId: number;
  isCompleted: boolean;
  completedAt?: string;
  photoUrl?: string;
  notes?: string;
}

export default function Checklists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [removedTaskIds, setRemovedTaskIds] = useState<number[]>([]);
  const [activeCompletionId, setActiveCompletionId] = useState<number | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTaskIdForUpload, setCurrentTaskIdForUpload] = useState<number | null>(null);
  const [currentCompletionIdForUpload, setCurrentCompletionIdForUpload] = useState<number | null>(null);
  const [highlightedChecklistId, setHighlightedChecklistId] = useState<number | null>(null);
  const [localCompletions, setLocalCompletions] = useState<Map<number, ChecklistCompletion>>(new Map());

  const isCoach = user?.role === 'coach';
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'supervisor_buddy';
  
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const checklistId = params.get('id');
    if (checklistId) {
      const id = parseInt(checklistId);
      setHighlightedChecklistId(id);
      setTimeout(() => {
        const element = document.querySelector(`[data-testid="card-checklist-${id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      setTimeout(() => setHighlightedChecklistId(null), 3000);
    }
  }, [searchString]);

  const canManageChecklists = isHQRole((user?.role || 'barista') as UserRoleType) || isCoach || isSupervisor;
  
  const checklistEndpoint = canManageChecklists ? "/api/checklists" : "/api/checklists/my-assignments";

  const { data: checklists, isLoading } = useQuery<any[]>({
    queryKey: [checklistEndpoint],
  });

  const { data: checklistTasks } = useQuery<ChecklistTask[]>({
    queryKey: ["/api/checklist-tasks"],
    enabled: canManageChecklists,
  });

  const { data: todayCompletions = [], refetch: refetchCompletions } = useQuery<ChecklistCompletion[]>({
    queryKey: ["/api/checklist-completions/my/today"],
    queryFn: async () => {
      const res = await fetch("/api/checklist-completions/my/today");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !canManageChecklists,
  });

  useEffect(() => {
    setLocalCompletions(() => {
      const newMap = new Map<number, ChecklistCompletion>();
      todayCompletions.forEach(c => {
        newMap.set(c.checklistId, c);
      });
      return newMap;
    });
  }, [todayCompletions]);

  const startCompletionMutation = useMutation({
    mutationFn: async ({ assignmentId, checklistId }: { assignmentId: number; checklistId: number }) => {
      const res = await fetch("/api/checklist-completions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, checklistId, branchId: user?.branchId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ChecklistCompletion>;
    },
    onSuccess: (data) => {
      setActiveCompletionId(data.id);
      setLocalCompletions(prev => {
        const newMap = new Map(prev);
        newMap.set(data.checklistId, data);
        return newMap;
      });
      refetchCompletions();
      toast({ title: "Başarılı", description: "Checklist başlatıldı" });
    },
    onError: (error: Error) => {
      offlineErrorHandler(error, { url: "/api/checklist-completions/start", method: "POST", body: { branchId: user?.branchId } }, "Checklist başlatma", toast) ||
        toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ completionId, taskId, photoUrl, notes }: { completionId: number; taskId: number; photoUrl?: string; notes?: string }) => {
      const res = await fetch(`/api/checklist-completions/${completionId}/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setLocalCompletions(prev => {
        const newMap = new Map(prev);
        for (const [checklistId, completion] of Array.from(newMap.entries())) {
          if (completion.id === variables.completionId) {
            const updatedTaskCompletions = [...(completion.taskCompletions || [])];
            const existingIdx = updatedTaskCompletions.findIndex(tc => tc.taskId === variables.taskId);
            if (existingIdx >= 0) {
              updatedTaskCompletions[existingIdx] = { ...updatedTaskCompletions[existingIdx], isCompleted: true, completedAt: new Date().toISOString() };
            } else {
              updatedTaskCompletions.push({
                id: Date.now(),
                completionId: variables.completionId,
                taskId: variables.taskId,
                isCompleted: true,
                completedAt: new Date().toISOString(),
              });
            }
            newMap.set(checklistId, { ...completion, taskCompletions: updatedTaskCompletions });
            break;
          }
        }
        return newMap;
      });
      refetchCompletions();
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-completions/my/today"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const submitCompletionMutation = useMutation({
    mutationFn: async (completionId: number) => {
      const res = await fetch(`/api/checklist-completions/${completionId}/submit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setActiveCompletionId(null);
      refetchCompletions();
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-completions/my/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklists/my-assignments"] });
      toast({ title: "Başarılı", description: "Checklist tamamlandı ve gönderildi!" });
    },
    onError: (error: Error) => {
      offlineErrorHandler(error, { url: `/api/checklist-completions/${activeCompletionId}/submit`, method: "POST", body: null }, "Checklist tamamlama", toast) ||
        toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<InsertChecklist>({
    resolver: zodResolver(insertChecklistSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
      category: "",
      isActive: true,
    },
  });

  const editForm = useForm<EditChecklistFormValues>({
    resolver: zodResolver(EditChecklistFormSchema),
    shouldUnregister: false,
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
      category: "",
      isEditable: true,
      timeWindowStart: "",
      timeWindowEnd: "",
      tasks: [],
    },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control: editForm.control,
    name: "tasks",
  });

  const getCompletionForChecklist = (checklistId: number): ChecklistCompletion | undefined => {
    const localCompletion = localCompletions.get(checklistId);
    if (localCompletion) return localCompletion;
    return todayCompletions.find(c => c.checklistId === checklistId);
  };

  const isTaskCompleted = (completion: ChecklistCompletion | undefined, taskId: number): boolean => {
    if (!completion?.taskCompletions) return false;
    return completion.taskCompletions.some(tc => tc.taskId === taskId && tc.isCompleted);
  };

  const getTaskCompletion = (completion: ChecklistCompletion | undefined, taskId: number): TaskCompletion | undefined => {
    if (!completion?.taskCompletions) return undefined;
    return completion.taskCompletions.find(tc => tc.taskId === taskId);
  };

  const handleStartChecklist = (checklist: any) => {
    const assignmentId = checklist.assignment?.id || checklist.id;
    startCompletionMutation.mutate({ assignmentId, checklistId: checklist.id });
  };

  const handleTaskCheck = async (completionId: number, taskId: number, requiresPhoto: boolean, photoUrl?: string) => {
    if (requiresPhoto && !photoUrl) {
      setCurrentTaskIdForUpload(taskId);
      setCurrentCompletionIdForUpload(completionId);
      fileInputRef.current?.click();
      return;
    }
    
    completeTaskMutation.mutate({ completionId, taskId, photoUrl });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTaskIdForUpload || !currentCompletionIdForUpload) return;

    const completionId = currentCompletionIdForUpload;
    const taskId = currentTaskIdForUpload;

    setUploadingTaskId(taskId);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "checklist-photo");
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error("Fotoğraf yüklenemedi");
      }
      
      const { url } = await uploadRes.json();
      
      completeTaskMutation.mutate({ 
        completionId, 
        taskId, 
        photoUrl: url 
      });
      
      toast({ title: "Başarılı", description: "Fotoğraf yüklendi ve görev tamamlandı" });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setUploadingTaskId(null);
      setCurrentTaskIdForUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmitChecklist = (completionId: number) => {
    submitCompletionMutation.mutate(completionId);
  };

  const toggleTaskExpanded = (taskId: number) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertChecklist) => {
      await apiRequest("POST", "/api/checklists", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklists/my-assignments"] });
      toast({ title: "Başarılı", description: "Checklist oluşturuldu" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Checklist oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (checklist: Checklist) => {
    const tasks = getTasksForChecklist(checklist.id).sort((a, b) => a.order - b.order);
    
    editForm.reset({
      title: checklist.title,
      description: checklist.description || "",
      frequency: checklist.frequency as "daily" | "weekly" | "monthly",
      category: checklist.category || "",
      isEditable: checklist.isEditable ?? true,
      timeWindowStart: checklist.timeWindowStart || "",
      timeWindowEnd: checklist.timeWindowEnd || "",
      tasks: tasks.map(t => ({
        id: t.id,
        taskDescription: t.taskDescription,
        requiresPhoto: t.requiresPhoto ?? false,
        tolerancePercent: t.tolerancePercent ?? 70,
        aiVerificationType: t.aiVerificationType ?? "none",
      })),
    });
    
    setEditingChecklist(checklist);
    setRemovedTaskIds([]);
    setIsEditDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: EditChecklistFormValues) => {
      if (!editingChecklist) throw new Error("No checklist selected");
      
      const uniqueRemovedIds = Array.from(new Set(removedTaskIds));
      
      const payload: UpdateChecklist = {
        title: data.title,
        description: data.description || null,
        frequency: data.frequency,
        category: data.category || null,
        isEditable: data.isEditable,
        timeWindowStart: data.timeWindowStart || null,
        timeWindowEnd: data.timeWindowEnd || null,
        tasks: [
          ...data.tasks.map((t, idx) => ({
            id: t.id ?? null,
            taskDescription: t.taskDescription,
            requiresPhoto: t.requiresPhoto,
            order: idx,
            tolerancePercent: t.tolerancePercent ?? 70,
            aiVerificationType: (t.aiVerificationType ?? "none") as "none" | "cleanliness" | "arrangement" | "machine_settings" | "general",
          })),
          ...uniqueRemovedIds.map(id => ({
            id,
            taskDescription: "",
            requiresPhoto: false,
            order: 0,
            tolerancePercent: 70,
            aiVerificationType: "none" as const,
            _action: "delete" as const,
          })),
        ],
      };
      
      await apiRequest("PATCH", `/api/checklists/${editingChecklist.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklists/my-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-tasks"] });
      toast({ title: "Başarılı", description: "Checklist güncellendi" });
      setIsEditDialogOpen(false);
      setEditingChecklist(null);
      setRemovedTaskIds([]);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: error.message || "Checklist güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const handleTaskRemove = (index: number) => {
    const task = fields[index] as any;
    if (task.id) {
      setRemovedTaskIds(prev => [...prev, task.id as number]);
    }
    remove(index);
  };

  const getTasksForChecklist = (checklistId: number): ChecklistTask[] => {
    if (canManageChecklists && checklistTasks) {
      return checklistTasks.filter(task => task.checklistId === checklistId) || [];
    }
    const checklist = checklists?.find(c => c.id === checklistId) as any;
    return checklist?.tasks || [];
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Günlük",
    weekly: "Haftalık",
    monthly: "Aylık",
  };

  const renderEmployeeChecklistCard = (checklist: any) => {
    const tasks = checklist.tasks || [];
    const completion = getCompletionForChecklist(checklist.id);
    const isStarted = !!completion;
    const isCompleted = completion?.status === 'completed' || completion?.status === 'reviewed';
    
    const completedTasksCount = completion?.taskCompletions?.filter(tc => tc.isCompleted).length || 0;
    const totalTasks = tasks.length;
    const progressPercent = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

    const isHighlighted = highlightedChecklistId === checklist.id;
    
    return (
      <Card 
        key={checklist.id} 
        className={`transition-all duration-300 ${isCompleted ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/20" : ""} ${isHighlighted ? "ring-2 ring-primary shadow-lg animate-pulse" : ""}`} 
        data-testid={`card-checklist-${checklist.id}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isStarted ? (
                  <Clock className="h-5 w-5 text-amber-500" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
                {checklist.title}
              </CardTitle>
              {checklist.description && (
                <CardDescription className="mt-1 text-xs">{checklist.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
              <Badge variant="secondary" className="text-xs">{frequencyLabels[checklist.frequency]}</Badge>
              {isCompleted && <Badge className="bg-green-500 text-xs">Tamamlandı</Badge>}
              {isStarted && !isCompleted && <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">Devam Ediyor</Badge>}
            </div>
          </div>
          
          {isStarted && !isCompleted && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>İlerleme</span>
                <span>{completedTasksCount}/{totalTasks} görev</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-2">
          {!isStarted ? (
            <Button 
              onClick={() => handleStartChecklist(checklist)}
              disabled={startCompletionMutation.isPending}
              className="w-full"
              data-testid={`button-start-checklist-${checklist.id}`}
            >
              {startCompletionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Checklist'i Başlat
            </Button>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: ChecklistTask) => {
                const taskCompleted = isTaskCompleted(completion, task.id);
                const taskCompletionData = getTaskCompletion(completion, task.id);
                const isExpanded = expandedTasks[task.id];
                const isUploading = uploadingTaskId === task.id;
                
                return (
                  <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                    <div 
                      className={`border rounded-md transition-colors ${taskCompleted ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'hover-elevate'}`}
                      data-testid={`checklist-task-${task.id}`}
                    >
                      <div className="flex items-center gap-2 p-3">
                        <Checkbox
                          checked={taskCompleted}
                          disabled={taskCompleted || isCompleted || completeTaskMutation.isPending || isUploading}
                          onCheckedChange={() => {
                            if (!taskCompleted && completion) {
                              handleTaskCheck(completion.id, task.id, task.requiresPhoto || false, taskCompletionData?.photoUrl);
                            }
                          }}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          data-testid={`checkbox-task-${task.id}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left" disabled={isCompleted}>
                          <p className={`flex-1 text-sm ${taskCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {task.taskDescription}
                          </p>
                          {task.requiresPhoto && !taskCompleted && (
                            <Badge variant="outline" className="text-xs">
                              <Camera className="h-3 w-3 mr-1" />
                              Fotoğraf
                            </Badge>
                          )}
                          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 border-t space-y-3">
                          {taskCompletionData?.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              Tamamlandı: {new Date(taskCompletionData.completedAt).toLocaleString('tr-TR')}
                            </p>
                          )}
                          
                          {task.requiresPhoto && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                Fotoğraf Kanıtı {task.requiresPhoto && <span className="text-destructive">*</span>}
                              </h5>
                              
                              {taskCompletionData?.photoUrl ? (
                                <div className="relative">
                                  <img 
                                    src={taskCompletionData.photoUrl} 
                                    alt="Görev fotoğrafı" 
                                    className="w-full max-h-48 object-cover rounded-md border"
                                    loading="lazy"
                                  />
                                </div>
                              ) : !taskCompleted && !isCompleted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentTaskIdForUpload(task.id);
                                    setCurrentCompletionIdForUpload(completion!.id);
                                    fileInputRef.current?.click();
                                  }}
                                  disabled={isUploading}
                                  className="w-full"
                                  data-testid={`button-upload-photo-${task.id}`}
                                >
                                  {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Camera className="mr-2 h-4 w-4" />
                                  )}
                                  Fotoğraf Çek / Yükle
                                </Button>
                              ) : null}
                            </div>
                          )}
                          
                          {!taskCompleted && !isCompleted && !task.requiresPhoto && (
                            <Button
                              size="sm"
                              onClick={() => completion && handleTaskCheck(completion.id, task.id, false)}
                              disabled={completeTaskMutation.isPending}
                              className="w-full"
                              data-testid={`button-complete-task-${task.id}`}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Görevi Tamamla
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
        
        {isStarted && !isCompleted && completedTasksCount === totalTasks && totalTasks > 0 && (
          <CardFooter className="pt-0">
            <Button 
              onClick={() => completion && handleSubmitChecklist(completion.id)}
              disabled={submitCompletionMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid={`button-submit-checklist-${checklist.id}`}
            >
              {submitCompletionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Checklist'i Gönder
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  const renderManagerChecklistCard = (checklist: Checklist) => {
    const tasks = getTasksForChecklist(checklist.id);
    const isHighlighted = highlightedChecklistId === checklist.id;
    
    return (
      <Card 
        key={checklist.id} 
        className={`transition-all duration-300 ${isHighlighted ? "ring-2 ring-primary shadow-lg animate-pulse" : ""}`}
        data-testid={`card-checklist-${checklist.id}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {checklist.title}
              </CardTitle>
              {checklist.description && (
                <CardDescription className="mt-2">{checklist.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-2 items-start">
              <Badge variant="secondary">{frequencyLabels[checklist.frequency]}</Badge>
              {checklist.category && (
                <Badge variant="outline">{checklist.category}</Badge>
              )}
              {(isCoach || (isSupervisor && checklist.isEditable)) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditClick(checklist)}
                  data-testid={`button-edit-checklist-${checklist.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Çizelge Maddeleri ({tasks.length} görev)</h3>
              </div>
              
              <div className="w-full space-y-1">
                {tasks.sort((a, b) => a.order - b.order).map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-2 p-2 border rounded-md text-sm"
                    data-testid={`checklist-task-${task.id}`}
                  >
                    <div className="w-4 h-4 border rounded flex items-center justify-center text-muted-foreground text-xs">
                      {task.order + 1}
                    </div>
                    <span className="flex-1">{task.taskDescription}</span>
                    {task.requiresPhoto && (
                      <Badge variant="outline" className="text-xs">
                        <Camera className="h-3 w-3 mr-1" />
                        Fotoğraf
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Bu checklist için henüz görev eklenmemiş
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold" data-testid="text-page-title">Checklistler</h1>
          <p className="text-muted-foreground mt-1">
            {canManageChecklists 
              ? "Görev şablonlarını ve rutin kontrolleri yönetin" 
              : "Size atanan görevleri tamamlayın"}
          </p>
        </div>
        {canManageChecklists && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-checklist">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Checklist
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Checklist Oluştur</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Örn: Açılış Checklist" data-testid="input-checklist-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Checklist açıklaması" data-testid="input-checklist-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sıklık</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-frequency">
                            <SelectValue placeholder="Sıklık seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="monthly">Aylık</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Örn: Açılış, Kapanış, Temizlik" data-testid="input-checklist-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-checklist">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton count={3} variant="row" showHeader={false} />
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {checklists?.map((checklist) => 
            canManageChecklists 
              ? renderManagerChecklistCard(checklist)
              : renderEmployeeChecklistCard(checklist)
          )}
          {(!checklists || checklists.length === 0) && (
            <EmptyStatePreset 
              preset="checklists"
              variant={canManageChecklists ? "default" : "filter"}
            />
          )}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
              {editingChecklist && !(editingChecklist.isEditable ?? true) && !isCoach && (
                <div className="bg-warning/10 dark:bg-warning/5/20 border border-warning/30 dark:border-warning/40 rounded-md p-3 text-sm text-warning dark:text-warning flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Bu checklist düzenlenemez olarak işaretlenmiş. Sadece HQ Coach yetkisi ile düzenlenebilir.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isCoach && !(editingChecklist?.isEditable ?? true)} data-testid="input-edit-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sıklık</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isCoach && !(editingChecklist?.isEditable ?? true)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-frequency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="monthly">Aylık</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={!isCoach && !(editingChecklist?.isEditable ?? true)} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Örn: Açılış, Kapanış" disabled={!isCoach && !(editingChecklist?.isEditable ?? true)} data-testid="input-edit-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isCoach && (
                  <FormField
                    control={editForm.control}
                    name="isEditable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Düzenlenebilir</FormLabel>
                          <FormDescription className="text-xs">
                            Supervisorlar düzenleyebilir mi?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-isEditable"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <FormField
                  control={editForm.control}
                  name="timeWindowStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç Saati (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          disabled={!isCoach && !(editingChecklist?.isEditable ?? true)}
                          data-testid="input-edit-timeWindowStart"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Görevlerin başlayabileceği en erken saat
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="timeWindowEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş Saati (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          disabled={!isCoach && !(editingChecklist?.isEditable ?? true)}
                          data-testid="input-edit-timeWindowEnd"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Görevlerin tamamlanması gereken son saat
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Görevler</h3>
                  {(isCoach || (editingChecklist && editingChecklist.isEditable)) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => append({ id: undefined, taskDescription: "", requiresPhoto: false, tolerancePercent: 70, aiVerificationType: "none" })}
                      data-testid="button-add-task"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Görev Ekle
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-md p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      <div className="flex gap-2">
                        <FormField
                          control={editForm.control}
                          name={`tasks.${index}.taskDescription`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Görev açıklaması"
                                  disabled={!isCoach && !(editingChecklist?.isEditable ?? true)}
                                  data-testid={`input-task-description-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {(isCoach || (editingChecklist && editingChecklist.isEditable)) && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => swap(index, index - 1)}
                              disabled={index === 0}
                              data-testid={`button-move-up-${index}`}
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => swap(index, index + 1)}
                              disabled={index === fields.length - 1}
                              data-testid={`button-move-down-${index}`}
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={() => handleTaskRemove(index)}
                              data-testid={`button-delete-task-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <FormField
                        control={editForm.control}
                        name={`tasks.${index}.requiresPhoto`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isCoach && !(editingChecklist?.isEditable ?? true)}
                                data-testid={`checkbox-requires-photo-${index}`}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Fotoğraf zorunlu
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Henüz görev eklenmemiş. "Görev Ekle" butonunu kullanın.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || (!isCoach && !(editingChecklist?.isEditable ?? true))}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
