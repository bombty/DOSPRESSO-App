import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Award, Star, Zap, Flame, Trophy, Coffee, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const BADGE_ICONS: Record<string, any> = {
  'Star': Star,
  'Trophy': Trophy,
  'Zap': Zap,
  'Award': Award,
  'Coffee': Coffee,
  'Users': Users,
};

export default function AcademyBadges() {
  const { user } = useAuth();

  // Fetch all available badges
  const { data: allBadges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ["/api/academy/badges"],
    queryFn: async () => {
      const res = await fetch("/api/academy/badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch user's unlocked badges
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

  const userBadgeIds = new Set(userBadges.map((b: any) => b.badgeId));
  const unlockedBadges = allBadges.filter((b: any) => userBadgeIds.has(b.id));
  const lockedBadges = allBadges.filter((b: any) => !userBadgeIds.has(b.id));
  const totalPoints = unlockedBadges.reduce((sum: number, b: any) => sum + (b.points || 0), 0);

  if (badgesLoading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

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
      div>
        <h1 className="text-3xl font-bold tracking-tight">Başarılar ve Rozetler</h1>
        <p className="text-muted-foreground mt-2">Eğitim yolculuğunda elde ettiğiniz başarılar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Toplam Puan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Tüm rozetlerden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Açılan Rozetler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{unlockedBadges.length}/{allBadges.length}</p>
            <Progress value={(unlockedBadges.length / allBadges.length) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round((unlockedBadges.length / allBadges.length) * 100)}%</p>
            <p className="text-xs text-muted-foreground">Tüm rozetlerin ortalaması</p>
          </CardContent>
        </Card>
      </div>

      {unlockedBadges.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Açılan Rozetler ({unlockedBadges.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedBadges.map((badge: any) => {
              const IconComponent = BADGE_ICONS[badge.iconName] || Star;
              return (
                <Card key={badge.id} className="border-primary/50 bg-primary/5 hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{badge.titleTr}</CardTitle>
                          <Badge className="mt-1 text-xs">+{badge.points} Puan</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{badge.descriptionTr}</p>
                    <p className="text-xs text-muted-foreground mt-2">Kategori: <span className="font-medium">{badge.category}</span></p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            Kilitli Rozetler ({lockedBadges.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedBadges.map((badge: any) => {
              const IconComponent = BADGE_ICONS[badge.iconName] || Star;
              return (
                <Card key={badge.id} className="opacity-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                          <IconComponent className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-gray-500">{badge.titleTr}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">+{badge.points} Puan</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{badge.descriptionTr}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">Açmak için şartları yerine getir</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
