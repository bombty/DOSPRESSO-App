import { CheckCircle2, Circle, Lock, Star } from "lucide-react";

const CAREER_PATH = [
  { role: "stajyer", label: "Stajyer" },
  { role: "bar_buddy", label: "Bar Buddy" },
  { role: "barista", label: "Barista" },
  { role: "supervisor_buddy", label: "Sup. Buddy" },
  { role: "supervisor", label: "Supervisor" },
];

export function CareerRoadmap({ currentRole }: { currentRole: string }) {
  const currentIndex = CAREER_PATH.findIndex((p) => p.role === currentRole);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="flex items-center justify-between gap-0.5" data-testid="mc-career-roadmap">
      {CAREER_PATH.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isCurrent = i === activeIndex;
        const isFuture = i > activeIndex;

        return (
          <div key={step.role} className="flex flex-col items-center gap-1 flex-1 min-w-0 relative">
            {i > 0 && (
              <div
                className={`absolute top-3.5 -left-1/2 w-full h-0.5 ${isCompleted ? "bg-emerald-500" : "bg-muted"}`}
                style={{ zIndex: 0 }}
              />
            )}
            <div
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isCurrent ? (
                <Star className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </div>
            <span
              className={`text-[9px] text-center leading-tight ${
                isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
