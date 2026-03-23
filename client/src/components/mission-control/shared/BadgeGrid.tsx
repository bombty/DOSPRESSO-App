import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Lock } from "lucide-react";

export interface BadgeItem {
  id: number | string;
  name: string;
  description?: string;
  earned: boolean;
  iconColor?: string;
  earnedAt?: string;
}

export function BadgeGrid({ badges }: { badges: BadgeItem[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" data-testid="mc-badge-grid">
      {badges.map((b) => (
        <Tooltip key={b.id}>
          <TooltipTrigger asChild>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                b.earned
                  ? "bg-amber-100 dark:bg-amber-900/40"
                  : "bg-muted border border-dashed border-muted-foreground/30"
              }`}
              data-testid={`badge-${b.id}`}
            >
              {b.earned ? (
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[180px]">
            <p className="font-medium">{b.name}</p>
            {b.description && <p className="text-muted-foreground">{b.description}</p>}
            {b.earned && b.earnedAt && <p className="text-muted-foreground text-[10px]">{b.earnedAt}</p>}
            {!b.earned && <p className="text-muted-foreground">Henüz kazanılmadı</p>}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
