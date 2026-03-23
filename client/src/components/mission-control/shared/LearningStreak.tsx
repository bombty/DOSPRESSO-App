import { Flame } from "lucide-react";

interface WeekDay {
  label: string;
  done: boolean;
  isToday: boolean;
  missed?: boolean;
}

export function LearningStreak({
  currentStreak,
  longestStreak,
  weekDays,
}: {
  currentStreak: number;
  longestStreak: number;
  weekDays?: WeekDay[];
}) {
  const weekLabels = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
  const days: WeekDay[] =
    weekDays && weekDays.length > 0
      ? weekDays
      : (() => {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          return weekLabels.map((label, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + mondayOffset + i);
            const isToday = d.toDateString() === today.toDateString();
            const isPast = d < today && !isToday;
            return { label, done: isPast && i < currentStreak, isToday, missed: isPast && !isToday && i >= currentStreak };
          });
        })();

  const motivationText = (() => {
    if (currentStreak >= 7) return `${currentStreak} günlük seri — muhteşem!`;
    if (currentStreak >= 3) return `${5 - currentStreak} gün daha → 5 gün seri!`;
    if (currentStreak === 1) return "Harika başlangıç! Bugün de devam et!";
    return "Bugün yeni bir başlangıç yap!";
  })();

  return (
    <div data-testid="mc-learning-streak">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Flame className={`w-5 h-5 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          <span className="text-lg font-bold">{currentStreak} gün</span>
        </div>
        <span className="text-[10px] text-muted-foreground">En uzun: {longestStreak} gün</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-medium ${
                day.done
                  ? "bg-emerald-500 text-white"
                  : day.isToday
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : day.missed
                  ? "bg-red-500/10 text-red-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {day.done ? "✓" : day.missed ? "✗" : day.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-center mt-2 text-muted-foreground">{motivationText}</p>
    </div>
  );
}
