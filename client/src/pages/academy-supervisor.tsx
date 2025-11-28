import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function AcademySupervisor() {
  const { toast } = useToast();
  const { user } = useAuth();

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

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Talep reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-team"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Akademi - Supervisor Paneli</h1>
        <p className="text-muted-foreground mt-2">Ekip eğitim yönetimi ve sınav talepleri</p>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Ekibim
          </TabsTrigger>
          <TabsTrigger value="exams">
            <Clock className="w-4 h-4 mr-2" />
            Sınav Talepleri ({pendingExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
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
                <div className="space-y-3">
                  {teamMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
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

        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beklemede Olan Sınav Talepleri</CardTitle>
              <CardDescription>HQ tarafından onay bekleyen sınav istekleri</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Beklemede talep yok</div>
              ) : (
                <div className="space-y-3">
                  {pendingExams.map((exam: any) => (
                    <div key={exam.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{exam.userId}</p>
                          <p className="text-sm text-muted-foreground">→ {exam.targetRoleId}</p>
                        </div>
                        <Badge variant="secondary">{exam.status}</Badge>
                      </div>
                      {exam.supervisorNotes && (
                        <p className="text-sm bg-muted p-2 rounded">{exam.supervisorNotes}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Düzenle</Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => rejectMutation.mutate({ id: exam.id, reason: "İleri tarih" })}
                        >
                          İptal
                        </Button>
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
