import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sun, Moon, Cloud, Coffee, Brain, Target, Zap, TrendingUp, ClipboardList, X, CheckCircle, AlertCircle } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [showAIReport, setShowAIReport] = useState(false);
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
  const pendingTasks = tasks.filter((t: any) => t.status === "beklemede" || t.status === "devam_ediyor").length;
  const taskProgress = Math.round((completedTasks / totalTasks) * 100);

  const totalChecklists = checklists.length || 1;
  const completedChecklists = checklists.filter((c: any) => c.isCompleted).length;
  const checklistProgress = Math.round((completedChecklists / totalChecklists) * 100);

  const overallProgress = Math.round((taskProgress + checklistProgress) / 2);

  return (
    <>
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
            
            <p className="text-xs text-white/70 mt-0.5">{formatDate()}</p>
            
            <div 
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-medium cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setShowAIReport(true)}
              data-testid="hero-ai-report"
            >
              <Brain className="w-3 h-3" />
              <span>AI Rapor</span>
              <span className="text-white/70">|</span>
              <span>{overallProgress}%</span>
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
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/70 whitespace-nowrap">
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
                  <span className="text-sm font-medium">{completedTasks}/{totalTasks}</span>
                  <span className="text-[10px] text-white/70 ml-1">Görev</span>
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
                  <span className="text-sm font-medium">{completedChecklists}/{totalChecklists}</span>
                  <span className="text-[10px] text-white/70 ml-1">Checklist</span>
                </div>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation("/raporlar/performans")}
                className="flex items-center gap-1 text-emerald-300 cursor-pointer hover:bg-white/10 rounded-md px-1 py-0.5 transition-colors"
                data-testid="hero-trend-metric"
                title="Performans Trendi - Tıkla detay gör"
              >
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">+8%</span>
                <span className="text-[10px] text-white/70 ml-0.5">Trend</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Report Popup Dialog */}
      <Dialog open={showAIReport} onOpenChange={setShowAIReport}>
        <DialogContent className="max-w-md" data-testid="dialog-ai-report">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Günlük AI Özet Rapor
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10">
              <div className="text-3xl font-bold text-primary">{overallProgress}%</div>
              <p className="text-sm text-muted-foreground">Genel İlerleme</p>
            </div>

            {/* Task Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Görevler
                </span>
                <Badge variant={taskProgress >= 80 ? "default" : taskProgress >= 50 ? "secondary" : "destructive"}>
                  {taskProgress}%
                </Badge>
              </div>
              <Progress value={taskProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedTasks} tamamlandı</span>
                <span>{pendingTasks} bekliyor</span>
              </div>
            </div>

            {/* Checklist Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-green-500" />
                  Checklistler
                </span>
                <Badge variant={checklistProgress >= 80 ? "default" : checklistProgress >= 50 ? "secondary" : "destructive"}>
                  {checklistProgress}%
                </Badge>
              </div>
              <Progress value={checklistProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedChecklists} tamamlandı</span>
                <span>{totalChecklists - completedChecklists} kalan</span>
              </div>
            </div>

            {/* Status Summary */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Durum Özeti</p>
              <div className="flex items-center gap-2 text-sm">
                {overallProgress >= 80 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Harika gidiyorsun! Hedeflerin büyük çoğunluğu tamamlandı.</span>
                  </>
                ) : overallProgress >= 50 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600">İyi ilerliyorsun, biraz daha çaba ile hedefe ulaşabilirsin!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">Dikkat! Bekleyen görevlerin var, önceliklendirme yap.</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => { setShowAIReport(false); setLocation("/gorevler"); }}
                data-testid="btn-goto-tasks"
              >
                Görevlere Git
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowAIReport(false); setLocation("/raporlar/ai-asistan"); }}
                data-testid="btn-goto-ai-assistant"
              >
                AI Asistan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
