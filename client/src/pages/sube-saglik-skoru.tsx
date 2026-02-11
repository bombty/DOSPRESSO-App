import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  MapPin,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface BranchHealthSummary {
  branchId: number;
  branchName: string;
  inspectionScore: number | null;
  totalInspections: number;
  openComplaints: number;
  totalComplaints: number;
}

interface BranchHealthDetail {
  branch: { id: number; name: string };
  audits: Array<{
    id: number;
    auditDate: string;
    overallScore: number;
    cleanlinessScore: number;
    staffBehaviorScore: number;
    productPresentationScore: number;
    [key: string]: any;
  }>;
  complaints: Array<{
    id: number;
    productName: string;
    complaintType: string;
    severity: string;
    status: string;
    createdAt: string;
    reporterName: string;
  }>;
  categoryAverages: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  exteriorScore: "Dış Mekan",
  buildingAppearanceScore: "Bina Görünüş",
  barLayoutScore: "Bar Düzeni",
  storageScore: "Depo",
  productPresentationScore: "Ürün Sunumu",
  staffBehaviorScore: "Personel Davranış",
  dressCodeScore: "Kıyafet",
  cleanlinessScore: "Temizlik",
};

function getScoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number | null) {
  if (score === null) return "bg-muted";
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 60) return "[&>div]:bg-yellow-500";
  if (score >= 40) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

function getBarColor(value: number) {
  if (value >= 80) return "hsl(142, 71%, 45%)";
  if (value >= 60) return "hsl(48, 96%, 53%)";
  if (value >= 40) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
}

function getSeverityLabel(severity: string) {
  switch (severity) {
    case "critical": return "Kritik";
    case "high": return "Yüksek";
    case "medium": return "Orta";
    case "low": return "Düşük";
    default: return severity;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "new": return "Yeni";
    case "investigating": return "İnceleniyor";
    case "resolved": return "Çözüldü";
    case "rejected": return "Reddedildi";
    default: return status;
  }
}

export default function SubeSaglikSkoru() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const { data: healthScores, isLoading } = useQuery<BranchHealthSummary[]>({
    queryKey: ["/api/branch-health-scores"],
  });

  const { data: branchDetail, isLoading: detailLoading } = useQuery<BranchHealthDetail>({
    queryKey: ["/api/branch-health-scores", selectedBranchId],
    enabled: !!selectedBranchId,
  });

  const aiMutation = useMutation({
    mutationFn: async (branchId: number) => {
      const res = await apiRequest("POST", "/api/branch-health-ai-summary", {
        branchId,
      });
      return res.json();
    },
    onSuccess: (data: { summary: string }) => {
      setAiSummary(data.summary);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "AI özeti oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  function handleBranchClick(branchId: number) {
    setSelectedBranchId(branchId);
    setAiSummary(null);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setSelectedBranchId(null);
      setAiSummary(null);
    }
  }

  const chartData = branchDetail
    ? Object.entries(branchDetail.categoryAverages).map(([key, value]) => ({
        name: CATEGORY_LABELS[key] || key,
        value,
      }))
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Şube Sağlık Skorları
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tüm şubelerin denetim sonuçları ve şikayet durumları
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : !healthScores?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Henüz şube verisi bulunmuyor
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthScores.map((branch) => (
            <Card
              key={branch.branchId}
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => handleBranchClick(branch.branchId)}
              data-testid={`card-branch-${branch.branchId}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {branch.branchName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Denetim Skoru</span>
                    <span
                      className={`text-lg font-bold ${getScoreColor(branch.inspectionScore)}`}
                      data-testid={`text-score-${branch.branchId}`}
                    >
                      {branch.inspectionScore !== null
                        ? `${branch.inspectionScore}/100`
                        : "N/A"}
                    </span>
                  </div>
                  <Progress
                    value={branch.inspectionScore ?? 0}
                    className={`h-2 ${getProgressColor(branch.inspectionScore)}`}
                    data-testid={`progress-score-${branch.branchId}`}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {branch.openComplaints > 0 && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-muted-foreground">Açık Şikayet</span>
                  </div>
                  <Badge
                    variant={branch.openComplaints > 0 ? "destructive" : "secondary"}
                    className="text-xs"
                    data-testid={`badge-complaints-${branch.branchId}`}
                  >
                    {branch.openComplaints}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Toplam Denetim</span>
                  </div>
                  <span className="font-medium">{branch.totalInspections}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedBranchId} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {branchDetail?.branch.name || "Şube Detayı"}
            </DialogTitle>
            <DialogDescription>
              Şubenin denetim performansı ve şikayet detayları
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : branchDetail ? (
            <div className="space-y-6 py-4">
              {chartData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Kategori Ortalamaları</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [`${value}/100`, "Skor"]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getBarColor(entry.value)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {branchDetail.audits.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Son Denetimler</h3>
                  <div className="space-y-2">
                    {branchDetail.audits.slice(0, 5).map((audit) => (
                      <div
                        key={audit.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        data-testid={`item-audit-${audit.id}`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {audit.auditDate
                              ? format(new Date(audit.auditDate), "dd MMM yyyy", {
                                  locale: tr,
                                })
                              : "-"}
                          </span>
                        </div>
                        <span
                          className={`font-bold ${getScoreColor(audit.overallScore)}`}
                        >
                          {audit.overallScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {branchDetail.complaints.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Ürün Şikayetleri</h3>
                  <div className="space-y-2">
                    {branchDetail.complaints.slice(0, 5).map((complaint) => (
                      <div
                        key={complaint.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                        data-testid={`item-complaint-${complaint.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {complaint.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {complaint.reporterName} -{" "}
                            {complaint.createdAt
                              ? format(new Date(complaint.createdAt), "dd MMM yyyy", {
                                  locale: tr,
                                })
                              : "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {getSeverityLabel(complaint.severity)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusLabel(complaint.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Button
                  onClick={() => aiMutation.mutate(selectedBranchId!)}
                  disabled={aiMutation.isPending}
                  data-testid="button-ai-summary"
                >
                  {aiMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {aiMutation.isPending ? "Analiz ediliyor..." : "AI Analiz"}
                </Button>

                {aiSummary && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Analiz Sonucu
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p
                        className="text-sm whitespace-pre-wrap"
                        data-testid="text-ai-summary"
                      >
                        {aiSummary}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
