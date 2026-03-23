import { useMemo } from "react";

export interface ShiftEntry {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  actualStart?: number;
  breakStart?: number;
  breakEnd?: number;
  status: "active" | "late" | "done" | "break" | "absent";
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  late: "bg-amber-500",
  done: "bg-gray-400",
  break: "bg-violet-500",
  absent: "bg-red-500",
};

const TIMELINE_START = 7;
const TIMELINE_END = 21;
const TOTAL_HOURS = TIMELINE_END - TIMELINE_START;

export function ShiftTimeline({ shifts }: { shifts: ShiftEntry[] }) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const nowPct = Math.max(0, Math.min(100, ((currentHour - TIMELINE_START) / TOTAL_HOURS) * 100));

  const hours = useMemo(() => {
    const arr = [];
    for (let h = TIMELINE_START; h <= TIMELINE_END; h += 2) arr.push(h);
    return arr;
  }, []);

  if (shifts.length === 0) return null;

  return (
    <div className="space-y-1" data-testid="mc-shift-timeline">
      <div className="flex items-center">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 flex items-center justify-between relative">
          {hours.map((h) => (
            <span key={h} className="text-[8px] text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>
      </div>

      {shifts.map((s) => {
        const leftPct = ((Math.max(s.actualStart ?? s.startHour, TIMELINE_START) - TIMELINE_START) / TOTAL_HOURS) * 100;
        const widthPct = ((Math.min(s.endHour, TIMELINE_END) - Math.max(s.actualStart ?? s.startHour, TIMELINE_START)) / TOTAL_HOURS) * 100;

        return (
          <div key={s.id} className="flex items-center h-5" data-testid={`shift-row-${s.id}`}>
            <div className="w-14 flex-shrink-0 text-[9px] font-medium truncate pr-1">{s.name.split(" ")[0]}</div>
            <div className="flex-1 relative h-4 rounded bg-muted/30">
              <div
                className={`absolute h-full rounded ${STATUS_COLORS[s.status]}`}
                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
              />
              {s.breakStart != null && s.breakEnd != null && (
                <div
                  className="absolute h-full rounded bg-violet-500"
                  style={{
                    left: `${((s.breakStart - TIMELINE_START) / TOTAL_HOURS) * 100}%`,
                    width: `${((s.breakEnd - s.breakStart) / TOTAL_HOURS) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 relative h-0">
          {currentHour >= TIMELINE_START && currentHour <= TIMELINE_END && (
            <div
              className="absolute top-[-4px] w-px h-[calc(100%+8px)] border-l border-dashed border-primary/60"
              style={{ left: `${nowPct}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
