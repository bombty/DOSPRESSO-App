import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  TrendingUp,
  ChevronRight,
  Eye,
  Target,
} from "lucide-react";

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
}

const ROLE_LABELS: Record<string, string> = {
  stajyer: "Stajyer",
  bar_buddy: "Bar Buddy",
  barista: "Barista",
  supervisor_buddy: "Sup. Buddy",
  supervisor: "Supervisor",
  mudur: "Müdür",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300",
  2: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  3: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  4: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  5: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

export default function CoachTeamProgress() {
  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/academy/team-progress'],
  });

  if (isLoading) {
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

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-team-progress">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Takım İlerlemesi</h2>
          <Badge variant="secondary">{totalMembers} kişi</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
      </div>

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
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1">
                              <Progress value={Math.min(100, member.compositeScore)} className="h-1.5" />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {Math.round(member.compositeScore)} puan
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="h-3 w-3" />
                          <span>{member.completedModules} modül</span>
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
