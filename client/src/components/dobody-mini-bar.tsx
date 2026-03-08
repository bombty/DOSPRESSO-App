import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useDobodyFlow } from "@/contexts/dobody-flow-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronUp, ChevronDown, X, Bot, ArrowRight } from "lucide-react";

export function DobodyMiniBar() {
  const {
    flowTasks,
    activeTaskIndex,
    isFlowActive,
    isMinimized,
    completeCurrentTask,
    minimizeBar,
    expandBar,
    dismissFlow,
  } = useDobodyFlow();

  const [, setLocation] = useLocation();
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [allDoneVisible, setAllDoneVisible] = useState(false);

  const totalTasks = flowTasks.length;
  const completedCount = flowTasks.filter((t) => t.completed).length;
  const allComplete = totalTasks > 0 && completedCount >= totalTasks;
  const currentTask = flowTasks[activeTaskIndex];

  useEffect(() => {
    if (allComplete && isFlowActive) {
      setAllDoneVisible(true);
      const timer = setTimeout(() => {
        setAllDoneVisible(false);
        dismissFlow();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, isFlowActive, dismissFlow]);

  const handleComplete = useCallback(() => {
    const nextIndex = activeTaskIndex + 1;
    const nextTask = flowTasks[nextIndex];

    completeCurrentTask();

    if (nextTask) {
      setTransitionMessage(`Harika! Sıradaki: ${nextTask.title}`);
      const timer = setTimeout(() => {
        setTransitionMessage(null);
        if (nextTask.navigateTo) {
          setLocation(nextTask.navigateTo);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTaskIndex, flowTasks, completeCurrentTask, setLocation]);

  const handleBarClick = useCallback(() => {
    if (currentTask?.navigateTo) {
      setLocation(currentTask.navigateTo);
    }
  }, [currentTask, setLocation]);

  if (!isFlowActive || totalTasks === 0) return null;

  if (allComplete && allDoneVisible) {
    return (
      <div
        className="fixed left-0 right-0 z-50 px-3 transition-all duration-300"
        style={{ bottom: "calc(70px + max(0px, env(safe-area-inset-bottom, 0px)))" }}
        data-testid="dobody-mini-bar-complete"
      >
        <div className="mx-auto max-w-lg rounded-md bg-green-600 dark:bg-green-700 text-white px-4 py-3 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium" data-testid="text-flow-complete">
              Bugünlük tamamladın!
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white no-default-hover-elevate"
            onClick={() => {
              setAllDoneVisible(false);
              dismissFlow();
            }}
            data-testid="button-flow-dismiss-complete"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div
        className="fixed z-50 transition-all duration-300"
        style={{
          right: "16px",
          bottom: "calc(80px + max(0px, env(safe-area-inset-bottom, 0px)))",
        }}
        data-testid="dobody-mini-bar-minimized"
      >
        <button
          onClick={expandBar}
          className="relative flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover-elevate active-elevate-2"
          data-testid="button-flow-expand"
        >
          <Bot className="h-5 w-5" />
          {totalTasks - completedCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1">
              {totalTasks - completedCount}
            </Badge>
          )}
        </button>
      </div>
    );
  }

  if (transitionMessage) {
    return (
      <div
        className="fixed left-0 right-0 z-50 px-3 transition-all duration-300"
        style={{ bottom: "calc(70px + max(0px, env(safe-area-inset-bottom, 0px)))" }}
        data-testid="dobody-mini-bar-transition"
      >
        <div className="mx-auto max-w-lg rounded-md bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2 shadow-lg">
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate" data-testid="text-flow-transition">
            {transitionMessage}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 z-50 px-3 transition-all duration-300"
      style={{ bottom: "calc(70px + max(0px, env(safe-area-inset-bottom, 0px)))" }}
      data-testid="dobody-mini-bar"
    >
      <div className="mx-auto max-w-lg rounded-md bg-card border shadow-lg px-3 py-2 flex items-center gap-2">
        <button
          onClick={handleBarClick}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
          data-testid="button-flow-navigate"
        >
          <Bot className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
            {activeTaskIndex + 1}/{totalTasks}
          </span>
          <span className="text-sm truncate" data-testid="text-current-task">
            {currentTask?.title}
          </span>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleComplete}
            data-testid="button-flow-complete-task"
          >
            <Check className="h-3 w-3 mr-1" />
            Tamamlandı
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={minimizeBar}
            data-testid="button-flow-minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
