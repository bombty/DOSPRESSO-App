import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Plus,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Star,
  ArrowLeft,
  Target,
  MessageSquare,
  UserCheck,
  BookOpen,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface OnboardingProgram {
  id: number;
  name: string;
  description: string | null;
  targetRole: string;
  durationWeeks: number;
  isActive: boolean;
  weeks?: OnboardingWeek[];
}

interface OnboardingWeek {
  id: number;
  programId: number;
  weekNumber: number;
  title: string;
  description: string | null;
  goals: string[];
}

interface OnboardingInstance {
  id: number;
  programId: number;
  traineeId: number;
  mentorId: number | null;
  status: string;
  startDate: string;
  completedAt: string | null;
  program?: OnboardingProgram;
  trainee?: { id: number; firstName: string; lastName: string };
  checkinsCount: number;
}

interface OnboardingInstanceDetail extends OnboardingInstance {
  weeks: OnboardingWeek[];
  checkins: OnboardingCheckin[];
  mentor: { id: number; firstName: string; lastName: string } | null;
}

interface OnboardingCheckin {
  id: number;
  instanceId: number;
  weekNumber: number;
  mentorId: number;
  rating: number | null;
  notes: string | null;
  strengths: string | null;
  areasToImprove: string | null;
  checkinDate: string;
}


const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Aktif", variant: "default" },
  completed: { label: "Tamamlandı", variant: "secondary" },
  paused: { label: "Durduruldu", variant: "outline" },
};

