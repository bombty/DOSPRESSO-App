import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ListTodo, Plus, Edit, Trash2, Save, Loader2, Filter
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

interface TaskTemplate {
  id: number;
  role: string;
  title: string;
  description: string | null;
  frequency: string;
  priority: number;
  sortOrder: number;
  icon: string | null;
  targetUrl: string | null;
  moduleLink: string | null;
  isActive: boolean;
}

const ALL_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "muhasebe_ik", label: "Muhasebe & İK" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "satinalma", label: "Satınalma" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "coach", label: "Coach" },
  { value: "trainer", label: "Trainer" },
  { value: "marketing", label: "Marketing" },
  { value: "teknik", label: "Teknik" },
  { value: "destek", label: "Destek" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "fabrika_operator", label: "Fabrika Operatör" },
  { value: "supervisor", label: "Supervisor" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "barista", label: "Barista" },
  { value: "stajyer", label: "Stajyer" },
  { value: "yatirimci_hq", label: "Yatırımcı HQ" },
];

const FREQUENCIES = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
];

const PRIORITIES = [
  { value: 1, label: "Yüksek" },
  { value: 2, label: "Orta" },
  { value: 3, label: "Düşük" },
];

export default function GorevSablonlari() {
  const { toast } = useToast();
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const queryUrl = filterRole === "all" 
    ? "/api/admin/task-templates" 
    : `/api/admin/task-templates?role=${filterRole}`;
    
  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: [queryUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/task-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-templates"] });
      setShowNewDialog(false);
      toast({ title: "Şablon oluşturuldu" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/admin/task-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-templates"] });
      setEditTemplate(null);
      toast({ title: "Şablon güncellendi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/task-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-templates"] });
      toast({ title: "Şablon silindi" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/task-templates/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/task-templates"] });
    },
  });

  const roleGroups: Record<string, TaskTemplate[]> = {};
  templates.forEach(t => {
    if (!roleGroups[t.role]) roleGroups[t.role] = [];
    roleGroups[t.role].push(t);
  });

  const totalActive = templates.filter(t => t.isActive).length;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Görev Şablonları Yönetimi</h2>
          <Badge variant="secondary">{templates.length} şablon</Badge>
          <Badge variant="default">{totalActive} aktif</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-role">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Rol Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              {ALL_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowNewDialog(true)} data-testid="button-new-template">
            <Plus className="h-4 w-4 mr-1" />
            Yeni Şablon
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : filterRole === "all" ? (
        Object.entries(roleGroups).sort(([a], [b]) => a.localeCompare(b)).map(([role, items]) => (
          <Card key={role}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {ALL_ROLES.find(r => r.value === role)?.label || role}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <TemplateTable
                templates={items}
                onEdit={setEditTemplate}
                onDelete={(id, name) => requestDelete(id, name)}
                onToggle={(id, active) => toggleActiveMutation.mutate({ id, isActive: active })}
              />
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-3 pb-3">
            <TemplateTable
              templates={templates}
              onEdit={setEditTemplate}
              onDelete={(id, name) => requestDelete(id, name)}
              onToggle={(id, active) => toggleActiveMutation.mutate({ id, isActive: active })}
            />
          </CardContent>
        </Card>
      )}

      {(showNewDialog || editTemplate) && (
        <TemplateFormDialog
          template={editTemplate}
          onClose={() => { setShowNewDialog(false); setEditTemplate(null); }}
          onSave={(data) => {
            if (editTemplate) {
              updateMutation.mutate({ id: editTemplate.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" şablonu silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}

function TemplateTable({
  templates,
  onEdit,
  onDelete,
  onToggle,
}: {
  templates: TaskTemplate[];
  onEdit: (t: TaskTemplate) => void;
  onDelete: (id: number, name: string) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const freqLabels: Record<string, string> = { daily: "Günlük", weekly: "Haftalık", monthly: "Aylık" };
  const priorityLabels: Record<number, { label: string; cls: string }> = {
    1: { label: "Yüksek", cls: "text-red-600 dark:text-red-400" },
    2: { label: "Orta", cls: "text-amber-600 dark:text-amber-400" },
    3: { label: "Düşük", cls: "text-blue-600 dark:text-blue-400" },
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Görev</TableHead>
          <TableHead>Sıklık</TableHead>
          <TableHead>Öncelik</TableHead>
          <TableHead>Aktif</TableHead>
          <TableHead className="text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map(t => (
          <TableRow key={t.id} data-testid={`template-row-${t.id}`}>
            <TableCell>
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs">{freqLabels[t.frequency] || t.frequency}</Badge>
            </TableCell>
            <TableCell>
              <span className={`text-xs font-medium ${priorityLabels[t.priority]?.cls || ""}`}>
                {priorityLabels[t.priority]?.label || t.priority}
              </span>
            </TableCell>
            <TableCell>
              <Switch
                checked={t.isActive}
                onCheckedChange={(checked) => onToggle(t.id, checked)}
                data-testid={`switch-active-${t.id}`}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(t)} data-testid={`button-edit-${t.id}`}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(t.id, t.title || "")} data-testid={`button-delete-${t.id}`}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TemplateFormDialog({
  template,
  onClose,
  onSave,
  isPending,
}: {
  template: TaskTemplate | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    role: template?.role || "barista",
    title: template?.title || "",
    description: template?.description || "",
    frequency: template?.frequency || "daily",
    priority: template?.priority || 2,
    sortOrder: template?.sortOrder || 0,
    icon: template?.icon || "",
    targetUrl: template?.targetUrl || "",
    moduleLink: template?.moduleLink || "",
    isActive: template?.isActive ?? true,
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      description: formData.description || null,
      icon: formData.icon || null,
      targetUrl: formData.targetUrl || null,
      moduleLink: formData.moduleLink || null,
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Şablonu Düzenle" : "Yeni Görev Şablonu"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Rol</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-template-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sıklık</label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger data-testid="select-template-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Görev Başlık</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Görev başlığını girin..."
              data-testid="input-template-title"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Açıklama</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Görev açıklaması..."
              data-testid="input-template-description"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Öncelik</label>
              <Select value={formData.priority.toString()} onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) })}>
                <SelectTrigger data-testid="select-template-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sıra</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-template-sort"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">İkon</label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="CheckCircle"
                data-testid="input-template-icon"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Hedef URL</label>
            <Input
              value={formData.targetUrl}
              onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
              placeholder="/operasyon?tab=checklistler"
              data-testid="input-template-url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={handleSubmit} disabled={isPending || !formData.title.trim()} data-testid="button-save-template">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {template ? "Güncelle" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
