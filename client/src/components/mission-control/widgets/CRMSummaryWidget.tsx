import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { openComplaints: number; totalComplaints: number; } | null;
}

export function CRMSummaryWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="CRM Özeti" />;
  return (
    <Card data-testid="widget-crm-summary">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">CRM Özeti</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Toplam Şikayet" value={data.totalComplaints} />
          <MiniKPI label="Açık Şikayet" value={data.openComplaints} color={data.openComplaints > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"} />
        </div>
      </CardContent>
    </Card>
  );
}
