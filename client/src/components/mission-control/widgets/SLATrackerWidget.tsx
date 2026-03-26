import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { slaBreaches: number; openTickets: number; } | null;
}

export function SLATrackerWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="SLA Takip" />;
  return (
    <Card data-testid="widget-sla-tracker">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">SLA Takip</span>
          {data.slaBreaches > 0 && <Badge variant="destructive" className="text-[9px] h-4 ml-auto">{data.slaBreaches} ihlal</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="SLA İhlali" value={data.slaBreaches} color={data.slaBreaches > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"} />
          <MiniKPI label="Açık Ticket" value={data.openTickets} color={data.openTickets > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
