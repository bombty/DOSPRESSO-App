import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { ArrowLeft, Building2, TrendingUp, Users, Zap, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcademyBranchAnalytics() {
  const { user } = useAuth();

  // Get branch performance data
  const { data: branchMetrics = [], isLoading } = useQuery({
    queryKey: ["/api/academy/branch-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/academy/branch-analytics", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const totalBranches = branchMetrics.length;
  const avgCompletionRate = totalBranches > 0 
    ? Math.round(branchMetrics.reduce((sum: number, b) => sum + (b.completionRate || 0), 0) / totalBranches)
    : 0;
  const avgScore = totalBranches > 0
    ? (branchMetrics.reduce((sum: number, b) => sum + (b.avgScore || 0), 0) / totalBranches).toFixed(1)
    : 0;

  // Sort branches by completion rate
  const topBranches = [...branchMetrics].sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));

  // Performance trend data
  const performanceTrend = branchMetrics
    .slice(0, 5)
    .map((b) => ({
      name: b.branchName?.substring(0, 12) || "Şube",
      completion: b.completionRate || 0,
      avgScore: b.avgScore || 0,
    }));

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Şube Akademi Analitikleri</h1>
        <p className="text-muted-foreground mt-2">Tüm şubelerin eğitim performansı ve ilerlemesi</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Toplam Şube
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBranches}</p>
            <p className="text-xs text-muted-foreground">Akademi'de aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ortalama Tamamlama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgCompletionRate}%</p>
            <p className="text-xs text-muted-foreground">Tüm şubeler ortalaması</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Ortalama Puan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">/100 puan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              En Başarılı Şube
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{topBranches[0]?.branchName?.substring(0, 15) || "—"}</p>
            <p className="text-xs text-muted-foreground">{topBranches[0]?.completionRate || 0}% tamamlama</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
            <TabsTrigger value="ranking">Sıralama</TabsTrigger>
            <TabsTrigger value="details">Detaylar</TabsTrigger>
          </TabsList>

          {/* Performance Comparison Chart */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Şube Performans Karşılaştırması</CardTitle>
                <CardDescription>Tamamlama oranı ve ortalama puan</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="completion" fill="#3b82f6" name="Tamamlama %" />
                    <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Ortalama Puan" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rankings */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Şube Sıralaması</CardTitle>
                <CardDescription>Tamamlama oranına göre sıralanmış</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:gap-4">
                {topBranches.map((branch, idx: number) => (
                  <div key={branch.branchId} className="grid grid-cols-1 gap-2 p-3 border rounded-lg" data-testid={`branch-card-${branch.branchId}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{branch.branchName}</p>
                          <p className="text-xs text-muted-foreground">{branch.activeStudents || 0} öğrenci</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{branch.completionRate || 0}%</Badge>
                      </div>
                    </div>
                    <Progress value={branch.completionRate || 0} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Ort. Puan: {branch.avgScore || 0}</span>
                      <span>Tamamlananlar: {branch.completedQuizzes || 0}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detaylı Şube Metrikleri</CardTitle>
                <CardDescription>Tüm şubelerin eğitim verileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Şube</th>
                        <th className="text-right py-2">Öğrenci</th>
                        <th className="text-right py-2">Tamamlama</th>
                        <th className="text-right py-2">Ort. Puan</th>
                        <th className="text-right py-2">Sınavlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchMetrics.map((branch) => (
                        <tr key={branch.branchId} className="border-b">
                          <td className="py-2">{branch.branchName}</td>
                          <td className="text-right">{branch.activeStudents || 0}</td>
                          <td className="text-right">
                            <Badge variant="outline">{branch.completionRate || 0}%</Badge>
                          </td>
                          <td className="text-right font-medium">{branch.avgScore || 0}</td>
                          <td className="text-right">{branch.completedQuizzes || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
