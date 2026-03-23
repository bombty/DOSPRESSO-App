import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status?: string;
  score?: number;
  trend?: number;
  shiftLabel?: string;
  stationName?: string;
  avatarUrl?: string;
}

const ROLE_LABELS: Record<string, string> = {
  barista: "Barista",
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  supervisor: "Supervisor",
  supervisor_buddy: "Sup. Buddy",
  mudur: "Müdür",
  fabrika_mudur: "Fab. Müdür",
  fabrika_operator: "Operatör",
  fabrika_sorumlu: "Sorumlu",
  fabrika_personel: "Personel",
  fabrika_pisman: "Pişman",
  fabrika_depo: "Depo",
  fabrika_kalite: "Kalite",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function StaffCard({ member }: { member: StaffMember }) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusColors: Record<string, string> = {
    active: "ring-emerald-500",
    late: "ring-amber-500",
    break: "ring-violet-500",
    absent: "ring-red-500",
    leave: "ring-gray-400",
  };

  return (
    <div
      className="flex flex-col items-center p-2 rounded-lg bg-muted/30 min-w-[72px]"
      data-testid={`staff-card-${member.id}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 ring-[2.5px] ${statusColors[member.status || ""] || "ring-transparent"}`}
      >
        {initials}
      </div>
      <p className="text-[10px] font-bold mt-1 text-center truncate w-full">{member.name.split(" ")[0]}</p>
      <p className="text-[8px] text-muted-foreground">{ROLE_LABELS[member.role] || member.role}</p>
      {member.shiftLabel && (
        <p className="text-[8px] text-muted-foreground">{member.shiftLabel}</p>
      )}
      {member.stationName && (
        <p className="text-[8px] text-muted-foreground truncate w-full text-center">{member.stationName}</p>
      )}
      {member.score != null && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <span className={`text-sm font-bold ${getScoreColor(member.score)}`}>{member.score}</span>
          {member.trend != null && member.trend !== 0 && (
            <span className={`text-[8px] flex items-center ${member.trend > 0 ? "text-emerald-500" : "text-red-500"}`}>
              {member.trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {member.trend > 0 ? `+${member.trend}` : member.trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
