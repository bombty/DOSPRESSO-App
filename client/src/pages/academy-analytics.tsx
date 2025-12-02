import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer as RC } from "recharts";
import { ArrowLeft, Trophy, Target, TrendingUp, Users, Zap, Award, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcademyAnalytics() {
  const { user } = useAuth();

  // Get user's career progress
  const { data: userProgress } = useQuery({
    queryKey: ["/api/academy/career-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/career-progress/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get user's quiz stats
  const { data: quizStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/academy/quiz-stats`, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/quiz-stats/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Get user's badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ["/api/academy/user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/academy/user-badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Generate performance trend data from quiz stats
  const performanceData = quizStats?.quizHistory
    ? quizStats.quizHistory.slice(-7).map((q: any, idx: number) => ({
        name: `Sınav ${idx + 1}`,
        score: q.score,
        date: new Date(q.completedAt).toLocaleDateString("tr-TR")
      }))
    : [
        { name: "Sınav 1", score: 78 },
        { name: "Sınav 2", score: 85 },
        { name: "Sınav 3", score: 82 },
        { name: "Sınav 4", score: 90 },
      ];

  const badgeProgress = [
    { name: "Açılmış", value: userBadges.length },
    { name: "Kilitli", value: Math.max(0, 6 - userBadges.length) },
  ];

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6 p-6">
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
        <h1 className="text-3xl font-bold tracking-tight">Akademi Analitikleri</h1>
        <p className="text-muted-foreground mt-2">Şube-çapı eğitim performansı ve ilerleme</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="text-xs text-muted-foreground">Kariyer</p>
              <p className="text-lg font-bold">{userProgress?.currentLevel || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Ort. Puan</p>
              <p className="text-lg font-bold">{quizStats?.averageScore?.toFixed(1) || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground">Sınavlar</p>
              <p className="text-lg font-bold">{quizStats?.completedQuizzes || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">Rozetler</p>
              <p className="text-lg font-bold">{userBadges.length}/6</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performans</TabsTrigger>
            <TabsTrigger value="badges">Rozetler</TabsTrigger>
            <TabsTrigger value="progress">Kariyer Yolu</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Sınav Puanı Trendi</CardTitle>
                <CardDescription>Son sınavlarındaki performans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      dot={{ fill: '#3b82f6' }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Rozet İlerleme</CardTitle>
                <CardDescription>Kazanılan ve kilitli rozetler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Rozet Tamamlama</span>
                    <Badge variant="outline">{userBadges.length}/6</Badge>
                  </div>
                  <Progress value={(userBadges.length / 6) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {userBadges.map((badge: any) => (
                    <div key={badge.id} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                      <p className="font-medium text-sm">{badge.titleTr}</p>
                      <p className="text-xs text-muted-foreground">{badge.points} puan</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Kariyer Ilerlemesi</CardTitle>
                <CardDescription>Kariyer seviyesi ve hedef</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Mevcut Seviye</span>
                    <Badge>{userProgress?.currentLevel || "Bilinmiyor"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userProgress?.completionPercent || 0}% tamamlanmış
                  </p>
                  <Progress value={userProgress?.completionPercent || 0} className="h-2 mt-2" />
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium mb-1">Tavsiyelenecek Sınavlar</p>
                  <p className="text-xs text-muted-foreground">
                    {userProgress?.nextSteps || "Kariyer hedeflerinize ulaşmak için sınavlara başlayın"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
