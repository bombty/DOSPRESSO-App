import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PresenceMember {
  id: string;
  name: string;
  role: string;
  status: "active" | "late" | "break" | "absent" | "leave";
  shiftLabel?: string;
  avatarUrl?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "border-emerald-500",
  late: "border-amber-500",
  break: "border-violet-500",
  absent: "border-red-500",
  leave: "border-gray-400 border-dashed",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  late: "Geç",
  break: "Molada",
  absent: "Gelmedi",
  leave: "İzinli",
};

const LEGEND = [
  { key: "active", color: "bg-emerald-500", label: "Aktif" },
  { key: "late", color: "bg-amber-500", label: "Geç" },
  { key: "break", color: "bg-violet-500", label: "Molada" },
  { key: "absent", color: "bg-red-500", label: "Gelmedi" },
  { key: "leave", color: "bg-gray-400", label: "İzinli" },
];

export function PresenceBar({ members, maxVisible = 10 }: { members: PresenceMember[]; maxVisible?: number }) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  return (
    <div data-testid="mc-presence-bar">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {visible.map((m) => {
          const initials = m.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 bg-muted ${STATUS_COLORS[m.status] || "border-gray-300"}`}
                  data-testid={`presence-${m.id}`}
                >
                  {initials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{m.name}</p>
                <p className="text-muted-foreground">{m.role} · {STATUS_LABELS[m.status]}</p>
                {m.shiftLabel && <p className="text-muted-foreground">{m.shiftLabel}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground flex-shrink-0 border-2 border-muted-foreground/20">
            +{overflow}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {LEGEND.map((l) => (
          <div key={l.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[9px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
