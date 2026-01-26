import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "navy" | "blue" | "red" | "green" | "purple" | "amber";
  showPercentage?: boolean;
  label?: string;
  className?: string;
  delay?: number;
}

const colorClasses = {
  navy: "stroke-[hsl(var(--dospresso-navy))]",
  blue: "stroke-[hsl(var(--dospresso-blue))]",
  red: "stroke-[hsl(var(--dospresso-red))]",
  green: "stroke-emerald-500",
  purple: "stroke-violet-500",
  amber: "stroke-amber-500",
};

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = "blue",
  showPercentage = true,
  label,
  className,
  delay = 0,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="progress-ring">
        {/* Background circle */}
        <circle
          className="stroke-muted"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className={cn("progress-ring-circle", colorClasses[color])}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.5 }}
            className="text-lg font-bold text-foreground"
          >
            {Math.round(progress)}%
          </motion.span>
        )}
        {label && (
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
