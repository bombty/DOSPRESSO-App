import { Card, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { EmptyWidget } from "./BranchStatusWidget";

interface Props {
  data: { source: string; endpoint?: string; } | null;
}

export function AIBriefingWidget({ data }: Props) {
  if (!data) return <EmptyWidget label="AI Brifing" />;
  return (
    <Card data-testid="widget-ai-briefing">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">AI Brifing</span>
        </div>
        <p className="text-xs text-muted-foreground">AI brifing modülü yakında aktif olacak.</p>
      </CardContent>
    </Card>
  );
}
