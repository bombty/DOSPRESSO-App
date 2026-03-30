import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useBreakpoint } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { useLocation } from "wouter";
import type { Notification, Branch, Message, User, Announcement } from "@shared/schema";
import { hasPermission, isHQRole, type UserRoleType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ROLE_LABELS } from "@/lib/turkish-labels";
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
  Award,
  Flame,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Search,
  Mail,
  MailOpen,
  ArrowLeft,
  Paperclip,
  Calendar,
  AlertCircle,
  Settings,
  BellOff,
  Users,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  quiz_passed: CheckCheck,
  quiz_failed: AlertTriangle,
  module_completed: GraduationCap,
  badge_earned: Award,
  gate_passed: GraduationCap,
  gate_failed: AlertTriangle,
  gate_request: GraduationCap,
  gate_result: GraduationCap,
  certificate_earned: Award,
  streak_milestone: Flame,
  score_change: TrendingUp,
  recipe_updated: BookOpen,
  recipe_update: BookOpen,
  module_approval_pending: GraduationCap,
  module_approved: CheckCheck,
  module_rejected: AlertTriangle,
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
  quiz_passed: "Quiz Başarılı",
  quiz_failed: "Quiz Başarısız",
  module_completed: "Modül Tamamlandı",
  badge_earned: "Rozet Kazanıldı",
  gate_passed: "Statü Atlama Başarılı",
  gate_failed: "Statü Atlama Başarısız",
  gate_request: "Statü Atlama Talebi",
  gate_result: "Statü Atlama Sonucu",
  certificate_earned: "Sertifika Kazanıldı",
  streak_milestone: "Seri Rekoru",
  score_change: "Skor Değişimi",
  recipe_updated: "Reçete Güncellendi",
  recipe_update: "Reçete Güncellendi",
  module_approval_pending: "Modül Onay Bekliyor",
  module_approved: "Modül Onaylandı",
  module_rejected: "Modül Reddedildi",
};

const NOTIFICATION_CATEGORIES: Record<string, { label: string; icon: any; types: string[] }> = {
  all: { label: "Tümü", icon: Bell, types: [] },
  tasks: { label: "Görevler", icon: ClipboardCheck, types: ["task_assigned", "task_started", "task_complete", "task_completed", "task_verified", "task_rejected", "task_overdue", "task_acknowledged", "task_overdue_assigner", "task_check_requested", "task_check_approved", "task_check_rejected", "task_status_changed"] },
  crm: { label: "CRM", icon: MessageSquare, types: ["ticket_assigned", "ticket_resolved", "sla_breach", "complaint", "feedback_alert", "feedback_info", "feedback_positive", "stale_quote_reminder"] },
  faults: { label: "Arızalar", icon: Wrench, types: ["fault_reported", "fault_assigned", "fault_resolved", "fault_updated", "fault_alert", "critical_fault", "critical_service_request", "maintenance_reminder", "recipe_updated", "recipe_update"] },
  checklists: { label: "Checklistler", icon: CheckSquare, types: ["checklist_reminder", "checklist_overdue", "capa_overdue"] },
  announcements: { label: "Duyurular", icon: Megaphone, types: ["announcement", "info", "warning", "alert", "system"] },
  egitim: { label: "Eğitim", icon: GraduationCap, types: ["quiz_passed", "quiz_failed", "module_completed", "badge_earned", "gate_passed", "gate_failed", "gate_request", "gate_result", "certificate_earned", "streak_milestone", "score_change", "training_assigned", "training_overdue", "training_reminder", "module_approval_pending", "module_approved", "module_rejected"] },
  hr: { label: "IK", icon: Clock, types: ["shift_change", "shift_assigned", "shift_swap_request", "shift_swap_approved", "shift_swap_rejected", "shift_swap_completed", "shift_swap_pending_supervisor", "leave_request", "onboarding_complete", "evaluation_reminder"] },
  dobody: { label: "Dobody", icon: AlertCircle, types: ["agent_guidance", "agent_escalation", "agent_escalation_info", "agent_suggestion"] },
  stock: { label: "Stok", icon: Package, types: ["stock_alert", "factory_fault_report"] },
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

type ThreadSummary = {
  threadId: string;
  subject: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  unreadCount: number;
  sentByMe: boolean;
  participants: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string | null }>;
};

