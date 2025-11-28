import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Star, Zap, Flame } from "lucide-react";

const ACHIEVEMENTS = [
  {
    id: "first_module",
    icon: Award,
    name: "İlk Adım",
    description: "İlk modülü tamamla",
    condition: "1 modül tamamlandı",
    earned: true,
  },
  {
    id: "quiz_master",
    icon: Star,
    name: "Sınav Ustası",
    description: "5 sınavda 90+ puan al",
    condition: "3/5 sınav tamamlandı",
    earned: false,
    progress: 60,
  },
  {
    id: "streak_week",
    icon: Flame,
    name: "7 Gün Serisi",
    description: "7 gün arka arkaya eğitim al",
    condition: "4 gün devam",
    earned: false,
    progress: 57,
  },
  {
    id: "promotion",
    icon: Zap,
    name: "Terfi Başarısı",
    description: "Kariyer seviyesi terfi edildi",
    condition: "Bar Buddy → Barista",
    earned: false,
    progress: 0,
  },
  {
    id: "team_leader",
    icon: Award,
    name: "Takım Lideri",
    description: "Takımında en yüksek puanı al",
    condition: "Şube liderliği için 5 puan daha gerekli",
    earned: false,
    progress: 40,
  },
  {
    id: "perfect_score",
    icon: Star,
    name: "Mükemmel Sınav",
    description: "100/100 puanla sınav geç",
    condition: "Henüz başlanmadı",
    earned: false,
    progress: 0,
  },
];

export default function AcademyBadges() {
  const { user } = useAuth();

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;
  const progressCount = ACHIEVEMENTS.filter((a) => !a.earned && (a.progress ?? 0) > 0).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Başarılar ve Rozetler</h1>
        <p className="text-muted-foreground mt-2">Eğitim yolculuğunda elde ettiğiniz başarılar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kazanılan Rozetler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{earnedCount}</p>
            <p className="text-xs text-muted-foreground">{ACHIEVEMENTS.length} toplam rozetden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Devam Eden Rozetler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{progressCount}</p>
            <p className="text-xs text-muted-foreground">Tamamlanmaya yakın</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round((earnedCount / ACHIEVEMENTS.length) * 100)}%</p>
            <p className="text-xs text-muted-foreground">Tüm rozetlerin ortalaması</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map((achievement) => {
          const Icon = achievement.icon;
          return (
            <Card key={achievement.id} className={achievement.earned ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${achievement.earned ? "bg-primary/20" : "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${achievement.earned ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{achievement.name}</CardTitle>
                      <CardDescription className="text-xs">{achievement.description}</CardDescription>
                    </div>
                  </div>
                  {achievement.earned && <Badge className="bg-primary">Kazanıldı</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{achievement.condition}</p>
                {!achievement.earned && (achievement.progress ?? 0) > 0 && (
                  <>
                    <Progress value={achievement.progress ?? 0} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{achievement.progress}% tamamlandı</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
