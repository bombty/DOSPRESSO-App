import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  GraduationCap,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  completedModules: number;
  compositeScore: number;
  levelTitleTr: string;
}

function getParticipationColor(rate: number): string {
  if (rate >= 80) return "text-green-500";
  if (rate >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getParticipationBadgeVariant(rate: number): "default" | "secondary" | "destructive" {
  if (rate >= 80) return "default";
  if (rate >= 50) return "secondary";
  return "destructive";
}

function getParticipationLabel(rate: number): string {
  if (rate >= 80) return "İyi";
  if (rate >= 50) return "Orta";
  return "Düşük";
}

export function TeamTrainingWidget() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/academy/team-progress'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-team-training-loading">
        <CardContent className="p-3">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const team: TeamMember[] = data?.team || [];
  if (team.length === 0) return null;

  const totalMembers = team.length;
  const membersWithModules = team.filter((m) => m.completedModules > 0).length;
  const participationRate = totalMembers > 0 ? Math.round((membersWithModules / totalMembers) * 100) : 0;
  const pendingMembers = team.filter((m) => m.completedModules === 0);

  return (
    <Card data-testid="widget-team-training">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
          Ekip Eğitim Durumu
          <Badge
            variant={getParticipationBadgeVariant(participationRate)}
            className="ml-auto text-[10px]"
            data-testid="badge-participation-rate"
          >
            {getParticipationLabel(participationRate)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Katılım Oranı</span>
              <span className={`text-sm font-bold ${getParticipationColor(participationRate)}`} data-testid="text-participation-percent">
                %{participationRate}
              </span>
            </div>
            <Progress value={participationRate} className="h-1.5" />
          </div>
          <div className="text-center shrink-0">
            <p className="text-lg font-bold" data-testid="text-members-with-modules">{membersWithModules}</p>
            <p className="text-[10px] text-muted-foreground">/{totalMembers} kişi</p>
          </div>
        </div>

        {pendingMembers.length > 0 && (
          <div className="p-2 rounded-md bg-yellow-500/10" data-testid="panel-pending-members">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="w-3 h-3 text-yellow-500 shrink-0" />
              <span className="text-[11px] font-medium">Eğitim Tamamlamamış ({pendingMembers.length})</span>
            </div>
            <div className="space-y-1">
              {pendingMembers.slice(0, 4).map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-1.5"
                  data-testid={`text-pending-member-${member.userId}`}
                >
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[8px]">
                      {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] truncate">
                    {member.firstName} {member.lastName}
                  </span>
                  <Badge variant="secondary" className="text-[9px] ml-auto shrink-0">
                    {member.levelTitleTr}
                  </Badge>
                </div>
              ))}
              {pendingMembers.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{pendingMembers.length - 4} kişi daha
                </span>
              )}
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-between p-1.5 rounded-md hover-elevate cursor-pointer"
          onClick={() => setLocation("/akademi")}
          data-testid="link-team-training-detail"
        >
          <span className="text-[11px] text-muted-foreground">Detaylı Görünüm</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

interface BranchTrainingData {
  branchId: number;
  branchName: string;
  totalMembers: number;
  membersWithTraining: number;
  participationRate: number;
  avgCompositeScore: number;
}

export function BranchTrainingComparisonWidget() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: teamData, isLoading: teamLoading } = useQuery<any>({
    queryKey: ['/api/academy/team-progress'],
    enabled: !!user,
  });

  const { data: branchesData, isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    enabled: !!user,
  });

  const isLoading = teamLoading || branchesLoading;

  if (isLoading) {
    return (
      <Card data-testid="widget-branch-training-loading">
        <CardContent className="p-3">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const team: TeamMember[] = teamData?.team || [];
  const branches: any[] = branchesData || [];

  if (team.length === 0 || branches.length === 0) return null;

  const branchMap = new Map<number, string>();
  for (const b of branches) {
    branchMap.set(b.id, b.name || b.branchName || `Şube #${b.id}`);
  }

  const branchStats = new Map<number, { total: number; trained: number; scoreSum: number }>();
  for (const member of team) {
    const bid = (member as any).branchId;
    if (!bid) continue;
    const existing = branchStats.get(bid) || { total: 0, trained: 0, scoreSum: 0 };
    existing.total++;
    if (member.completedModules > 0) existing.trained++;
    existing.scoreSum += member.compositeScore || 0;
    branchStats.set(bid, existing);
  }

  const branchTraining: BranchTrainingData[] = [];
  Array.from(branchStats.entries()).forEach(([branchId, stats]) => {
    branchTraining.push({
      branchId,
      branchName: branchMap.get(branchId) || `Şube #${branchId}`,
      totalMembers: stats.total,
      membersWithTraining: stats.trained,
      participationRate: stats.total > 0 ? Math.round((stats.trained / stats.total) * 100) : 0,
      avgCompositeScore: stats.total > 0 ? Math.round(stats.scoreSum / stats.total) : 0,
    });
  });

  branchTraining.sort((a, b) => b.participationRate - a.participationRate);

  const topBranches = branchTraining.slice(0, 3);
  const bottomBranches = branchTraining.length > 3
    ? branchTraining.slice(-3).reverse()
    : [];

  return (
    <Card data-testid="widget-branch-training-comparison">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          Şube Eğitim Karşılaştırması
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {topBranches.length > 0 && (
          <div data-testid="panel-top-branches">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-[11px] font-medium text-green-600 dark:text-green-400">En Yüksek</span>
            </div>
            <div className="space-y-1">
              {topBranches.map((branch, idx) => (
                <div
                  key={branch.branchId}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-green-500/5"
                  data-testid={`card-top-branch-${branch.branchId}`}
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                  <span className="text-[11px] font-medium truncate flex-1">{branch.branchName}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Progress value={branch.participationRate} className="h-1 w-12" />
                    <span className="text-[11px] font-bold text-green-500">%{branch.participationRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bottomBranches.length > 0 && (
          <div data-testid="panel-bottom-branches">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400">En Düşük</span>
            </div>
            <div className="space-y-1">
              {bottomBranches.map((branch) => (
                <div
                  key={branch.branchId}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-red-500/5"
                  data-testid={`card-bottom-branch-${branch.branchId}`}
                >
                  <span className="text-[11px] font-medium truncate flex-1">{branch.branchName}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Progress value={branch.participationRate} className="h-1 w-12" />
                    <span className="text-[11px] font-bold text-red-500">%{branch.participationRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-between p-1.5 rounded-md hover-elevate cursor-pointer"
          onClick={() => setLocation("/akademi")}
          data-testid="link-branch-training-detail"
        >
          <span className="text-[11px] text-muted-foreground">Tüm Şubeleri Gör</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
