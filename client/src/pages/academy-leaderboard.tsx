import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, TrendingUp, Award, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcademyLeaderboard() {
  const { user } = useAuth();

  const { data: leaderboard } = useQuery({
    queryKey: ["/api/academy/leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/leaderboard`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: examLeaderboard = [] } = useQuery({
    queryKey: ["/api/academy/exam-leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/academy/exam-leaderboard`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mock leaderboard data
  const topPerformers = [
    { rank: 1, name: "Ahmet Yıldız", role: "Barista", score: 950, completedModules: 8, avatar: "AY" },
    { rank: 2, name: "Fatma Kaya", role: "Barista", score: 920, completedModules: 8, avatar: "FK" },
    { rank: 3, name: "Mehmet Demir", role: "Supervisor Buddy", score: 890, completedModules: 7, avatar: "MD" },
    { rank: 4, name: "Zeynep Özturk", role: "Bar Buddy", score: 850, completedModules: 6, avatar: "ZÖ" },
    { rank: 5, name: "Emre Can", role: "Barista", score: 820, completedModules: 6, avatar: "EC" },
  ];

  const branchLeaders = [
    { branchName: "Merkez Şube", leader: "Ahmet Yıldız", avgScore: 82, completionRate: 92 },
    { branchName: "İstanbul Şubesi", leader: "Fatma Kaya", avgScore: 78, completionRate: 85 },
    { branchName: "Ankara Şubesi", leader: "Mehmet Demir", avgScore: 75, completionRate: 80 },
  ];

  const userRank = topPerformers.findIndex((p) => p.name === user?.firstName) + 1;

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-2 col-span-full">
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
      <div className="col-span-full">
        <h1 className="text-lg font-bold tracking-tight">Academy Liderliği</h1>
        <p className="text-xs text-muted-foreground mt-1">En yüksek performans gösteren çalışanlar ve şubeler</p>
      </div>

      {/* Your Rank Card */}
      {user && (
        <Card className="col-span-full border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Sizin Sıralamanız
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">#{userRank || "—"}</p>
                <p className="text-xs text-muted-foreground">Şube içinde sıralama</p>
              </div>
              <Badge variant="default">750 Puan</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">
            <Trophy className="w-4 h-4 mr-2" />
            Genel Liderlik
          </TabsTrigger>
          <TabsTrigger value="branches">
            <TrendingUp className="w-4 h-4 mr-2" />
            Şube Liderleri
          </TabsTrigger>
          <TabsTrigger value="exams">
            <Flame className="w-4 h-4 mr-2" />
            Sınav Liderleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Performans</CardTitle>
              <CardDescription>Toplam puanlara göre en iyi performans gösteren 5 çalışan</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
              {topPerformers.map((performer) => (
                <div key={performer.rank} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-center">
                      <Trophy className={`w-5 h-5 mx-auto ${performer.rank === 1 ? "text-yellow-500" : performer.rank === 2 ? "text-gray-400" : performer.rank === 3 ? "text-orange-600" : "text-gray-500"}`} />
                      <p className="text-xs font-bold mt-1">#{performer.rank}</p>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{performer.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">{performer.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{performer.score}</p>
                    <Badge variant="outline" className="text-xs">{performer.completedModules} modül</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Şube Performansı</CardTitle>
              <CardDescription>Her şubenin ortalama puanı ve tamamlama oranı</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:gap-4">
              {branchLeaders.map((branch) => (
                <div key={branch.branchName} className="grid grid-cols-1 gap-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{branch.branchName}</p>
                      <p className="text-xs text-muted-foreground">Lider: {branch.leader}</p>
                    </div>
                    <Badge variant="default">{branch.avgScore} Ort.</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tamamlama Oranı</p>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${branch.completionRate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="w-full space-y-2 sm:space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Sınav Performans Liderleri</CardTitle>
              <CardDescription>En yüksek notla sınav geçen çalışanlar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
              {examLeaderboard.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Henüz sınav sonucu bulunmuyor</p>
              ) : (
                examLeaderboard.map((performer: any, idx: number) => (
                  <div key={performer.userId} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-center">
                        <Flame className={`w-5 h-5 mx-auto ${idx === 0 ? "text-red-500" : idx === 1 ? "text-orange-500" : idx === 2 ? "text-yellow-500" : "text-gray-500"}`} />
                        <p className="text-xs font-bold mt-1">#{idx + 1}</p>
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{performer.userInitials || "??"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{performer.userName || "Kullanıcı"}</p>
                        <p className="text-xs text-muted-foreground">{performer.targetRole} → {performer.promotionTarget}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{performer.score}%</p>
                      <Badge variant="outline" className="text-xs">Geçti</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
