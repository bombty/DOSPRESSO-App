import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertCircle, UserPlus, Camera, Upload, X, BrainCircuit, ImagePlus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import type { Checklist, ChecklistTask, UserRoleType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

// Sortable Task Item Component
function SortableTaskItem({ 
  task, 
  index 
}: { 
  task: ChecklistTask; 
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md border bg-background"
      data-testid={`sortable-task-${task.id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-muted-foreground min-w-[24px]">{index + 1}.</span>
      <span className="flex-1">{task.taskDescription}</span>
      {task.requiresPhoto && (
        <Badge variant="outline" className="text-xs">Fotoğraf</Badge>
      )}
      {task.aiVerificationType && task.aiVerificationType !== "none" && (
        <Badge variant="secondary" className="text-xs">
          <BrainCircuit className="h-3 w-3 mr-1" />
          AI
        </Badge>
      )}
    </div>
  );
}

export default function AdminChecklistManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignChecklist, setAssignChecklist] = useState<Checklist | null>(null);
  const [expandedChecklistId, setExpandedChecklistId] = useState<number | null>(null);

  const { data: checklists, isLoading, isError, refetch } = useQuery<Checklist[]>({
    queryKey: ['/api/checklists'],
  });

  const { data: checklistTasks = [] } = useQuery<ChecklistTask[]>({
    queryKey: ['/api/checklist-tasks'],
    enabled: !!checklists,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const deleteChecklistMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists'] });
      toast({ title: "Başarılı", description: "Checklist silindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async ({ checklistId, taskIds }: { checklistId: number; taskIds: number[] }) => {
      return apiRequest("PATCH", "/api/checklist-tasks/reorder", { checklistId, taskIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-tasks'] });
      toast({ title: "Başarılı", description: "Görev sırası güncellendi" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleTaskDragEnd = (checklistId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Get current sorted tasks fresh from query data
    const currentTasks = checklistTasks
      .filter((t) => t.checklistId === checklistId)
      .sort((a, b) => a.order - b.order);

    const oldIndex = currentTasks.findIndex((t) => t.id === active.id);
    const newIndex = currentTasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedTasks = arrayMove(currentTasks, oldIndex, newIndex);
      const taskIds = reorderedTasks.map((t) => t.id);
      reorderTasksMutation.mutate({ checklistId, taskIds });
    }
  };

  const filteredChecklists = checklists?.filter((c) => {
    if (filterFrequency !== "all" && c.frequency !== filterFrequency) return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    return true;
  });

  const getChecklistTasks = (checklistId: number) => {
    return checklistTasks.filter((t) => t.checklistId === checklistId);
  };

  const handleEdit = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setEditDialogOpen(true);
  };

  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const handleDelete = (id: number, name?: string) => {
    requestDelete(id, name || "Checklist");
  };

  const toggleExpand = (id: number) => {
    setExpandedChecklistId(expandedChecklistId === id ? null : id);
  };

  if (!user || !isHQRole(user.role as UserRoleType)) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg">Yetkisiz Erişim</h3>
            <p className="text-muted-foreground" data-testid="text-unauthorized">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-2 sm:space-y-3">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Checklist Yönetimi</CardTitle>
              <CardDescription>Şube checklist'lerini oluşturun ve yönetin</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-checklist">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Checklist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogDescription className="sr-only">Yeni bir checklist oluşturun</DialogDescription>
                <ChecklistFormDialog
                  mode="create"
                  onClose={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 sm:gap-3 mb-4">
            <Select value={filterFrequency} onValueChange={setFilterFrequency}>
              <SelectTrigger className="w-48" data-testid="filter-frequency">
                <SelectValue placeholder="Sıklık" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sıklıklar</SelectItem>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="weekly">Haftalık</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48" data-testid="filter-category">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="opening">Açılış</SelectItem>
                <SelectItem value="closing">Kapanış</SelectItem>
                <SelectItem value="cleaning">Temizlik</SelectItem>
                <SelectItem value="maintenance">Bakım</SelectItem>
                <SelectItem value="safety">Güvenlik</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredChecklists?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henüz checklist bulunmuyor</div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {filteredChecklists?.map((checklist) => {
                const tasks = getChecklistTasks(checklist.id);
                const isExpanded = expandedChecklistId === checklist.id;

                return (
                  <Card key={checklist.id} data-testid={`checklist-card-${checklist.id}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg" data-testid={`checklist-title-${checklist.id}`}>
                              {checklist.title}
                            </h3>
                            <Badge variant="outline" data-testid={`checklist-frequency-${checklist.id}`}>
                              {checklist.frequency === 'daily' && 'Günlük'}
                              {checklist.frequency === 'weekly' && 'Haftalık'}
                              {checklist.frequency === 'monthly' && 'Aylık'}
                            </Badge>
                            {checklist.category && (
                              <Badge variant="secondary" data-testid={`checklist-category-${checklist.id}`}>
                                {checklist.category}
                              </Badge>
                            )}
                            {!checklist.isActive && (
                              <Badge variant="destructive">Pasif</Badge>
                            )}
                            {!checklist.isEditable && (
                              <Badge variant="outline">Düzenlenemez</Badge>
                            )}
                          </div>
                          {checklist.description && (
                            <p className="text-sm text-muted-foreground mb-2">{checklist.description}</p>
                          )}
                          <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                            <span>{tasks.length} görev</span>
                            {checklist.timeWindowStart && checklist.timeWindowEnd && (
                              <span>
                                Zaman: {checklist.timeWindowStart} - {checklist.timeWindowEnd}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(checklist.id)}
                            data-testid={`button-expand-${checklist.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setAssignChecklist(checklist); setAssignDialogOpen(true); }}
                            data-testid={`button-assign-${checklist.id}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(checklist)}
                            data-testid={`button-edit-${checklist.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(checklist.id, checklist.title)}
                            data-testid={`button-delete-${checklist.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && tasks.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <div className="w-full space-y-1 md:space-y-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Görevler:</h4>
                              <span className="text-xs text-muted-foreground">Sıralamak için sürükleyin</span>
                            </div>
                            {(() => {
                              const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
                              return (
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={handleTaskDragEnd(checklist.id)}
                                >
                                  <SortableContext
                                    items={sortedTasks.map((t) => t.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className={`space-y-1 ${reorderTasksMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                                      {sortedTasks.map((task, index) => (
                                        <SortableTaskItem 
                                          key={task.id} 
                                          task={task} 
                                          index={index} 
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogDescription className="sr-only">Checklist'i düzenleyin</DialogDescription>
          {selectedChecklist && (
            <ChecklistFormDialog
              mode="edit"
              checklist={selectedChecklist}
              onClose={() => {
                setEditDialogOpen(false);
                setSelectedChecklist(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {assignChecklist && (
        <AssignmentDialog
          checklist={assignChecklist}
          open={assignDialogOpen}
          onClose={() => {
            setAssignDialogOpen(false);
            setAssignChecklist(null);
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id !== null) deleteChecklistMutation.mutate(id as number);
        }}
        title="Checklist'i Sil"
        description={`"${deleteState.itemName || ''}" checklist'ini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />
    </div>
  );
}

function ChecklistFormDialog({
  mode,
  checklist,
  onClose,
}: {
  mode: "create" | "edit";
  checklist?: Checklist;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(checklist?.title || "");
  const [description, setDescription] = useState(checklist?.description || "");
  const [frequency, setFrequency] = useState(checklist?.frequency || "daily");
  const [category, setCategory] = useState(checklist?.category || "");
  const [isEditable, setIsEditable] = useState(checklist?.isEditable ?? true);
  const [isActive, setIsActive] = useState(checklist?.isActive ?? true);
  const [timeWindowStart, setTimeWindowStart] = useState(checklist?.timeWindowStart || "");
  const [timeWindowEnd, setTimeWindowEnd] = useState(checklist?.timeWindowEnd || "");
  const [tasks, setTasks] = useState<Array<{ 
    taskDescription: string; 
    requiresPhoto: boolean; 
    order: number; 
    taskTimeStart?: string; 
    taskTimeEnd?: string;
    aiVerificationType?: string;
    tolerancePercent?: number;
    referencePhotoUrl?: string;
  }>>([]);

  const { data: existingTasks } = useQuery<ChecklistTask[]>({
    queryKey: ['/api/checklist-tasks'],
    enabled: mode === "edit" && !!checklist,
  });

  useEffect(() => {
    if (mode === "edit" && existingTasks && checklist) {
      const checklistTasks = existingTasks
        .filter((t) => t.checklistId === checklist.id)
        .map((t) => ({ 
          taskDescription: t.taskDescription, 
          requiresPhoto: t.requiresPhoto || false, 
          order: t.order, 
          taskTimeStart: t.taskTimeStart || "", 
          taskTimeEnd: t.taskTimeEnd || "",
          aiVerificationType: t.aiVerificationType || "none",
          tolerancePercent: t.tolerancePercent ?? 70,
          referencePhotoUrl: t.referencePhotoUrl || "",
        }));
      setTasks(checklistTasks);
    }
  }, [mode, existingTasks, checklist]);

  const createMutation = useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-tasks'] });
      toast({ title: "Başarılı", description: "Checklist oluşturuldu" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/checklists/${checklist!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-tasks'] });
      toast({ title: "Başarılı", description: "Checklist güncellendi" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!title || !frequency) {
      toast({ title: "Hata", description: "Başlık ve sıklık gerekli", variant: "destructive" });
      return;
    }

    const data = {
      title,
      description,
      frequency,
      category,
      isEditable,
      isActive,
      timeWindowStart: timeWindowStart || null,
      timeWindowEnd: timeWindowEnd || null,
      tasks: tasks.map((t, i) => ({ ...t, order: i + 1 })),
    };

    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const addTask = () => {
    setTasks([...tasks, { 
      taskDescription: "", 
      requiresPhoto: false, 
      order: tasks.length + 1,
      aiVerificationType: "none",
      tolerancePercent: 70,
      referencePhotoUrl: "",
    }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: any) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Yeni Checklist" : "Checklist Düzenle"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-2 sm:gap-3 py-3">
        <div className="flex flex-col gap-3 sm:gap-4">
          <Label htmlFor="title">Başlık *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Açılış Kontrol Listesi"
            data-testid="input-title"
          />
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Checklist açıklaması..."
            rows={3}
            data-testid="input-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-3 sm:gap-4">
            <Label>Sıklık *</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger data-testid="select-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="weekly">Haftalık</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opening">Açılış</SelectItem>
                <SelectItem value="closing">Kapanış</SelectItem>
                <SelectItem value="cleaning">Temizlik</SelectItem>
                <SelectItem value="maintenance">Bakım</SelectItem>
                <SelectItem value="safety">Güvenlik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-3 sm:gap-4">
            <Label htmlFor="timeWindowStart">Başlangıç Saati</Label>
            <Input
              id="timeWindowStart"
              type="time"
              value={timeWindowStart}
              onChange={(e) => setTimeWindowStart(e.target.value)}
              data-testid="input-time-start"
            />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <Label htmlFor="timeWindowEnd">Bitiş Saati</Label>
            <Input
              id="timeWindowEnd"
              type="time"
              value={timeWindowEnd}
              onChange={(e) => setTimeWindowEnd(e.target.value)}
              data-testid="input-time-end"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isEditable"
              checked={isEditable}
              onCheckedChange={(checked) => setIsEditable(!!checked)}
              data-testid="checkbox-editable"
            />
            <Label htmlFor="isEditable" className="cursor-pointer">Düzenlenebilir</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
              data-testid="checkbox-active"
            />
            <Label htmlFor="isActive" className="cursor-pointer">Aktif</Label>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Görevler</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTask}
              data-testid="button-add-task"
            >
              <Plus className="h-3 w-3 mr-1" />
              Görev Ekle
            </Button>
          </div>

          {tasks.map((task, index) => (
            <Card key={index} data-testid={`task-row-${index}`}>
              <CardContent className="py-3">
                <div className="flex gap-2 items-start">
                  <span className="text-sm text-muted-foreground pt-2">{index + 1}.</span>
                  <div className="flex-1 flex flex-col gap-3">
                    <Input
                      value={task.taskDescription}
                      onChange={(e) => updateTask(index, 'taskDescription', e.target.value)}
                      placeholder="Görev açıklaması..."
                      data-testid={`input-task-desc-${index}`}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`task-time-start-${index}`} className="text-xs">Başlangıç Saati</Label>
                        <Input
                          id={`task-time-start-${index}`}
                          type="time"
                          value={task.taskTimeStart || ""}
                          onChange={(e) => updateTask(index, 'taskTimeStart', e.target.value)}
                          data-testid={`input-task-time-start-${index}`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`task-time-end-${index}`} className="text-xs">Bitiş Saati</Label>
                        <Input
                          id={`task-time-end-${index}`}
                          type="time"
                          value={task.taskTimeEnd || ""}
                          onChange={(e) => updateTask(index, 'taskTimeEnd', e.target.value)}
                          data-testid={`input-task-time-end-${index}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={task.requiresPhoto}
                        onCheckedChange={(checked) => updateTask(index, 'requiresPhoto', !!checked)}
                        data-testid={`checkbox-photo-${index}`}
                      />
                      <Label className="text-sm cursor-pointer">Fotoğraf gerekli</Label>
                    </div>
                    
                    {task.requiresPhoto && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-3 mt-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <BrainCircuit className="h-4 w-4 text-primary" />
                          <span>AI Doğrulama Ayarları</span>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Doğrulama Tipi</Label>
                          <Select 
                            value={task.aiVerificationType || "none"} 
                            onValueChange={(val) => updateTask(index, 'aiVerificationType', val)}
                          >
                            <SelectTrigger className="w-full" data-testid={`select-ai-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">AI Doğrulama Yok</SelectItem>
                              <SelectItem value="cleanliness">Temizlik Kontrolü</SelectItem>
                              <SelectItem value="arrangement">Düzen Kontrolü</SelectItem>
                              <SelectItem value="machine_settings">Makine Ayarları</SelectItem>
                              <SelectItem value="general">Genel Karşılaştırma</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {task.aiVerificationType && task.aiVerificationType !== "none" && (
                          <>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Tolerans Oranı</Label>
                                <span className="text-xs text-muted-foreground font-medium">
                                  %{task.tolerancePercent || 70}
                                </span>
                              </div>
                              <Slider
                                value={[task.tolerancePercent || 70]}
                                onValueChange={(val) => updateTask(index, 'tolerancePercent', val[0])}
                                min={30}
                                max={100}
                                step={5}
                                className="w-full"
                                data-testid={`slider-tolerance-${index}`}
                              />
                              <p className="text-xs text-muted-foreground">
                                Düşük tolerans = daha sıkı kontrol
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <Label className="text-xs">Referans Fotoğraf</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={task.referencePhotoUrl || ""}
                                  onChange={(e) => updateTask(index, 'referencePhotoUrl', e.target.value)}
                                  placeholder="Referans fotoğraf URL'si..."
                                  className="flex-1"
                                  data-testid={`input-reference-photo-${index}`}
                                />
                                <ObjectUploader
                                  onGetUploadParameters={async () => {
                                    const res = await fetch('/api/objects/upload', {
                                      method: 'POST',
                                      credentials: 'include',
                                    });
                                    return res.json();
                                  }}
                                  onComplete={(result) => {
                                    if (result.successful?.[0]?.uploadURL) {
                                      updateTask(index, 'referencePhotoUrl', result.successful[0].uploadURL);
                                    }
                                  }}
                                  maxWidthOrHeight={800}
                                >
                                  <ImagePlus className="h-4 w-4" />
                                </ObjectUploader>
                              </div>
                              {task.referencePhotoUrl && (
                                <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                                  <img 
                                    src={task.referencePhotoUrl} 
                                    alt="Referans" 
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1"
                                    onClick={() => updateTask(index, 'referencePhotoUrl', '')}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Fotoğraf yükle veya URL gir
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTask(index)}
                    data-testid={`button-remove-task-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="button-cancel">
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-submit"
        >
          {mode === "create" ? "Oluştur" : "Güncelle"}
        </Button>
      </DialogFooter>
    </>
  );
}

// Assignment Dialog Component
interface AssignmentDialogProps {
  checklist: Checklist;
  open: boolean;
  onClose: () => void;
}

function AssignmentDialog({ checklist, open, onClose }: AssignmentDialogProps) {
  const { toast } = useToast();
  const { deleteState: assignDeleteState, requestDelete: requestAssignDelete, cancelDelete: cancelAssignDelete, confirmDelete: confirmAssignDelete } = useConfirmDelete();
  const [scope, setScope] = useState<'user' | 'branch' | 'role'>('branch');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['/api/branches'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: scope === 'user',
  });

  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['/api/checklist-assignments', checklist.id],
    queryFn: async () => {
      const res = await fetch(`/api/checklist-assignments?checklistId=${checklist.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/checklist-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-assignments', checklist.id] });
      toast({ title: 'Başarılı', description: 'Atama oluşturuldu' });
      setSelectedBranchId('');
      setSelectedUserId('');
      setSelectedRole('');
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/checklist-assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-assignments', checklist.id] });
      toast({ title: 'Başarılı', description: 'Atama silindi' });
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    },
  });

  const handleCreateAssignment = () => {
    const data: any = {
      checklistId: checklist.id,
      scope,
    };

    if (scope === 'user') {
      if (!selectedUserId) {
        toast({ title: 'Hata', description: 'Kullanıcı seçiniz', variant: 'destructive' });
        return;
      }
      data.assignedUserId = selectedUserId;
    } else if (scope === 'branch') {
      if (!selectedBranchId) {
        toast({ title: 'Hata', description: 'Şube seçiniz', variant: 'destructive' });
        return;
      }
      data.branchId = parseInt(selectedBranchId);
    } else if (scope === 'role') {
      if (!selectedBranchId || !selectedRole) {
        toast({ title: 'Hata', description: 'Şube ve rol seçiniz', variant: 'destructive' });
        return;
      }
      data.branchId = parseInt(selectedBranchId);
      data.role = selectedRole;
    }

    createAssignmentMutation.mutate(data);
  };

  const roleOptions = [
    { value: 'stajyer', label: 'Stajyer' },
    { value: 'bar_buddy', label: 'Bar Buddy' },
    { value: 'barista', label: 'Barista' },
    { value: 'supervisor_buddy', label: 'Supervisor Buddy' },
    { value: 'supervisor', label: 'Supervisor' },
  ];

  const getAssignmentLabel = (assignment: any) => {
    if (assignment.scope === 'user') {
      const user = users.find((u: any) => u.id === assignment.assignedUserId);
      return `Kullanıcı: ${user?.firstName || user?.username || assignment.assignedUserId}`;
    } else if (assignment.scope === 'branch') {
      const branch = branches.find((b: any) => b.id === assignment.branchId);
      return `Şube: ${branch?.name || assignment.branchId} (Tüm personel)`;
    } else if (assignment.scope === 'role') {
      const branch = branches.find((b: any) => b.id === assignment.branchId);
      const roleLabel = roleOptions.find(r => r.value === assignment.role)?.label || assignment.role;
      return `${branch?.name || assignment.branchId} - ${roleLabel}`;
    }
    return 'Bilinmeyen';
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Checklist Atamaları: {checklist.title}</DialogTitle>
          <DialogDescription>Bu checklist'i şubelere, rollere veya kullanıcılara atayın</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignments */}
          {assignments.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">Mevcut Atamalar</Label>
              <div className="mt-2 space-y-2">
                {assignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm">{getAssignmentLabel(assignment)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestAssignDelete(assignment.id, getAssignmentLabel(assignment))}
                      data-testid={`button-delete-assignment-${assignment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* New Assignment Form */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Yeni Atama</Label>

            <div>
              <Label htmlFor="scope">Atama Türü</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger data-testid="select-scope">
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Tüm Şube</SelectItem>
                  <SelectItem value="role">Rol Bazlı</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(scope === 'branch' || scope === 'role') && (
              <div>
                <Label htmlFor="branch">Şube</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger data-testid="select-branch">
                    <SelectValue placeholder="Şube seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'role' && (
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'user' && (
              <div>
                <Label htmlFor="user">Kullanıcı</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Kullanıcı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleCreateAssignment}
              disabled={createAssignmentMutation.isPending}
              className="w-full"
              data-testid="button-create-assignment"
            >
              <Plus className="h-4 w-4 mr-2" />
              Atama Ekle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      open={assignDeleteState.open}
      onOpenChange={(open) => !open && cancelAssignDelete()}
      onConfirm={() => {
        const id = confirmAssignDelete();
        if (id !== null) deleteAssignmentMutation.mutate(id as number);
      }}
      title="Atamayı Kaldır"
      description={`"${assignDeleteState.itemName || ''}" atamasını kaldırmak istediğinize emin misiniz?`}
    />
    </>
  );
}
