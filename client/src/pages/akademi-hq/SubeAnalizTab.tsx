import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompactKPIStrip, type KPIItem } from "@/components/compact-kpi-strip";
import { BarChart3, Building2, TrendingUp, Users } from "lucide-react";

interface BranchAnalytics {
  branchId: number;
  branchName: string;
  activeStudents: number;
  completedQuizzes: number;
  avgScore: number;
  completionRate: number;
}

export function SubeAnalizTab() {
  const [sortBy, setSortBy] = useState<string>("completionRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: branchAnalytics = [], isLoading } = useQuery<BranchAnalytics[]>({
    queryKey: ["/api/academy/branch-analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/branch-analytics`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const sorted = [...branchAnalytics].sort((a, b) => {
    const aVal = (a as any)[sortBy] || 0;
    const bVal = (b as any)[sortBy] || 0;
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const totalBranches = branchAnalytics.length;
  const totalStudents = branchAnalytics.reduce((s, b) => s + (b.activeStudents || 0), 0);
  const avgCompletion = totalBranches > 0
    ? Math.round(branchAnalytics.reduce((s, b) => s + (b.completionRate || 0), 0) / totalBranches)
    : 0;
  const avgScore = totalBranches > 0
    ? Math.round(branchAnalytics.reduce((s, b) => s + (b.avgScore || 0), 0) / totalBranches)
    : 0;

  const getPerformanceTier = (completionRate: number) => {
    if (completionRate >= 75) return "high";
    if (completionRate >= 40) return "mid";
    return "low";
  };

  const tierVariant = (tier: string): "default" | "secondary" | "destructive" => {
    if (tier === "high") return "default";
    if (tier === "mid") return "secondary";
    return "destructive";
  };

  const kpiItems: KPIItem[] = [
    { label: "Toplam Şube", value: totalBranches, icon: Building2, testId: "stat-total-branches" },
    { label: "Aktif Öğrenci", value: totalStudents, icon: Users, testId: "stat-total-students" },
    { label: "Ort. Tamamlanma", value: `%${avgCompletion}`, icon: TrendingUp, testId: "stat-avg-completion" },
    { label: "Ort. Puan", value: avgScore, icon: BarChart3, testId: "stat-avg-score" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-3"><div className="h-10 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <CompactKPIStrip items={kpiItems} desktopColumns={4} testId="branch-analytics-kpi" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <Building2 className="w-4 h-4" />
            Şube Karşılaştırma Tablosu
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branchAnalytics.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-branch-data">Şube verisi bulunamadı</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("branchName")} data-testid="sort-branch-name">
                      Şube {sortBy === "branchName" ? (sortDir === "desc" ? "\u25BC" : "\u25B2") : ""}
                    </TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort("activeStudents")} data-testid="sort-active-students">
                      Öğrenci {sortBy === "activeStudents" ? (sortDir === "desc" ? "\u25BC" : "\u25B2") : ""}
                    </TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort("completionRate")} data-testid="sort-completion">
                      Tamamlanma {sortBy === "completionRate" ? (sortDir === "desc" ? "\u25BC" : "\u25B2") : ""}
                    </TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort("avgScore")} data-testid="sort-avg-score">
                      Ort. Puan {sortBy === "avgScore" ? (sortDir === "desc" ? "\u25BC" : "\u25B2") : ""}
                    </TableHead>
                    <TableHead className="text-xs text-center">Performans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((branch, idx) => {
                    const tier = getPerformanceTier(branch.completionRate || 0);
                    return (
                      <TableRow key={branch.branchId} data-testid={`branch-row-${branch.branchId}`}>
                        <TableCell className="text-xs font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{branch.branchName}</TableCell>
                        <TableCell className="text-xs text-right">{branch.activeStudents}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={branch.completionRate || 0} className="w-16 h-1.5" />
                            <span>%{branch.completionRate || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right">{branch.avgScore != null ? Number(branch.avgScore).toFixed(1) : '\u2014'}</TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge variant={tierVariant(tier)} className="text-xs">
                            {tier === "high" ? "Yüksek" : tier === "mid" ? "Orta" : "Düşük"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {branchAnalytics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <BarChart3 className="w-4 h-4" />
              Şube Tamamlanma Oranları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {sorted.map((branch) => {
                const tier = getPerformanceTier(branch.completionRate || 0);
                return (
                  <div key={branch.branchId} className="flex items-center gap-3" data-testid={`branch-bar-${branch.branchId}`}>
                    <span className="text-xs font-medium w-28 truncate">{branch.branchName}</span>
                    <Progress value={branch.completionRate || 0} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-12 text-right">%{branch.completionRate || 0}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
