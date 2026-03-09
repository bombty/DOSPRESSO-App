import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Award, Trophy, Flame, AlertCircle } from "lucide-react";

export default function BadgeCollection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userBadges = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/academy/user-badges", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/academy/user-badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ["/api/academy/badges"],
    queryFn: async () => {
      const res = await fetch("/api/academy/badges", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const badgeColors: Record<string, { bg: string; icon: any; text: string }> = {
    coffee_cherry: { bg: "bg-warning/10 dark:bg-orange-950", icon: Award, text: "Kahve Kirazı" },
    green_bean: { bg: "bg-success/10 dark:bg-success/5", icon: Award, text: "Yeşil Çekirdek" },
    bean_expert: { bg: "bg-amber-100 dark:bg-amber-950", icon: Trophy, text: "Çekirdek Uzmanı" },
    roast_master: { bg: "bg-destructive/10 dark:bg-red-950", icon: Flame, text: "Kavurma Ustası" },
    coffee_pro: { bg: "bg-secondary/10 dark:bg-purple-950", icon: Trophy, text: "Kahve Pro" },
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setLocation("/akademi")}
          variant="outline"
          size="icon"
          data-testid="button-back-badges"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Badge Collection</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Career Badges</CardTitle>
          <CardDescription>Earn badges by completing modules - Journey from Coffee Cherry to Coffee Pro</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading badges...</p>
          ) : userBadges.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No badges yet. Complete modules to earn badges!</p>
          ) : (
            <div className="w-full space-y-2 sm:space-y-3 lg:grid-cols-3 gap-2 sm:gap-3">
              {userBadges.map((userBadge) => {
                const config = badgeColors[userBadge.badgeKey] || badgeColors.coffee_cherry;
                const IconComponent = config.icon;
                return (
                  <div key={userBadge.id} className={`${config.bg} p-3 rounded-lg border border-current border-opacity-20`}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <IconComponent className="w-8 h-8 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{userBadge.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{userBadge.description}</p>
                        {userBadge.unlockedAt && (
                          <p className="text-xs text-muted-foreground">
                            Kazanıldı: {new Date(userBadge.unlockedAt).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Available Badges</CardTitle>
          <CardDescription>All badges in the system and how to earn them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-2 sm:space-y-3 lg:grid-cols-3 gap-2 sm:gap-3">
            {allBadges.map((badge) => {
              const isEarned = userBadges.some((ub) => ub.id === badge.id);
              return (
                <div key={badge.id} className={`p-3 rounded-lg border ${isEarned ? "border-success bg-success/10 dark:bg-success/5/30" : "border-muted"}`}>
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                    {isEarned && <Badge className="bg-success">✓ Earned</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
