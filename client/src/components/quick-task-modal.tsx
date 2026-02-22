import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Store, Camera, UserCheck, GraduationCap, Users, X, ListChecks, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ObjectUploader } from "@/components/ObjectUploader";

// Role hierarchy for task assignment
const ROLE_HIERARCHY: Record<string, string[]> = {
  // HQ roles can assign to everyone
  admin: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  muhasebe: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  satinalma: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  coach: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  teknik: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  destek: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  fabrika: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  yatirimci_hq: ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  // Branch roles with hierarchy
  supervisor: ['supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'],
  supervisor_buddy: ['barista', 'bar_buddy', 'stajyer'],
  barista: ['bar_buddy', 'stajyer'],
  bar_buddy: [],
  stajyer: [],
  yatirimci_branch: [],
};

// HQ roles that can assign to HQ staff as well
const HQ_ROLES = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];

// HQ roles that HQ admin can assign tasks to
const HQ_ASSIGNABLE_ROLES = ['muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika'];

interface Employee {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  branchId?: number;
  profilePhoto?: string;
}

interface Branch {
  id: number;
  name: string;
  shortName?: string;
}

const quickTaskSchema = z.object({
  description: z.string().min(1, "Görev açıklaması gereklidir").max(500),
  priority: z.enum(["düşük", "orta", "yüksek", "acil", "kritik"]),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  photoUrl: z.string().optional(),
  isOnboarding: z.boolean().optional(),
  checkerId: z.string().optional(),
});

type QuickTaskFormData = z.infer<typeof quickTaskSchema>;

interface QuickTaskModalProps {
  trigger?: React.ReactNode;
}

