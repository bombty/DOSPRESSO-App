import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import type { Checklist, ChecklistTask } from "@shared/schema";

export default function AdminChecklistManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  if (!user || !isHQRole(user.role)) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center grid grid-cols-1 gap-3 md:grid-cols-2">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg">Yetkisiz Erişim</h3>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [expandedChecklistId, setExpandedChecklistId] = useState<number | null>(null);

  const { data: checklists, isLoading } = useQuery<Checklist[]>({
    queryKey: ['/api/checklists'],
  });

  const { data: checklistTasks = [] } = useQuery<ChecklistTask[]>({
    queryKey: ['/api/checklist-tasks'],
    enabled: !!checklists,
  });

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

  const handleDelete = (id: number) => {
    if (confirm("Bu checklist'i silmek istediğinize emin misiniz?")) {
      deleteChecklistMutation.mutate(id);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedChecklistId(expandedChecklistId === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <ChecklistFormDialog
                  mode="create"
                  onClose={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
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
            <div className="text-center py-8 text-muted-foreground">Checklist bulunamadı</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {filteredChecklists?.map((checklist) => {
                const tasks = getChecklistTasks(checklist.id);
                const isExpanded = expandedChecklistId === checklist.id;

                return (
                  <Card key={checklist.id} data-testid={`checklist-card-${checklist.id}`}>
                    <CardContent className="py-4">
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
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                            onClick={() => handleEdit(checklist)}
                            data-testid={`button-edit-${checklist.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(checklist.id)}
                            data-testid={`button-delete-${checklist.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && tasks.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                            <h4 className="font-medium text-sm mb-2">Görevler:</h4>
                            {tasks.map((task, index) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 text-sm py-1"
                                data-testid={`task-item-${task.id}`}
                              >
                                <span className="text-muted-foreground">{index + 1}.</span>
                                <span className="flex-1">{task.taskDescription}</span>
                                {task.requiresPhoto && (
                                  <Badge variant="outline" className="text-xs">Fotoğraf</Badge>
                                )}
                              </div>
                            ))}
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
  const [tasks, setTasks] = useState<Array<{ taskDescription: string; requiresPhoto: boolean; order: number }>>([]);

  const { data: existingTasks } = useQuery<ChecklistTask[]>({
    queryKey: ['/api/checklist-tasks'],
    enabled: mode === "edit" && !!checklist,
  });

  useState(() => {
    if (mode === "edit" && existingTasks && checklist) {
      const checklistTasks = existingTasks
        .filter((t) => t.checklistId === checklist.id)
        .map((t) => ({ taskDescription: t.taskDescription, requiresPhoto: t.requiresPhoto || false, order: t.order }));
      setTasks(checklistTasks);
    }
  });

  const createMutation = useMutation({
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

  const updateMutation = useMutation({
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
    setTasks([...tasks, { taskDescription: "", requiresPhoto: false, order: tasks.length + 1 }]);
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
      <div className="grid grid-cols-1 gap-4 py-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Label htmlFor="title">Başlık *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Açılış Kontrol Listesi"
            data-testid="input-title"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Label htmlFor="timeWindowStart">Başlangıç Saati</Label>
            <Input
              id="timeWindowStart"
              type="time"
              value={timeWindowStart}
              onChange={(e) => setTimeWindowStart(e.target.value)}
              data-testid="input-time-start"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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

        <div className="flex items-center gap-4">
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  <div className="flex-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Input
                      value={task.taskDescription}
                      onChange={(e) => updateTask(index, 'taskDescription', e.target.value)}
                      placeholder="Görev açıklaması..."
                      data-testid={`input-task-desc-${index}`}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={task.requiresPhoto}
                        onCheckedChange={(checked) => updateTask(index, 'requiresPhoto', !!checked)}
                        data-testid={`checkbox-photo-${index}`}
                      />
                      <Label className="text-sm cursor-pointer">Fotoğraf gerekli</Label>
                    </div>
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
