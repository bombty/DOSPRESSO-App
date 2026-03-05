import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  AlertTriangle,
  Factory,
  RefreshCw,
  CheckCircle,
  XCircle,
  Flame,
  PackageX,
  MessageSquareWarning,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function ScoreCircle({ score, label, icon: Icon, color }: { score: number; label: string; icon: any; color: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke={score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444"}
            strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${scoreColor}`}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-center">{label}</span>
      </div>
    </div>
  );
}

export default function FabrikaYonetimSkoru() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isFabrikaMudur = user?.role === "fabrika_mudur" || user?.role === "admin";
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: scores, isLoading } = useQuery<any[]>({
    queryKey: ["/api/factory-management-scores", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/factory-management-scores?year=${selectedYear}`);
      if (!res.ok) throw new Error("Skorlar alınamadı");
      return res.json();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      const res = await apiRequest("POST", "/api/factory-management-scores/calculate", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Skor hesaplandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/factory-management-scores"] });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthScore = scores?.find((s: any) => s.month === currentMonth);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 md:p-4" data-testid="fabrika-yonetim-skoru-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Fabrika Yönetim Skoru</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28" data-testid="select-score-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFabrikaMudur && (
            <Button
              variant="outline"
              onClick={() => calculateMutation.mutate({ month: currentMonth, year: selectedYear })}
              disabled={calculateMutation.isPending}
              data-testid="button-calculate-score"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${calculateMutation.isPending ? "animate-spin" : ""}`} />
              Skoru Hesapla
            </Button>
          )}
        </div>
      </div>

      {/* Current month overview */}
      {currentMonthScore && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {MONTHS[currentMonth - 1]} {selectedYear} - Genel Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`text-5xl font-bold ${
                  currentMonthScore.overall_score >= 80 ? "text-green-600" :
                  currentMonthScore.overall_score >= 50 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {currentMonthScore.overall_score}
                </div>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                <ScoreCircle
                  score={currentMonthScore.inventory_count_score || 0}
                  label="Sayım"
                  icon={ClipboardList}
                  color="text-blue-500"
                />
                <ScoreCircle
                  score={currentMonthScore.waste_score || 0}
                  label="Zayiat"
                  icon={Flame}
                  color="text-orange-500"
                />
                <ScoreCircle
                  score={currentMonthScore.production_error_score || 0}
                  label="Üretim Hatası"
                  icon={PackageX}
                  color="text-red-500"
                />
                <ScoreCircle
                  score={currentMonthScore.wrong_production_score || 0}
                  label="Yanlış Üretim"
                  icon={AlertTriangle}
                  color="text-amber-500"
                />
                <ScoreCircle
                  score={currentMonthScore.branch_complaint_score || 0}
                  label="Şube Şikayetleri"
                  icon={MessageSquareWarning}
                  color="text-purple-500"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${currentMonthScore.inventory_count_completed ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-muted-foreground">Sayım:</span>
                <span>{currentMonthScore.inventory_count_completed ? "Tamamlandı" : "Yapılmadı"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Zayiat:</span>
                <span>{currentMonthScore.waste_count || 0} adet</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Üretim Hatası:</span>
                <span>{currentMonthScore.production_error_count || 0} adet</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Şube Şikayeti:</span>
                <span>{currentMonthScore.branch_complaint_count || 0} adet</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly scores table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{selectedYear} Aylık Skorlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MONTHS.map((monthName, idx) => {
              const monthNum = idx + 1;
              const score = scores?.find((s: any) => s.month === monthNum);
              if (!score) {
                return (
                  <Card key={idx} className="opacity-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{monthName}</span>
                        <Badge variant="outline">Hesaplanmadı</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card key={idx} data-testid={`card-score-${monthNum}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{monthName}</span>
                      <Badge variant={score.overall_score >= 80 ? "default" : score.overall_score >= 50 ? "secondary" : "destructive"}>
                        {score.overall_score}/100
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                      {[
                        { key: "inventory_count_score", label: "S" },
                        { key: "waste_score", label: "Z" },
                        { key: "production_error_score", label: "Ü" },
                        { key: "wrong_production_score", label: "Y" },
                        { key: "branch_complaint_score", label: "Ş" },
                      ].map((item) => {
                        const val = score[item.key] || 0;
                        return (
                          <div key={item.key} className="text-center">
                            <div className={`text-xs font-bold ${val >= 80 ? "text-green-600" : val >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                              {val}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {score.inventory_count_completed ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>Sayım {score.inventory_count_completed ? (score.inventory_count_on_time ? "zamanında" : "gecikmeli") : "yapılmadı"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
