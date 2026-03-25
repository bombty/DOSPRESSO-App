import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "muted";
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

const BADGE_CLASSES: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  muted: "bg-muted text-muted-foreground",
};

export function CollapsibleSection({
  title,
  icon,
  badge,
  badgeVariant = "info",
  defaultOpen = false,
  headerRight,
  children,
  className,
  "data-testid": testId,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn("border border-border/40 rounded-lg", className)}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover-elevate rounded-lg transition-colors"
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
          <span className="text-xs font-semibold truncate">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className={cn("text-[10px] h-5 no-default-hover-elevate no-default-active-elevate", BADGE_CLASSES[badgeVariant])}>
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerRight}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
