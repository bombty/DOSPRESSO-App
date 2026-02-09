import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  fault_reported: AlertTriangle,
  fault_assigned: Wrench,
  fault_resolved: Wrench,
  fault_updated: Wrench,
  training_assigned: GraduationCap,
  maintenance_reminder: Wrench,
  checklist_reminder: CheckSquare,
  capa_overdue: AlertTriangle,
  shift_change: Clock,
  leave_request: Clock,
  announcement: Megaphone,
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
  fault_reported: "Arıza Raporu",
  fault_assigned: "Arıza Atandı",
  fault_resolved: "Arıza Çözüldü",
  fault_updated: "Arıza Güncellendi",
  training_assigned: "Eğitim Atandı",
  maintenance_reminder: "Bakım Hatırlatması",
  checklist_reminder: "Checklist Hatırlatması",
  capa_overdue: "Düzeltici Aksiyon",
  shift_change: "Vardiya Değişikliği",
  leave_request: "İzin Talebi",
  announcement: "Duyuru",
  system: "Sistem",
};

const NOTIFICATION_CATEGORIES: Record<string, { label: string; icon: any; types: string[] }> = {
  all: { label: "Tümü", icon: Bell, types: [] },
  tasks: { label: "Görevler", icon: ClipboardCheck, types: ["task_assigned", "task_started", "task_complete", "task_completed", "task_verified", "task_rejected", "task_overdue", "task_acknowledged", "task_overdue_assigner"] },
  faults: { label: "Arızalar", icon: Wrench, types: ["fault_reported", "fault_assigned", "fault_resolved", "fault_updated", "maintenance_reminder"] },
  checklists: { label: "Checklistler", icon: CheckSquare, types: ["checklist_reminder", "capa_overdue"] },
  announcements: { label: "Duyurular", icon: Megaphone, types: ["announcement", "system"] },
  hr: { label: "İK", icon: Clock, types: ["shift_change", "leave_request", "training_assigned"] },
};

interface TaskSummary {
  id: number;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedById: string | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("notifications");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const pollingInterval = useAdaptivePolling();
  
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: pollingInterval,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: pollingInterval,
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
        'task_assigned': '/gorevler',
        'task_started': '/gorevler',
        'task_completed': '/gorevler',
        'task_verified': '/gorevler',
        'task_rejected': '/gorevler',
        'task_overdue': '/gorevler',
        'task_overdue_assigner': '/gorevler',
        'fault_assigned': '/ariza',
        'fault_updated': '/ariza',
        'fault_reported': '/ariza',
        'fault_resolved': '/ariza',
        'maintenance_reminder': '/ekipman',
        'shift_change': '/vardiyalarim',
        'leave_request': '/ik',
        'announcement': '/duyurular',
        'checklist_reminder': '/checklistler',
        'training_assigned': '/akademi',
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
        
        {unreadCount > 0 && activeTab === "notifications" && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        )}
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
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(NOTIFICATION_CATEGORIES).map(([key, cat]) => {
              const count = key === "all" 
                ? notifications?.length || 0
                : (notifications || []).filter(n => cat.types.includes(n.type)).length;
              
              return (
                <Badge
                  key={key}
                  variant={categoryFilter === key ? "default" : "secondary"}
                  className="cursor-pointer text-xs gap-1"
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
    </div>
  );
}

function NotificationCard({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const Icon = notificationTypeIcons[notification.type] || Bell;
  const typeLabel = notificationTypeLabels[notification.type] || "Bildirim";
  const isUnread = !notification.isRead;

  return (
    <Card 
      className={`cursor-pointer hover-elevate ${isUnread ? 'border-primary/30 bg-primary/5' : ''}`}
      onClick={onClick}
      data-testid={`card-notification-${notification.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${isUnread ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`w-4 h-4 ${isUnread ? 'text-primary' : ''}`} />
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
