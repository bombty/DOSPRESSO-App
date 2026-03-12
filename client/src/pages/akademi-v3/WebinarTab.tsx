import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

function WebinarSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="webinar-skeleton">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

export default function WebinarTab() {
  const { toast } = useToast();

  const { data: webinars, isLoading } = useQuery<any[]>({
    queryKey: ["/api/v3/academy/webinars"],
  });

  const registerMutation = useMutation({
    mutationFn: async (webinarId: number) => {
      const res = await apiRequest("POST", `/api/v3/academy/webinars/${webinarId}/register`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/home-data"] });
      toast({ title: "Webinara kaydolundu" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: async (webinarId: number) => {
      await apiRequest("DELETE", `/api/v3/academy/webinars/${webinarId}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/home-data"] });
      toast({ title: "Kayıt iptal edildi" });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <WebinarSkeleton />;

  const liveWebinars = webinars?.filter((w) => w.status === "live" || w.isLive) || [];
  const upcomingWebinars = webinars?.filter((w) => w.status === "scheduled" && !w.isLive) || [];

  const isPending = registerMutation.isPending || unregisterMutation.isPending;

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="webinar-tab">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-sm" data-testid="webinar-heading">Webinar Takvimi</h2>
        <span className="text-xs text-muted-foreground" data-testid="webinar-month">
          {new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
        </span>
      </div>

      {liveWebinars.map((w) => (
        <Card
          key={w.id}
          className="border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5"
          data-testid={`live-webinar-${w.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-destructive text-xs font-bold uppercase tracking-widest">CANLI YAYIN</span>
            </div>
            <div className="font-semibold mb-1" data-testid={`live-title-${w.id}`}>{w.title}</div>
            <div className="text-sm text-muted-foreground" data-testid={`live-host-${w.id}`}>{w.hostName}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(w.webinarDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
              </span>
              <span>Şimdi</span>
            </div>
            {w.meetingLink && (
              <Button
                className="mt-3 w-full"
                onClick={() => window.open(w.meetingLink, "_blank")}
                data-testid={`join-live-${w.id}`}
              >
                <Video className="h-4 w-4 mr-2" />
                Hemen Katıl
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {upcomingWebinars.length > 0 && (
        <div data-testid="upcoming-webinars-section">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
            Yaklaşan Webinarlar
          </p>
          <div className="space-y-3">
            {upcomingWebinars.map((w) => (
              <Card key={w.id} className="hover-elevate" data-testid={`webinar-card-${w.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1" data-testid={`webinar-title-${w.id}`}>{w.title}</div>
                      <div className="text-xs text-muted-foreground" data-testid={`webinar-host-${w.id}`}>{w.hostName}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1" data-testid={`webinar-date-${w.id}`}>
                          <Calendar className="h-3 w-3" />
                          {new Date(w.webinarDate).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                        <span className="flex items-center gap-1" data-testid={`webinar-time-${w.id}`}>
                          <Clock className="h-3 w-3" />
                          {new Date(w.webinarDate).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {w.durationMinutes && (
                          <span data-testid={`webinar-duration-${w.id}`}>{w.durationMinutes} dk</span>
                        )}
                      </div>
                      {w.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2" data-testid={`webinar-desc-${w.id}`}>
                          {w.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {w.isRegistered ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unregisterMutation.mutate(w.id)}
                          disabled={isPending}
                          data-testid={`unregister-${w.id}`}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                              Kayıtlı
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => registerMutation.mutate(w.id)}
                          disabled={isPending}
                          data-testid={`register-${w.id}`}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Kaydol"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {liveWebinars.length === 0 && upcomingWebinars.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="no-webinars">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Yaklaşan webinar bulunmuyor</p>
        </div>
      )}
    </div>
  );
}
