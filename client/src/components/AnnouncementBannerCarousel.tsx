import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Megaphone, AlertCircle, ShoppingBag, BookOpen, PartyPopper, FileText, Calendar } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

type AnnouncementBanner = {
  id: number;
  title: string;
  summary?: string;
  category?: string;
  bannerImageUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerPriority?: number;
};

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string }> = {
  general: { icon: Megaphone, gradient: "from-blue-600 to-blue-800" },
  new_product: { icon: ShoppingBag, gradient: "from-green-600 to-green-800" },
  policy: { icon: FileText, gradient: "from-purple-600 to-purple-800" },
  campaign: { icon: PartyPopper, gradient: "from-orange-600 to-orange-800" },
  urgent: { icon: AlertCircle, gradient: "from-red-600 to-red-800" },
  training: { icon: BookOpen, gradient: "from-cyan-600 to-cyan-800" },
  event: { icon: Calendar, gradient: "from-pink-600 to-pink-800" },
};

export function AnnouncementBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<number, boolean>>({});

  const { data: banners = [] } = useQuery<AnnouncementBanner[]>({
    queryKey: ["/api/announcements/banners"],
    staleTime: 30000, // 30 saniye cache, stale data önleme
  });

  const handleImageError = (bannerId: number) => {
    setImageLoadErrors(prev => ({ ...prev, [bannerId]: true }));
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/announcements/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
    },
  });

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  if (banners.length === 0) return null;

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleBannerClick = (id: number) => {
    markReadMutation.mutate(id);
  };

  const currentBanner = banners[currentIndex];
  const category = currentBanner?.category || "general";
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link 
        href={`/duyurular`}
        onClick={() => handleBannerClick(currentBanner.id)}
      >
        <Card 
          className="overflow-hidden cursor-pointer group"
          data-testid={`banner-carousel-${currentBanner.id}`}
        >
          <CardContent className="p-0">
            <div className="relative aspect-[3/1] min-h-[120px] max-h-[200px]">
              {currentBanner.bannerImageUrl && !imageLoadErrors[currentBanner.id] ? (
                <>
                  <img 
                    src={currentBanner.bannerImageUrl}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => handleImageError(currentBanner.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </>
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${categoryConfig.gradient}`} />
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <CategoryIcon className="h-4 w-4" />
                  {currentBanner.bannerTitle || currentBanner.title}
                </div>
                {(currentBanner.bannerSubtitle || currentBanner.summary) && (
                  <p className="text-sm text-white/80 line-clamp-1">
                    {currentBanner.bannerSubtitle || currentBanner.summary}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
            onClick={(e) => { e.preventDefault(); goToPrev(); }}
            data-testid="button-banner-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
            onClick={(e) => { e.preventDefault(); goToNext(); }}
            data-testid="button-banner-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-white" : "bg-white/40"
                }`}
                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                data-testid={`button-banner-dot-${idx}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
