import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { FavoriteStar } from "@/components/favorite-star";
import type { SidebarMenuResponse, SidebarMenuSection } from "@shared/schema";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const getIconComponent = (iconName: string): any => {
  const icons = LucideIcons as Record<string, any>;
  return icons[iconName] || LucideIcons.FileText;
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  "operations": "Günlük operasyonel işlemler, görevler ve kontrol listeleri",
  "hr-shifts": "Personel yönetimi, vardiyalar ve puantaj",
  "fabrika": "Fabrika üretim, kalite ve performans yönetimi",
  "training-academy-section": "Eğitim programları ve bilgi bankası",
  "audit-analytics": "Denetim, performans analizi ve raporlama",
  "finance-procurement": "Muhasebe, satınalma ve tedarik yönetimi",
  "communication": "Bildirimler, mesajlar ve destek",
  "management": "Sistem yönetimi, kullanıcılar ve ayarlar",
  "marketing-section": "Kampanya ve pazarlama yönetimi",
};

export default function HubPage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params.sectionId;
  const { user } = useAuth();

  const { data: menuData, isLoading, isError, refetch } = useQuery<SidebarMenuResponse>({
    queryKey: ["sidebar-menu", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/menu", { credentials: "include" });
      if (!res.ok) throw new Error("Menu fetch failed");
      return res.json();
    },
    staleTime: 10 * 1000,
    enabled: !!user,
  });

  const section = useMemo(() => {
    if (!menuData?.sections) return null;
    return menuData.sections.find(s => s.id === sectionId) || null;
  }, [menuData, sectionId]);

  const badges = menuData?.badges || {};

  useBreadcrumb(section?.titleTr || "");

  if (isLoading) {
    

  return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="p-4 sm:p-6 text-center text-muted-foreground" data-testid="hub-not-found">
        <p className="text-lg font-medium">Bu bölüm bulunamadı</p>
      </div>
    );
  }

  const SectionIcon = getIconComponent(section.icon);
  const description = SECTION_DESCRIPTIONS[sectionId || ""] || "";

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid={`hub-page-${sectionId}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <SectionIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="hub-title">
            {section.titleTr}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {section.items?.map((item) => {
          const ItemIcon = getIconComponent(item.icon);
          const badgeCount = item.badge ? badges[item.badge] : 0;

          return (
            <div key={item.id} className="relative">
              <Link href={item.path}>
                <Card
                  className="hover-elevate cursor-pointer h-full"
                  data-testid={`hub-card-${item.id}`}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                      <ItemIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{item.titleTr}</h3>
                        {badgeCount > 0 && (
                          <Badge variant="destructive" className="flex-shrink-0" data-testid={`hub-badge-${item.id}`}>
                            {badgeCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <div className="absolute top-2 right-2 z-10">
                <FavoriteStar page={{ path: item.path, title: item.titleTr, icon: item.icon }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
