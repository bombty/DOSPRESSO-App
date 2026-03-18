import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface ExamItem {
  id: number;
  userId: string;
  targetRoleId: string;
  status: string;
  supervisorNotes?: string;
}

export function SinavTalepleriTab() {
  const { toast } = useToast();

  const { data: pendingExams = [] } = useQuery({
    queryKey: ["/api/academy/exam-requests-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-requests?status=pending`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

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
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("PATCH", `/api/academy/exam-request/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({ title: "Sınav reddedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/exam-requests-pending"] });
    },
  });

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4" />
            Beklemede ({pendingExams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingExams.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-pending-exams">Talep yok</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {pendingExams.map((exam: ExamItem) => (
                <div key={exam.id} className="p-3 border rounded text-sm" data-testid={`exam-pending-${exam.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <p className="font-medium">{exam.userId}</p>
                      <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                    </div>
                    <Badge variant="outline">Beklemede</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(exam.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-exam-${exam.id}`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ id: exam.id, reason: "Reddedildi" })}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-exam-${exam.id}`}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <CheckCircle className="w-4 h-4" />
            Onaylı ({approvedExams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedExams.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-approved-exams">Onay yok</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {approvedExams.map((exam: ExamItem) => (
                <div key={exam.id} className="p-3 border rounded text-sm" data-testid={`exam-approved-${exam.id}`}>
                  <p className="font-medium">{exam.userId}</p>
                  <p className="text-xs text-muted-foreground">Rol: {exam.targetRoleId}</p>
                  <Badge className="mt-2">Onaylı</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
