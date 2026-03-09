import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface TeamOnboarding {
  id: number;
  userId: string;
  userName: string;
  userRole: string;
  templateName: string;
  branchId: number;
  status: string;
  startDate: string;
  expectedEndDate: string | null;
  dayNumber: number;
  totalDays: number;
  overallProgress: number;
  totalSteps: number;
  completedSteps: number;
  pendingApprovals: number;
}

interface PendingApproval {
  progressId: number;
  assignmentId: number;
  stepTitle: string;
  contentType: string;
  userName: string;
  userId: string;
  branchId: number;
  completedAt: string;
}


export default function SupervisorOnboarding() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("progress");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalRating, setApprovalRating] = useState(0);

  const { data: teamProgress, isLoading: progressLoading, isError, refetch } = useQuery<TeamOnboarding[]>({
    queryKey: ["/api/academy/onboarding/team-progress"],
  });

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery<PendingApproval[]>({
    queryKey: ["/api/academy/onboarding/pending-approvals"],
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved, notes, rating }: { id: number; approved: boolean; notes: string; rating: number }) =>
      apiRequest("POST", `/api/academy/onboarding/progress/${id}/approve`, { approved, notes, rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/onboarding/team-progress"] });
      setShowApprovalDialog(false);
      setSelectedApproval(null);
      setApprovalNotes("");
      setApprovalRating(0);
      toast({ title: "Onay işlemi tamamlandı" });
    },
    onError: (err: any) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  function openApproval(approval: PendingApproval) {
    setSelectedApproval(approval);
    setApprovalNotes("");
    setApprovalRating(0);
    setShowApprovalDialog(true);
  }

  const activeOnboardings = (teamProgress || []).filter(t => t.status === "in_progress");
  const completedOnboardings = (teamProgress || []).filter(t => t.status === "completed");
  const pendingCount = (pendingApprovals || []).length;

  if (progressLoading) {
    
  if (progressLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4 p-4" data-testid="supervisor-onboarding-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto" data-testid="supervisor-onboarding">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Ekip Onboarding</h2>
        {pendingCount > 0 && (
          <Badge variant="destructive">{pendingCount} onay bekliyor</Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="progress" data-testid="tab-progress">
            İlerleme ({activeOnboardings.length})
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            Onay Bekleyenler {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Tamamlananlar ({completedOnboardings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-3 mt-3">
          {activeOnboardings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p className="text-sm">Aktif onboarding bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            activeOnboardings.map((item) => (
              <Card key={item.id} data-testid={`team-onboarding-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{item.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.templateName} | {ROLE_LABELS[item.userRole] || item.userRole}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.pendingApprovals > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {item.pendingApprovals} onay
                        </Badge>
                      )}
                      <Badge variant="outline">Gün {item.dayNumber}/{item.totalDays}</Badge>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{item.completedSteps}/{item.totalSteps} adım</span>
                      <span>%{item.overallProgress}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${item.overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {item.dayNumber > item.totalDays && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Süre aşımı</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-3 mt-3">
          {approvalsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (pendingApprovals || []).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Onay bekleyen adım yok</p>
              </CardContent>
            </Card>
          ) : (
            (pendingApprovals || []).map((approval) => (
              <Card key={approval.progressId} data-testid={`pending-approval-${approval.progressId}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{approval.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {approval.stepTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{approval.contentType}</Badge>
                        {approval.completedAt && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(approval.completedAt).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openApproval(approval)} data-testid={`button-review-${approval.progressId}`}>
                      Değerlendir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-3">
          {completedOnboardings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p className="text-sm">Tamamlanan onboarding yok</p>
              </CardContent>
            </Card>
          ) : (
            completedOnboardings.map((item) => (
              <Card key={item.id} data-testid={`completed-onboarding-${item.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{item.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.templateName} | {ROLE_LABELS[item.userRole] || item.userRole}
                      </p>
                    </div>
                    <Badge variant="secondary">Tamamlandı</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pratik Adım Değerlendirme</DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium">{selectedApproval.userName}</p>
                <p className="text-xs text-muted-foreground">{selectedApproval.stepTitle}</p>
              </div>
              <div>
                <Label>Puan (1-5)</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={approvalRating === n ? "default" : "outline"}
                      className="toggle-elevate"
                      onClick={() => setApprovalRating(n)}
                      data-testid={`button-rating-${n}`}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Değerlendirme notlarınız..."
                  className="min-h-[60px]"
                  data-testid="input-approval-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedApproval) {
                  approveMutation.mutate({
                    id: selectedApproval.progressId,
                    approved: false,
                    notes: approvalNotes,
                    rating: approvalRating,
                  });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4 mr-1" /> Reddet
            </Button>
            <Button
              onClick={() => {
                if (selectedApproval) {
                  approveMutation.mutate({
                    id: selectedApproval.progressId,
                    approved: true,
                    notes: approvalNotes,
                    rating: approvalRating,
                  });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}