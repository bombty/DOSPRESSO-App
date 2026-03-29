import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";
import { Badge } from "./badge";

interface ModernModuleCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  badge?: number;
  color?: string;
  onClick?: () => void;
  delay?: number;
  variant?: "compact" | "expanded";
}

export function ModernModuleCard({
  icon: Icon,
  label,
  description,
  badge,
  color = "bg-primary",
  onClick,
  delay = 0,
  variant = "compact",
}: ModernModuleCardProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-card-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group overflow-hidden"
      >
        {/* Gradient accent on hover */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300",
          color
        )} />
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-[10px] p-0">
              {badge > 99 ? "99+" : badge}
            </Badge>
          </div>
        )}
        
        {/* Icon */}
        <div className={cn(
          "p-3 rounded-xl mb-2 transition-all duration-300 group-hover:scale-110",
          color.includes("bg-") ? color : `bg-${color}`,
          "bg-opacity-90"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        {/* Label */}
        <span className="text-xs font-semibold text-center text-foreground line-clamp-2 leading-tight">
          {label}
        </span>
      </motion.div>
    );
  }

  // Expanded variant
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex items-center gap-3 p-4 rounded-2xl bg-card border border-card-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 p-3 rounded-xl transition-all duration-300",
        color.includes("bg-") ? color : `bg-${color}`,
        "bg-opacity-90"
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {badge > 99 ? "99+" : badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      
      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
    </motion.div>
  );
}

interface ModernMegaModuleCardProps {
  icon: LucideIcon;
  title: string;
  color: string;
  itemCount: number;
  onClick?: () => void;
  delay?: number;
}

export function ModernMegaModuleCard({
  icon: Icon,
  title,
  color,
  itemCount,
  onClick,
  delay = 0,
}: ModernMegaModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-card border border-card-border shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      {/* Gradient header */}
      <div className={cn(
        "p-4 bg-gradient-to-br",
        color.includes("from-") ? color : `from-${color.replace('bg-', '')} to-${color.replace('bg-', '')}/80`
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-card/20 backdrop-blur-sm">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-white/70 text-sm">{itemCount} modül</p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-card/10 rounded-full blur-2xl" />
      </div>
      
      {/* Footer with arrow */}
      <div className="p-3 flex items-center justify-between bg-card">
        <span className="text-xs text-muted-foreground">Görüntüle</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </motion.div>
  );
}
