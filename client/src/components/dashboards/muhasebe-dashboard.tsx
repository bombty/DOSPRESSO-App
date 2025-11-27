import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Building2, AlertCircle } from "lucide-react";

interface MuhasebeDashboardProps {
  compositeBranchScores: any[];
  totalBranches: number;
  faults?: any[];
  isLoading: boolean;
}

export function MuhasebeDashboard({
  compositeBranchScores,
  totalBranches,
  faults,
  isLoading,
}: MuhasebeDashboardProps) {
  const faultsByCost = faults?.reduce((acc: any[], fault) => {
    const cost = fault.repairCost || 0;
    const existing = acc.find(f => f.branch === fault.branchName);
    if (existing) {
      existing.cost += cost;
    } else {
      acc.push({ branch: fault.branchName, cost });
    }
    return acc;
  }, []) || [];

  const totalRepairCost = faultsByCost.reduce((sum, f) => sum + f.cost, 0);
  const avgScoreBranches = compositeBranchScores.reduce((sum, s) => sum + s.compositeScore, 0) / (compositeBranchScores.length || 1);

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Mali Gösterge Paneli</h2>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-700">{totalBranches}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Şubeler</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-700">
              {avgScoreBranches.toFixed(0)}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Ort. Skor</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-orange-700">
              ₺{(totalRepairCost / 1000).toFixed(1)}K
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Onarım Malı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-purple-700">
              {(totalRepairCost > 0 ? totalRepairCost / totalBranches : 0).toFixed(0)}₺
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Ort. Maliyet</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Overview */}
      {compositeBranchScores.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Şube Performans Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compositeBranchScores.slice(0, 5).map((score) => (
                <div key={score.branchId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{score.branchName}</p>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full ${
                          score.compositeScore >= 80 ? 'bg-green-600' : 
                          score.compositeScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${score.compositeScore}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {score.compositeScore.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
