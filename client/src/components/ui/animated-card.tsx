import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
  duration?: number;
  hover?: boolean;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, delay = 0, duration = 0.4, hover = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration, 
          delay,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        whileHover={hover ? { 
          y: -4, 
          transition: { duration: 0.2 } 
        } : undefined}
        className={cn(
          "rounded-2xl border bg-card border-card-border text-card-foreground shadow-card transition-shadow duration-300",
          hover && "hover:shadow-card-hover",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";

const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
AnimatedCardContent.displayName = "AnimatedCardContent";

export { AnimatedCard, AnimatedCardContent };
