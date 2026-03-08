import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export interface FlowTask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  navigateTo?: string;
  type?: string;
  completed: boolean;
}

interface DobodyFlowContextValue {
  flowTasks: FlowTask[];
  activeTaskIndex: number;
  isFlowActive: boolean;
  isMinimized: boolean;
  isDismissed: boolean;
  completedToday: number;
  streak: number;
  score: number;
  greeting: string;
  personalMessage: string;
  setFlowData: (data: {
    tasks: FlowTask[];
    completedToday?: number;
    streak?: number;
    score?: number;
    greeting?: string;
    personalMessage?: string;
  }) => void;
  startFlow: () => void;
  completeCurrentTask: () => void;
  dismissFlow: () => void;
  minimizeBar: () => void;
  expandBar: () => void;
  setUserId: (id: string | number) => void;
}

const DobodyFlowContext = createContext<DobodyFlowContextValue | null>(null);

function getTodayStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDismissKey(userId: string | number): string {
  return `dobody_flow_dismissed_${userId}_${getTodayStr()}`;
}

function isDismissedForUser(userId: string | number): boolean {
  if (typeof window === "undefined" || !userId) return false;
  return localStorage.getItem(getDismissKey(userId)) === "true";
}

export function DobodyFlowProvider({ children }: { children: ReactNode }) {
  const [flowTasks, setFlowTasks] = useState<FlowTask[]>([]);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [isFlowActive, setIsFlowActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const currentUserIdRef = useRef<string | number>("");

  const setUserId = useCallback((id: string | number) => {
    currentUserIdRef.current = id;
    setIsDismissed(isDismissedForUser(id));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const uid = currentUserIdRef.current;
      if (uid) {
        const dismissed = isDismissedForUser(uid);
        setIsDismissed((prev) => {
          if (prev && !dismissed) return false;
          return prev;
        });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const setFlowData = useCallback((data: {
    tasks: FlowTask[];
    completedToday?: number;
    streak?: number;
    score?: number;
    greeting?: string;
    personalMessage?: string;
  }) => {
    setFlowTasks(data.tasks);
    if (data.completedToday !== undefined) setCompletedToday(data.completedToday);
    if (data.streak !== undefined) setStreak(data.streak);
    if (data.score !== undefined) setScore(data.score);
    if (data.greeting !== undefined) setGreeting(data.greeting);
    if (data.personalMessage !== undefined) setPersonalMessage(data.personalMessage);
  }, []);

  const startFlow = useCallback(() => {
    setIsFlowActive(true);
    setIsMinimized(false);
    setActiveTaskIndex(0);
  }, []);

  const completeCurrentTask = useCallback(() => {
    setFlowTasks((prev) => {
      const updated = [...prev];
      if (updated[activeTaskIndex]) {
        updated[activeTaskIndex] = { ...updated[activeTaskIndex], completed: true };
      }
      return updated;
    });
    setCompletedToday((prev) => prev + 1);

    setActiveTaskIndex((prev) => {
      const nextIndex = prev + 1;
      return nextIndex;
    });
  }, [activeTaskIndex]);

  const dismissFlow = useCallback(() => {
    setIsDismissed(true);
    setIsFlowActive(false);
    setIsMinimized(false);
    if (typeof window !== "undefined" && currentUserIdRef.current) {
      localStorage.setItem(getDismissKey(currentUserIdRef.current), "true");
    }
  }, []);

  const minimizeBar = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const expandBar = useCallback(() => {
    setIsMinimized(false);
  }, []);

  return (
    <DobodyFlowContext.Provider
      value={{
        flowTasks,
        activeTaskIndex,
        isFlowActive,
        isMinimized,
        isDismissed,
        completedToday,
        streak,
        score,
        greeting,
        personalMessage,
        setFlowData,
        startFlow,
        completeCurrentTask,
        dismissFlow,
        minimizeBar,
        expandBar,
        setUserId,
      }}
    >
      {children}
    </DobodyFlowContext.Provider>
  );
}

export function useDobodyFlow() {
  const context = useContext(DobodyFlowContext);
  if (!context) {
    throw new Error("useDobodyFlow must be used within a DobodyFlowProvider");
  }
  return context;
}
