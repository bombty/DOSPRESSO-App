import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Building, Trophy, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from "recharts";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

type BranchComparison = {
  branchId: number;
  branchName: string;
  averageScore: number;
  maxScore: number;
  minScore: number;
  auditCount: number;
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "hsl(var(--chart-2))";
  if (score >= 70) return "hsl(var(--chart-3))";
  if (score >= 50) return "hsl(var(--chart-4))";
  return "hsl(var(--chart-5))";
};

const getScoreBadge = (score: number) => {
  if (score >= 90) return { variant: "default" as const, label: "Mükemmel" };
  if (score >= 70) return { variant: "secondary" as const, label: "İyi" };
  if (score >= 50) return { variant: "outline" as const, label: "Orta" };
  return { variant: "destructive" as const, label: "Düşük" };
};

export default function SubeKarsilastirma() {
  const { data: comparisonData, isLoading, isError, refetch } = useQuery<BranchComparison[]>({
    queryKey: ["/api/branch-audit-comparison"],
  });

  if (isLoading) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const branches = comparisonData || [];
  const topBranch = branches[0];
  const worstBranch = branches[branches.length - 1];
  const averageAll = branches.length > 0 
    ? Math.round(branches.reduce((sum, b) => sum + b.averageScore, 0) / branches.length)
    : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Şube Denetim Karşılaştırması</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="hover-elevate">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Şube</p>
                <p className="text-xl font-bold">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Genel Ortalama</p>
                <p className="text-xl font-bold">{averageAll}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {topBranch && (
          <Card className="hover-elevate border-green-500/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Trophy className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">En Başarılı</p>
                  <p className="text-sm font-bold truncate">{topBranch.branchName}</p>
                  <p className="text-xs text-green-500">{topBranch.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {worstBranch && branches.length > 1 && (
          <Card className="hover-elevate border-red-500/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Geliştirilmeli</p>
                  <p className="text-sm font-bold truncate">{worstBranch.branchName}</p>
                  <p className="text-xs text-red-500">{worstBranch.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Şube Bazlı Denetim Puanları
          </CardTitle>
          <CardDescription>
            Tüm şubelerin ortalama denetim puanları karşılaştırması
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henüz tamamlanmış denetim bulunmuyor</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={branches} layout="vertical" margin={{ left: 100, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="branchName" width={90} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Ortalama Puan']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="averageScore" name="Ortalama Puan" radius={[0, 4, 4, 0]}>
                  {branches.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.averageScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detaylı Şube Listesi</CardTitle>
          <CardDescription>
            Şubelerin min, max ve ortalama denetim skorları
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {branches.map((branch, index) => {
              const badgeInfo = getScoreBadge(branch.averageScore);
              return (
                <div 
                  key={branch.branchId}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`branch-row-${branch.branchId}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{branch.branchName}</p>
                      <p className="text-xs text-muted-foreground">
                        {branch.auditCount} denetim
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Min: {branch.minScore}%</p>
                      <p>Max: {branch.maxScore}%</p>
                    </div>
                    <Badge variant={badgeInfo.variant} className="min-w-[80px] justify-center">
                      {branch.averageScore}% - {badgeInfo.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
