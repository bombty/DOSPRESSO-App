import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface Props {
  title: string;
  data: any;
}

export function GenericStatWidget({ title, data }: Props) {
  return (
    <Card data-testid="widget-generic">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        {data ? (
          <div className="text-xs text-muted-foreground">
            {typeof data === "object" ? (
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(data).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-1">
                    <span className="truncate">{k}:</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span>{String(data)}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Veri yok</span>
        )}
      </CardContent>
    </Card>
  );
}