export default function OnboardingProgramlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("atamalar");
  const [selectedInstance, setSelectedInstance] = useState<number | null>(null);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [checkinWeek, setCheckinWeek] = useState(1);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinRating, setCheckinRating] = useState(3);
  const [checkinStrengths, setCheckinStrengths] = useState("");
  const [checkinAreas, setCheckinAreas] = useState("");

  const isManager = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'mudur', 'supervisor', 'muhasebe_ik', 'fabrika_mudur'].includes(user?.role || '');

  const { data: programs = [], isLoading: isProgramsLoading, isError, refetch } = useQuery<OnboardingProgram[]>({
    queryKey: ["/api/onboarding-programs"],
  });

  const { data: instances = [], isLoading: isInstancesLoading } = useQuery<OnboardingInstance[]>({
    queryKey: ["/api/onboarding-instances"],
  });

  const { data: instanceDetail, isLoading: isDetailLoading } = useQuery<OnboardingInstanceDetail>({
    queryKey: ["/api/onboarding-instances", selectedInstance],
    queryFn: async () => {
      const res = await fetch(`/api/onboarding-instances/${selectedInstance}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Yüklenemedi");
      return res.json();
    },
    enabled: !!selectedInstance,
  });

  const submitCheckin = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/onboarding-instances/${selectedInstance}/checkins`, {
        weekNumber: checkinWeek,
        notes: checkinNotes,
        rating: checkinRating,
        strengths: checkinStrengths,
        areasToImprove: checkinAreas,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Check-in kaydedildi" });
      setShowCheckinDialog(false);
      setCheckinNotes("");
      setCheckinStrengths("");
      setCheckinAreas("");
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-instances", selectedInstance] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Check-in kaydedilemedi", variant: "destructive" });
    },
  });

  const completeInstance = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/onboarding-instances/${id}/complete`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Onboarding tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-instances", selectedInstance] });
    },
    onError: () => {
      toast({ title: "Hata", variant: "destructive" });
    },
  });

  if (selectedInstance && instanceDetail) {
    const totalWeeks = instanceDetail.weeks?.length || instanceDetail.program?.durationWeeks || 4;
    const completedCheckins = instanceDetail.checkins?.length || 0;
    const progressPercent = Math.min(100, Math.round((completedCheckins / totalWeeks) * 100));

    
  if (isProgramsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 pb-24 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedInstance(null)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>

          <div className="space-y-2">
            <h1 className="text-xl font-bold" data-testid="text-instance-title">
              {instanceDetail.program?.name || "Onboarding"}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={(STATUS_CONFIG[instanceDetail.status || 'active']?.variant) || "default"} data-testid="badge-status">
                {STATUS_CONFIG[instanceDetail.status || 'active']?.label || instanceDetail.status}
              </Badge>
              {instanceDetail.trainee && (
                <Badge variant="outline" data-testid="badge-trainee">
                  {instanceDetail.trainee.firstName} {instanceDetail.trainee.lastName}
                </Badge>
              )}
              {instanceDetail.mentor && (
                <Badge variant="outline" data-testid="badge-mentor">
                  Mentor: {instanceDetail.mentor.firstName} {instanceDetail.mentor.lastName}
                </Badge>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">İlerleme</span>
                <span className="text-sm text-muted-foreground">{completedCheckins}/{totalWeeks} hafta</span>
              </div>
              <Progress value={progressPercent} className="h-2" data-testid="progress-bar" />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Haftalık Plan
              </h2>
              {isManager && instanceDetail.status === 'active' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => setShowCheckinDialog(true)}
                    data-testid="button-new-checkin"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Check-in Ekle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeInstance.mutate(instanceDetail.id)}
                    disabled={completeInstance.isPending}
                    data-testid="button-complete"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Tamamla
                  </Button>
                </div>
              )}
            </div>

            {(instanceDetail.weeks || []).map((week) => {
              const weekCheckin = instanceDetail.checkins?.find(c => c.weekNumber === week.weekNumber);
              return (
                <Card key={week.id} data-testid={`card-week-${week.weekNumber}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${weekCheckin ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {week.weekNumber}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{week.title}</p>
                          {week.description && (
                            <p className="text-xs text-muted-foreground">{week.description}</p>
                          )}
                        </div>
                      </div>
                      {weekCheckin ? (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Tamamlandı
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Bekliyor
                        </Badge>
                      )}
                    </div>

                    {week.goals && week.goals.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Hedefler
                        </p>
                        <ul className="space-y-1">
                          {week.goals.map((goal, gi) => (
                            <li key={gi} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="text-primary shrink-0">-</span>
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {weekCheckin && (
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Mentor Değerlendirmesi</span>
                          {weekCheckin.rating && (
                            <div className="flex items-center gap-1 ml-auto">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`h-3 w-3 ${s <= weekCheckin.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                        {weekCheckin.notes && (
                          <p className="text-xs text-muted-foreground">{weekCheckin.notes}</p>
                        )}
                        {weekCheckin.strengths && (
                          <div>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">Güçlü Yönler:</p>
                            <p className="text-xs text-muted-foreground">{weekCheckin.strengths}</p>
                          </div>
                        )}
                        {weekCheckin.areasToImprove && (
                          <div>
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Geliştirilecek Alanlar:</p>
                            <p className="text-xs text-muted-foreground">{weekCheckin.areasToImprove}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Haftalık Check-in</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Hafta No</label>
                  <Input
                    type="number"
                    min={1}
                    max={totalWeeks}
                    value={checkinWeek}
                    onChange={(e) => setCheckinWeek(parseInt(e.target.value) || 1)}
                    data-testid="input-checkin-week"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Değerlendirme (1-5)</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="icon"
                        onClick={() => setCheckinRating(s)}
                        data-testid={`button-rating-${s}`}
                      >
                        <Star className={`h-5 w-5 ${s <= checkinRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notlar</label>
                  <Textarea
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder="Genel değerlendirme..."
                    rows={3}
                    data-testid="input-checkin-notes"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Güçlü Yönler</label>
                  <Textarea
                    value={checkinStrengths}
                    onChange={(e) => setCheckinStrengths(e.target.value)}
                    placeholder="Başarılı olduğu alanlar..."
                    rows={2}
                    data-testid="input-checkin-strengths"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Geliştirilecek Alanlar</label>
                  <Textarea
                    value={checkinAreas}
                    onChange={(e) => setCheckinAreas(e.target.value)}
                    placeholder="Üzerinde çalışılması gereken konular..."
                    rows={2}
                    data-testid="input-checkin-areas"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCheckinDialog(false)} data-testid="button-cancel-checkin">
                    İptal
                  </Button>
                  <Button
                    onClick={() => submitCheckin.mutate()}
                    disabled={submitCheckin.isPending}
                    data-testid="button-save-checkin"
                  >
                    {submitCheckin.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Kaydet
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 pb-24 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Onboarding Programları</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Hafta bazlı onboarding programları ve mentor check-in takibi
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-onboarding">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="atamalar" data-testid="tab-atamalar">
              <Users className="h-4 w-4 mr-2" />
              Atamalar
            </TabsTrigger>
            <TabsTrigger value="programlar" data-testid="tab-programlar">
              <BookOpen className="h-4 w-4 mr-2" />
              Programlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atamalar" className="space-y-3 mt-4">
            {isInstancesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : instances.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground" data-testid="text-no-instances">
                    Henüz onboarding ataması yok.
                  </p>
                </CardContent>
              </Card>
            ) : (
              instances.map((inst) => {
                const totalWeeks = inst.program?.durationWeeks || 4;
                const prog = Math.min(100, Math.round((inst.checkinsCount / totalWeeks) * 100));
                return (
                  <Card
                    key={inst.id}
                    className="cursor-pointer hover-elevate transition-all"
                    onClick={() => setSelectedInstance(inst.id)}
                    data-testid={`card-instance-${inst.id}`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{inst.program?.name || "Program"}</p>
                          {inst.trainee && (
                            <p className="text-xs text-muted-foreground">
                              <UserCheck className="h-3 w-3 inline mr-1" />
                              {inst.trainee.firstName} {inst.trainee.lastName}
                            </p>
                          )}
                        </div>
                        <Badge variant={(STATUS_CONFIG[inst.status || 'active']?.variant) || "default"}>
                          {STATUS_CONFIG[inst.status || 'active']?.label || inst.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={prog} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{inst.checkinsCount}/{totalWeeks}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="programlar" className="space-y-3 mt-4">
            {isProgramsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : programs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground" data-testid="text-no-programs">
                    Henüz program oluşturulmamış.
                  </p>
                </CardContent>
              </Card>
            ) : (
              programs.map((program) => (
                <Card key={program.id} data-testid={`card-program-${program.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{program.name}</p>
                        {program.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{program.description}</p>
                        )}
                      </div>
                      <Badge variant={program.isActive ? "default" : "outline"}>
                        {program.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ROLE_LABELS[program.targetRole] || program.targetRole}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {program.durationWeeks} hafta
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
