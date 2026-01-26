import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: "default" | "gradient" | "glass";
  color?: "navy" | "blue" | "red" | "green" | "purple" | "amber";
  delay?: number;
  onClick?: () => void;
}

const colorClasses = {
  navy: "from-[hsl(var(--dospresso-navy))] to-[hsl(var(--dospresso-navy-light))]",
  blue: "from-[hsl(var(--dospresso-blue))] to-[hsl(var(--dospresso-blue-light))]",
  red: "from-[hsl(var(--dospresso-red))] to-[hsl(var(--dospresso-red-light))]",
  green: "from-emerald-500 to-emerald-400",
  purple: "from-violet-500 to-violet-400",
  amber: "from-amber-500 to-amber-400",
};

const iconBgClasses = {
  navy: "bg-[hsl(var(--dospresso-navy)/0.15)]",
  blue: "bg-[hsl(var(--dospresso-blue)/0.15)]",
  red: "bg-[hsl(var(--dospresso-red)/0.15)]",
  green: "bg-emerald-100 dark:bg-emerald-900/30",
  purple: "bg-violet-100 dark:bg-violet-900/30",
  amber: "bg-amber-100 dark:bg-amber-900/30",
};

const iconColorClasses = {
  navy: "text-[hsl(var(--dospresso-navy))]",
  blue: "text-[hsl(var(--dospresso-blue))]",
  red: "text-[hsl(var(--dospresso-red))]",
  green: "text-emerald-600 dark:text-emerald-400",
  purple: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
};

export function ModernStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  color = "blue",
  delay = 0,
  onClick,
}: ModernStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300",
        variant === "gradient" && `bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`,
        variant === "glass" && "glass-card",
        variant === "default" && "bg-card border border-card-border shadow-card hover:shadow-card-hover"
      )}
    >
      {/* Top accent line for default variant */}
      {variant === "default" && (
        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", colorClasses[color])} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-medium mb-1 truncate",
            variant === "gradient" ? "text-white/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <motion.p
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.1 }}
            className={cn(
              "text-2xl font-bold tracking-tight",
              variant === "gradient" ? "text-white" : "text-foreground"
            )}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className={cn(
              "text-xs mt-1",
              variant === "gradient" ? "text-white/70" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.positive 
                ? variant === "gradient" ? "text-emerald-200" : "text-emerald-600 dark:text-emerald-400"
                : variant === "gradient" ? "text-red-200" : "text-red-600 dark:text-red-400"
            )}>
              <span>{trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              <span className={variant === "gradient" ? "text-white/60" : "text-muted-foreground"}>
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn(
            "flex-shrink-0 p-2.5 rounded-xl",
            variant === "gradient" 
              ? "bg-white/20" 
              : iconBgClasses[color]
          )}>
            <Icon className={cn(
              "h-5 w-5",
              variant === "gradient" ? "text-white" : iconColorClasses[color]
            )} />
          </div>
        )}
      </div>

      {/* Decorative gradient circle */}
      {variant === "gradient" && (
        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl" />
      )}
    </motion.div>
  );
}
