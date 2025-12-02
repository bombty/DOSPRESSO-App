import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Flame, Trophy, Target, Users, Zap, Lock, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcademyTeamCompetitions() {
  const { user } = useAuth();

  // Get team competitions data
  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["/api/academy/team-competitions"],
    queryFn: async () => {
      const res = await fetch("/api/academy/team-competitions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get monthly challenge data
  const { data: monthlyChallenge } = useQuery({
    queryKey: ["/api/academy/monthly-challenge"],
    queryFn: async () => {
      const res = await fetch("/api/academy/monthly-challenge", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const activeCompetition = competitions.find((c: any) => c.status === "active");
  const completedCompetitions = competitions.filter((c: any) => c.status === "completed");

  const chartData = activeCompetition?.leaderboard || [];

  return (
    <div className="space-y-2 p-3">
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
        <h1 className="text-lg font-bold tracking-tight">Takım Yarışmaları</h1>
        <p className="text-xs text-muted-foreground mt-1">Rekabetçi eğitim yarışmaları</p>
      </div>

      {/* Monthly Challenge */}
      {monthlyChallenge && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Aylık Zorluk
                </CardTitle>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{monthlyChallenge.daysRemaining}g</p>
                <Badge variant="default" className="text-xs">{monthlyChallenge.reward}p</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Genel İlerleme</span>
                <span className="font-medium">{monthlyChallenge.progress}%</span>
              </div>
              <Progress value={monthlyChallenge.progress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{monthlyChallenge.participatingBranches} şube katılıyor</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Canlı Yarışma</TabsTrigger>
          <TabsTrigger value="leaderboard">Liderlik</TabsTrigger>
          <TabsTrigger value="history">Geçmiş</TabsTrigger>
        </TabsList>

        {/* Active Competition */}
        <TabsContent value="active">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeCompetition ? (
            <Card>
              <CardHeader>
                <CardTitle>{activeCompetition.title}</CardTitle>
                <CardDescription>{activeCompetition.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Başlama</p>
                    <p className="font-medium">{new Date(activeCompetition.startDate).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Bitiş</p>
                    <p className="font-medium">{new Date(activeCompetition.endDate).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Katılımcılar</p>
                    <p className="font-medium">{activeCompetition.participantCount || 0} şube</p>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-4">Gerçek Zamanlı Sıralama</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branchName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="score" fill="#3b82f6" name="Puan" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Şu anda aktif yarışma yok</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Yarışma Sıralaması</CardTitle>
              <CardDescription>Şubelerin mevcut performans puanları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeCompetition?.leaderboard?.map((entry: any, idx: number) => (
                  <div key={entry.branchId} className="flex items-center gap-4 p-3 border rounded-lg hover-elevate transition" data-testid={`team-rank-${idx + 1}`}>
                    <div className="text-2xl font-bold text-primary w-12 text-center">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.branchName}</p>
                      <p className="text-xs text-muted-foreground">{entry.quizzesCompleted} sınav tamamlandı</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{entry.score}</p>
                      <Badge variant="outline" className="mt-1">{entry.place === 1 ? '🥇' : entry.place === 2 ? '🥈' : entry.place === 3 ? '🥉' : ''}</Badge>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Geçmiş Yarışmalar</CardTitle>
              <CardDescription>Tamamlanan yarışmaların sonuçları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedCompetitions.length > 0 ? (
                  completedCompetitions.map((comp: any) => (
                    <div key={comp.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{comp.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(comp.endDate).toLocaleDateString('tr-TR')} tarihinde bitti
                          </p>
                        </div>
                        <Badge variant="secondary">Tamamlandı</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">Kazanan: {comp.winner}</span>
                        <Badge className="ml-auto">{comp.winnerScore} puan</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">Henüz tamamlanan yarışma yok</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Yarışma Rozetleri
          </CardTitle>
          <CardDescription>Yarışmalarda kazanılan özel rozetler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 text-center border rounded-lg">
              <p className="text-2xl mb-2">🥇</p>
              <p className="text-xs font-medium">1. Sıra Ustası</p>
              <p className="text-xs text-muted-foreground mt-1">3 kez birincilik</p>
            </div>
            <div className="p-3 text-center border rounded-lg opacity-50">
              <p className="text-2xl mb-2">🔥</p>
              <p className="text-xs font-medium">Yanış Erişim</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Lock className="w-3 h-3 inline" /> Kilitli
              </p>
            </div>
            <div className="p-3 text-center border rounded-lg opacity-50">
              <p className="text-2xl mb-2">⭐</p>
              <p className="text-xs font-medium">Harita Şampiyon</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Lock className="w-3 h-3 inline" /> Kilitli
              </p>
            </div>
            <div className="p-3 text-center border rounded-lg opacity-50">
              <p className="text-2xl mb-2">💎</p>
              <p className="text-xs font-medium">Elmas Derece</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Lock className="w-3 h-3 inline" /> Kilitli
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
