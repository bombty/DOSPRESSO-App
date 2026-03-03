import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, ClipboardCheck, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

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
  if (score >= 90) return 'Mukemmel';
  if (score >= 75) return 'Iyi';
  if (score >= 60) return 'Orta';
  if (score >= 40) return 'Gelistirilmeli';
  return 'Kritik';
}

function generateAISummary(scoreData: BranchScore): string {
  const score = scoreData.score;
  const parts: string[] = [];
  if (score >= 80) {
    parts.push("Şube performansı iyi seviyede.");
  } else if (score >= 60) {
    parts.push("Şube performansı orta seviyede, iyileştirme alanları mevcut.");
  } else {
    parts.push("Şube performansı kritik seviyede, acil aksiyon gerekiyor.");
  }
  if (scoreData.tasksPending > 3) {
    parts.push(`${scoreData.tasksPending} bekleyen görev önceliklendirilmeli.`);
  }
  if (scoreData.activeFaults > 0) {
    parts.push(`${scoreData.activeFaults} aktif arıza takip ediliyor.`);
  }
  if (scoreData.checklistRate < 80) {
    parts.push("Checklist tamamlama oranı arttırılmalı.");
  }
  return parts.join(" ");
}

export function BranchScorecard() {
  const { user } = useAuth();
  const [showAI, setShowAI] = useState(false);
  
  const { data: scoreData, isLoading, isError, refetch } = useQuery<BranchScore>({
    queryKey: ["/api/branch/score"],
    enabled: !!user?.branchId,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center justify-center min-h-[80px]">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-3 flex flex-col items-center justify-center min-h-[80px] gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-xs text-muted-foreground">Skor yuklenemedi</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="button-retry-score">
            <RefreshCw className="h-3 w-3 mr-1" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) return null;

  const scoreDiff = scoreData.score - scoreData.previousScore;
  const isImproved = scoreDiff > 0;

  return (
    <Card data-testid="branch-scorecard">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold ${getScoreColor(scoreData.score)}`}>
              {scoreData.score}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isImproved ? "default" : "destructive"} className="text-[10px]">
              {getScoreLabel(scoreData.score)}
            </Badge>
            <div className={`flex items-center gap-0.5 text-xs ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
              {isImproved ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{isImproved ? '+' : ''}{scoreDiff}</span>
            </div>
          </div>
        </div>

        <Progress value={scoreData.score} className="h-1.5 mb-3" />

        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="p-1.5 rounded-md bg-muted/50">
            <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-500 mb-0.5" />
            <p className="text-sm font-bold">{scoreData.tasksCompleted}</p>
            <p className="text-[9px] text-muted-foreground">Biten</p>
          </div>
          <div className="p-1.5 rounded-md bg-muted/50">
            <Clock className="h-3.5 w-3.5 mx-auto text-yellow-500 mb-0.5" />
            <p className="text-sm font-bold">{scoreData.tasksPending}</p>
            <p className="text-[9px] text-muted-foreground">Bekleyen</p>
          </div>
          <div className="p-1.5 rounded-md bg-muted/50">
            <ClipboardCheck className="h-3.5 w-3.5 mx-auto text-blue-500 mb-0.5" />
            <p className="text-sm font-bold">%{scoreData.checklistRate}</p>
            <p className="text-[9px] text-muted-foreground">Checklist</p>
          </div>
          <div className="p-1.5 rounded-md bg-muted/50">
            <AlertTriangle className="h-3.5 w-3.5 mx-auto text-orange-500 mb-0.5" />
            <p className="text-sm font-bold">{scoreData.activeFaults}</p>
            <p className="text-[9px] text-muted-foreground">Ar\u0131za</p>
          </div>
        </div>

        <button
          onClick={() => setShowAI(!showAI)}
          className="w-full mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
          data-testid="button-ai-summary-toggle"
        >
          <Sparkles className="h-3 w-3" />
          {showAI ? 'Gizle' : 'AI Ozet'}
        </button>

        {showAI && (
          <div className="mt-1 p-2 rounded-md bg-primary/5 border border-primary/10">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {generateAISummary(scoreData)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
