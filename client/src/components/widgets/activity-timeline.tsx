import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  Award,
  Clock,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Activity {
  id: number;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  icon: any;
  color: string;
}

const iconMap: Record<string, { icon: any; color: string }> = {
  task_completed: { icon: CheckCircle, color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40" },
  fault_reported: { icon: AlertTriangle, color: "text-amber-500 bg-amber-100 dark:bg-amber-900/40" },
  comment: { icon: MessageSquare, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/40" },
  badge_earned: { icon: Award, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/40" },
  shift_started: { icon: Clock, color: "text-cyan-500 bg-cyan-100 dark:bg-cyan-900/40" },
  default: { icon: User, color: "text-gray-500 bg-gray-100 dark:bg-gray-900/40" }
};

export function ActivityTimeline() {
  const { user } = useAuth();

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["/api/activities/recent"],
    enabled: !!user,
  });

  const recentActivities = activities.slice(0, 5);

  if (recentActivities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border bg-card p-4"
      >
        <h3 className="text-sm font-semibold mb-3">Son Aktiviteler</h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border bg-card p-4"
      data-testid="activity-timeline"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Son Aktiviteler</h3>
        <span className="text-xs text-muted-foreground">Son 24 saat</span>
      </div>

      <div className="space-y-3">
        {recentActivities.map((activity: any, index: number) => {
          const typeConfig = iconMap[activity.type] || iconMap.default;
          const Icon = typeConfig.icon;
          
          return (
            <motion.div
              key={activity.id || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <div className={`w-8 h-8 rounded-xl ${typeConfig.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {activity.createdAt && formatDistanceToNow(new Date(activity.createdAt), { 
                    addSuffix: true, 
                    locale: tr 
                  })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
