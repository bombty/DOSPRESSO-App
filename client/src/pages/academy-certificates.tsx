import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Award, Download, Share2, Loader } from "lucide-react";

const CAREER_LEVELS = [
  { id: 1, roleId: "stajyer", titleTr: "Stajyer", levelNumber: 1, certificateColor: "from-blue-100 to-blue-50" },
  { id: 2, roleId: "bar_buddy", titleTr: "Bar Buddy", levelNumber: 2, certificateColor: "from-purple-100 to-purple-50" },
  { id: 3, roleId: "barista", titleTr: "Barista", levelNumber: 3, certificateColor: "from-green-100 to-green-50" },
  { id: 4, roleId: "supervisor_buddy", titleTr: "Supervisor Buddy", levelNumber: 4, certificateColor: "from-amber-100 to-amber-50" },
  { id: 5, roleId: "supervisor", titleTr: "Supervisor", levelNumber: 5, certificateColor: "from-red-100 to-red-50" },
];

export default function AcademyCertificates() {
  const { user } = useAuth();

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

  const { data: quizStats } = useQuery({
    queryKey: [`/api/academy/quiz-stats`, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/academy/quiz-stats/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const currentLevel = CAREER_LEVELS.find(l => l.id === userProgress?.currentCareerLevelId);
  const completedLevels = CAREER_LEVELS.filter(l => l.id <= (userProgress?.currentCareerLevelId || 0));

  const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

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
        <h1 className="text-lg font-bold tracking-tight">Sertifikalar</h1>
        <p className="text-xs text-muted-foreground mt-1">Kariyer seviyelerine ulaşınca kazanılan sertifikalar</p>
      </div>

      {/* Current Level Certificate */}
      {currentLevel && (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Award className="w-4 h-4 text-primary" />
              {currentLevel.titleTr}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Certificate Preview */}
              <div className={`bg-gradient-to-br ${currentLevel.certificateColor} p-3 rounded-lg border-2 border-dashed border-gray-300 text-center min-h-40 flex flex-col justify-between text-xs`}>
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-widest">DOSPRESSO AKADEMİ</p>
                  <p className="text-lg font-serif mt-2">Kariyer Sertifikası</p>
                </div>

                <div>
                  <p className="text-3xl font-bold text-gray-800 mb-2">{currentLevel.titleTr}</p>
                  <p className="text-sm text-gray-600">Seviye {currentLevel.levelNumber} / 5</p>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Kullanıcı"}</span> tarafından başarıyla tamamlanmış
                  </p>
                  <p className="text-xs text-gray-600">{today}</p>
                  <p className="text-xs text-gray-600 mt-3">Sertifika No: CERT-{user?.id?.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  PDF İndir
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Paylaş
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">Tamamlanan Sınavlar</p>
                  <p className="text-2xl font-bold">{quizStats?.completedQuizzes || 0}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-muted-foreground">Ortalama Puan</p>
                  <p className="text-2xl font-bold">{quizStats?.averageScore || 0}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earned">Kazanılan ({completedLevels.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Hedefler ({CAREER_LEVELS.length - completedLevels.length})</TabsTrigger>
        </TabsList>

        {/* Earned Certificates */}
        <TabsContent value="earned">
          <div className="w-full space-y-2 sm:space-y-3">
            {completedLevels.map((level, idx) => (
              <Card key={level.id} className="overflow-hidden">
                <CardHeader className={`bg-gradient-to-r ${level.certificateColor} pb-3`}>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {level.titleTr}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <Badge variant="default">Kazanıldı</Badge>
                    <p className="text-sm text-muted-foreground">Seviye {level.levelNumber} / 5</p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        İndir
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1">
                        <Share2 className="w-3 h-3 mr-1" />
                        Paylaş
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Upcoming Certificates */}
        <TabsContent value="upcoming">
          <div className="w-full space-y-2 sm:space-y-3">
            {CAREER_LEVELS.filter(l => l.id > (userProgress?.currentCareerLevelId || 0)).map((level) => {
              const progress = Math.min(100, Math.round(((userProgress?.currentCareerLevelId || 0) / level.id) * 100));
              return (
                <Card key={level.id} className="opacity-60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {level.titleTr}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <Badge variant="secondary">Kilitli</Badge>
                      <p className="text-sm text-muted-foreground">Seviye {level.levelNumber} / 5</p>
                      <p className="text-xs text-muted-foreground mt-2">Sonraki kariyer seviyesini geçmek için sınavı tamamla</p>
                      <div className="mt-3 p-2 bg-gray-100 dark:bg-slate-800 rounded">
                        <p className="text-xs font-medium">İlerleme: {progress}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Sertifikalar Hakkında</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm">
          <p>✅ Her kariyer seviyesinde resmi sertifika kazanın</p>
          <p>✅ Sertifikaları PDF olarak indirip paylaşın</p>
          <p>✅ LinkedIn ve diğer platformlarda gösterin</p>
          <p>✅ DOSPRESSO Akademi tarafından onaylanmış belgeler</p>
        </CardContent>
      </Card>
    </div>
  );
}
