import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";

export default function AcademyAnalytics() {
  const { user } = useAuth();

  // Get branch performance stats
  const { data: stats } = useQuery({
    queryKey: ["/api/academy/stats"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/stats`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Mock data for visualization
  const completionData = [
    { role: "Barista", completed: 85, total: 100 },
    { role: "Supervisor Buddy", completed: 60, total: 100 },
    { role: "Bar Buddy", completed: 92, total: 100 },
    { role: "Stajyer", completed: 45, total: 100 },
  ];

  const performanceData = [
    { name: "Pazartesi", score: 78 },
    { name: "Salı", score: 85 },
    { name: "Çarşamba", score: 82 },
    { name: "Perşembe", score: 90 },
    { name: "Cuma", score: 88 },
  ];

  const roleDistribution = [
    { name: "Barista", value: 35 },
    { name: "Supervisor", value: 8 },
    { name: "Supervisor Buddy", value: 12 },
    { name: "Bar Buddy", value: 28 },
    { name: "Stajyer", value: 17 },
  ];

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Akademi Analitikleri</h1>
        <p className="text-muted-foreground mt-2">Şube-çapı eğitim performansı ve ilerleme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Toplam Tamamlama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">87%</p>
            <p className="text-xs text-muted-foreground">Tüm roller ortalaması</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Ortalama Sınav Notu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">82</p>
            <p className="text-xs text-muted-foreground">/100 puan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Haftalık Artış
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">+5.2%</p>
            <p className="text-xs text-muted-foreground">Geçen haftaya karşı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Aktif Öğrenci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">142</p>
            <p className="text-xs text-muted-foreground">Devam eden modül</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="completion" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="completion">Tamamlama</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
          <TabsTrigger value="distribution">Rol Dağılımı</TabsTrigger>
        </TabsList>

        <TabsContent value="completion">
          <Card>
            <CardHeader>
              <CardTitle>Rol Bazlı Tamamlama Oranı</CardTitle>
              <CardDescription>Her role grubu için eğitim tamamlama durumu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completionData.map((item) => (
                <div key={item.role} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.role}</span>
                    <Badge variant="outline">{item.completed}%</Badge>
                  </div>
                  <Progress value={item.completed} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Haftalık Performans Trendi</CardTitle>
              <CardDescription>Ortalama sınav puanlarının haftalık değişimi</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Rol Bazlı Dağılım</CardTitle>
              <CardDescription>Her role grubu içindeki çalışan sayısı</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
