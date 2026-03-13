import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

import { isHQRole, type UserRoleType } from "@shared/schema";

const TARGET_ROLE_OPTIONS = [
  { id: "barista", label: "Barista" },
  { id: "stajyer", label: "Stajyer" },
  { id: "bar_buddy", label: "Bar Buddy" },
  { id: "supervisor", label: "Süpervizör" },
  { id: "mudur", label: "Müdür" },
  { id: "coach", label: "Koç" },
  { id: "trainer", label: "Eğitmen" },
  { id: "kalite_kontrol", label: "Kalite Kontrol" },
];

function WebinarSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="webinar-skeleton">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

function CreateWebinarDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostName, setHostName] = useState("");
  const [webinarDate, setWebinarDate] = useState("");
  const [webinarTime, setWebinarTime] = useState("14:00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/v3/academy/webinars", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/webinars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v3/academy/home-data"] });
      toast({ title: "Webinar oluşturuldu" });
      setOpen(false);
      resetForm();
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setHostName("");
    setWebinarDate("");
    setWebinarTime("14:00");
    setDurationMinutes("60");
    setMeetingLink("");
    setMaxParticipants("");
    setTargetRoles([]);
  };

  const toggleRole = (roleId: string) => {
    setTargetRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = () => {
    if (!title.trim() || !hostName.trim() || !webinarDate) {
      toast({ title: "Başlık, sunan ve tarih zorunludur", variant: "destructive" });
      return;
    }
    const dateTime = new Date(`${webinarDate}T${webinarTime}:00`);
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      hostName: hostName.trim(),
      webinarDate: dateTime.toISOString(),
      durationMinutes: parseInt(durationMinutes) || 60,
      meetingLink: meetingLink.trim() || null,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      targetRoles: targetRoles.length > 0 ? targetRoles : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="create-webinar-btn">
          <Plus className="h-3 w-3 mr-1" />
          Yeni Webinar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="create-webinar-dialog">
        <DialogHeader>
          <DialogTitle>Yeni Webinar Oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="webinar-title">Başlık</Label>
            <Input
              id="webinar-title"
              placeholder="Webinar başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-webinar-title"
            />
          </div>
          <div>
            <Label htmlFor="webinar-host">Sunan</Label>
            <Input
              id="webinar-host"
              placeholder="Sunan kişi / ekip"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              data-testid="input-webinar-host"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="webinar-date">Tarih</Label>
              <Input
                id="webinar-date"
                type="date"
                value={webinarDate}
                onChange={(e) => setWebinarDate(e.target.value)}
                data-testid="input-webinar-date"
              />
            </div>
            <div>
              <Label htmlFor="webinar-time">Saat</Label>
              <Input
                id="webinar-time"
                type="time"
                value={webinarTime}
                onChange={(e) => setWebinarTime(e.target.value)}
                data-testid="input-webinar-time"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="webinar-duration">Süre (dk)</Label>
              <Input
                id="webinar-duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                data-testid="input-webinar-duration"
              />
            </div>
            <div>
              <Label htmlFor="webinar-max">Kontenjan</Label>
              <Input
                id="webinar-max"
                type="number"
                placeholder="Sınırsız"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                data-testid="input-webinar-max"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="webinar-link">Toplantı Linki</Label>
            <Input
              id="webinar-link"
              placeholder="https://..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              data-testid="input-webinar-link"
            />
          </div>
          <div>
            <Label>Hedef Roller (opsiyonel)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1" data-testid="target-roles-selector">
              {TARGET_ROLE_OPTIONS.map((role) => (
                <Button
                  key={role.id}
                  type="button"
                  size="sm"
                  variant={targetRoles.includes(role.id) ? "default" : "outline"}
                  onClick={() => toggleRole(role.id)}
                  className="toggle-elevate"
                  data-testid={`target-role-${role.id}`}
                >
                  {role.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="webinar-desc">Açıklama</Label>
            <Textarea
              id="webinar-desc"
              placeholder="Webinar açıklaması (opsiyonel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-webinar-desc"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            data-testid="submit-webinar"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Oluştur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WebinarTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPast, setShowPast] = useState(false);
  const isHQ = user?.role && isHQRole(user.role as UserRoleType);

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
  const pastWebinars = webinars?.filter((w) => w.status === "completed" || w.status === "cancelled") || [];

  const pendingWebinarId = registerMutation.isPending
    ? registerMutation.variables
    : unregisterMutation.isPending
      ? unregisterMutation.variables
      : null;

  return (
    <div className="space-y-4 p-4 pb-8" data-testid="webinar-tab">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-sm" data-testid="webinar-heading">Webinar Takvimi</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground" data-testid="webinar-month">
            {new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </span>
          {isHQ && (
            <CreateWebinarDialog onCreated={() => {}} />
          )}
        </div>
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
                          disabled={pendingWebinarId === w.id}
                          data-testid={`unregister-${w.id}`}
                        >
                          {pendingWebinarId === w.id ? (
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
                          disabled={pendingWebinarId === w.id}
                          data-testid={`register-${w.id}`}
                        >
                          {pendingWebinarId === w.id ? (
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

      {pastWebinars.length > 0 && (
        <div data-testid="past-webinars-section">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowPast(!showPast)}
            data-testid="toggle-past-webinars"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              Geçmiş Webinarlar ({pastWebinars.length})
            </span>
            {showPast ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          {showPast && (
            <div className="space-y-2 mt-2">
              {pastWebinars.map((w) => (
                <Card key={w.id} className="opacity-70" data-testid={`past-webinar-${w.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" data-testid={`past-title-${w.id}`}>{w.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span data-testid={`past-host-${w.id}`}>{w.hostName}</span>
                        <span data-testid={`past-date-${w.id}`}>
                          {new Date(w.webinarDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </span>
                        <Badge variant="secondary" data-testid={`past-status-${w.id}`}>
                          {w.status === "completed" ? "Tamamlandı" : "İptal"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
