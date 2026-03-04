import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Award, Star, Zap, Flame, Trophy, Coffee, Users, Lock, Info } from "lucide-react";
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

  const userBadgeIds = new Set(userBadges.map((b) => b.badgeId));
  const unlockedBadges = allBadges.filter((b) => userBadgeIds.has(b.id));
  const lockedBadges = allBadges.filter((b) => !userBadgeIds.has(b.id));
  const totalPoints = unlockedBadges.reduce((sum: number, b) => sum + (b.points || 0), 0);

  if (badgesLoading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

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
        <h1 className="text-lg font-bold tracking-tight">Rozetler</h1>
        <p className="text-xs text-muted-foreground mt-1">Eğitim yolculuğunda kazanılan başarılar</p>
      </div>

      {isHQRole(user?.role as any) && (
        <Card className="col-span-full bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground" data-testid="text-hq-badges-info">
              Bu rozetler ekibinizin kazanabileceği başarılardır. Rozet sistemini inceleyerek ekibinizi daha iyi yönlendirebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="col-span-full grid grid-cols-3 md:grid-cols-3 gap-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Puan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">toplam</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Açılan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{unlockedBadges.length}/{allBadges.length}</p>
            <Progress value={(unlockedBadges.length / allBadges.length) * 100} className="mt-1 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Oran</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{Math.round((unlockedBadges.length / allBadges.length) * 100)}%</p>
            <p className="text-xs text-muted-foreground">ortalama</p>
          </CardContent>
        </Card>
      </div>

      {unlockedBadges.length > 0 && (
        <div className="col-span-full">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Trophy className="w-4 h-4 text-warning" />
            Açılan ({unlockedBadges.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {unlockedBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.iconName] || Star;
              return (
                <Card key={badge.id} className="border-primary/50 bg-primary/5 hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <div className="p-1 bg-primary/20 rounded">
                          <IconComponent className="w-3 h-3 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xs">{badge.titleTr}</CardTitle>
                          <Badge className="mt-0.5 text-xs h-4">+{badge.points}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{badge.descriptionTr}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div className="col-span-full">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Lock className="w-4 h-4 text-gray-400" />
            Kilitli ({lockedBadges.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {lockedBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.iconName] || Star;
              return (
                <Card key={badge.id} className="opacity-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <div className="p-1 bg-accent dark:bg-gray-700 rounded">
                          <IconComponent className="w-3 h-3 text-gray-400 dark:text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-xs text-gray-500">{badge.titleTr}</CardTitle>
                          <Badge variant="outline" className="mt-0.5 text-xs h-4">+{badge.points}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-1">{badge.descriptionTr}</p>
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
