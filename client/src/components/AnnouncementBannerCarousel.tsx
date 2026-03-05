import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Megaphone, AlertCircle, ShoppingBag, BookOpen, PartyPopper, FileText, Calendar, ExternalLink, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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

type AnnouncementDetail = {
  id: number;
  title: string;
  message: string;
  summary?: string;
  category?: string;
  detailedContent?: string;
  ctaText?: string;
  ctaLink?: string;
  bannerImageUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  priority?: string;
  publishedAt?: string;
  expiresAt?: string;
  isRead?: boolean;
};

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; label: string }> = {
  general: { icon: Megaphone, gradient: "from-blue-600 to-blue-800", label: "Genel" },
  new_product: { icon: ShoppingBag, gradient: "from-green-600 to-green-800", label: "Yeni Ürün" },
  policy: { icon: FileText, gradient: "from-purple-600 to-purple-800", label: "Politika" },
  campaign: { icon: PartyPopper, gradient: "from-orange-600 to-orange-800", label: "Kampanya" },
  urgent: { icon: AlertCircle, gradient: "from-red-600 to-red-800", label: "Acil" },
  training: { icon: BookOpen, gradient: "from-cyan-600 to-cyan-800", label: "Eğitim" },
  event: { icon: Calendar, gradient: "from-pink-600 to-pink-800", label: "Etkinlik" },
};

export function AnnouncementBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<number, boolean>>({});
  const [selectedBannerId, setSelectedBannerId] = useState<number | null>(null);

  const { data: banners = [] } = useQuery<AnnouncementBanner[]>({
    queryKey: ["/api/announcements/banners"],
    staleTime: 30000,
  });

  const { data: announcementDetail, isLoading: detailLoading } = useQuery<AnnouncementDetail>({
    queryKey: ["/api/announcements", selectedBannerId],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${selectedBannerId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch announcement");
      return res.json();
    },
    enabled: !!selectedBannerId,
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
    setSelectedBannerId(id);
    markReadMutation.mutate(id);
  };

  const handleCloseDialog = () => {
    setSelectedBannerId(null);
  };

  const currentBanner = banners[currentIndex];
  const category = currentBanner?.category || "general";
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;

  const detailCategory = announcementDetail?.category || "general";
  const detailCategoryConfig = CATEGORY_CONFIG[detailCategory] || CATEGORY_CONFIG.general;
  const DetailCategoryIcon = detailCategoryConfig.icon;

  return (
    <>
      <div 
        className="relative w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div onClick={() => handleBannerClick(currentBanner.id)}>
          <Card 
            className="overflow-hidden cursor-pointer group rounded-lg"
            data-testid={`banner-carousel-${currentBanner.id}`}
          >
            <CardContent className="p-0">
              <div className="relative w-full" style={{ aspectRatio: '4/1', minHeight: '100px', maxHeight: '180px' }}>
                {currentBanner.bannerImageUrl && !imageLoadErrors[currentBanner.id] ? (
                  <>
                    <img 
                      src={currentBanner.bannerImageUrl}
                      alt={currentBanner.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() => handleImageError(currentBanner.id)}
                      loading="lazy"
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
        </div>

        {banners.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToPrev(); }}
              data-testid="button-banner-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToNext(); }}
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx); }}
                  data-testid={`button-banner-dot-${idx}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedBannerId} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden" data-testid="dialog-announcement-detail">
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : announcementDetail ? (
            <>
              {announcementDetail.bannerImageUrl && (
                <div className="relative w-full h-48">
                  <img 
                    src={announcementDetail.bannerImageUrl}
                    alt={announcementDetail.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <Badge className={`bg-gradient-to-r ${detailCategoryConfig.gradient} text-white mb-2`}>
                      <DetailCategoryIcon className="h-3 w-3 mr-1" />
                      {detailCategoryConfig.label}
                    </Badge>
                    <h2 className="text-xl font-bold text-white" data-testid="text-announcement-detail-title">
                      {announcementDetail.bannerTitle || announcementDetail.title}
                    </h2>
                  </div>
                </div>
              )}
              
              <ScrollArea className="max-h-[calc(90vh-200px)]">
                <div className="p-6 space-y-4">
                  {!announcementDetail.bannerImageUrl && (
                    <DialogHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`bg-gradient-to-r ${detailCategoryConfig.gradient} text-white`}>
                          <DetailCategoryIcon className="h-3 w-3 mr-1" />
                          {detailCategoryConfig.label}
                        </Badge>
                        {announcementDetail.priority === "urgent" && (
                          <Badge variant="destructive">Acil</Badge>
                        )}
                      </div>
                      <DialogTitle className="text-xl" data-testid="text-announcement-detail-title">
                        {announcementDetail.title}
                      </DialogTitle>
                      {announcementDetail.publishedAt && (
                        <DialogDescription>
                          {format(new Date(announcementDetail.publishedAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                        </DialogDescription>
                      )}
                    </DialogHeader>
                  )}

                  {announcementDetail.bannerImageUrl && announcementDetail.publishedAt && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(announcementDetail.publishedAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                    </p>
                  )}

                  <div className="space-y-4">
                    {announcementDetail.message && (
                      <p className="text-base leading-relaxed" data-testid="text-announcement-message">
                        {announcementDetail.message}
                      </p>
                    )}

                    {announcementDetail.detailedContent && (
                      <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-announcement-detailed-content">
                        <ReactMarkdown>
                          {announcementDetail.detailedContent}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {announcementDetail.ctaText && announcementDetail.ctaLink && (
                    <div className="pt-4">
                      <Button 
                        asChild
                        className="w-full sm:w-auto"
                        data-testid="button-announcement-cta"
                      >
                        <a href={announcementDetail.ctaLink} target="_blank" rel="noopener noreferrer">
                          {announcementDetail.ctaText}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  )}

                  {announcementDetail.expiresAt && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Geçerlilik: {format(new Date(announcementDetail.expiresAt), "d MMMM yyyy", { locale: tr })} tarihine kadar
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Duyuru yüklenemedi
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
