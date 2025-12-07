import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  GraduationCap, 
  CheckSquare,
  Megaphone,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const notificationTypeIcons: Record<string, any> = {
  task_assigned: CheckSquare,
  task_started: Clock,
  task_complete: CheckCheck,
  task_completed: CheckCheck,
  task_verified: CheckCheck,
  task_rejected: AlertTriangle,
  task_overdue: AlertTriangle,
  fault_reported: AlertTriangle,
  fault_resolved: Wrench,
  training_assigned: GraduationCap,
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
  fault_reported: "Arıza Raporu",
  fault_resolved: "Arıza Çözüldü",
  training_assigned: "Eğitim Atandı",
  announcement: "Duyuru",
  system: "Sistem",
};

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  
  const pollingInterval = useAdaptivePolling();
  
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: pollingInterval,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: pollingInterval,
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

  const filteredNotifications = notifications?.filter(n => 
    activeTab === "all" || (activeTab === "unread" && !n.isRead)
  ) || [];

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
      // Smart fallback based on notification type
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
        'maintenance_reminder': '/ekipman',
        'shift_change': '/vardiya',
        'leave_request': '/ik',
        'announcement': '/duyurular',
      };
      
      const fallbackPath = typeFallbacks[notification.type] || '/';
      navigate(fallbackPath);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Bildirimler
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-description">
            Size gönderilen bildirimler ve güncellemeler
          </p>
        </div>
        
        {unreadCount > 0 && (
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
        <TabsList data-testid="tabs-notification-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            Tümü ({notifications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread">
            Okunmamış ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-full">
                  <CardContent className="p-3">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredNotifications.map((notification) => {
                const Icon = notificationTypeIcons[notification.type] || Bell;
                const typeLabel = notificationTypeLabels[notification.type] || "Bildirim";
                
                return (
                  <Card 
                    key={notification.id}
                    className={`cursor-pointer transition-all hover-elevate h-full ${
                      !notification.isRead ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`card-notification-${notification.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={`p-2 rounded-lg ${
                          !notification.isRead ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold" data-testid={`text-title-${notification.id}`}>
                              {notification.title}
                            </h3>
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${notification.id}`}>
                              {typeLabel}
                            </Badge>
                            {!notification.isRead && (
                              <Badge variant="destructive" className="text-xs" data-testid={`badge-unread-${notification.id}`}>
                                Yeni
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground" data-testid={`text-message-${notification.id}`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`text-time-${notification.id}`}>
                              {format(new Date(notification.createdAt!), "d MMMM yyyy HH:mm", { locale: tr })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === "unread" 
                    ? "Okunmamış bildiriminiz yok" 
                    : "Henüz bildiriminiz yok"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