export function QuickTaskModal({ trigger }: QuickTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [assignmentCategory, setAssignmentCategory] = useState<"hq" | "branch" | "">("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [additionalAssignees, setAdditionalAssignees] = useState<string[]>([]);
  const [subTasks, setSubTasks] = useState<string[]>([]);
  const [newSubTask, setNewSubTask] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const isHQUser = HQ_ROLES.includes(user?.role as string);

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: open,
  });

  // Fetch branches for HQ users
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: open && isHQUser,
  });

  // Filter assignable employees based on role hierarchy and category selection
  const assignableEmployees = useMemo(() => {
    if (!user || !employees.length) return [];
    
    const userRole = user.role as string;
    const allowedRoles = ROLE_HIERARCHY[userRole] || [];
    
    if (allowedRoles.length === 0) return [];

    // For HQ users with category selection
    if (isHQUser) {
      if (assignmentCategory === "hq") {
        // Show only HQ staff (no branchId or branchId is null)
        return employees.filter((emp) => {
          return HQ_ASSIGNABLE_ROLES.includes(emp.role) && !emp.branchId;
        });
      } else if (assignmentCategory === "branch" && selectedBranchId) {
        // Show only employees from selected branch
        return employees.filter((emp) => {
          if (!allowedRoles.includes(emp.role)) return false;
          return emp.branchId === parseInt(selectedBranchId);
        });
      }
      return [];
    }

    // For branch roles, can only assign within same branch
    return employees.filter((emp) => {
      if (!allowedRoles.includes(emp.role)) return false;
      return emp.branchId === user.branchId;
    });
  }, [user, employees, isHQUser, assignmentCategory, selectedBranchId]);

  const form = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      description: "",
      priority: "orta" as const,
      dueDate: "",
      assignedToId: "",
      photoUrl: "",
      isOnboarding: false,
      checkerId: "",
    },
  });

  const availableCheckers = useMemo(() => {
    if (!employees.length) return [];
    
    const assigneeId = form.watch("assignedToId");
    
    if (isHQUser) {
      return employees.filter(e => 
        e.id !== assigneeId && 
        !additionalAssignees.includes(e.id) &&
        e.id !== user?.id
      );
    }
    
    const assignee = employees.find(e => e.id === assigneeId);
    if (assignee?.branchId) {
      return employees.filter(e => 
        e.branchId === assignee.branchId &&
        e.id !== assigneeId &&
        !additionalAssignees.includes(e.id)
      );
    }
    
    return employees.filter(e => 
      e.id !== assigneeId && 
      !additionalAssignees.includes(e.id)
    );
  }, [employees, form.watch("assignedToId"), isHQUser, additionalAssignees, user?.id]);

  const createMutation = useMutation({
    mutationFn: async (data: QuickTaskFormData) => {
      // Determine branchId based on selection
      let taskBranchId = user?.branchId;
      if (isHQUser && assignmentCategory === "branch" && selectedBranchId) {
        taskBranchId = parseInt(selectedBranchId);
      } else if (isHQUser && assignmentCategory === "hq") {
        taskBranchId = null;
      }

      const res = await apiRequest("POST", "/api/tasks", {
        description: data.description,
        priority: data.priority,
        status: "beklemede",
        branchId: taskBranchId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || null,
        photoUrl: data.photoUrl || null,
        isOnboarding: data.isOnboarding || false,
        checkerId: data.checkerId || null,
        additionalAssignees: additionalAssignees,
      });
      
      const taskData = await res.json();
      if (subTasks.length > 0 && taskData?.id) {
        for (let i = 0; i < subTasks.length; i++) {
          try {
            await apiRequest("POST", `/api/tasks/${taskData.id}/steps`, {
              title: subTasks[i],
              order: i,
            });
          } catch (e) {
            console.error("Step creation error:", e);
          }
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Görev Oluşturuldu",
        description: subTasks.length > 0 
          ? `Görev ${subTasks.length} alt görev ile oluşturuldu`
          : "Yeni görev başarıyla oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      form.reset();
      setAssignmentCategory("");
      setSelectedBranchId("");
      setPhotoUrl("");
      setAdditionalAssignees([]);
      setSubTasks([]);
      setNewSubTask("");
      setTimeout(() => setOpen(false), 0);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  const canAssignTasks = (ROLE_HIERARCHY[user?.role as string] || []).length > 0 || isHQUser;

  // Reset employee selection when category or branch changes
  const handleCategoryChange = (value: "hq" | "branch") => {
    setAssignmentCategory(value);
    setSelectedBranchId("");
    form.setValue("assignedToId", "");
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranchId(value);
    form.setValue("assignedToId", "");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setAssignmentCategory("");
        setSelectedBranchId("");
        setPhotoUrl("");
        setAdditionalAssignees([]);
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" data-testid="button-quick-task">
            <Plus className="h-4 w-4 mr-1" />
            Hızlı Görev
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-md max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Hızlı Görev Oluştur</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görev Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Görev açıklamasını girin..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* HQ users: Category selection (HQ or Branch) */}
            {canAssignTasks && isHQUser && (
              <FormItem>
                <FormLabel>Atama Kategorisi</FormLabel>
                <Select value={assignmentCategory} onValueChange={handleCategoryChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-assignment-category">
                      <SelectValue placeholder="Kategori seçin..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hq" data-testid="option-category-hq">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>HQ Personeli</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="branch" data-testid="option-category-branch">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>Şube Personeli</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            {/* Branch selection for HQ users when "branch" category selected */}
            {isHQUser && assignmentCategory === "branch" && (
              <FormItem>
                <FormLabel>Şube</FormLabel>
                <Select 
                  value={selectedBranchId} 
                  onValueChange={handleBranchChange}
                  disabled={branchesLoading}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-branch">
                      <SelectValue placeholder={branchesLoading ? "Yükleniyor..." : "Şube seçin..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.length === 0 && !branchesLoading ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">
                        Şube bulunamadı
                      </div>
                    ) : (
                      branches.map((branch) => (
                        <SelectItem 
                          key={branch.id} 
                          value={branch.id.toString()}
                          data-testid={`option-branch-${branch.id}`}
                        >
                          {branch.shortName || branch.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            {/* Employee selection - shows after category/branch selection for HQ, or directly for branch users */}
            {canAssignTasks && assignableEmployees.length > 0 && (
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atanan Kişi</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Personel seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableEmployees.map((emp) => (
                          <SelectItem 
                            key={emp.id} 
                            value={emp.id}
                            data-testid={`option-assignee-${emp.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={emp.profilePhoto} />
                                <AvatarFallback className="text-[8px]">
                                  {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || emp.username?.[0] || '?')}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {emp.firstName && emp.lastName 
                                  ? `${emp.firstName} ${emp.lastName}` 
                                  : emp.username || '?'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Additional assignees - multi-select */}
            {canAssignTasks && form.watch("assignedToId") && assignableEmployees.length > 1 && (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Ek Atananlar (İsteğe Bağlı)
                </FormLabel>
                {additionalAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {additionalAssignees.map((aId) => {
                      const emp = assignableEmployees.find(e => e.id === aId);
                      if (!emp) return null;
                      return (
                        <Badge key={aId} variant="secondary" className="gap-1">
                          {emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.username || '?'}
                          <button
                            type="button"
                            onClick={() => setAdditionalAssignees(prev => prev.filter(id => id !== aId))}
                            className="ml-1"
                            data-testid={`button-remove-assignee-${aId}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val && !additionalAssignees.includes(val)) {
                      setAdditionalAssignees(prev => [...prev, val]);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-additional-assignee">
                      <SelectValue placeholder="Ek kişi ekle..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignableEmployees
                      .filter(emp => emp.id !== form.watch("assignedToId") && !additionalAssignees.includes(emp.id))
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} data-testid={`option-extra-assignee-${emp.id}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={emp.profilePhoto} />
                              <AvatarFallback className="text-[8px]">
                                {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || emp.username?.[0] || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.username || '?'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Göreve birden fazla kişi atayabilirsiniz</p>
              </FormItem>
            )}

            {/* Show message when no employees available after selection */}
            {canAssignTasks && isHQUser && assignmentCategory && assignableEmployees.length === 0 && (
              assignmentCategory === "branch" ? (
                selectedBranchId && (
                  <p className="text-sm text-muted-foreground">
                    Bu şubede atanabilir personel bulunamadı.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  HQ'da atanabilir personel bulunamadı.
                </p>
              )
            )}

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Öncelik</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => field.onChange("düşük")}
                      variant={field.value === "düşük" ? "default" : "outline"}
                      className="toggle-elevate"
                      data-testid="button-priority-low"
                    >
                      Düşük
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => field.onChange("orta")}
                      variant={field.value === "orta" ? "default" : "outline"}
                      className="toggle-elevate"
                      data-testid="button-priority-medium"
                    >
                      Orta
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => field.onChange("yüksek")}
                      variant={field.value === "yüksek" ? "secondary" : "outline"}
                      className="toggle-elevate"
                      data-testid="button-priority-high"
                    >
                      Yüksek
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => field.onChange("acil")}
                      variant={field.value === "acil" ? "destructive" : "outline"}
                      className="toggle-elevate"
                      data-testid="button-priority-urgent"
                    >
                      Acil
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => field.onChange("kritik")}
                      variant={field.value === "kritik" ? "destructive" : "outline"}
                      className="toggle-elevate"
                      data-testid="button-priority-critical"
                    >
                      Kritik
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checker Selection - shown when assignee is selected */}
            {form.watch("assignedToId") && availableCheckers.length > 0 && (
              <FormField
                control={form.control}
                name="checkerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      Kontrol Edici (İsteğe Bağlı)
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-checker">
                          <SelectValue placeholder="Kontrol edici seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCheckers.map((checker) => (
                          <SelectItem 
                            key={checker.id} 
                            value={checker.id}
                            data-testid={`option-checker-${checker.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={checker.profilePhoto} />
                                <AvatarFallback className="text-[8px]">
                                  {(checker.firstName?.[0] || '') + (checker.lastName?.[0] || checker.username?.[0] || '?')}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {checker.firstName && checker.lastName 
                                  ? `${checker.firstName} ${checker.lastName}` 
                                  : checker.username || '?'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Görev tamamlandığında kontrol edecek kişi
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div>
              <FormLabel className="mb-2 flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                Alt Görevler (İsteğe Bağlı)
              </FormLabel>
              {subTasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {subTasks.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded border bg-muted/50" data-testid={`subtask-item-${idx}`}>
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-sm flex-1 truncate">{st}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={() => setSubTasks(prev => prev.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-subtask-${idx}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Alt görev ekle..."
                  value={newSubTask}
                  onChange={(e) => setNewSubTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubTask.trim()) {
                      e.preventDefault();
                      setSubTasks(prev => [...prev, newSubTask.trim()]);
                      setNewSubTask("");
                    }
                  }}
                  className="flex-1 h-8 text-sm"
                  data-testid="input-new-subtask"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (newSubTask.trim()) {
                      setSubTasks(prev => [...prev, newSubTask.trim()]);
                      setNewSubTask("");
                    }
                  }}
                  disabled={!newSubTask.trim()}
                  data-testid="button-add-subtask"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ekle
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Grup üyeleri bu alt görevleri sahiplenebilir
              </p>
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Son Tarih (İsteğe Bağlı)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-due-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="mb-2 block">Fotoğraf (İsteğe Bağlı)</FormLabel>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={async () => {
                  const response = await fetch("/api/objects/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  });
                  const data = await response.json();
                  return { method: "PUT" as const, url: data.url };
                }}
                onComplete={(result) => {
                  if (result.successful && result.successful[0]) {
                    const uploadedUrl = result.successful[0].uploadURL;
                    setPhotoUrl(uploadedUrl);
                    form.setValue("photoUrl", uploadedUrl);
                  }
                }}
                buttonClassName="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Fotoğraf Yükle
              </ObjectUploader>
              {photoUrl && (
                <p className="text-xs text-success mt-1">✓ Fotoğraf yüklendi</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
                data-testid="button-submit-task"
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-task"
              >
                İptal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
