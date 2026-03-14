import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Check, AlertTriangle, Megaphone, CheckCircle2 } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string | null;
  priority: string;
  confirmed?: boolean;
  confirmed_count?: number;
  total_recipients?: number;
  createdAt?: string;
  created_at?: string;
}

export default function BroadcastTab() {
  const qc = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const confirmMutation = useMutation({
    mutationFn: async (announcementId: number) =>
      apiRequest("POST", `/api/iletisim/broadcast/${announcementId}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/announcements"] }),
  });

  return (
    <div className="space-y-3" data-testid="broadcast-tab">
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Duyuru bulunamadı</div>
      ) : (
        announcements.map((ann) => (
          <div
            key={ann.id}
            className={cn(
              "bg-muted/30 p-3 rounded-md border",
              ann.priority === "urgent" ? "border-red-300 dark:border-red-800" : "border-border"
            )}
            data-testid={`announcement-${ann.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1">
                  {ann.priority === "urgent" ? (
                    <><AlertTriangle className="h-3 w-3 text-red-500" /> Acil</>
                  ) : (
                    <><Megaphone className="h-3 w-3" /> Duyuru</>
                  )}
                </p>
                <p className="text-sm font-medium" data-testid={`text-announcement-title-${ann.id}`}>{ann.title}</p>
                {ann.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(ann.createdAt ?? ann.created_at ?? new Date()), { addSuffix: true, locale: tr })}
                  </span>
                  {ann.confirmed_count != null && ann.total_recipients != null && (
                    <Badge variant="outline" className="text-[9px]" data-testid={`receipt-count-${ann.id}`}>
                      {ann.confirmed_count}/{ann.total_recipients} onayladı
                    </Badge>
                  )}
                </div>
              </div>
              {ann.confirmed ? (
                <Badge variant="outline" className="flex-shrink-0 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700" data-testid={`confirmed-badge-${ann.id}`}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Onaylandı
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => confirmMutation.mutate(ann.id)}
                  disabled={confirmMutation.isPending}
                  data-testid={`confirm-btn-${ann.id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Onayladım
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
