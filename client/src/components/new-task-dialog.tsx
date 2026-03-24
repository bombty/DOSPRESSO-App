import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Building2, Store, Factory, Globe, Users, UserPlus,
  ChevronLeft, ChevronRight, Check, X, Calendar, AlertTriangle,
  Plus, Trash2, Clock
} from "lucide-react";

const HQ_ROLES = ['admin', 'ceo', 'cgo', 'muhasebe_ik', 'satinalma', 'coach', 'marketing', 'trainer', 'kalite_kontrol', 'gida_muhendisi', 'muhasebe', 'teknik', 'destek', 'yatirimci_hq'];
const BRANCH_ROLES = ['supervisor', 'mudur', 'barista', 'stajyer', 'bar_buddy', 'supervisor_buddy', 'yatirimci_branch', 'sube_kiosk'];
const FACTORY_ROLES = ['fabrika_mudur', 'uretim_sefi', 'fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel'];

const DEPARTMENTS = [
  { value: 'operasyon', label: 'Operasyon' },
  { value: 'mutfak', label: 'Mutfak / Bar' },
  { value: 'temizlik', label: 'Temizlik' },
  { value: 'kasa', label: 'Kasa' },
  { value: 'depo', label: 'Depo' },
  { value: 'egitim', label: 'Eğitim' },
  { value: 'kalite', label: 'Kalite' },
  { value: 'teknik', label: 'Teknik' },
  { value: 'pazarlama', label: 'Pazarlama' },
  { value: 'insan_kaynaklari', label: 'İnsan Kaynakları' },
  { value: 'finans', label: 'Finans / Muhasebe' },
  { value: 'genel', label: 'Genel' },
];

const PRIORITY_OPTIONS = [
  { value: 'düşük', label: 'Düşük', color: 'text-muted-foreground' },
  { value: 'orta', label: 'Orta', color: 'text-yellow-600' },
  { value: 'yüksek', label: 'Yüksek', color: 'text-orange-600' },
  { value: 'kritik', label: 'Kritik', color: 'text-red-600' },
];

interface Employee {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  branchId?: number;
  profilePhoto?: string;
  profileImageUrl?: string;
}

interface Branch {
  id: number;
  name: string;
  shortName?: string;
}

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScope?: string;
  defaultBranchId?: number;
  source?: string;
  sourceId?: string;
}

type StepKey = 'scope' | 'target' | 'details' | 'summary';

