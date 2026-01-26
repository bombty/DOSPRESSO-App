import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ProgressRing } from "@/components/ui/progress-ring";
import { TrendingUp, Award, Target, Zap } from "lucide-react";

export function ProgressOverview() {
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: !!user,
  });

  const { data: checklists = [] } = useQuery<any[]>({
    queryKey: ["/api/checklists/my-assignments"],
    enabled: !!user,
  });

  const totalTasks = tasks.length || 1;
  const completedTasks = tasks.filter((t: any) => t.status === "tamamlandi").length;
  const taskProgress = Math.round((completedTasks / totalTasks) * 100);

  const totalChecklists = checklists.length || 1;
  const completedChecklists = checklists.filter((c: any) => c.isCompleted).length;
  const checklistProgress = Math.round((completedChecklists / totalChecklists) * 100);

  const overallProgress = Math.round((taskProgress + checklistProgress) / 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border bg-card p-4"
      data-testid="progress-overview"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Günlük İlerleme</h3>
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-medium">+8%</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Main progress ring */}
        <div className="relative">
          <ProgressRing 
            progress={overallProgress} 
            size={80} 
            strokeWidth={8}
            showPercentage
          />
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground">Görevler</span>
            </div>
            <span className="text-sm font-semibold">{completedTasks}/{totalTasks}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-muted-foreground">Checklistler</span>
            </div>
            <span className="text-sm font-semibold">{completedChecklists}/{totalChecklists}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-muted-foreground">Puan</span>
            </div>
            <span className="text-sm font-semibold">85</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
