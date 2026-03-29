import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  greeting?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  greeting,
  children,
  className,
  compact = false,
}: HeroSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl hero-gradient text-white",
        compact ? "p-4" : "p-6",
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-card/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(var(--dospresso-blue)/0.3)] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
      
      <div className="relative z-10">
        {greeting && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-white/80 text-sm mb-1"
          >
            {greeting}
          </motion.p>
        )}
        
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={cn(
            "font-bold",
            compact ? "text-xl" : "text-2xl"
          )}
        >
          {title}
        </motion.h1>
        
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-white/70 text-sm mt-1"
          >
            {subtitle}
          </motion.p>
        )}
        
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-4"
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
