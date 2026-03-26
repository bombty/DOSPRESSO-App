import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { total: number; critical: number; } | null;
}

export function OpenTicketsWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Açık Talepler" />;
  return (
    <Card data-testid="widget-open-tickets">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Açık Talepler</span>
          {data.critical > 0 && <Badge variant="destructive" className="text-[9px] h-4 ml-auto">{data.critical} kritik</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Toplam" value={data.total} />
          <MiniKPI label="Kritik" value={data.critical} color={data.critical > 0 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
