import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  CheckCircle,
  Activity,
  Package,
  GraduationCap,
  Wrench,
  ChevronDown,
  ChevronUp,
  Bot,
  Zap,
  ExternalLink,
} from "lucide-react";

interface BranchComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  notes: string[];
  evidenceCount: number;
  insufficientData?: boolean;
}

interface RiskFlag {
  key: string;
  label: string;
  severity: string;
}

interface BranchHealth {
  branchId: number;
  branchName: string;
  totalScore: number;
  level: string;
  components: BranchComponent[];
  trend: { direction: string; delta: number };
  riskFlags: RiskFlag[];
  deepLinks: { details: string };
}

interface BranchHealthReport {
  range: string;
  generatedAt: string;
  branches: BranchHealth[];
}

interface CopilotRisk {
  label: string;
  neden: string;
  severity: "low" | "med" | "high";
}

interface CopilotAksiyon {
  label: string;
  deepLink: string;
  oncelik: "yuksek" | "orta" | "dusuk";
}

interface CopilotResponse {
  durum_ozeti: string;
  ilk_3_risk: CopilotRisk[];
  ilk_3_aksiyon: CopilotAksiyon[];
  fallback_used: boolean;
  generatedAt: string;
  schemaVersion: string;
  rangeUsed: string;
}

type RangeOption = "7d" | "30d" | "90d";

const RANGE_LABELS: Record<RangeOption, string> = {
  "7d": "7 Gun",
  "30d": "30 Gun",
  "90d": "90 Gun",
};

const COMPONENT_ICONS: Record<string, typeof Activity> = {
  inspections: CheckCircle,
  complaints: AlertTriangle,
  equipment: Wrench,
  training: GraduationCap,
  opsHygiene: Shield,
};

