import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { active: number; approved: number; } | null;
}

export function StaffOverviewWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Personel Özeti" />;
  return (
    <Card data-testid="widget-staff-overview">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Personel Özeti</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Aktif" value={data.active} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Onaylı" value={data.approved} />
        </div>
      </CardContent>
    </Card>
  );
}
