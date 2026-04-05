import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  X,
  Megaphone,
  ShoppingBag,
  FileText,
  PartyPopper,
  BookOpen,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChefHat,
} from "lucide-react";

type HeaderAnnouncement = {
  id: number;
  title: string;
  category: string;
  priority: string;
  bannerTitle?: string;
  isPinned?: boolean;
  requiresAcknowledgment?: boolean;
};

const CATEGORY_ICONS: Record<string, any> = {
  general: Megaphone,
  new_product: ShoppingBag,
  policy: FileText,
  campaign: PartyPopper,
  urgent: AlertCircle,
  training: BookOpen,
  event: Calendar,
  recipe: ChefHat,
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-blue-600 dark:bg-blue-700",
  new_product: "bg-green-600 dark:bg-green-700",
  policy: "bg-purple-600 dark:bg-purple-700",
  campaign: "bg-orange-600 dark:bg-orange-700",
  urgent: "bg-red-600 dark:bg-red-700",
  training: "bg-cyan-600 dark:bg-cyan-700",
  event: "bg-pink-600 dark:bg-pink-700",
  recipe: "bg-amber-600 dark:bg-amber-700",
};

export function AnnouncementHeaderBanner() {
  const [, setLocation] = useLocation();

  const { data: headerAnnouncements = [] } = useQuery<HeaderAnnouncement[]>({
    queryKey: ["/api/announcements/header-active"],
    staleTime: 60000, // 1 dakika cache
    refetchInterval: 120000, // 2 dakikada bir yenile
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id, temporary }: { id: number; temporary: boolean }) =>
      apiRequest("POST", `/api/announcements/${id}/dismiss`, { temporary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/header-active"] });
    },
  });

  if (headerAnnouncements.length === 0) return null;

  return (
    <div className="space-y-0.5 px-2 pt-1" data-testid="header-announcement-banners">
      {headerAnnouncements.map((ann) => {
        const Icon = CATEGORY_ICONS[ann.category] || Megaphone;
        const bgColor = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.general;
        const isUrgent = ann.priority === "urgent";

        return (
          <div
            key={ann.id}
            className={`${bgColor} text-white rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer group transition-opacity hover:opacity-95 ${isUrgent ? "animate-pulse-subtle" : ""}`}
            onClick={() => setLocation(`/duyuru/${ann.id}`)}
            data-testid={`header-banner-${ann.id}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium truncate flex-1">
              {ann.bannerTitle || ann.title}
            </span>
            {ann.requiresAcknowledgment && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded shrink-0">
                Onay gerekli
              </span>
            )}
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/20 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                dismissMutation.mutate({ id: ann.id, temporary: !isUrgent });
              }}
              data-testid={`dismiss-banner-${ann.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
