import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, CheckCircle, Clock, AlertCircle, Check, X, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { GateRequestsWidget } from "@/components/widgets/gate-requests-widget";

export default function AcademySupervisor() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Get team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ["/api/academy/team-members", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/academy/team-members?supervisorId=${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get pending exam requests
  const { data: pendingExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-team", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/academy/exam-requests?status=pending&supervisorId=${user.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get training modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/training/modules"],
    queryFn: async () => {
      const res = await fetch("/api/training/modules", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Sınav onaylandı", description: "Kullanıcı sınava başlayabilir." });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-team", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: rejectReason });
    },
    onSuccess: () => {
      toast({ title: "Talep reddedildi" });
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-team", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-2 col-span-full">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      <div className="col-span-full">
        <h1 className="text-lg font-bold tracking-tight">Supervisor Paneli</h1>
        <p className="text-xs text-muted-foreground mt-1">Ekip yönetimi ve sınav talepleri</p>
      </div>

      <GateRequestsWidget />

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="team" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Ekibim
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            Modüller
          </TabsTrigger>
          <TabsTrigger value="exams" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Sınavlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="w-full space-y-2 sm:space-y-3 gap-2">
          <Card>
            <CardHeader>
              <CardTitle>Ekip Üyeleri Eğitim Durumu</CardTitle>
              <CardDescription>Ekibinizdeki çalışanların kariyer ve eğitim ilerlemesi</CardDescription>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Ekip üyesi bulunamadı</div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {teamMembers.map((member: { id: number; firstName: string; lastName: string; currentRole: string; targetRole?: string; progressPercent?: number }) => (
                    <div key={member.id} className="flex flex-col items-center text-center p-3 border rounded-lg hover-elevate">
                      <div>
                        <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.currentRole} → {member.targetRole || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.round(member.progressPercent || 0)}%</Badge>
                        <Button size="sm" variant="ghost">Detay</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Eğitim Modülleri</CardTitle>
              <CardDescription>Ekibinize atayabileceğiniz tüm modüller</CardDescription>
            </CardHeader>
            <CardContent>
              {modulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Modül bulunamadı</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
                  {modules.map((module: { id: number; title: string; level: string; estimatedDuration: number; description?: string }) => (
                    <Link key={module.id} to={`/akademi-modul/${module.id}`}>
                      <Card className="cursor-pointer hover-elevate h-full flex flex-col">
                        <CardHeader className="pb-2 pt-2 px-2 flex-1">
                          <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight mb-1">{module.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {module.level === 'beginner' ? 'Başlangıç' : module.level === 'intermediate' ? 'Orta' : 'İleri'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{module.estimatedDuration} dk</span>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2 px-2 pb-2">
                          <p className="text-xs text-muted-foreground line-clamp-2">{module.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Beklemede Olan Sınav Talepleri</CardTitle>
              <CardDescription>HQ tarafından onay bekleyen sınav istekleri</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Beklemede talep yok</div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {pendingExams.map((exam: { id: number; userId: string; targetRoleId: string; status: string; supervisorNotes?: string }) => (
                    <div key={exam.id} className="p-3 border rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{exam.userId}</p>
                          <p className="text-sm text-muted-foreground">→ {exam.targetRoleId}</p>
                        </div>
                        <Badge variant="secondary" data-testid={`status-exam-${exam.id}`}>{exam.status}</Badge>
                      </div>
                      {exam.supervisorNotes && (
                        <p className="text-sm bg-muted p-2 rounded">{exam.supervisorNotes}</p>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => approveMutation.mutate(exam.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${exam.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Onayla
                        </Button>

                        <Dialog open={rejectingId === exam.id} onOpenChange={(open) => {
                          if (!open) {
                            setRejectingId(null);
                            setRejectReason("");
                          } else {
                            setRejectingId(exam.id);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              data-testid={`button-reject-${exam.id}`}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reddet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sınav Talebini Reddet</DialogTitle>
                            </DialogHeader>
                            <div className="w-full space-y-2 sm:space-y-3">
                              <p className="text-sm text-muted-foreground">
                                {exam.userId} kullanıcısının {exam.targetRoleId} pozisyonuna geçiş talebini reddetmek üzeresin.
                              </p>
                              <Textarea 
                                placeholder="Reddetme sebebini yazın..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                data-testid="textarea-reject-reason"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                  data-testid="button-cancel-reject"
                                >
                                  İptal
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => rejectMutation.mutate(exam.id)}
                                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                                  data-testid="button-confirm-reject"
                                >
                                  Reddet
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
