import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Target,
  Shield,
  CheckSquare,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  GraduationCap,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface GateInfo {
  gateNumber: number;
  gateTitleTr: string;
  status: string;
  passed: boolean;
}

interface ChecklistRate {
  total: number;
  completed: number;
  rate: number;
}

interface MentorOnboarding {
  id: number;
  userId: string;
  status: string;
  overallProgress: number | null;
  startDate: string | null;
}

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number | null;
  levelNumber: number;
  levelTitleTr: string;
  compositeScore: number;
  completedModules: number;
  lastUpdated: string | null;
  currentGate: GateInfo | null;
  checklistRate: ChecklistRate;
  mentorOnboarding: MentorOnboarding | null;
}

interface TeamProgressResponse {
  team: TeamMember[];
  mentorOnboardings: MentorOnboarding[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300",
  2: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  3: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  4: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  5: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

const GATE_COLORS: Record<string, string> = {
  passed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  in_progress: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

function ScoreTrend({ score }: { score: number }) {
  if (score >= 70) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (score >= 40) return <Minus className="h-3 w-3 text-muted-foreground" />;
  return <TrendingDown className="h-3 w-3 text-red-500" />;
}

export default function CoachTeamProgress() {
  const { data: response, isLoading, isError, refetch } = useQuery<TeamProgressResponse>({
    queryKey: ['/api/academy/team-progress'],
  });

  const team = Array.isArray(response) ? response : response?.team || [];
  const mentorOnboardings = Array.isArray(response) ? [] : response?.mentorOnboardings || [];

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="space-y-4 p-4" data-testid="team-progress-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const groupedByLevel = (team || []).reduce((acc, member) => {
    const level = member.levelNumber;
    if (!acc[level]) acc[level] = [];
    acc[level].push(member);
    return acc;
  }, {} as Record<number, TeamMember[]>);

  const totalMembers = (team || []).length;
  const avgScore = totalMembers > 0
    ? Math.round((team || []).reduce((sum, m) => sum + (m.compositeScore || 0), 0) / totalMembers)
    : 0;
  const avgChecklist = totalMembers > 0
    ? Math.round((team || []).reduce((sum, m) => sum + (m.checklistRate?.rate || 0), 0) / totalMembers)
    : 0;

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-team-progress">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Takim Ilerlemesi</h2>
          <Badge variant="secondary">{totalMembers} kisi</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="stat-total">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalMembers}</p>
            <p className="text-xs text-muted-foreground">Toplam Personel</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-score">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">Ort. Skor</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-levels">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{Object.keys(groupedByLevel).length}</p>
            <p className="text-xs text-muted-foreground">Aktif Seviye</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-checklist">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">%{avgChecklist}</p>
            <p className="text-xs text-muted-foreground">Checklist Ort.</p>
          </CardContent>
        </Card>
      </div>

      {mentorOnboardings.length > 0 && (
        <Card data-testid="mentor-onboardings">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Mentor Oldugunuz Onboarding'ler</span>
              <Badge variant="secondary">{mentorOnboardings.length}</Badge>
            </div>
            <div className="space-y-2">
              {mentorOnboardings.map(ob => {
                const member = team.find(m => m.userId === ob.userId);
                return (
                  <div key={ob.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50" data-testid={`mentor-onboarding-${ob.id}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(member?.firstName?.[0] || '?') + (member?.lastName?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate">
                        {member ? `${member.firstName} ${member.lastName}` : ob.userId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={ob.overallProgress || 0} className="h-1.5 w-16" />
                      <span className="text-xs text-muted-foreground">%{ob.overallProgress || 0}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{ob.status}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedByLevel)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([level, members]) => {
          const levelColor = LEVEL_COLORS[Number(level)] || LEVEL_COLORS[1];
          const levelTitle = members[0]?.levelTitleTr || `Seviye ${level}`;
          return (
            <div key={level} data-testid={`level-group-${level}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`px-2 py-0.5 rounded-md text-xs font-semibold ${levelColor}`}>
                  Seviye {level}
                </div>
                <span className="text-sm font-medium">{levelTitle}</span>
                <Badge variant="outline">{members.length}</Badge>
              </div>
              <div className="space-y-2">
                {members.map(member => (
                  <Card key={member.userId} className="hover-elevate" data-testid={`member-card-${member.userId}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {member.firstName} {member.lastName}
                            </span>
                            <Badge variant="outline">
                              {ROLE_LABELS[member.role] || member.role}
                            </Badge>
                            {member.currentGate && (
                              <Badge variant="secondary" className={`text-[10px] ${GATE_COLORS[member.currentGate.passed ? 'passed' : member.currentGate.status] || ''}`} data-testid={`gate-badge-${member.userId}`}>
                                <Shield className="h-2.5 w-2.5 mr-0.5" />
                                Gate-{member.currentGate.gateNumber}
                                {member.currentGate.passed ? ' Gecti' : member.currentGate.status === 'failed' ? ' Kaldi' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1">
                              <Progress value={Math.min(100, member.compositeScore)} className="h-1.5" />
                            </div>
                            <div className="flex items-center gap-1">
                              <ScoreTrend score={member.compositeScore} />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.round(member.compositeScore)} puan
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`modules-${member.userId}`}>
                              <GraduationCap className="h-3 w-3" />
                              <span>{member.completedModules} modul</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`checklist-${member.userId}`}>
                              <CheckSquare className="h-3 w-3" />
                              <span>%{member.checklistRate?.rate || 0} checklist</span>
                            </div>
                            {member.mentorOnboarding && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`onboarding-${member.userId}`}>
                                <BookOpen className="h-3 w-3" />
                                <span>Onboarding %{member.mentorOnboarding.overallProgress || 0}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Target className="h-3 w-3" />
                          <span>{member.completedModules}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

      {totalMembers === 0 && (
        <Card data-testid="no-team">
          <CardContent className="p-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Takım üyesi bulunamadı</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
