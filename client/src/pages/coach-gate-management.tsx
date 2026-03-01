import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  ChevronRight,
  Eye,
} from "lucide-react";

interface Gate {
  id: number;
  gateNumber: number;
  titleTr: string;
  titleEn: string | null;
  fromLevelId: number;
  toLevelId: number;
  minDaysInLevel: number;
  quizPassingScore: number;
  retryCooldownDays: number;
  maxRetries: number;
  isActive: boolean;
  fromLevelTitle: string | null;
  fromLevelRole: string | null;
}

export default function CoachGateManagement() {
  const { toast } = useToast();

  const { data: gates, isLoading } = useQuery<Gate[]>({
    queryKey: ['/api/academy/gates'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="gate-management-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" data-testid="coach-gate-management">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Gate Yönetimi</h2>
        <Badge variant="secondary">{(gates || []).length} gate</Badge>
      </div>

      <div className="space-y-3">
        {(gates || []).map((gate) => (
          <Card key={gate.id} data-testid={`gate-card-${gate.gateNumber}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {gate.gateNumber}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{gate.titleTr}</h3>
                    <p className="text-xs text-muted-foreground">
                      {gate.fromLevelTitle || '—'} <ChevronRight className="h-3 w-3 inline" /> Sonraki seviye
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" data-testid={`button-gate-detail-${gate.gateNumber}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Detay
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Min Gün</p>
                  <p className="font-semibold text-sm" data-testid={`text-min-days-${gate.gateNumber}`}>{gate.minDaysInLevel || 30}</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Quiz Geçme Notu</p>
                  <p className="font-semibold text-sm" data-testid={`text-quiz-score-${gate.gateNumber}`}>{gate.quizPassingScore || 80}%</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Bekleme (Gün)</p>
                  <p className="font-semibold text-sm" data-testid={`text-cooldown-${gate.gateNumber}`}>{gate.retryCooldownDays || 7}</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Max Deneme</p>
                  <p className="font-semibold text-sm" data-testid={`text-max-retries-${gate.gateNumber}`}>{gate.maxRetries || 3}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(gates || []).length === 0 && (
        <Card data-testid="no-gates">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Gate tanımı bulunamadı</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
