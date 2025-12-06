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
import { Plus, Building2, Store, Camera } from "lucide-react";
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
  priority: z.enum(["düşük", "orta", "yüksek"]),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  photoUrl: z.string().optional(),
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
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickTaskFormData) => {
      // Determine branchId based on selection
      let taskBranchId = user?.branchId;
      if (isHQUser && assignmentCategory === "branch" && selectedBranchId) {
        taskBranchId = parseInt(selectedBranchId);
      } else if (isHQUser && assignmentCategory === "hq") {
        taskBranchId = null;
      }

      await apiRequest("POST", "/api/tasks", {
        description: data.description,
        priority: data.priority,
        status: "beklemede",
        branchId: taskBranchId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || null,
        photoUrl: data.photoUrl || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Görev Oluşturuldu",
        description: "Yeni görev başarıyla oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      form.reset();
      setAssignmentCategory("");
      setSelectedBranchId("");
      setPhotoUrl("");
      // Modal'ı state update'ten sonra kapat
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hızlı Görev Oluştur</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                                  {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || emp.username[0])}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {emp.firstName && emp.lastName 
                                  ? `${emp.firstName} ${emp.lastName}` 
                                  : emp.username}
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="düşük">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yüksek">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
