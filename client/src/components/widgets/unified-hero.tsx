import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sun, Moon, Cloud, Coffee, Target, ClipboardList } from "lucide-react";
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
  const totalChecklists = checklists.length || 1;
  const completedChecklists = checklists.filter((c: any) => c.isCompleted).length;
  const overallProgress = Math.round(((completedTasks / totalTasks) + (completedChecklists / totalChecklists)) / 2 * 100);

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--dospresso-navy))] via-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue)/0.8)] p-3 text-white"
      data-testid="unified-hero"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <GreetingIcon className="w-4 h-4 text-yellow-300" />
            <span className="text-xs text-white/80">{greeting.text},</span>
            <span className="text-sm font-semibold truncate">{firstName}</span>
          </div>
          <p className="text-[11px] text-white/60">{formatDate()}</p>
          
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setLocation("/gorevler")}
              className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white transition-colors"
              data-testid="hero-tasks-metric"
            >
              <Target className="w-3 h-3" />
              <span className="font-medium">{completedTasks}/{totalTasks}</span>
              <span className="text-white/60">görev</span>
            </button>
            <button
              onClick={() => setLocation("/checklistler")}
              className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white transition-colors"
              data-testid="hero-checklist-metric"
            >
              <ClipboardList className="w-3 h-3" />
              <span className="font-medium">{completedChecklists}/{totalChecklists}</span>
              <span className="text-white/60">checklist</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setLocation("/gorevler")}
          className="relative cursor-pointer shrink-0"
          data-testid="hero-progress-ring"
          title="Günlük İlerleme"
        >
          <ProgressRing 
            progress={overallProgress} 
            size={52} 
            strokeWidth={5}
            showPercentage
            className="text-white"
          />
        </button>
      </div>
    </div>
  );
}
