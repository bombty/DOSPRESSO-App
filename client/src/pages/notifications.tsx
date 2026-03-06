import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { useLocation } from "wouter";
import type { Notification, Branch } from "@shared/schema";
import { hasPermission, type UserRoleType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  GraduationCap, 
  CheckSquare,
  Megaphone,
  Info,
  ClipboardCheck,
  ArrowRight,
  Filter,
  Building2,
  Package,
  MapPin,
  RefreshCw,
  Plus,
  Send,
  CalendarIcon,
  UserPlus,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const notificationTypeIcons: Record<string, any> = {
  task_assigned: ClipboardCheck,
  task_started: Clock,
  task_complete: CheckCheck,
  task_completed: CheckCheck,
  task_verified: CheckCheck,
  task_rejected: AlertTriangle,
  task_overdue: AlertTriangle,
  task_acknowledged: CheckSquare,
  task_overdue_assigner: AlertTriangle,
  task_check_requested: ClipboardCheck,
  task_check_approved: CheckCheck,
  task_check_rejected: AlertTriangle,
  task_status_changed: ClipboardCheck,
  fault_reported: AlertTriangle,
  fault_assigned: Wrench,
  fault_resolved: Wrench,
  fault_updated: Wrench,
  fault_alert: AlertTriangle,
  critical_fault: AlertTriangle,
  critical_service_request: AlertTriangle,
  training_assigned: GraduationCap,
  training_overdue: AlertTriangle,
  training_reminder: GraduationCap,
  maintenance_reminder: Wrench,
  checklist_reminder: CheckSquare,
  checklist_overdue: CheckSquare,
  capa_overdue: AlertTriangle,
  shift_change: Clock,
  shift_assigned: Clock,
  shift_swap_request: Clock,
  shift_swap_approved: CheckCheck,
  shift_swap_rejected: AlertTriangle,
  shift_swap_completed: CheckCheck,
  shift_swap_pending_supervisor: Clock,
  leave_request: Clock,
  stock_alert: Package,
  onboarding_complete: GraduationCap,
  announcement: Megaphone,
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  system: Info,
};

const notificationTypeLabels: Record<string, string> = {
  task_assigned: "Görev Atandı",
  task_started: "Görev Başladı",
  task_complete: "Görev Tamamlandı",
  task_completed: "Görev Tamamlandı",
  task_verified: "Görev Onaylandı",
  task_rejected: "Görev Reddedildi",
  task_overdue: "Gecikmiş Görev",
  task_acknowledged: "Görev Görüldü",
  task_overdue_assigner: "Gecikmiş Görev",
  task_check_requested: "Kontrol Talebi",
  task_check_approved: "Kontrol Onayı",
  task_check_rejected: "Kontrol Reddi",
  task_status_changed: "Görev Durumu",
  fault_reported: "Arıza Raporu",
  fault_assigned: "Arıza Atandı",
  fault_resolved: "Arıza Çözüldü",
  fault_updated: "Arıza Güncellendi",
  fault_alert: "Arıza Uyarısı",
  critical_fault: "Kritik Arıza",
  critical_service_request: "Kritik Talep",
  training_assigned: "Eğitim Atandı",
  training_overdue: "Gecikmiş Eğitim",
  training_reminder: "Eğitim Hatırlatması",
  maintenance_reminder: "Bakım Hatırlatması",
  checklist_reminder: "Checklist Hatırlatması",
  checklist_overdue: "Checklist Gecikmiş",
  capa_overdue: "Düzeltici Aksiyon",
  shift_change: "Vardiya Değişikliği",
  shift_assigned: "Vardiya Atandı",
  shift_swap_request: "Takas Talebi",
  shift_swap_approved: "Takas Onayı",
  shift_swap_rejected: "Takas Reddi",
  shift_swap_completed: "Takas Tamamlandı",
  shift_swap_pending_supervisor: "Takas Onay Bekliyor",
  leave_request: "İzin Talebi",
  stock_alert: "Stok Uyarısı",
  onboarding_complete: "Onboarding Tamamlandı",
  announcement: "Duyuru",
  info: "Bilgi",
  warning: "Uyarı",
  alert: "Acil Uyarı",
  system: "Sistem",
};

const NOTIFICATION_CATEGORIES: Record<string, { label: string; icon: any; types: string[] }> = {
  all: { label: "Tümü", icon: Bell, types: [] },
  tasks: { label: "Görevler", icon: ClipboardCheck, types: ["task_assigned", "task_started", "task_complete", "task_completed", "task_verified", "task_rejected", "task_overdue", "task_acknowledged", "task_overdue_assigner", "task_check_requested", "task_check_approved", "task_check_rejected", "task_status_changed"] },
  faults: { label: "Arızalar", icon: Wrench, types: ["fault_reported", "fault_assigned", "fault_resolved", "fault_updated", "fault_alert", "critical_fault", "critical_service_request", "maintenance_reminder"] },
  checklists: { label: "Checklistler", icon: CheckSquare, types: ["checklist_reminder", "checklist_overdue", "capa_overdue"] },
  announcements: { label: "Duyurular", icon: Megaphone, types: ["announcement", "info", "warning", "alert", "system"] },
  hr: { label: "İK", icon: Clock, types: ["shift_change", "shift_assigned", "shift_swap_request", "shift_swap_approved", "shift_swap_rejected", "shift_swap_completed", "shift_swap_pending_supervisor", "leave_request", "training_assigned", "training_overdue", "training_reminder", "onboarding_complete"] },
  stock: { label: "Stok", icon: Package, types: ["stock_alert"] },
};

interface TaskSummary {
  id: number;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedById: string | null;
}

interface SimpleUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  branchId: number | null;
}

function AssignTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("orta");
  const [dueDate, setDueDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allUsers } = useQuery<SimpleUser[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const filteredUsers = (allUsers || []).filter(u => {
    if (!u.id || u.id === user?.id) return false;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLocaleLowerCase('tr-TR');
    const email = (u.email || '').toLocaleLowerCase('tr-TR');
    const q = searchQuery.toLocaleLowerCase('tr-TR');
    return !q || fullName.includes(q) || email.includes(q);
  });

  const selectedUser = (allUsers || []).find(u => u.id === assigneeId);

  const createTaskMutation = useMutation({
    mutationFn: async (data: { description: string; assignedToId: string; priority: string; dueDate?: string }) => {
      const body: any = {
        description: data.description,
        assignedToId: data.assignedToId,
        priority: data.priority,
      };
      if (data.dueDate) {
        body.dueDate = new Date(data.dueDate).toISOString();
      }
      await apiRequest('POST', '/api/tasks', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: "Görev atandı", description: "Görev başarıyla oluşturuldu ve atandı." });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error?.message || "Görev oluşturulamadı", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDescription("");
    setAssigneeId("");
    setPriority("orta");
    setDueDate("");
    setSearchQuery("");
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({ title: "Hata", description: "Görev açıklaması gerekli", variant: "destructive" });
      return;
    }
    if (!assigneeId) {
      toast({ title: "Hata", description: "Bir kişi seçmelisiniz", variant: "destructive" });
      return;
    }
    createTaskMutation.mutate({
      description: description.trim(),
      assignedToId: assigneeId,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      admin: "Admin", barista: "Barista", supervisor: "Supervisor", mudur: "Müdür",
      bolge_mudur: "Bölge Müdürü", ceo: "CEO", coo: "COO", cgo: "CGO",
      trainer: "Eğitmen", kalite_kontrol: "Kalite Kontrol", coach: "Coach",
      fabrika_mudur: "Fabrika Müdürü", fabrika_personel: "Fabrika Personel", employee: "Çalışan",
    };
    return labels[role || ''] || role || '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        data-testid="dialog-assign-task"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-assign-task">
            <UserPlus className="w-5 h-5" />
            Görev Ata
          </DialogTitle>
          <DialogDescription>
            Bir kişiye yeni görev atayın. Atanan kişiye bildirim gönderilecektir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-description">Görev Açıklaması *</Label>
            <Textarea
              id="task-description"
              placeholder="Görev detayını yazın..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[80px]"
              data-testid="input-task-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Atanan Kişi *</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-selected-assignee">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getRoleLabel(selectedUser.role)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssigneeId("")}
                  data-testid="button-clear-assignee"
                >
                  Değiştir
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="İsim veya e-posta ile arayın..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-assignee"
                />
                <div className="max-h-[160px] overflow-y-auto rounded-md border">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.slice(0, 20).map(u => (
                      <Button
                        key={u.id}
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto py-2"
                        onClick={() => { setAssigneeId(u.id); setSearchQuery(""); }}
                        data-testid={`user-option-${u.id}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {(u.firstName || '?')[0]}{(u.lastName || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate" data-testid={`text-user-name-${u.id}`}>{u.firstName} {u.lastName}</p>
                          <p className="text-[11px] text-muted-foreground truncate" data-testid={`text-user-role-${u.id}`}>
                            {getRoleLabel(u.role)}
                          </p>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      {searchQuery ? "Kullanıcı bulunamadı" : "Kişi aramak için yazın"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="düşük">Düşük</SelectItem>
                  <SelectItem value="orta">Orta</SelectItem>
                  <SelectItem value="yüksek">Yüksek</SelectItem>
                  <SelectItem value="acil">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Bitiş Tarihi</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                data-testid="input-due-date"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            data-testid="button-cancel-task"
            className="w-full sm:w-auto"
          >
            Vazgeç
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending || !description.trim() || !assigneeId}
            data-testid="button-submit-task"
            className="w-full sm:w-auto"
          >
            {createTaskMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Görev Ata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("notifications");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'ceo';
  const canAssignTasks = user?.role ? hasPermission(user.role as UserRoleType, 'tasks', 'create') : false;
  const [viewAll, setViewAll] = useState(false);
  
  const pollingInterval = useAdaptivePolling();
  
  const { data: notifications, isLoading, isError, refetch } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', viewAll ? 'all' : 'personal', branchFilter !== 'all' ? branchFilter : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (viewAll && isAdmin) {
        params.set('viewAll', 'true');
        if (branchFilter !== 'all') {
          params.set('branchId', branchFilter);
        }
      }
      const res = await fetch(`/api/notifications?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status}: ${errorText}`);
      }
      return await res.json();
    },
    refetchInterval: pollingInterval,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: pollingInterval,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    enabled: !!isAdmin,
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery<TaskSummary[]>({
    queryKey: ['/api/tasks/my'],
    refetchInterval: 60000,
  });

  const { data: myChecklists, isLoading: checklistsLoading } = useQuery<any[]>({
    queryKey: ['/api/checklists/my-assignments'],
    refetchInterval: 60000,
  });
  
  const unreadCount = unreadData?.count || 0;
  
  const branchMap = (branches || []).reduce((acc, b) => { acc[b.id] = b.name; return acc; }, {} as Record<number, string>);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Bildirim güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Başarılı",
        description: "Tüm bildirimler okundu olarak işaretlendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlem başarısız",
        variant: "destructive",
      });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/admin/test-notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Başarılı",
        description: "Test bildirimi oluşturuldu",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Test bildirimi oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const filteredNotifications = (notifications || []).filter(n => {
    if (categoryFilter === "all") return true;
    const category = NOTIFICATION_CATEGORIES[categoryFilter];
    return category?.types.includes(n.type);
  });

  const unreadNotifications = filteredNotifications.filter(n => !n.isRead);
  const readNotifications = filteredNotifications.filter(n => n.isRead);

  const activeTasks = (myTasks || []).filter(t => 
    ['beklemede', 'devam_ediyor', 'foto_bekleniyor', 'incelemede'].includes(t.status)
  );
  const overdueTasks = activeTasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date()
  );

  const pendingChecklists = (myChecklists || []).filter((c: any) => !c.isCompleted);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        return;
      }
    }
    
    if (notification.link) {
      navigate(notification.link);
    } else {
      const typeFallbacks: Record<string, string> = {
        'task_assigned': '/operasyon?tab=gorevler',
        'task_started': '/operasyon?tab=gorevler',
        'task_completed': '/operasyon?tab=gorevler',
        'task_complete': '/operasyon?tab=gorevler',
        'task_verified': '/operasyon?tab=gorevler',
        'task_rejected': '/operasyon?tab=gorevler',
        'task_overdue': '/operasyon?tab=gorevler',
        'task_overdue_assigner': '/operasyon?tab=gorevler',
        'task_acknowledged': '/operasyon?tab=gorevler',
        'task_check_requested': '/operasyon?tab=gorevler',
        'task_check_approved': '/operasyon?tab=gorevler',
        'task_check_rejected': '/operasyon?tab=gorevler',
        'task_status_changed': '/operasyon?tab=gorevler',
        'fault_assigned': '/ekipman?tab=ariza-yonetimi',
        'fault_updated': '/ekipman?tab=ariza-yonetimi',
        'fault_reported': '/ekipman?tab=ariza-yonetimi',
        'fault_resolved': '/ekipman?tab=ariza-yonetimi',
        'fault_alert': '/ekipman?tab=ariza-yonetimi',
        'critical_fault': '/ekipman?tab=ariza-yonetimi',
        'critical_service_request': '/crm',
        'maintenance_reminder': '/ekipman',
        'shift_change': '/operasyon?tab=vardiyalar',
        'shift_assigned': '/operasyon?tab=vardiyalar',
        'shift_swap_request': '/operasyon?tab=vardiyalar',
        'shift_swap_approved': '/operasyon?tab=vardiyalar',
        'shift_swap_rejected': '/operasyon?tab=vardiyalar',
        'shift_swap_completed': '/operasyon?tab=vardiyalar',
        'shift_swap_pending_supervisor': '/operasyon?tab=vardiyalar',
        'leave_request': '/operasyon?tab=izinler',
        'announcement': '/operasyon?tab=duyurular',
        'checklist_reminder': '/operasyon?tab=checklistler',
        'checklist_overdue': '/operasyon?tab=checklistler',
        'capa_overdue': '/raporlar?tab=aksiyon-takip',
        'training_assigned': '/akademi',
        'training_overdue': '/akademi',
        'training_reminder': '/akademi',
        'stock_alert': '/satinalma?tab=stok-yonetimi',
        'onboarding_complete': '/operasyon?tab=onboarding',
      };
      
      const fallbackPath = typeFallbacks[notification.type] || '/';
      navigate(fallbackPath);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      beklemede: { label: "Beklemede", variant: "secondary" },
      devam_ediyor: { label: "Devam Ediyor", variant: "default" },
      foto_bekleniyor: { label: "Fotoğraf Bekleniyor", variant: "secondary" },
      incelemede: { label: "İncelemede", variant: "default" },
    };
    const info = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "yüksek") return <Badge variant="destructive" className="text-[10px]">Yüksek</Badge>;
    if (priority === "orta") return <Badge variant="secondary" className="text-[10px]">Orta</Badge>;
    return null;
  };

  const totalPending = activeTasks.length + pendingChecklists.length;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Bildirimler
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-description">
            Bildirimler, görevler ve hatırlatmalar
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {canAssignTasks && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setAssignTaskOpen(true)}
              data-testid="button-assign-task"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Görev Ata
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={viewAll ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewAll(!viewAll); setBranchFilter('all'); }}
              data-testid="button-toggle-view-all"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              {viewAll ? 'Sistem Bildirimleri' : 'Kişisel'}
            </Button>
          )}
          {isAdmin && viewAll && branches && branches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-branch-filter">
                <Building2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <SelectValue placeholder="Tüm Şubeler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="branch-option-all">Tüm Şubeler</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={String(branch.id)} data-testid={`branch-option-${branch.id}`}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotificationMutation.mutate()}
              disabled={testNotificationMutation.isPending}
              data-testid="button-test-notification"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {testNotificationMutation.isPending ? "Gönderiliyor..." : "Test Bildirimi Gönder"}
            </Button>
          )}
          {unreadCount > 0 && activeTab === "notifications" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Tümünü Okundu İşaretle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="dialog-confirm-mark-all-read">
                <AlertDialogHeader>
                  <AlertDialogTitle data-testid="dialog-title-confirm">Emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription data-testid="dialog-description">
                    Tüm bildirimler okundu olarak işaretlenecek. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-dialog-cancel">Vazgeç</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    data-testid="button-dialog-confirm"
                  >
                    Evet, İşaretle
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-main">
          <TabsTrigger value="notifications" data-testid="tab-notifications" className="gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Bildirimler
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending" className="gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Bekleyenler
            {totalPending > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {totalPending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
            {Object.entries(NOTIFICATION_CATEGORIES).map(([key, cat]) => {
              const count = key === "all" 
                ? notifications?.length || 0
                : (notifications || []).filter(n => cat.types.includes(n.type)).length;
              
              return (
                <Badge
                  key={key}
                  variant={categoryFilter === key ? "default" : "secondary"}
                  className="cursor-pointer text-xs gap-1 flex-shrink-0"
                  onClick={() => setCategoryFilter(key)}
                  data-testid={`filter-${key}`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                  {count > 0 && <span>({count})</span>}
                </Badge>
              );
            })}
          </div>

          {isLoading ? (
            <ListSkeleton count={6} variant="card" />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-sm text-muted-foreground">Bildirimler yüklenirken bir hata oluştu.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-notifications">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Tekrar Dene
              </Button>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {unreadNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Okunmamış
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unreadNotifications.length}</Badge>
                  </h3>
                  <div className="space-y-1.5">
                    {unreadNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        branchName={notification.branchId ? branchMap[notification.branchId] : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {readNotifications.length > 0 && (
                <div className="space-y-2">
                  {unreadNotifications.length > 0 && (
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Okunmuş
                    </h3>
                  )}
                  <div className="space-y-1.5">
                    {readNotifications.slice(0, 30).map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        branchName={notification.branchId ? branchMap[notification.branchId] : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState 
              icon={Bell}
              title={categoryFilter !== "all" ? "Bu kategoride bildirim yok" : "Bildirim yok"}
              description={categoryFilter !== "all" ? "Farklı bir kategori deneyin." : "Henüz bildiriminiz bulunmuyor."}
              data-testid="empty-state-notifications"
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {overdueTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Gecikmiş Görevler
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{overdueTasks.length}</Badge>
              </h3>
              <div className="space-y-1.5">
                {overdueTasks.map(task => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover-elevate border-destructive/30"
                    onClick={() => navigate(`/gorev-detay/${task.id}`)}
                    data-testid={`card-overdue-task-${task.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-destructive/10">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                            {task.dueDate && (
                              <span className="text-[11px] text-destructive font-medium">
                                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: tr })} gecikmiş
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTasks.filter(t => !overdueTasks.includes(t)).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Açık Görevler
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {activeTasks.filter(t => !overdueTasks.includes(t)).length}
                </Badge>
              </h3>
              <div className="space-y-1.5">
                {activeTasks.filter(t => !overdueTasks.includes(t)).map(task => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/gorev-detay/${task.id}`)}
                    data-testid={`card-active-task-${task.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <ClipboardCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                            {task.dueDate && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(task.dueDate), "d MMM", { locale: tr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pendingChecklists.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" />
                Bekleyen Checklistler
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{pendingChecklists.length}</Badge>
              </h3>
              <div className="space-y-1.5">
                {pendingChecklists.map((checklist: any) => (
                  <Card
                    key={checklist.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/checklistler`)}
                    data-testid={`card-pending-checklist-${checklist.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10">
                          <CheckSquare className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {checklist.checklist?.title || checklist.title || `Checklist #${checklist.id}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Tamamlanmamış checklist
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tasksLoading || checklistsLoading ? (
            <ListSkeleton count={4} variant="card" />
          ) : totalPending === 0 && (
            <EmptyState 
              icon={CheckCheck}
              title="Bekleyen işiniz yok"
              description="Tüm görevleriniz ve checklistleriniz tamamlanmış."
              data-testid="empty-state-pending"
            />
          )}
        </TabsContent>
      </Tabs>

      <AssignTaskDialog open={assignTaskOpen} onOpenChange={setAssignTaskOpen} />
    </div>
  );
}

function NotificationCard({ notification, onClick, branchName }: { notification: Notification; onClick: () => void; branchName?: string }) {
  const Icon = notificationTypeIcons[notification.type] || Bell;
  const typeLabel = notificationTypeLabels[notification.type] || "Bildirim";
  const isUnread = !notification.isRead;

  const isCritical = ['critical_fault', 'critical_service_request', 'fault_alert', 'capa_overdue', 'alert'].includes(notification.type);

  return (
    <Card 
      className={`cursor-pointer hover-elevate ${isUnread ? 'border-primary/30 bg-primary/5' : ''} ${isCritical ? 'border-destructive/40' : ''}`}
      onClick={onClick}
      data-testid={`card-notification-${notification.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${isCritical ? 'bg-destructive/10' : isUnread ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`w-4 h-4 ${isCritical ? 'text-destructive' : isUnread ? 'text-primary' : ''}`} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate" data-testid={`text-title-${notification.id}`}>
                {notification.title}
              </h3>
              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-message-${notification.id}`}>
              {notification.message}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]" data-testid={`badge-type-${notification.id}`}>
                {typeLabel}
              </Badge>
              {branchName && (
                <Badge variant="secondary" className="text-[10px] gap-0.5" data-testid={`badge-branch-${notification.id}`}>
                  <MapPin className="w-2.5 h-2.5" />
                  {branchName}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground" data-testid={`text-time-${notification.id}`}>
                {formatDistanceToNow(new Date(notification.createdAt!), { addSuffix: true, locale: tr })}
              </span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
