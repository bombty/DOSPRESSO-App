import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Building2, Users, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface AdminDashboardProps {
  compositeBranchScores: any[];
  isLoading: boolean;
  totalBranches: number;
  totalFaults: number;
  openFaults: number;
  branchScoresTimeRange?: string;
  onTimeRangeChange?: (range: any) => void;
}

export function AdminDashboard({
  compositeBranchScores,
  isLoading,
  totalBranches,
  totalFaults,
  openFaults,
  branchScoresTimeRange,
  onTimeRangeChange,
}: AdminDashboardProps) {
  return (
    <div className="space-y-3 md:space-y-6">
      {/* KPI Cards Row */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-700">{totalBranches}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Toplam Şubeler</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-red-700">{openFaults}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Açık Arızalar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 md:col-span-1">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-700">{totalFaults - openFaults}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Kapanan</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600 md:col-span-1">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-amber-700">
              {totalFaults > 0 ? Math.round(((totalFaults - openFaults) / totalFaults) * 100) : 0}%
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Kapanış Oranı</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Table - Desktop Only */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle>Şube Performans Tablosu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Şube</th>
                    <th className="text-center py-2 px-2">Personel</th>
                    <th className="text-center py-2 px-2">Ekipman</th>
                    <th className="text-center py-2 px-2">Kalite</th>
                    <th className="text-center py-2 px-2">Müşteri</th>
                    <th className="text-center py-2 px-2">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {compositeBranchScores.map((score) => (
                    <tr key={score.branchId} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{score.branchName}</td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline">{score.employeePerformanceScore.toFixed(0)}</Badge>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline">{score.equipmentScore.toFixed(0)}</Badge>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline">{score.qualityAuditScore.toFixed(0)}</Badge>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline">{score.customerSatisfactionScore.toFixed(0)}</Badge>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge 
                          variant={score.compositeScore >= 80 ? "default" : "secondary"}
                        >
                          {score.compositeScore.toFixed(0)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Performance List - Mobile */}
      {!isLoading && compositeBranchScores.length > 0 && (
        <div className="lg:hidden space-y-2">
          {compositeBranchScores.slice(0, 5).map((score) => (
            <Card key={score.branchId}>
              <CardContent className="pt-3 pb-3">
                <div className="font-semibold text-sm mb-2">{score.branchName}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Personel: <span className="font-bold text-blue-600">{score.employeePerformanceScore.toFixed(0)}</span></div>
                  <div>Ekipman: <span className="font-bold text-green-600">{score.equipmentScore.toFixed(0)}</span></div>
                  <div>Kalite: <span className="font-bold text-purple-600">{score.qualityAuditScore.toFixed(0)}</span></div>
                  <div>Müşteri: <span className="font-bold text-orange-600">{score.customerSatisfactionScore.toFixed(0)}</span></div>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Toplam Skor</span>
                  <Badge className="text-base">{score.compositeScore.toFixed(0)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
