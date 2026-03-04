import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  User,
  Send,
} from "lucide-react";

interface PendingAttempt {
  id: number;
  gateId: number;
  userId: string;
  attemptNumber: number;
  quizScore: number | null;
  quizPassed: boolean | null;
  practicalScore: number | null;
  practicalPassed: boolean | null;
  attendanceRate: number | null;
  attendancePassed: boolean | null;
  status: string;
  createdAt: string;
  gateTitleTr: string;
  gateNumber: number;
  quizPassingScore: number | null;
  userName: string;
  userRole: string;
  userBranchId: number | null;
}

function AttemptEvaluationForm({ attempt }: { attempt: PendingAttempt }) {
  const { toast } = useToast();
  const [quizScore, setQuizScore] = useState<string>(attempt.quizScore?.toString() || "");
  const [practicalScore, setPracticalScore] = useState<string>(attempt.practicalScore?.toString() || "");
  const [attendanceRate, setAttendanceRate] = useState<string>(attempt.attendanceRate?.toString() || "");
  const [expanded, setExpanded] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await apiRequest('PATCH', `/api/academy/gate-attempts/${attempt.id}`, updates);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/academy/gate-attempts/pending'] });
      if (data.status === 'passed') {
        toast({ title: "Gate Geçildi!", description: `${attempt.userName} başarıyla bir sonraki seviyeye terfi edildi.` });
      } else if (data.status === 'failed') {
        toast({ title: "Gate Başarısız", description: `${attempt.userName} gate sınavında başarısız oldu.`, variant: "destructive" });
      } else {
        toast({ title: "Güncellendi", description: "Skor kaydedildi." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitScores = () => {
    const updates: Record<string, any> = {};
    if (quizScore && attempt.quizPassed === null) {
      updates.quizScore = parseInt(quizScore);
    }
    if (practicalScore && attempt.practicalPassed === null) {
      updates.practicalScore = parseInt(practicalScore);
      updates.practicalPassed = parseInt(practicalScore) >= 70;
    }
    if (attendanceRate && attempt.attendancePassed === null) {
      updates.attendanceRate = parseInt(attendanceRate);
      updates.attendancePassed = parseInt(attendanceRate) >= 80;
    }
    if (Object.keys(updates).length === 0) {
      toast({ title: "Uyarı", description: "Lütfen en az bir skor girin.", variant: "destructive" });
      return;
    }
    updateMutation.mutate(updates);
  };

  const roleLabels: Record<string, string> = {
    stajyer: "Stajyer",
    bar_buddy: "Bar Buddy",
    barista: "Barista",
    supervisor_buddy: "Sv. Buddy",
    supervisor: "Supervisor",
  };

  return (
    <Card data-testid={`gate-attempt-${attempt.id}`}>
      <CardContent className="p-0">
        <button
          className="w-full flex items-center justify-between gap-2 p-3 text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`toggle-attempt-${attempt.id}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-medium block truncate" data-testid={`text-attempt-user-${attempt.id}`}>
                {attempt.userName}
              </span>
              <span className="text-xs text-muted-foreground">
                {roleLabels[attempt.userRole] || attempt.userRole} — {attempt.gateTitleTr}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">#{attempt.attemptNumber}</Badge>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t">
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Quiz Skor
                  {attempt.quizPassed === true && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {attempt.quizPassed === false && <XCircle className="h-3 w-3 text-red-500" />}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  value={quizScore}
                  onChange={(e) => setQuizScore(e.target.value)}
                  disabled={attempt.quizPassed !== null}
                  data-testid={`input-quiz-score-${attempt.id}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Pratik Skor
                  {attempt.practicalPassed === true && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {attempt.practicalPassed === false && <XCircle className="h-3 w-3 text-red-500" />}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  value={practicalScore}
                  onChange={(e) => setPracticalScore(e.target.value)}
                  disabled={attempt.practicalPassed !== null}
                  data-testid={`input-practical-score-${attempt.id}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Devam %
                  {attempt.attendancePassed === true && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {attempt.attendancePassed === false && <XCircle className="h-3 w-3 text-red-500" />}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  value={attendanceRate}
                  onChange={(e) => setAttendanceRate(e.target.value)}
                  disabled={attempt.attendancePassed !== null}
                  data-testid={`input-attendance-${attempt.id}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className={attempt.quizPassed === true ? "text-green-600" : attempt.quizPassed === false ? "text-red-600" : ""}>
                  {attempt.quizPassed === true ? "Quiz OK" : attempt.quizPassed === false ? "Quiz Kaldı" : "Quiz —"}
                </span>
                <span className={attempt.practicalPassed === true ? "text-green-600" : attempt.practicalPassed === false ? "text-red-600" : ""}>
                  {attempt.practicalPassed === true ? "Pratik OK" : attempt.practicalPassed === false ? "Pratik Kaldı" : "Pratik —"}
                </span>
                <span className={attempt.attendancePassed === true ? "text-green-600" : attempt.attendancePassed === false ? "text-red-600" : ""}>
                  {attempt.attendancePassed === true ? "Devam OK" : attempt.attendancePassed === false ? "Devam Kaldı" : "Devam —"}
                </span>
              </div>

              <Button
                size="sm"
                onClick={handleSubmitScores}
                disabled={updateMutation.isPending}
                className="gap-1.5"
                data-testid={`button-submit-scores-${attempt.id}`}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GateRequestsWidget() {
  const { data: attempts, isLoading } = useQuery<PendingAttempt[]>({
    queryKey: ['/api/academy/gate-attempts/pending'],
  });

  if (isLoading) {
    return (
      <Card data-testid="gate-requests-loading">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Bekleyen Gate Talepleri
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!attempts || attempts.length === 0) return null;

  return (
    <Card data-testid="gate-requests-widget">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          Bekleyen Gate Talepleri
          <Badge variant="destructive">{attempts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {attempts.map((attempt) => (
          <AttemptEvaluationForm key={attempt.id} attempt={attempt} />
        ))}
      </CardContent>
    </Card>
  );
}
