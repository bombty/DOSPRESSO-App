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
import { Plus } from "lucide-react";

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
  bar_buddy: ['stajyer'],
  stajyer: [], // Cannot assign to anyone
  yatirimci_branch: [], // Read-only
};

const HQ_ROLES = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];

interface Employee {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  branchId?: number;
  profilePhoto?: string;
}

const quickTaskSchema = z.object({
  description: z.string().min(1, "Görev açıklaması gereklidir").max(500),
  priority: z.enum(["dusuk", "orta", "yuksek"]),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

type QuickTaskFormData = z.infer<typeof quickTaskSchema>;

interface QuickTaskModalProps {
  trigger?: React.ReactNode;
}

export function QuickTaskModal({ trigger }: QuickTaskModalProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: open,
  });

  // Filter assignable employees based on role hierarchy
  const assignableEmployees = useMemo(() => {
    if (!user || !employees.length) return [];
    
    const userRole = user.role as string;
    const allowedRoles = ROLE_HIERARCHY[userRole] || [];
    
    if (allowedRoles.length === 0) return [];

    return employees.filter((emp) => {
      // Check if employee's role is in allowed roles
      if (!allowedRoles.includes(emp.role)) return false;
      
      // For HQ roles, can assign to any branch
      if (HQ_ROLES.includes(userRole)) return true;
      
      // For branch roles, can only assign within same branch
      return emp.branchId === user.branchId;
    });
  }, [user, employees]);

  const form = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      description: "",
      priority: "orta",
      dueDate: "",
      assignedTo: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickTaskFormData) => {
      await apiRequest("POST", "/api/tasks", {
        description: data.description,
        priority: data.priority,
        status: "beklemede",
        branchId: user?.branchId,
        dueDate: data.dueDate || null,
        assignedTo: data.assignedTo ? parseInt(data.assignedTo) : null,
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
      setOpen(false);
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

  const canAssignTasks = (ROLE_HIERARCHY[user?.role as string] || []).length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

            {canAssignTasks && assignableEmployees.length > 0 && (
              <FormField
                control={form.control}
                name="assignedTo"
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
                        <SelectItem value="">Atanmamış</SelectItem>
                        {assignableEmployees.map((emp) => (
                          <SelectItem 
                            key={emp.id} 
                            value={emp.id.toString()}
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
                      <SelectItem value="dusuk">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yuksek">Yüksek</SelectItem>
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
