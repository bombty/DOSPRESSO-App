import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, CheckCircle2, AlertCircle, Wrench, User, ClipboardList,
  Clock, ChevronRight, Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ActivityItem {
  id: number;
  type: 'task_completed' | 'task_created' | 'fault_reported' | 'fault_resolved' | 'checklist_completed' | 'user_action';
  title: string;
  description?: string;
  timestamp: string;
  userId?: number;
  userName?: string;
  entityId?: number;
  entityType?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  task_completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Görev Tamamlandı' },
  task_created: { icon: ClipboardList, color: 'text-blue-500', label: 'Görev Oluşturuldu' },
  fault_reported: { icon: AlertCircle, color: 'text-red-500', label: 'Arıza Bildirimi' },
  fault_resolved: { icon: Wrench, color: 'text-green-500', label: 'Arıza Çözüldü' },
  checklist_completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Checklist Tamamlandı' },
  user_action: { icon: User, color: 'text-primary', label: 'Kullanıcı İşlemi' },
};

function ActivityItemRow({ item, onNavigate }: { item: ActivityItem; onNavigate: (path: string) => void }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.user_action;
  const Icon = config.icon;

  const getPath = () => {
    if (item.entityType === 'task') return `/gorev/${item.entityId}`;
    if (item.entityType === 'fault') return `/ariza/${item.entityId}`;
    if (item.entityType === 'checklist') return `/checklistler`;
    return '#';
  };

  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: tr });

  return (
    <div 
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onNavigate(getPath())}
      data-testid={`activity-item-${item.id}`}
    >
      <div className={`shrink-0 mt-0.5 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          {item.userName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {item.userName}
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </div>
  );
}

export function RecentActivities({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();

  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activities/recent"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Son Aktiviteler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Son Aktiviteler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Henüz aktivite yok
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayActivities = compact ? activities.slice(0, 5) : activities;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Son Aktiviteler
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          <div className="space-y-1">
            {displayActivities.map((item) => (
              <ActivityItemRow 
                key={item.id} 
                item={item} 
                onNavigate={navigate}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
