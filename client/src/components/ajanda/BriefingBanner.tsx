import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface BriefingData {
  todayTodos: { total: number; overdue: number; highPriority: number };
  todayEvents: Array<{ id: number; title: string; startTime: string; type: string; location: string | null }>;
  openTickets: { total: number; slaNearing: number };
  pendingApprovals: number;
}

export default function BriefingBanner() {
  const hour = new Date().getHours();
  const showBriefing = hour >= 6 && hour <= 22;

  const { data: briefing, isLoading } = useQuery<BriefingData>({
    queryKey: ["/api/ajanda/briefing"],
    queryFn: async () => {
      const res = await fetch("/api/ajanda/briefing");
      if (!res.ok) throw new Error("Briefing fetch failed");
      return res.json();
    },
    enabled: showBriefing,
    refetchInterval: 5 * 60 * 1000,
  });

  if (!showBriefing || isLoading || !briefing) return null;

  const { todayTodos, todayEvents, openTickets } = briefing;
  const hasContent = todayTodos.total > 0 || todayTodos.overdue > 0 || todayEvents.length > 0 || openTickets.total > 0;

  if (!hasContent) return null;

  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  const summaryParts: string[] = [];
  if (todayEvents.length > 0) summaryParts.push(`${todayEvents.length} etkinlik`);
  if (todayTodos.total > 0) summaryParts.push(`${todayTodos.total} yapılacak`);
  if (todayTodos.overdue > 0) summaryParts.push(`${todayTodos.overdue} gecikmiş`);
  if (openTickets.slaNearing > 0) summaryParts.push(`${openTickets.slaNearing} SLA riski`);

  return (
    <Card className="p-4 bg-primary/5 border-primary/20" data-testid="briefing-banner">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {greeting}! Bugünün özeti
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {summaryParts.join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {todayTodos.overdue > 0 && (
            <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {todayTodos.overdue} gecikmiş
            </Badge>
          )}
          {todayEvents.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {todayEvents.length} etkinlik
            </Badge>
          )}
          {todayTodos.total > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckSquare className="h-3 w-3" />
              {todayTodos.total} todo
            </Badge>
          )}
        </div>
      </div>

      {todayEvents.length > 0 && (
        <div className="flex items-center gap-3 mt-3 overflow-x-auto">
          {todayEvents.slice(0, 4).map(e => (
            <div key={e.id} className="flex items-center gap-1.5 text-xs bg-background rounded-md px-2 py-1 flex-shrink-0" data-testid={`briefing-event-${e.id}`}>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{format(new Date(e.startTime), "HH:mm")}</span>
              <span className="text-muted-foreground truncate max-w-[120px]">{e.title}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
