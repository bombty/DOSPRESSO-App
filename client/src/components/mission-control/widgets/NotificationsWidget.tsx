import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { unread: number; total: number; } | null;
}

export function NotificationsWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Bildirimler" />;
  return (
    <Card data-testid="widget-notifications">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Bildirimler</span>
          {data.unread > 0 && <Badge variant="destructive" className="text-[9px] h-4 ml-auto">{data.unread} yeni</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Okunmamış" value={data.unread} color={data.unread > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
          <MiniKPI label="Toplam" value={data.total} />
        </div>
      </CardContent>
    </Card>
  );
}