export function NewTaskDialog({ open, onOpenChange, defaultScope, defaultBranchId, source, sourceId }: NewTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isHQUser = HQ_ROLES.includes(user?.role as string);

  const [step, setStep] = useState<StepKey>('scope');
  const [taskScope, setTaskScope] = useState(defaultScope || 'branch');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(defaultBranchId ? [defaultBranchId] : []);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [isGroupTask, setIsGroupTask] = useState(false);
  const [acceptanceRequired, setAcceptanceRequired] = useState(false);
  const [allowExtension, setAllowExtension] = useState(true);

  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('orta');
  const [dueDate, setDueDate] = useState('');
  const [subTasks, setSubTasks] = useState<string[]>([]);
  const [newSubTask, setNewSubTask] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: open,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: open,
  });

  const filteredEmployees = useMemo(() => {
    if (!employees.length) return [];
    let filtered = employees;

    if (taskScope === 'branch') {
      if (selectedBranchIds.length > 0) {
        filtered = filtered.filter(e => e.branchId && selectedBranchIds.includes(e.branchId));
      }
      filtered = filtered.filter(e => BRANCH_ROLES.includes(e.role));
    } else if (taskScope === 'hq') {
      filtered = filtered.filter(e => HQ_ROLES.includes(e.role));
    } else if (taskScope === 'factory') {
      filtered = filtered.filter(e => FACTORY_ROLES.includes(e.role));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(term) ||
        e.username.toLowerCase().includes(term) ||
        e.role.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [employees, taskScope, selectedBranchIds, searchTerm]);

  const resetForm = useCallback(() => {
    setStep('scope');
    setTaskScope(defaultScope || 'branch');
    setTargetDepartment('');
    setSelectedBranchIds(defaultBranchId ? [defaultBranchId] : []);
    setSelectedAssigneeIds([]);
    setIsGroupTask(false);
    setAcceptanceRequired(false);
    setAllowExtension(true);
    setDescription('');
    setPriority('orta');
    setDueDate('');
    setSubTasks([]);
    setNewSubTask('');
    setSearchTerm('');
  }, [defaultScope, defaultBranchId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const primaryAssignee = selectedAssigneeIds[0];
      const additionalAssignees = selectedAssigneeIds.slice(1);

      const payload: any = {
        description,
        priority,
        dueDate: dueDate || null,
        assignedToId: primaryAssignee || user?.id,
        branchId: selectedBranchIds[0] || user?.branchId || null,
        taskScope,
        targetDepartment: targetDepartment || null,
        targetBranchIds: selectedBranchIds.length > 0 ? selectedBranchIds : null,
        isGroupTask,
        acceptanceRequired,
        allowExtension,
        source: source || 'manual',
        sourceId: sourceId || null,
        additionalAssignees,
      };

      const res = await apiRequest("POST", "/api/tasks", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Görev oluşturuldu", description: "Yeni görev başarıyla atandı." });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Görev oluşturulamadı", variant: "destructive" });
    },
  });

  const steps: StepKey[] = ['scope', 'target', 'details', 'summary'];
  const stepIndex = steps.indexOf(step);

  const canGoNext = () => {
    if (step === 'scope') return !!taskScope;
    if (step === 'target') return selectedAssigneeIds.length > 0;
    if (step === 'details') return description.trim().length > 0;
    return true;
  };

  const goNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goPrev = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const toggleBranch = (id: number) => {
    setSelectedBranchIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleAssignee = (id: string) => {
    setSelectedAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username : 'Bilinmiyor';
  };

  const getBranchName = (id: number) => {
    const b = branches.find(br => br.id === id);
    return b?.name || `Şube #${id}`;
  };

  const stepLabels: Record<StepKey, string> = {
    scope: 'Kapsam',
    target: 'Hedef',
    details: 'Detaylar',
    summary: 'Özet',
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-new-task">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <UserPlus className="h-5 w-5" />
            Yeni Görev Ata
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4" data-testid="stepper-progress">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center rounded-full h-7 w-7 text-xs font-medium border transition-colors ${
                  i <= stepIndex
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {stepLabels[s]}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 'scope' && (
          <div className="space-y-4" data-testid="step-scope">
            <p className="text-sm text-muted-foreground">Görev kapsamını seçin:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'branch', label: 'Şube', icon: Store, desc: 'Bir veya birden fazla şubeye' },
                { value: 'hq', label: 'Merkez (HQ)', icon: Building2, desc: 'Merkez ofis ekibine' },
                { value: 'factory', label: 'Fabrika', icon: Factory, desc: 'Fabrika ekibine' },
                { value: 'all', label: 'Tümü', icon: Globe, desc: 'Tüm lokasyonlara' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTaskScope(opt.value);
                    setSelectedBranchIds([]);
                    setSelectedAssigneeIds([]);
                  }}
                  className={`flex flex-col items-start gap-1 p-4 rounded-md border text-left transition-colors ${
                    taskScope === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  }`}
                  data-testid={`button-scope-${opt.value}`}
                >
                  <div className="flex items-center gap-2">
                    <opt.icon className={`h-5 w-5 ${taskScope === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>

            {taskScope === 'branch' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Departman (opsiyonel)</Label>
                <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Departman seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 'target' && (
          <div className="space-y-4" data-testid="step-target">
            {taskScope === 'branch' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Şube Seçimi</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {branches.filter(b => b.id !== 23 && b.id !== 24).map(b => (
                    <Badge
                      key={b.id}
                      variant={selectedBranchIds.includes(b.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleBranch(b.id)}
                      data-testid={`badge-branch-${b.id}`}
                    >
                      {b.shortName || b.name}
                    </Badge>
                  ))}
                </div>
                {selectedBranchIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedBranchIds.length} şube seçildi</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Kişi Seçimi</Label>
              <Input
                placeholder="İsim veya rol ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                data-testid="input-search-assignee"
              />
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    {taskScope === 'branch' && selectedBranchIds.length === 0
                      ? 'Önce şube seçin'
                      : 'Eşleşen çalışan bulunamadı'}
                  </p>
                ) : (
                  filteredEmployees.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleAssignee(emp.id)}
                      className={`w-full flex items-center gap-3 p-2 text-left transition-colors border-b last:border-b-0 ${
                        selectedAssigneeIds.includes(emp.id) ? 'bg-primary/5' : 'hover-elevate'
                      }`}
                      data-testid={`button-assignee-${emp.id}`}
                    >
                      <Checkbox
                        checked={selectedAssigneeIds.includes(emp.id)}
                        className="pointer-events-none"
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={emp.profilePhoto || emp.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {emp.firstName || ''} {emp.lastName || ''}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                      </div>
                      {emp.branchId && (
                        <span className="text-xs text-muted-foreground">{getBranchName(emp.branchId)}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
              {selectedAssigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAssigneeIds.map(id => (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {getEmployeeName(id)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleAssignee(id)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {selectedAssigneeIds.length > 1 && (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                <Checkbox
                  checked={isGroupTask}
                  onCheckedChange={(v) => setIsGroupTask(!!v)}
                  id="group-task"
                  data-testid="checkbox-group-task"
                />
                <Label htmlFor="group-task" className="text-sm cursor-pointer">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Grup görevi (ortak çalışma)
                  </div>
                  <p className="text-xs text-muted-foreground font-normal">Tüm atananlar aynı görev üzerinde birlikte çalışır</p>
                </Label>
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4" data-testid="step-details">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Görev Açıklaması *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Görev açıklamasını yazın..."
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Öncelik</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Son Tarih</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Alt Görevler (opsiyonel)</Label>
              {subTasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{idx + 1}. {st}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setSubTasks(prev => prev.filter((_, i) => i !== idx))}
                    data-testid={`button-remove-subtask-${idx}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Alt görev ekle..."
                  value={newSubTask}
                  onChange={e => setNewSubTask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSubTask.trim()) {
                      e.preventDefault();
                      setSubTasks(prev => [...prev, newSubTask.trim()]);
                      setNewSubTask('');
                    }
                  }}
                  data-testid="input-new-subtask"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (newSubTask.trim()) {
                      setSubTasks(prev => [...prev, newSubTask.trim()]);
                      setNewSubTask('');
                    }
                  }}
                  disabled={!newSubTask.trim()}
                  data-testid="button-add-subtask"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ekle
                </Button>
              </div>
            </div>

            <div className="space-y-3 border rounded-md p-3">
              <p className="text-sm font-medium">Ek Ayarlar</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={acceptanceRequired}
                  onCheckedChange={(v) => setAcceptanceRequired(!!v)}
                  id="acceptance-req"
                  data-testid="checkbox-acceptance-required"
                />
                <Label htmlFor="acceptance-req" className="text-sm cursor-pointer">
                  Kabul/Red zorunlu (atanan kişi önce kabul etmeli)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allowExtension}
                  onCheckedChange={(v) => setAllowExtension(!!v)}
                  id="allow-ext"
                  data-testid="checkbox-allow-extension"
                />
                <Label htmlFor="allow-ext" className="text-sm cursor-pointer">
                  Süre uzatma talebine izin ver
                </Label>
              </div>
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div className="space-y-4" data-testid="step-summary">
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kapsam</span>
                <Badge variant="outline">
                  {taskScope === 'branch' ? 'Şube' : taskScope === 'hq' ? 'Merkez' : taskScope === 'factory' ? 'Fabrika' : 'Tümü'}
                </Badge>
              </div>
              {targetDepartment && targetDepartment !== 'all' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Departman</span>
                  <span className="text-sm">{DEPARTMENTS.find(d => d.value === targetDepartment)?.label}</span>
                </div>
              )}
              {selectedBranchIds.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground">Şubeler</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedBranchIds.map(id => (
                      <Badge key={id} variant="secondary" className="text-xs">{getBranchName(id)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between flex-wrap gap-1">
                <span className="text-sm text-muted-foreground">Atananlar</span>
                <div className="flex flex-wrap gap-1">
                  {selectedAssigneeIds.map(id => (
                    <Badge key={id} variant="secondary" className="text-xs">{getEmployeeName(id)}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Öncelik</span>
                <Badge variant={priority === 'kritik' ? 'destructive' : priority === 'yüksek' ? 'default' : 'outline'}>
                  {PRIORITY_OPTIONS.find(p => p.value === priority)?.label}
                </Badge>
              </div>
              {dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Son Tarih</span>
                  <span className="text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(dueDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
              {isGroupTask && (
                <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                  <Users className="h-3.5 w-3.5" />
                  Grup görevi
                </div>
              )}
              {acceptanceRequired && (
                <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Kabul/Red zorunlu
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-1">Açıklama</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              {subTasks.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-1">Alt Görevler ({subTasks.length})</p>
                  <ul className="space-y-1">
                    {subTasks.map((st, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3 text-muted-foreground/50" />
                        {st}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            onClick={goPrev}
            disabled={stepIndex === 0}
            data-testid="button-prev-step"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} data-testid="button-cancel">
              İptal
            </Button>
            {step === 'summary' ? (
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                data-testid="button-create-task"
              >
                {createMutation.isPending ? 'Oluşturuluyor...' : 'Görevi Oluştur'}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
                data-testid="button-next-step"
              >
                İleri
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
