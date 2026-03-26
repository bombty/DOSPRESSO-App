import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface Props {
  data: { normal: number; warning: number; critical: number; total: number; branches?: any[]; } | null;
}

export function BranchStatusWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="Şube Durumu" />;
  return (
    <Card data-testid="widget-branch-status">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Şube Durumu</span>
          {data.critical > 0 && <Badge variant="destructive" className="text-[9px] h-4 ml-auto">{data.critical} kritik</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI label="Toplam" value={data.total} />
          <MiniKPI label="Normal" value={data.normal} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Uyarı" value={data.warning} color={data.warning > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniKPI({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="text-center p-2 rounded-md bg-muted/30">
      <div className={`text-lg font-bold ${color || ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function EmptyWidget({ label }: { label: string }) {
  return (
    <Card data-testid="widget-empty">
      <CardContent className="p-3 text-center">
        <span className="text-xs text-muted-foreground">{label} - Veri yok</span>
      </CardContent>
    </Card>
  );
}

export { MiniKPI, EmptyWidget };
