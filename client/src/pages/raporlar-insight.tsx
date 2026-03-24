import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, AlertOctagon, CheckCircle2, RefreshCw, Loader2, TrendingUp, Building2, Filter } from "lucide-react";

interface BranchInsight {
  branchId: number;
  branchName: string;
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  recommendation: string;
  data: Record<string, any>;
  createdAt: string;
}

interface InsightSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  branchCount: number;
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "critical")
    return <Badge variant="destructive" data-testid="badge-critical">Kritik</Badge>;
  if (severity === "warning")
    return <Badge className="bg-amber-500 text-white" data-testid="badge-warning">Uyarı</Badge>;
  return <Badge variant="secondary" data-testid="badge-info">Olumlu</Badge>;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertOctagon className="h-5 w-5 text-red-500 flex-shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
  return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
}

export default function RaporlarInsight() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const { data: insights, isLoading } = useQuery<BranchInsight[]>({
    queryKey: ["/api/reports/insights"],
  });

  const { data: summary } = useQuery<InsightSummary>({
    queryKey: ["/api/reports/insights/summary"],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports/insights/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/insights/summary"] });
      toast({ title: "Yenilendi", description: "Insight analizi tamamlandı" });
    },
  });

  const filteredInsights = (insights || []).filter((i) => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (branchFilter !== "all" && String(i.branchId) !== branchFilter) return false;
    return true;
  });

  const branches = [...new Map((insights || []).map((i) => [i.branchId, i.branchName])).entries()];

  const kpiItems = [
    { label: "Toplam", value: summary?.total || 0, active: severityFilter === "all", onClick: () => setSeverityFilter("all"), color: "text-foreground" },
    { label: "Kritik", value: summary?.critical || 0, active: severityFilter === "critical", onClick: () => setSeverityFilter("critical"), color: "text-red-500" },
    { label: "Uyarı", value: summary?.warning || 0, active: severityFilter === "warning", onClick: () => setSeverityFilter("warning"), color: "text-amber-500" },
    { label: "Olumlu", value: summary?.info || 0, active: severityFilter === "info", onClick: () => setSeverityFilter("info"), color: "text-green-500" },
  ];

  return (
    <div className="space-y-4" data-testid="insight-report-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Şube Insight Raporu</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-insights"
        >
          {refreshMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Yenile
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {kpiItems.map((kpi) => (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className={`flex flex-col items-center px-4 py-2 rounded-lg border min-w-[80px] transition-colors ${
                kpi.active ? "bg-primary/10 border-primary" : "bg-muted/50 border-transparent hover-elevate"
              }`}
              data-testid={`kpi-${kpi.label.toLowerCase()}`}
            >
              <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </button>
          ))}
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50 min-w-[80px]">
            <span className="text-xl font-bold">{summary?.branchCount || 0}</span>
            <span className="text-xs text-muted-foreground">Şube</span>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-branch-filter">
            <SelectValue placeholder="Tüm Şubeler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {branches.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-muted-foreground">Şu anda tespit edilen bulgu yok</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInsights.map((insight, idx) => (
            <Card key={`${insight.branchId}-${insight.ruleId}-${idx}`} data-testid={`insight-card-${idx}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <SeverityIcon severity={insight.severity} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={insight.severity} />
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {insight.branchName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{insight.ruleName}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{insight.recommendation}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                      {insight.data.staffCount > 0 && <span>Personel: {insight.data.staffCount}</span>}
                      {insight.data.customerComplaints > 0 && <span>Şikayet: {insight.data.customerComplaints}</span>}
                      {insight.data.equipmentFaults > 0 && <span>Arıza: {insight.data.equipmentFaults}</span>}
                      {insight.data.checklistCompletion > 0 && <span>Checklist: %{insight.data.checklistCompletion.toFixed(0)}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
