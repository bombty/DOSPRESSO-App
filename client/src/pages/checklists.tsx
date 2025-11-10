import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChecklistSchema, updateChecklistSchema, type Checklist, type InsertChecklist, type ChecklistTask, type UpdateChecklist } from "@shared/schema";
import { z } from "zod";
import { FileText, Plus, Camera, ChevronDown, Sparkles, Edit, Trash2, MoveUp, MoveDown } from "lucide-react";

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
  })).min(1, "En az bir görev olmalı"),
});

type EditChecklistFormValues = z.infer<typeof EditChecklistFormSchema>;

export default function Checklists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [removedTaskIds, setRemovedTaskIds] = useState<number[]>([]);
  const [taskStates, setTaskStates] = useState<Record<number, { checked: boolean; open: boolean; photo?: string }>>({});

  const isCoach = user?.role === 'coach';
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'supervisor_buddy';

  const { data: checklists, isLoading } = useQuery<Checklist[]>({
    queryKey: ["/api/checklists"],
  });

  const { data: checklistTasks } = useQuery<ChecklistTask[]>({
    queryKey: ["/api/checklist-tasks"],
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

  const toggleTaskChecked = (taskId: number) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        checked: !prev[taskId]?.checked,
      }
    }));
  };

  const toggleTaskOpen = (taskId: number) => {
    setTaskStates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        open: !prev[taskId]?.open,
      }
    }));
  };

  const handlePhotoUpload = (taskId: number) => {
    toast({ title: "Fotoğraf Yükleme", description: "Fotoğraf yükleme özelliği yakında aktif olacak" });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertChecklist) => {
      await apiRequest("/api/checklists", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
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
          })),
          ...uniqueRemovedIds.map(id => ({
            id,
            taskDescription: "",
            requiresPhoto: false,
            order: 0,
            _action: "delete" as const,
          })),
        ],
      };
      
      await apiRequest(`/api/checklists/${editingChecklist.id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-tasks"] });
      toast({ title: "Başarılı", description: "Checklist güncellendi" });
      setIsEditDialogOpen(false);
      setEditingChecklist(null);
      setRemovedTaskIds([]);
    },
    onError: (error: any) => {
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

  const getTasksForChecklist = (checklistId: number) => {
    return checklistTasks?.filter(task => task.checklistId === checklistId) || [];
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Günlük",
    weekly: "Haftalık",
    monthly: "Aylık",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Checklistler</h1>
          <p className="text-muted-foreground mt-1">Görev şablonlarını ve rutin kontrolleri yönetin</p>
        </div>
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
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {checklists?.map((checklist) => {
            const tasks = getTasksForChecklist(checklist.id);
            return (
              <Card key={checklist.id} data-testid={`card-checklist-${checklist.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
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
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Çizelge Maddeleri</h3>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">09:00</h4>
                        {tasks.map((task) => {
                          const isChecked = taskStates[task.id]?.checked || false;
                          const isOpen = taskStates[task.id]?.open || false;
                          
                          return (
                            <Collapsible
                              key={task.id}
                              open={isOpen}
                              onOpenChange={() => toggleTaskOpen(task.id)}
                            >
                              <div 
                                className="border rounded-md hover-elevate"
                                data-testid={`checklist-task-${task.id}`}
                              >
                                <CollapsibleTrigger className="w-full">
                                  <div className="flex items-center gap-3 p-3">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => toggleTaskChecked(task.id)}
                                      className="data-[state=checked]:bg-info data-[state=checked]:border-info"
                                      data-testid={`checkbox-task-${task.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <p className="flex-1 text-left text-sm">{task.taskDescription}</p>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </div>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-1 space-y-3 border-t">
                                    <p className="text-xs text-muted-foreground">
                                      En son Ece tarafından tarihinde işlem yapılmıştır.
                                    </p>
                                    
                                    <div className="space-y-2">
                                      <h5 className="text-sm font-medium">Fotoğraf Kanıtı</h5>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePhotoUpload(task.id)}
                                        className="w-full"
                                        data-testid={`button-upload-photo-${task.id}`}
                                      >
                                        <Camera className="mr-2 h-4 w-4" />
                                        Fotoğraf Ekle
                                      </Button>
                                      
                                      {taskStates[task.id]?.photo && (
                                        <div className="space-y-2">
                                          <div className="aspect-video bg-muted rounded-md overflow-hidden">
                                            <img 
                                              src={taskStates[task.id].photo} 
                                              alt="Task photo" 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full bg-info hover:bg-info/90"
                                            data-testid={`button-ai-analyze-${task.id}`}
                                          >
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            AI ile Analiz Et
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Bu checklist için henüz görev eklenmemiş
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(!checklists || checklists.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Henüz checklist yok. Yeni checklist oluşturmak için yukarıdaki butonu kullanın.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Düzenle</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              {editingChecklist && !(editingChecklist.isEditable ?? true) && !isCoach && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Bu checklist düzenlenemez olarak işaretlenmiş. Sadece HQ Coach yetkisi ile düzenlenebilir.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Görevler</h3>
                  {(isCoach || (editingChecklist && editingChecklist.isEditable)) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => append({ id: undefined, taskDescription: "", requiresPhoto: false })}
                      data-testid="button-add-task"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Görev Ekle
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-md p-3 space-y-2">
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
                    <p className="text-sm text-muted-foreground text-center py-4">
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
