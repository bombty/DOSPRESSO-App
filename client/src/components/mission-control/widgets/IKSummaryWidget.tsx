import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { MiniKPI, EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: {
    documents: { total: number; verified: number; completionRate: number };
    disciplinary: { total: number; open: number };
  } | null;
}

export function IKSummaryWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="İK Özeti" />;
  return (
    <Card data-testid="widget-ik-summary">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">İK Özeti</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniKPI label="Belge" value={data.documents.total} />
          <MiniKPI label="Onaylı" value={data.documents.verified} color="text-emerald-600 dark:text-emerald-400" />
          <MiniKPI label="Tamamlanma" value={`%${data.documents.completionRate}`} />
          <MiniKPI label="Açık Disiplin" value={data.disciplinary.open} color={data.disciplinary.open > 0 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
