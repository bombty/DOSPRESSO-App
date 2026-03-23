import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, CheckCircle2, BookOpen, AlertCircle } from "lucide-react";

export interface ModuleInfo {
  id: number | string;
  name: string;
  progress: number;
  status: "completed" | "active" | "required" | "locked";
  iconColor?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Tamamlandı", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  active: { label: "Aktif", className: "bg-primary/10 text-primary", icon: BookOpen },
  required: { label: "Zorunlu", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
  locked: { label: "Kilitli", className: "bg-muted text-muted-foreground", icon: GraduationCap },
};

export function ModuleCard({ module }: { module: ModuleInfo }) {
  const config = STATUS_CONFIG[module.status] || STATUS_CONFIG.locked;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 ${module.status === "locked" ? "opacity-60" : ""}`}
      data-testid={`module-card-${module.id}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: module.iconColor ? `${module.iconColor}20` : undefined }}
      >
        <Icon className="w-5 h-5" style={{ color: module.iconColor || undefined }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-xs font-medium truncate">{module.name}</p>
          <Badge className={`text-[8px] h-4 px-1.5 border-0 ${config.className}`}>{config.label}</Badge>
        </div>
        <Progress value={module.progress} className="h-1.5" />
      </div>
    </div>
  );
}
