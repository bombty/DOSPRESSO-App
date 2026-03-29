import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sun, Moon, Cloud, Coffee, Target, ClipboardList, GraduationCap, Wrench, BarChart3, Settings, BookOpen, Users, Package, ShoppingCart, Bell, Calendar, Shield, Briefcase, Heart, Star, Zap, TrendingUp, FileText, MessageSquare, Award, CheckCircle2, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Target, ClipboardList, GraduationCap, Wrench, BarChart3, Settings, BookOpen, Users, Package, ShoppingCart, Bell, Calendar, Shield, Briefcase, Heart, Star, Zap, TrendingUp, FileText, MessageSquare, Award, CheckCircle2, Sun, Moon, Cloud, Coffee,
};

const URL_TO_COUNT_KEY: Record<string, string> = {
  '/gorevler': 'tasks',
  '/checklistler': 'checklists',
  '/ekipman/ariza': 'faults',
  '/akademi': 'training',
  '/raporlar': 'reports',
};

function getGreeting(): { text: string; icon: any } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Günaydın", icon: Sun };
  if (hour >= 12 && hour < 17) return { text: "İyi Günler", icon: Cloud };
  if (hour >= 17 && hour < 21) return { text: "İyi Akşamlar", icon: Coffee };
  return { text: "İyi Geceler", icon: Moon };
}

function formatDate(): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'long' };
  return new Date().toLocaleDateString('tr-TR', options);
}

export function UnifiedHero() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const firstName = user?.firstName || user?.username?.split(' ')[0] || 'Kullanıcı';

  const { data: widgets = [] } = useQuery<any[]>({
    queryKey: ["/api/dashboard-widgets"],
    enabled: !!user,
  });

  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/dashboard-widgets/counts"],
    enabled: !!user,
    refetchInterval: 60 * 1000,
  });

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--dospresso-navy))] via-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue)/0.8)] p-3 text-white"
      data-testid="unified-hero"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-card/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-0.5">
          <GreetingIcon className="w-4 h-4 text-yellow-300" />
          <span className="text-xs text-white/80">{greeting.text},</span>
          <span className="text-sm font-semibold truncate">{firstName}</span>
        </div>
        <p className="text-[11px] text-white/60 mb-2">{formatDate()}</p>
        
        {widgets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {widgets.map((widget: any) => {
              const IconComp = ICON_MAP[widget.icon] || Target;
              const countKey = URL_TO_COUNT_KEY[widget.url] || '';
              const count = countKey ? (counts[countKey] || 0) : 0;
              return (
                <button
                  key={widget.id}
                  onClick={() => widget.url && setLocation(widget.url)}
                  className="flex items-center gap-1.5 bg-card/10 hover:bg-card/20 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors"
                  data-testid={`hero-widget-${widget.id}`}
                >
                  <IconComp className="w-3.5 h-3.5 text-white/80" />
                  <span className="font-medium text-white">{widget.title}</span>
                  {count > 0 && (
                    <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-card/25 text-[10px] font-bold text-white px-1" data-testid={`hero-widget-count-${widget.id}`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
