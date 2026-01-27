import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sun, Moon, Cloud, Coffee, Target, Zap, TrendingUp, ClipboardList } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";

function getGreeting(): { text: string; icon: any } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Günaydın", icon: Sun };
  if (hour >= 12 && hour < 17) return { text: "İyi Günler", icon: Cloud };
  if (hour >= 17 && hour < 21) return { text: "İyi Akşamlar", icon: Coffee };
  return { text: "İyi Geceler", icon: Moon };
}

function formatDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  };
  return new Date().toLocaleDateString('tr-TR', options);
}

export function UnifiedHero() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  
  const firstName = user?.firstName || user?.username?.split(' ')[0] || 'Kullanıcı';

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
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--dospresso-navy))] via-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue)/0.8)] p-4 text-white"
      data-testid="unified-hero"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Left: Greeting and info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <GreetingIcon className="w-5 h-5 text-yellow-300" />
            </motion.div>
            <span className="text-sm font-medium text-white/80">{greeting.text}</span>
          </div>
          
          <h1 className="text-xl font-bold truncate">{firstName}</h1>
          <p className="text-xs text-white/70 mt-0.5">{formatDate()}</p>
          
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-medium">
            <Coffee className="w-3 h-3" />
            DOSPRESSO
          </div>
        </div>

        {/* Right: Progress Ring with stats - Clickable */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation("/gorevler")}
            className="relative cursor-pointer"
            data-testid="hero-progress-ring"
            title="Günlük İlerleme - Tıkla detay gör"
          >
            <ProgressRing 
              progress={overallProgress} 
              size={64} 
              strokeWidth={6}
              showPercentage
              className="text-white"
            />
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-white/70 whitespace-nowrap">
              İlerleme
            </span>
          </motion.button>
          
          <div className="space-y-1.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/gorevler")}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 rounded-md px-1 py-0.5 transition-colors"
              data-testid="hero-tasks-metric"
              title="Görevler - Tıkla detay gör"
            >
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
              <div className="text-left">
                <span className="text-xs font-medium">{completedTasks}/{totalTasks}</span>
                <span className="text-[8px] text-white/60 ml-1">Görev</span>
              </div>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/checklistler")}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 rounded-md px-1 py-0.5 transition-colors"
              data-testid="hero-checklist-metric"
              title="Checklistler - Tıkla detay gör"
            >
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                <ClipboardList className="w-3 h-3 text-white" />
              </div>
              <div className="text-left">
                <span className="text-xs font-medium">{completedChecklists}/{totalChecklists}</span>
                <span className="text-[8px] text-white/60 ml-1">Checklist</span>
              </div>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/raporlar?tab=performans")}
              className="flex items-center gap-1 text-emerald-300 cursor-pointer hover:bg-white/10 rounded-md px-1 py-0.5 transition-colors"
              data-testid="hero-trend-metric"
              title="Performans Trendi - Tıkla detay gör"
            >
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] font-medium">+8%</span>
              <span className="text-[8px] text-white/60 ml-0.5">Trend</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
