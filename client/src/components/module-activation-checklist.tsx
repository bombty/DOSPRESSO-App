import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ExternalLink, Package } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  deepLink: string;
  required: boolean;
  completed: boolean;
}

interface ModuleChecklist {
  title: string;
  items: ChecklistItem[];
  completionPercentage: number;
  message?: string;
}

export function ModuleActivationChecklist({ moduleKey }: { moduleKey: string }) {
  const { data, isLoading } = useQuery<ModuleChecklist>({
    queryKey: ["/api/admin/module-activation-checklist", moduleKey],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return null;
  }

  const completedCount = data.items.filter(i => i.completed).length;
  const allComplete = completedCount === data.items.length;

  return (
    <Card data-testid={`module-checklist-${moduleKey}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{data.title}</CardTitle>
          </div>
          <Badge variant={allComplete ? "default" : "secondary"}>
            {completedCount} / {data.items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={data.completionPercentage} className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground">{data.completionPercentage}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.items.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-md border"
            data-testid={`checklist-item-${item.id}`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                  {item.title}
                </span>
                {item.required && !item.completed && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">Zorunlu</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            {!item.completed && (
              <Button variant="ghost" size="icon" asChild>
                <a href={item.deepLink} data-testid={`link-checklist-${item.id}`}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
