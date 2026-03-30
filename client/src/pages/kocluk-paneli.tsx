import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  AlertTriangle,
  Building2,
  ExternalLink,
  TrendingDown,
  GraduationCap,
  Star,
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { DobodySuggestionList, type DobodySuggestion } from "@/components/dobody-suggestion-card";
import { SmartNotificationDialog } from "@/components/smart-notification-dialog";
import { DobodyFlowMode } from "@/components/dobody-flow-mode";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { Bot } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { useDashboardMode } from "@/hooks/useDashboardMode";

const MissionControlCoach = lazy(() => import("@/components/mission-control/MissionControlCoach"));

interface CoachSummaryData {
  branches: Array<{ id: number; name: string }>;
  attentionNeeded: Array<{
    userId: string;
    name: string;
    branchName: string;
    branchId: number;
    role: string;
    compositeScore: number;
    currentLevel: string;
    dangerZoneMonths: number;
    reason: string;
  }>;
  totalBranches: number;
  suggestions: Array<{
    id: string;
    message: string;
    actionType: string;
    actionLabel: string;
    priority: string;
    icon: string;
    payload?: Record<string, any>;
  }>;
}

export default function KoclukPaneli() {
  const { user } = useAuth();
  const { isMissionControl, isLoading: modeLoading } = useDashboardMode();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionSuggestion, setActionSuggestion] = useState<DobodySuggestion | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<CoachSummaryData>({
    queryKey: ["/api/coach-summary"],
    enabled: !isMissionControl && !modeLoading,
  });

  if (!modeLoading && isMissionControl) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Yükleniyor...</p></div>}>
        <MissionControlCoach />
      </Suspense>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto" data-testid="kocluk-paneli-loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 max-w-[1200px] mx-auto" data-testid="kocluk-paneli-error">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 max-w-[1200px] mx-auto" data-testid="kocluk-paneli-empty">
        <Card><CardContent className="p-6 text-center text-muted-foreground">Veriler yüklenemedi</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-[1200px] mx-auto overflow-y-auto h-full" data-testid="kocluk-paneli-page">
      <DobodyFlowMode
        userId={user?.id || ""}
        userRole={user?.role || ""}
        userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
        branchId={user?.branchId ? Number(user.branchId) : null}
      />
      <div data-testid="coach-header">
        <h1 className="text-xl font-bold" data-testid="text-coach-title">Koçluk Paneli</h1>
        <p className="text-sm text-muted-foreground">{data.totalBranches} şube takip ediliyor</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" data-testid="branch-list">
        {data.branches?.map((branch) => (
          <Link key={branch.id} href={`/sube/${branch.id}/dashboard`}>
            <Card className="flex-shrink-0 hover-elevate cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm whitespace-nowrap">{branch.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data.attentionNeeded.length > 0 && (
        <Card data-testid="card-attention-needed">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Dikkat Gereken Personel ({data.attentionNeeded.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {data.attentionNeeded?.map((person) => (
              <div
                key={person.userId}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30"
                data-testid={`attention-${person.userId}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{person.name}</span>
                    <Badge variant="outline" className="text-xs">{person.branchName}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{person.compositeScore}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{person.currentLevel}</span>
                    {person.dangerZoneMonths > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {person.dangerZoneMonths} ay
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-orange-500 mt-1">{person.reason}</p>
                </div>
                <Link href={`/personel/${person.userId}`}>
                  <Button size="sm" variant="outline" data-testid={`btn-view-${person.userId}`}>
                    İncele
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.attentionNeeded.length === 0 && (
        <Card data-testid="card-no-attention">
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">Tüm personel normal durumda</p>
          </CardContent>
        </Card>
      )}

      <DobodySuggestionList
        suggestions={data.suggestions || []}
        onAction={(s) => { setActionSuggestion(s); setActionDialogOpen(true); }}
      />

      <div className="pb-4 space-y-2">
        <Button variant="outline" className="w-full" onClick={() => setShowAssignDialog(true)} data-testid="btn-assign-task">
          <Bot className="h-4 w-4 mr-2" />
          Ekibe Görev Ata
        </Button>
        <Link href="/hq-dashboard/coach">
          <Button variant="outline" className="w-full" data-testid="btn-detailed-dashboard">
            <ExternalLink className="h-4 w-4 mr-2" />
            Detaylı Koç Dashboard
          </Button>
        </Link>
      </div>

      <QuickTaskModal
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        allowedBranchIds={data.branches?.map((b) => b.id)}
      />

      <SmartNotificationDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        suggestion={actionSuggestion ? {
          id: actionSuggestion.id,
          message: actionSuggestion.message,
          targetUserId: actionSuggestion.targetUserId,
          payload: actionSuggestion.payload,
          branchId: actionSuggestion.payload?.branchId,
          branchName: actionSuggestion.payload?.branchName,
        } : null}
      />
    </div>
  );
}
