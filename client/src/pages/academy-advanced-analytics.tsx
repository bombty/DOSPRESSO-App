import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, TrendingUp, Calendar, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function AcademyAdvancedAnalytics() {
  const { user } = useAuth();

  const { data: analytics = {} } = useQuery({
    queryKey: ["/api/academy/advanced-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const res = await fetch(`/api/academy/advanced-analytics/${user.id}`, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!user?.id,
  });

  const scoreData = [
    { week: "Hafta 1", score: 65 },
    { week: "Hafta 2", score: 72 },
    { week: "Hafta 3", score: 78 },
    { week: "Hafta 4", score: 85 },
  ];

  const performanceData = [
    { name: "Kolay", value: 35 },
    { name: "Orta", value: 45 },
    { name: "Zor", value: 20 },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 p-3">
      <div className="flex items-center gap-2 mb-2">
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
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Analitikler
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Performans analizi</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Toplam Puan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">85%</p>
            <p className="text-xs text-green-600 mt-1">↑ 5% geçen haftaya göre</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tamamlanan Sınavlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-xs text-muted-foreground mt-1">Ortalama 3 gün aralığı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Öğrenme Süresi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">42h</p>
            <p className="text-xs text-muted-foreground mt-1">Toplam yatırılan zaman</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Başarı Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">92%</p>
            <p className="text-xs text-blue-600 mt-1">Sınavlarda geçiş oranı</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Puan Eğilimi</CardTitle>
            <CardDescription>Son 4 haftalık performans</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zorluk Dağılımı</CardTitle>
            <CardDescription>Çözülen sınavların dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={performanceData} cx="50%" cy="50%" labelLine={false} label dataKey="value">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Yapay Zeka İçgörüleri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <p>✓ Orta zorluk sınavlarda en iyi performans gösteriyorsunuz</p>
          <p>✓ Teknik konular hakkında daha fazla pratik yapmanız önerilir</p>
          <p>✓ Son hafta performansında %5 artış görülmektedir</p>
          <p>✓ Kariyer seviyesi 3 için tamamen hazırsınız</p>
        </CardContent>
      </Card>
    </div>
  );
}