type ThreadData = {
  messages: Message[];
  participants: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string | null; role?: string }>;
};

type AnnouncementWithUser = Announcement & {
  createdBy: {
    fullName: string;
  };
};

const announcementPriorityLabels: Record<string, string> = {
  normal: "Normal",
  urgent: "Acil",
};

const announcementCategoryLabels: Record<string, string> = {
  general: "Genel",
  new_product: "Yeni Ürün",
  policy: "Politika",
  campaign: "Kampanya",
  urgent: "Acil",
  training: "Eğitim",
  event: "Etkinlik",
};

function EmbeddedMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unread" | "sent">("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: allThreads = [], isLoading: threadsLoading, isFetching: threadsFetching } = useQuery<ThreadSummary[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const filteredThreads = useMemo(() => {
    let threads = allThreads;
    if (filter === "unread") threads = threads.filter((t) => t.unreadCount > 0);
    else if (filter === "sent") threads = threads.filter((t) => t.sentByMe);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLocaleLowerCase('tr-TR');
      threads = threads.filter(
        (t) =>
          t.subject.toLocaleLowerCase('tr-TR').includes(q) ||
          t.lastMessageBody.toLocaleLowerCase('tr-TR').includes(q) ||
          t.participants.some((p) => `${p.firstName} ${p.lastName}`.toLocaleLowerCase('tr-TR').includes(q))
      );
    }
    return threads;
  }, [allThreads, filter, debouncedSearch]);

  const { data: threadData, isLoading: threadLoading } = useQuery<ThreadData>({
    queryKey: ["/api/messages", selectedThreadId],
    enabled: !!selectedThreadId,
    refetchInterval: selectedThreadId ? 5000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (threadId: string) => apiRequest("POST", `/api/messages/${threadId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: (data: { threadId: string; body: string }) =>
      apiRequest("POST", `/api/messages/${data.threadId}/replies`, { body: data.body, attachments: [] }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threadData?.messages]);

  useEffect(() => {
    if (selectedThreadId && threadData) {
      const thread = allThreads.find((t) => t.threadId === selectedThreadId);
      if (thread && thread.unreadCount > 0) markReadMutation.mutate(selectedThreadId);
    }
  }, [selectedThreadId, threadData]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !selectedThreadId) return;
    sendReplyMutation.mutate({ threadId: selectedThreadId, body: messageText });
  }, [messageText, selectedThreadId]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return "Şimdi";
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat`;
    if (diffMins < 2880) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  const getOtherParticipants = (participants: Array<{ id?: string; userId?: string; firstName: string; lastName: string }>) =>
    participants.filter((p) => (p.id || (p as any).userId) !== user?.id);

  const getParticipantNames = (participants: Array<{ id?: string; userId?: string; firstName: string; lastName: string }>) => {
    const others = getOtherParticipants(participants);
    if (others.length === 0) return "Sen";
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return `${others[0].firstName} ${others[0].lastName} +${others.length - 1}`;
  };

  const unreadTotal = useMemo(() => allThreads.reduce((sum, t) => sum + t.unreadCount, 0), [allThreads]);
  const { isMobile } = useBreakpoint();
  const showThreadList = !isMobile || !selectedThreadId;
  const showConversation = !isMobile || !!selectedThreadId;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[400px] overflow-hidden rounded-md border" data-testid="embedded-messages-container">
      {showThreadList && (
        <div className={`${isMobile ? "w-full" : "w-1/3 min-w-[280px] max-w-[380px]"} border-r flex flex-col bg-background`}>
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold" data-testid="text-embedded-messages-title">Mesajlar</h2>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/mesajlar'} data-testid="button-open-full-messages">
                Tam Görünüm
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara..."
                className="pl-9"
                data-testid="input-embedded-search-threads"
              />
            </div>
            <div className="flex gap-1">
              {([
                { key: "all" as const, label: "Tümünü", icon: MessageSquare },
                { key: "unread" as const, label: "Okunmamış", icon: Mail, count: unreadTotal },
                { key: "sent" as const, label: "Gönderdiklerim", icon: MailOpen },
              ]).map((fb) => (
                <Button
                  key={fb.key}
                  variant={filter === fb.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(fb.key)}
                  className="flex-1 gap-1"
                  data-testid={`button-embedded-filter-${fb.key}`}
                >
                  <fb.icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{fb.label}</span>
                  {fb.count !== undefined && fb.count > 0 && (
                    <Badge variant="destructive" className="ml-0.5 text-[10px] leading-none px-1.5 py-0.5">{fb.count}</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {threadsLoading || (threadsFetching && allThreads.length === 0) ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center" data-testid="text-embedded-no-threads">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Mesaj bulunamadı</p>
              </div>
            ) : (
              <div>
                {filteredThreads.map((thread) => {
                  const others = getOtherParticipants(thread.participants);
                  const isSelected = selectedThreadId === thread.threadId;
                  const hasUnread = thread.unreadCount > 0;
                  return (
                    <div
                      key={thread.threadId}
                      onClick={() => setSelectedThreadId(thread.threadId)}
                      className={`flex items-start gap-3 p-3 cursor-pointer border-b transition-colors ${isSelected ? "bg-accent" : "hover-elevate"} ${hasUnread ? "font-medium" : ""}`}
                      data-testid={`embedded-thread-item-${thread.threadId}`}
                    >
                      <Avatar className="shrink-0">
                        <AvatarFallback className={hasUnread ? "bg-primary text-primary-foreground" : ""}>
                          {others[0] ? getInitials(others[0].firstName, others[0].lastName) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>{getParticipantNames(thread.participants)}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDate(thread.lastMessageAt)}</span>
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${hasUnread ? "text-foreground" : "text-muted-foreground"}`}>{thread.subject}</p>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{thread.lastMessageBody}</p>
                          {hasUnread && (
                            <Badge variant="default" className="shrink-0 text-[10px] leading-none px-1.5 py-0.5">{thread.unreadCount}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {showConversation && (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {!selectedThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3" data-testid="text-embedded-no-thread-selected">
              <MessageSquare className="w-14 h-14 text-muted-foreground/20" />
              <p className="text-base font-medium">Bir konuşma seçin</p>
              <p className="text-sm text-muted-foreground/70">Sol taraftan bir mesaj seçin</p>
            </div>
          ) : threadLoading ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <Skeleton className="h-16 w-48 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : threadData ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                {isMobile && (
                  <Button size="icon" variant="ghost" onClick={() => setSelectedThreadId(null)} data-testid="button-embedded-back-to-list">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate" data-testid="text-embedded-thread-title">
                    {threadData.messages[0]?.subject || "Mesaj"}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {getParticipantNames(threadData.participants?.map((p: any) => ({ id: p.id || p.userId, firstName: p.firstName || "", lastName: p.lastName || "" })))}
                  </p>
                </div>
              </div>
              <ScrollArea className="flex-1" ref={scrollRef as any}>
                <div className="p-4 space-y-2">
                  {threadData.messages?.map((message) => {
                    const isSent = message.senderId === user?.id;
                    const sender = threadData.participants.find((p: any) => (p.id || p.userId) === message.senderId);
                    return (
                      <div key={message.id} className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1`} data-testid={`embedded-message-${message.id}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-lg ${isSent ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {!isSent && sender && (
                            <p className="text-xs font-medium mb-1">{sender.firstName} {sender.lastName}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[10px] mt-1 ${isSent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(message.createdAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Mesajinizi yazin..."
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    data-testid="input-embedded-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendReplyMutation.isPending}
                    data-testid="button-embedded-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EmbeddedAnnouncements() {
  const { user } = useAuth();

  const { data: announcements, isLoading } = useQuery<AnnouncementWithUser[]>({
    queryKey: ['/api/announcements'],
  });

  return (
    <div className="space-y-4" data-testid="embedded-announcements-container">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-embedded-announcements-title">Duyurular</h2>
        <Button size="sm" variant="outline" onClick={() => window.location.href = '/duyurular'} data-testid="button-open-full-announcements">
          Tam Gorunum
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} variant="card" />
      ) : announcements && announcements.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Array.isArray(announcements) ? announcements : []).map((announcement) => {
            const isUrgent = announcement.priority === 'urgent';
            const hasBanner = !!announcement.bannerImageUrl;

            return (
              <Card
                key={announcement.id}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${isUrgent ? 'ring-2 ring-destructive' : ''}`}
                data-testid={`embedded-card-announcement-${announcement.id}`}
              >
                {hasBanner ? (
                  <div className="relative h-32 overflow-hidden">
                    <img src={announcement.bannerImageUrl!} alt={announcement.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold line-clamp-2 text-sm" data-testid={`embedded-text-announcement-title-${announcement.id}`}>
                        {announcement.title}
                      </h3>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
                        {announcementPriorityLabels[announcement.priority]}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className={`h-32 flex items-center justify-center ${isUrgent ? 'bg-destructive/10' : 'bg-primary/5'}`}>
                    <div className="text-center p-4">
                      {isUrgent ? (
                        <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
                      ) : (
                        <Megaphone className="w-8 h-8 mx-auto text-primary mb-2" />
                      )}
                      <h3 className="font-semibold line-clamp-2 text-sm" data-testid={`embedded-text-announcement-title-${announcement.id}`}>
                        {announcement.title}
                      </h3>
                    </div>
                  </div>
                )}
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{announcement.message}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {announcement.publishedAt
                          ? format(new Date(announcement.publishedAt), "d MMM yyyy", { locale: tr })
                          : "Taslak"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {announcementCategoryLabels[announcement.category] || announcement.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="Henüz duyuru yok"
          description="Yeni duyurular burada görüntülenecek."
          data-testid="empty-state-embedded-announcements"
        />
      )}
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialTopTab = urlParams.get('tab') || 'bildirimler';
  const [topLevelTab, setTopLevelTab] = useState(initialTopTab);

  const [activeTab, setActiveTab] = useState("notifications");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'ceo';
  const canAssignTasks = user?.role ? hasPermission(user.role as UserRoleType, 'tasks', 'create') : false;
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (topLevelTab === 'bildirimler') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', topLevelTab);
    }
    window.history.replaceState({}, '', url.toString());
  }, [topLevelTab]);
  
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
  const [prefsOpen, setPrefsOpen] = useState(false);

  const { data: notifPrefs } = useQuery<Record<string, boolean>>({
    queryKey: ['/api/notification-preferences'],
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      await apiRequest('PATCH', '/api/notification-preferences', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({ title: "Başarılı", description: "Bildirim tercihleri güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Tercihler güncellenemedi", variant: "destructive" });
    },
  });
  
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
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-page-title">
              İletişim Merkezi
            </h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-description">
              Bildirimler, mesajlar ve duyurular
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPrefsOpen(true)}
            data-testid="button-notification-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {topLevelTab === 'bildirimler' && (
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
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-branch-filter">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <SelectValue placeholder="Tüm Şubeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="branch-option-all">Tüm Şubeler</SelectItem>
                  {(Array.isArray(branches) ? branches : []).map(branch => (
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
        )}
      </div>

      <Tabs value={topLevelTab} onValueChange={setTopLevelTab}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto" data-testid="tabs-top-level">
            <TabsTrigger value="bildirimler" data-testid="tab-top-bildirimler" className="gap-1.5 flex-1 sm:flex-initial">
              <Bell className="w-3.5 h-3.5" />
              Bildirimler
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mesajlar" data-testid="tab-top-mesajlar" className="gap-1.5 flex-1 sm:flex-initial">
              <MessageSquare className="w-3.5 h-3.5" />
              Mesajlar
            </TabsTrigger>
            <TabsTrigger value="duyurular" data-testid="tab-top-duyurular" className="gap-1.5 flex-1 sm:flex-initial">
              <Megaphone className="w-3.5 h-3.5" />
              Duyurular
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bildirimler" className="mt-4 space-y-3">
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
              const unreadCount = key === "all" 
                ? (notifications || []).filter(n => !n.isRead).length
                : (notifications || []).filter(n => cat.types.includes(n.type) && !n.isRead).length;
              
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
                  {unreadCount > 0 && <span className="bg-destructive text-destructive-foreground rounded-full min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center">{unreadCount}</span>}
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
        </TabsContent>

        <TabsContent value="mesajlar" className="mt-4">
          <EmbeddedMessages />
        </TabsContent>

        <TabsContent value="duyurular" className="mt-4">
          <EmbeddedAnnouncements />
        </TabsContent>
      </Tabs>

      <AssignTaskDialog open={assignTaskOpen} onOpenChange={setAssignTaskOpen} />

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-notification-preferences">
          <DialogHeader>
            <DialogTitle data-testid="text-prefs-title">Bildirim Tercihleri</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Almak istemediginiz bildirim turlerini kapatabilirsiniz. Kritik bildirimler her zaman aktiftir.
            </DialogDescription>
          </DialogHeader>
          <NotificationPreferencesContent
            prefs={notifPrefs || {}}
            onSave={(newPrefs) => {
              updatePrefsMutation.mutate(newPrefs);
            }}
            isPending={updatePrefsMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PREF_CATEGORIES = [
  {
    key: 'egitim',
    label: 'Eğitim Bildirimleri',
    icon: GraduationCap,
    types: [
      { key: 'quiz_passed', label: 'Quiz başarılı sonuçları' },
      { key: 'quiz_failed', label: 'Quiz başarısız sonuçları' },
      { key: 'module_completed', label: 'Modül tamamlama' },
      { key: 'badge_earned', label: 'Rozet kazanma' },
      { key: 'gate_passed', label: 'Statü atlama başarılı' },
      { key: 'gate_failed', label: 'Statü atlama başarısız' },
      { key: 'certificate_earned', label: 'Sertifika kazanma' },
      { key: 'streak_milestone', label: 'Seri rekoru' },
      { key: 'score_change', label: 'Skor değişimi' },
      { key: 'training_assigned', label: 'Eğitim atama' },
    ],
  },
  {
    key: 'gorevler',
    label: 'Görev Bildirimleri',
    icon: ClipboardCheck,
    types: [
      { key: 'task_assigned', label: 'Yeni görev ataması' },
      { key: 'task_overdue', label: 'Gecikme uyarısı' },
      { key: 'task_completed', label: 'Görev tamamlama' },
      { key: 'checklist_reminder', label: 'Checklist hatırlatma' },
    ],
  },
  {
    key: 'misafir',
    label: 'Misafir Bildirimleri',
    icon: AlertCircle,
    types: [
      { key: 'feedback_alert', label: 'Düşük puan uyarısı' },
      { key: 'complaint', label: 'Şikayet bildirimi' },
    ],
  },
  {
    key: 'recete',
    label: 'Reçete Bildirimleri',
    icon: BookOpen,
    types: [
      { key: 'recipe_updated', label: 'Reçete güncelleme' },
      { key: 'recipe_update', label: 'Yeni reçete' },
    ],
  },
  {
    key: 'sistem',
    label: 'Diğer Bildirimler',
    icon: Bell,
    types: [
      { key: 'shift_assigned', label: 'Vardiya ataması' },
      { key: 'shift_swap_request', label: 'Vardiya takas talebi' },
      { key: 'leave_request', label: 'İzin talebi' },
      { key: 'stock_alert', label: 'Stok uyarısı' },
      { key: 'announcement', label: 'Duyurular' },
    ],
  },
];

const NEVER_DISABLE = ['sla_breach', 'pin_lockout', 'critical_fault', 'security_alert', 'fault_alert'];

const FREQUENCY_CATEGORY_LIST = [
  { key: 'tasks', label: 'Görevler', icon: ClipboardCheck },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'stock', label: 'Stok', icon: Package },
  { key: 'dobody', label: 'Mr. Dobody', icon: Sparkles },
  { key: 'faults', label: 'Arızalar', icon: AlertTriangle },
  { key: 'checklist', label: 'Checklist', icon: ClipboardCheck },
  { key: 'training', label: 'Eğitim', icon: GraduationCap },
  { key: 'hr', label: 'İK', icon: Users },
];

const FREQUENCY_LABELS: Record<string, string> = {
  instant: 'Anında',
  daily_digest: 'Günlük Özet',
  off: 'Kapalı',
};

interface EffectivePref {
  category: string;
  frequency: string;
  source: string;
}

function NotificationPreferencesContent({
  prefs,
  onSave,
  isPending,
}: {
  prefs: Record<string, boolean>;
  onSave: (prefs: Record<string, boolean>) => void;
  isPending: boolean;
}) {
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({ ...prefs });
  const [activeTab, setActiveTab] = useState<'category' | 'detail'>('category');

  const { data: effectivePrefs } = useQuery<EffectivePref[]>({
    queryKey: ['/api/notification-preferences/effective'],
  });

  const bulkPrefMutation = useMutation({
    mutationFn: async (items: Array<{ category: string; frequency: string }>) => {
      await apiRequest('PUT', '/api/notification-preferences/bulk', items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences/effective'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
    },
  });

  const [localCategoryPrefs, setLocalCategoryPrefs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (effectivePrefs) {
      const map: Record<string, string> = {};
      effectivePrefs.forEach(p => { map[p.category] = p.frequency; });
      setLocalCategoryPrefs(map);
    }
  }, [effectivePrefs]);

  useEffect(() => {
    setLocalPrefs({ ...prefs });
  }, [prefs]);

  const togglePref = (key: string) => {
    if (NEVER_DISABLE.includes(key)) return;
    setLocalPrefs(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const isEnabled = (key: string) => {
    if (NEVER_DISABLE.includes(key)) return true;
    return localPrefs[key] !== false;
  };

  const handleCategoryFreqChange = (category: string, frequency: string) => {
    setLocalCategoryPrefs(prev => ({ ...prev, [category]: frequency }));
  };

  const handleSaveCategories = () => {
    const items = Object.entries(localCategoryPrefs).map(([category, frequency]) => ({
      category,
      frequency,
    }));
    bulkPrefMutation.mutate(items);
  };

  return (
    <div className="space-y-4" data-testid="notification-preferences-content">
      <div className="flex gap-1 border-b pb-2">
        <Button
          variant={activeTab === 'category' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('category')}
          data-testid="tab-category-prefs"
        >
          Kategori Bazlı
        </Button>
        <Button
          variant={activeTab === 'detail' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('detail')}
          data-testid="tab-detail-prefs"
        >
          Detaylı Ayarlar
        </Button>
      </div>

      {activeTab === 'category' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Her kategori için bildirim sıklığını ayarlayın.
          </p>
          {FREQUENCY_CATEGORY_LIST.map((cat) => {
            const CatIcon = cat.icon;
            const currentFreq = localCategoryPrefs[cat.key] || 'instant';
            return (
              <div
                key={cat.key}
                className="flex items-center justify-between gap-2 py-1.5"
                data-testid={`category-pref-${cat.key}`}
              >
                <div className="flex items-center gap-2">
                  <CatIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{cat.label}</span>
                </div>
                <Select
                  value={currentFreq}
                  onValueChange={(v) => handleCategoryFreqChange(cat.key, v)}
                >
                  <SelectTrigger className="w-[130px]" data-testid={`select-freq-${cat.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Anında</SelectItem>
                    <SelectItem value="daily_digest">Günlük Özet</SelectItem>
                    <SelectItem value="off">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <BellOff className="w-4 h-4" />
              <span>Kapatılamaz Bildirimler</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              SLA ihlali, güvenlik uyarısı ve kritik arıza bildirimleri her zaman aktiftir.
            </p>
          </div>

          <Button
            onClick={handleSaveCategories}
            disabled={bulkPrefMutation.isPending}
            className="w-full"
            data-testid="button-save-category-prefs"
          >
            {bulkPrefMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Kategori Tercihlerini Kaydet
          </Button>
        </div>
      )}

      {activeTab === 'detail' && (
        <div className="space-y-4">
          {PREF_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.key} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CatIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{cat.label}</span>
                </div>
                <div className="space-y-1 pl-6">
                  {cat.types?.map((type) => (
                    <div
                      key={type.key}
                      className="flex items-center justify-between py-1.5"
                      data-testid={`pref-row-${type.key}`}
                    >
                      <span className="text-sm">{type.label}</span>
                      <Switch
                        checked={isEnabled(type.key)}
                        onCheckedChange={() => togglePref(type.key)}
                        disabled={NEVER_DISABLE.includes(type.key)}
                        data-testid={`switch-pref-${type.key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <BellOff className="w-4 h-4" />
              <span>Kapatılamaz Bildirimler</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              SLA ihlali, güvenlik uyarısı ve kritik arıza bildirimleri her zaman aktiftir.
            </p>
          </div>

          <Button
            onClick={() => onSave(localPrefs)}
            disabled={isPending}
            className="w-full"
            data-testid="button-save-preferences"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Tercihleri Kaydet
          </Button>
        </div>
      )}
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
