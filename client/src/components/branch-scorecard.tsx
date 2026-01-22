import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, Users, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface BranchScore {
  score: number;
  previousScore: number;
  tasksCompleted: number;
  tasksPending: number;
  checklistRate: number;
  activeFaults: number;
  onTimeRate: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Mükemmel';
  if (score >= 75) return 'İyi';
  if (score >= 60) return 'Orta';
  if (score >= 40) return 'Geliştirilmeli';
  return 'Kritik';
}

export function BranchScorecard() {
  const { user } = useAuth();
  
  const { data: scoreData, isLoading, isError, refetch } = useQuery<BranchScore>({
    queryKey: ["/api/branch/score"],
    enabled: !!user?.branchId,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-center min-h-[100px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[100px] gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-xs text-muted-foreground">Skor yüklenemedi</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) {
    return null;
  }

  const scoreDiff = scoreData.score - scoreData.previousScore;
  const isImproved = scoreDiff > 0;

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Bugünkü Skor</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(scoreData.score)}`}>
                {scoreData.score}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="text-right">
            <Badge 
              variant={isImproved ? "default" : "destructive"} 
              className="mb-1"
            >
              {getScoreLabel(scoreData.score)}
            </Badge>
            <div className={`flex items-center gap-1 text-sm ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
              {isImproved ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isImproved ? '+' : ''}{scoreDiff} dün</span>
            </div>
          </div>
        </div>

        <Progress value={scoreData.score} className="h-2 mb-3" />

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-background/50">
            <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{scoreData.tasksCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Tamamlanan</p>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{scoreData.tasksPending}</p>
            <p className="text-[10px] text-muted-foreground">Bekleyen</p>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">%{scoreData.checklistRate}</p>
            <p className="text-[10px] text-muted-foreground">Checklist</p>
          </div>
          <div className="p-2 rounded-lg bg-background/50">
            <AlertTriangle className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{scoreData.activeFaults}</p>
            <p className="text-[10px] text-muted-foreground">Arıza</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