function getScoreBadgeClasses(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

function getLevelBadgeClasses(level: string): string {
  if (level === "green") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (level === "yellow") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

function getSeverityClasses(severity: string): string {
  if (severity === "high") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (severity === "med") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
}

const SEVERITY_LABELS: Record<string, string> = {
  high: "Yuksek",
  med: "Orta",
  low: "Dusuk",
};

const SEVERITY_CLASSES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  med: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function AiCopilotCard({ range }: { range: RangeOption }) {
  const { data, isLoading, isError } = useQuery<CopilotResponse>({
    queryKey: ["/api/ai/ops-copilot/summary", range],
    queryFn: async () => {
      const res = await fetch(`/api/ai/ops-copilot/summary?range=${range}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-ai-copilot-loading">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Gunluk Ozet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) return null;

  return (
    <Card data-testid="card-ai-copilot">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">AI Gunluk Ozet</CardTitle>
          {data.fallback_used && (
            <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
              <Zap className="h-3 w-3 mr-1" />
              Deterministik mod
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{data.rangeUsed}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm" data-testid="text-durum-ozeti">{data.durum_ozeti}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.ilk_3_risk.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Risk Alanlari</p>
              <div className="space-y-1.5" data-testid="list-riskler">
                {data.ilk_3_risk.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{risk.label}</p>
                      {risk.neden !== risk.label && (
                        <p className="text-xs text-muted-foreground">{risk.neden}</p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs no-default-hover-elevate no-default-active-elevate flex-shrink-0 ${SEVERITY_CLASSES[risk.severity] ?? ""}`}
                    >
                      {SEVERITY_LABELS[risk.severity] ?? risk.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.ilk_3_aksiyon.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Aksiyon Onerileri</p>
              <div className="space-y-1.5" data-testid="list-aksiyonlar">
                {data.ilk_3_aksiyon.map((aksiyon, i) => (
                  <Link key={i} href={aksiyon.deepLink}>
                    <div
                      className="flex items-center gap-2 rounded-md bg-muted/50 p-2 hover-elevate cursor-pointer"
                      data-testid={`link-aksiyon-${i}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-xs flex-1">{aksiyon.label}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs no-default-hover-elevate no-default-active-elevate flex-shrink-0 ${
                          aksiyon.oncelik === "yuksek"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : aksiyon.oncelik === "orta"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {aksiyon.oncelik === "yuksek" ? "Yuksek" : aksiyon.oncelik === "orta" ? "Orta" : "Dusuk"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ direction, delta }: { direction: string; delta: number }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400" data-testid="trend-up">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-medium">+{delta}</span>
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" data-testid="trend-down">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-medium">{delta}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" data-testid="trend-flat">
      <Minus className="h-4 w-4" />
      <span className="text-xs font-medium">0</span>
    </span>
  );
}

function ComponentScoreBadge({ component }: { component: BranchComponent }) {
  const Icon = COMPONENT_ICONS[component.key] || Activity;
  return (
    <div className="flex items-center gap-1.5" data-testid={`component-${component.key}`}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground truncate max-w-[80px]" title={component.label}>
          {component.label.split(" ")[0]}
        </span>
        <Badge
          variant="secondary"
          className={`text-xs no-default-hover-elevate no-default-active-elevate ${component.insufficientData ? "opacity-50" : getScoreBadgeClasses(component.score)}`}
        >
          {component.score}
        </Badge>
      </div>
    </div>
  );
}

function BranchDetailView({ branch }: { branch: BranchHealth }) {
  return (
    <div className="space-y-4" data-testid={`detail-branch-${branch.branchId}`}>
      <div>
        <h4 className="text-sm font-semibold mb-2">Bilesen Detaylari</h4>
        <div className="space-y-3">
          {branch.components.map((comp) => {
            const Icon = COMPONENT_ICONS[comp.key] || Activity;
            return (
              <div key={comp.key} className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{comp.label}</span>
                    {comp.insufficientData && (
                      <Badge variant="outline" className="text-xs">Yetersiz Veri</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Agirlik: %{Math.round(comp.weight * 100)}</span>
                    <Badge
                      variant="secondary"
                      className={`no-default-hover-elevate no-default-active-elevate ${getScoreBadgeClasses(comp.score)}`}
                    >
                      {comp.score}/100
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${comp.score >= 75 ? "bg-green-500" : comp.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${comp.score}%` }}
                  />
                </div>
                {comp.notes.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-6 list-disc">
                    {comp.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                )}
                <div className="text-xs text-muted-foreground">
                  Kanit sayisi: {comp.evidenceCount}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {branch.riskFlags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Risk Bayraklari</h4>
          <div className="space-y-1.5">
            {branch.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm flex-1">{flag.label}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs no-default-hover-elevate no-default-active-elevate ${getSeverityClasses(flag.severity)}`}
                >
                  {flag.severity === "high" ? "Yuksek" : flag.severity === "med" ? "Orta" : "Dusuk"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SingleBranchView({ branch }: { branch: BranchHealth }) {
  return (
    <Card data-testid="card-single-branch">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg">{branch.branchName}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-sm no-default-hover-elevate no-default-active-elevate ${getLevelBadgeClasses(branch.level)}`}
            data-testid="badge-total-score"
          >
            {branch.totalScore}/100
          </Badge>
          <TrendIndicator direction={branch.trend.direction} delta={branch.trend.delta} />
        </div>
      </CardHeader>
      <CardContent>
        <BranchDetailView branch={branch} />
      </CardContent>
    </Card>
  );
}

export default function SubeSaglikSkoru() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<"name" | "score">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery<BranchHealthReport>({
    queryKey: ["/api/reports/branch-health", range],
    queryFn: async () => {
      const res = await fetch(`/api/reports/branch-health?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const toggleRow = (branchId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const handleSort = (field: "name" | "score") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "score" ? "desc" : "asc");
    }
  };

  const branches = data?.branches || [];

  const sortedBranches = [...branches].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return mul * a.branchName.localeCompare(b.branchName, "tr");
    return mul * (a.totalScore - b.totalScore);
  });

  const avgScore = branches.length > 0
    ? Math.round(branches.reduce((s, b) => s + b.totalScore, 0) / branches.length)
    : 0;
  const atRiskCount = branches.filter((b) => b.level === "red").length;
  const totalRiskFlags = branches.reduce((s, b) => s + b.riskFlags.length, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-sube-saglik">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Sube Saglik Skoru
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sube bazli performans ve risk analizi
          </p>
        </div>
        <div className="flex items-center gap-1" data-testid="range-selector">
          {(["7d", "30d", "90d"] as RangeOption[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
              data-testid={`button-range-${r}`}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground" data-testid="text-empty-state">
              Henuz sube verisi bulunmuyor
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Secilen donemde veri mevcut degil
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <AiCopilotCard range={range} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-avg-score">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ortalama Skor
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" data-testid="text-avg-score">{avgScore}</span>
                  <Badge
                    variant="secondary"
                    className={`no-default-hover-elevate no-default-active-elevate ${getScoreBadgeClasses(avgScore)}`}
                  >
                    /100
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-at-risk">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Riskli Subeler
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" data-testid="text-at-risk-count">{atRiskCount}</span>
                  <span className="text-sm text-muted-foreground">/ {branches.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-risk-flags">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Risk Bayraklari
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold" data-testid="text-risk-flags-count">{totalRiskFlags}</span>
              </CardContent>
            </Card>
          </div>

          {(() => {
            const insufficientCount = branches.reduce((total, b) => {
              return total + b.components.filter(c => c.insufficientData).length;
            }, 0);
            const totalComponents = branches.reduce((total, b) => total + b.components.length, 0);
            const branchesWithInsufficient = branches.filter(b => b.components.some(c => c.insufficientData)).length;
            const avgInsuffPerBranch = branchesWithInsufficient > 0 ? Math.round(insufficientCount / branchesWithInsufficient) : 0;
            const reliability = avgInsuffPerBranch >= 3 ? "low" : avgInsuffPerBranch >= 1 ? "medium" : "high";

            if (insufficientCount === 0) return null;

            return (
              <div
                className={`flex items-start gap-3 rounded-md p-3 text-sm ${
                  reliability === "low"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                }`}
                data-testid="banner-insufficient-data"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">
                    {reliability === "low" ? "Guvenilirlik: Dusuk" : "Veri Uyarisi"}
                  </span>
                  <span className="ml-1">
                    — {branchesWithInsufficient} subede toplam {insufficientCount} bilesen yetersiz veri ile hesaplaniyor.
                    {reliability === "low" && " Skorlar gercegi yansitmayabilir."}
                  </span>
                </div>
              </div>
            );
          })()}

          {branches.length === 1 ? (
            <SingleBranchView branch={branches[0]} />
          ) : (
            <Card data-testid="card-branch-table">
              <CardHeader>
                <CardTitle className="text-base">Sube Listesi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-branches">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th
                          className="text-left p-3 font-medium cursor-pointer select-none"
                          onClick={() => handleSort("name")}
                          data-testid="th-branch-name"
                        >
                          <span className="inline-flex items-center gap-1">
                            Sube
                            {sortField === "name" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th
                          className="text-center p-3 font-medium cursor-pointer select-none"
                          onClick={() => handleSort("score")}
                          data-testid="th-score"
                        >
                          <span className="inline-flex items-center gap-1">
                            Skor
                            {sortField === "score" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th className="text-center p-3 font-medium hidden lg:table-cell">Bilesenler</th>
                        <th className="text-center p-3 font-medium">Trend</th>
                        <th className="text-center p-3 font-medium">Risk</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    {sortedBranches.map((branch) => {
                      const isExpanded = expandedRows.has(branch.branchId);
                      return (
                        <tbody key={branch.branchId}>
                          <tr
                            className="border-b cursor-pointer hover-elevate"
                            onClick={() => toggleRow(branch.branchId)}
                            data-testid={`row-branch-${branch.branchId}`}
                          >
                            <td className="p-3 font-medium">{branch.branchName}</td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`no-default-hover-elevate no-default-active-elevate ${getLevelBadgeClasses(branch.level)}`}
                                data-testid={`badge-score-${branch.branchId}`}
                              >
                                {branch.totalScore}
                              </Badge>
                            </td>
                            <td className="p-3 hidden lg:table-cell">
                              <div className="flex items-center justify-center gap-2 flex-wrap">
                                {branch.components.map((comp) => (
                                  <ComponentScoreBadge key={comp.key} component={comp} />
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <TrendIndicator direction={branch.trend.direction} delta={branch.trend.delta} />
                            </td>
                            <td className="p-3 text-center">
                              {branch.riskFlags.length > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  data-testid={`badge-risk-${branch.branchId}`}
                                >
                                  {branch.riskFlags.length}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr data-testid={`row-detail-${branch.branchId}`}>
                              <td colSpan={6} className="p-4 bg-muted/30">
                                <BranchDetailView branch={branch} />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
