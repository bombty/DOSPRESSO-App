import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ShiftChecklistItem {
  id: number;
  checklist: {
    id: number;
    title: string;
  };
  isCompleted: boolean;
  completedAt?: string | null;
}

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  checklists?: ShiftChecklistItem[];
}

export function ShiftChecklistCard() {
  const { toast } = useToast();
  
  // Get today's shift with checklists
  const today = new Date().toISOString().split("T")[0];
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/my"],
  });

  const todayShift = shifts?.find((s) => {
    if (s.date === today) return true;
    try {
      const shiftDate = new Date(s.date);
      if (isNaN(shiftDate.getTime())) return false;
      return shiftDate.toISOString().split("T")[0] === today;
    } catch {
      return false;
    }
  });

  const shiftChecklists = todayShift?.checklists || [];
  const completedCount = shiftChecklists.filter((c) => c.isCompleted).length;
  const totalCount = shiftChecklists.length;

  // Toggle checklist completion
  const toggleMutation = useMutation({
    mutationFn: async (checklistId: number) => {
      const item = shiftChecklists.find((c) => c.id === checklistId);
      if (!item) return;

      const response = await apiRequest(
        "PATCH",
        `/api/shift-checklists/${checklistId}`,
        { isCompleted: !item.isCompleted }
      );
      return response;
    },
    onSuccess: (_, checklistId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/my"] });
      toast({
        title: "Checklist güncellendi",
        description: "Durum başarıyla kaydedildi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Checklist güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  if (!todayShift || totalCount === 0) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bugünün Kontrol Listesi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Kontrol Listesi
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {shiftChecklists.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2 rounded border border-primary/10 hover-elevate transition-colors cursor-pointer"
            onClick={() => toggleMutation.mutate(item.id)}
          >
            <Checkbox
              checked={item.isCompleted}
              onCheckedChange={(e) => {
                e && (e as Event).stopPropagation?.();
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
              data-testid={`checkbox-checklist-${item.id}`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium ${
                  item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {item.checklist.title}
              </p>
              {item.isCompleted && item.completedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(item.completedAt), "HH:mm", { locale: tr })}
                </p>
              )}
            </div>
            {item.isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
          </div>
        ))}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-3 pt-2 border-t border-primary/10">
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {completedCount === totalCount ? "Tamamlandı" : `${totalCount - completedCount} beklemede`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
