import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AcademyHQ() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // Check HQ access
  if (!user || !isHQRole(user.role as any)) {
    return <div className="p-6 text-center text-destructive">Erişim Reddedildi</div>;
  }

  // Get pending exam requests
  const { data: pendingExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get approved exams
  const { data: approvedExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-approved"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=approved`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Sınav onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-approved"] });
      setSelectedExamId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Sınav reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
      setSelectedExamId(null);
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-4">
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
      $3div>
        <h1 className="text-3xl font-bold tracking-tight">Akademi - HQ Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-2">Sınav talepleri, modül yönetimi ve kariyer onayları</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Beklemede ({pendingExams.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Onaylı ({approvedExams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onay Bekleyen Sınav Talepleri</CardTitle>
              <CardDescription>Supervisor'lardan gelen sınav istekleri</CardDescription>
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
                          <p className="text-sm text-muted-foreground">
                            Rol: {exam.targetRoleId} | Supervisor: {exam.supervisorId}
                          </p>
                        </div>
                        <Badge variant="outline">{exam.status}</Badge>
                      </div>

                      {exam.supervisorNotes && (
                        <div className="text-sm bg-muted p-3 rounded">
                          <p className="font-medium mb-1">Supervisor Notu:</p>
                          <p>{exam.supervisorNotes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default" onClick={() => setSelectedExamId(exam.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Onayla
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sınav Onayı</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm">
                                <strong>{exam.userId}</strong> için <strong>{exam.targetRoleId}</strong> sınavını onaylamak istediğinize emin misiniz?
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  variant="default" 
                                  onClick={() => approveMutation.mutate(exam.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  Onayla
                                </Button>
                                <Button variant="outline">İptal</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" onClick={() => setSelectedExamId(exam.id)}>
                              <XCircle className="w-4 h-4 mr-1" />
                              Reddet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sınav Reddi</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea placeholder="Ret sebebi..." defaultValue="" id="reject-reason" />
                              <Button 
                                variant="destructive" 
                                onClick={() => {
                                  const reason = (document.getElementById("reject-reason") as HTMLTextAreaElement)?.value || "Belirtilmemiş";
                                  rejectMutation.mutate({ id: exam.id, reason });
                                }}
                              >
                                Reddet
                              </Button>
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

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onaylanmış Sınavlar</CardTitle>
              <CardDescription>HQ tarafından onaylanan sınav istekleri</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Onaylı sınav yok</div>
              ) : (
                <div className="space-y-2">
                  {approvedExams.map((exam: any) => (
                    <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{exam.userId}</p>
                        <p className="text-xs text-muted-foreground">→ {exam.targetRoleId}</p>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylı
                      </Badge>
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
