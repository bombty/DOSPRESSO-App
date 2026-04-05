import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  User,
  Megaphone,
  ShoppingBag,
  FileText,
  PartyPopper,
  BookOpen,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
  Share2,
  ChefHat,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type AnnouncementDetail = {
  id: number;
  title: string;
  message: string;
  summary?: string;
  category: string;
  detailedContent?: string;
  ctaText?: string;
  ctaLink?: string;
  bannerImageUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  priority?: string;
  publishedAt?: string;
  expiresAt?: string;
  mediaUrls?: string[];
  attachments?: string[];
  isRead?: boolean;
  requiresAcknowledgment?: boolean;
  status?: string;
  createdBy?: { fullName: string };
};

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; label: string; bgClass: string }> = {
  general: { icon: Megaphone, gradient: "from-blue-600 to-blue-800", label: "Genel Duyuru", bgClass: "bg-blue-50 dark:bg-blue-950" },
  new_product: { icon: ShoppingBag, gradient: "from-green-600 to-green-800", label: "Yeni Ürün Lansmanı", bgClass: "bg-green-50 dark:bg-green-950" },
  policy: { icon: FileText, gradient: "from-purple-600 to-purple-800", label: "Kanuni Yenilik", bgClass: "bg-purple-50 dark:bg-purple-950" },
  campaign: { icon: PartyPopper, gradient: "from-orange-600 to-orange-800", label: "Kampanya", bgClass: "bg-orange-50 dark:bg-orange-950" },
  urgent: { icon: AlertCircle, gradient: "from-red-600 to-red-800", label: "Acil Duyuru", bgClass: "bg-red-50 dark:bg-red-950" },
  training: { icon: BookOpen, gradient: "from-cyan-600 to-cyan-800", label: "Eğitim", bgClass: "bg-cyan-50 dark:bg-cyan-950" },
  event: { icon: Calendar, gradient: "from-pink-600 to-pink-800", label: "Etkinlik", bgClass: "bg-pink-50 dark:bg-pink-950" },
  recipe: { icon: ChefHat, gradient: "from-amber-600 to-amber-800", label: "Reçete Değişikliği", bgClass: "bg-amber-50 dark:bg-amber-950" },
};

export default function DuyuruDetay() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDialogOpen, setAckDialogOpen] = useState(false);

  const { data: announcement, isLoading, isError } = useQuery<AnnouncementDetail>({
    queryKey: ["/api/announcements", id],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Duyuru yüklenemedi");
      return res.json();
    },
    enabled: !!id,
  });

  // Okundu olarak işaretle
  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/announcements/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
    },
  });

  // Acknowledge (onayladım) mutation
  const acknowledgeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/announcements/${id}/acknowledge`, {}),
    onSuccess: () => {
      setAcknowledged(true);
      setAckDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Onaylandı", description: "Duyuruyu okuduğunuzu ve anladığınızı onayladınız." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Onay kaydedilemedi", variant: "destructive" });
    },
  });

  // İlk açılışta okundu işaretle
  useEffect(() => {
    if (id) markReadMutation.mutate();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !announcement) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Button variant="ghost" onClick={() => setLocation("/duyuru-yonetimi")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Duyuru bulunamadı veya yüklenemedi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category = announcement.category || "general";
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const CategoryIcon = config.icon;
  const needsAck = announcement.requiresAcknowledgment && !acknowledged;

  return (
    <div className="min-h-screen" data-testid="page-duyuru-detay">
      {/* Back button */}
      <div className="container mx-auto px-4 pt-4 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/duyuru-yonetimi")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Duyurular
        </Button>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full mt-2">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "200px" }}>
            {announcement.bannerImageUrl ? (
              <>
                <img
                  src={announcement.bannerImageUrl}
                  alt={announcement.title}
                  className="w-full h-64 sm:h-80 object-cover"
                  data-testid="img-hero-banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </>
            ) : (
              <div className={`w-full h-48 sm:h-64 bg-gradient-to-br ${config.gradient}`} />
            )}

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`bg-white/20 text-white border-white/30 backdrop-blur-sm`}>
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {announcement.priority === "urgent" && (
                  <Badge variant="destructive">Acil</Badge>
                )}
                {announcement.status && announcement.status !== "published" && (
                  <Badge variant="secondary">
                    {announcement.status === "draft" ? "Taslak" : announcement.status}
                  </Badge>
                )}
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-white leading-tight"
                data-testid="text-announcement-title"
              >
                {announcement.bannerTitle || announcement.title}
              </h1>
              {(announcement.bannerSubtitle || announcement.summary) && (
                <p className="text-white/80 mt-2 text-sm sm:text-base line-clamp-2">
                  {announcement.bannerSubtitle || announcement.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 max-w-4xl py-6 space-y-6">

        {/* Meta bilgiler */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {announcement.publishedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(announcement.publishedAt), "d MMMM yyyy, HH:mm", { locale: tr })}
            </div>
          )}
          {announcement.createdBy && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {announcement.createdBy.fullName}
            </div>
          )}
          {announcement.expiresAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Son: {format(new Date(announcement.expiresAt), "d MMM yyyy", { locale: tr })}
            </div>
          )}
          {announcement.isRead && (
            <div className="flex items-center gap-1.5 text-green-600">
              <Eye className="h-3.5 w-3.5" />
              Okundu
            </div>
          )}
        </div>

        <Separator />

        {/* Kısa mesaj */}
        {announcement.message && (
          <div className={`p-4 rounded-lg ${config.bgClass}`}>
            <p className="text-base leading-relaxed" data-testid="text-announcement-message">
              {announcement.message}
            </p>
          </div>
        )}

        {/* Detaylı içerik (TipTap HTML) */}
        {announcement.detailedContent && (
          <div
            className="prose prose-sm sm:prose dark:prose-invert max-w-none"
            data-testid="div-detailed-content"
            dangerouslySetInnerHTML={{ __html: announcement.detailedContent }}
          />
        )}

        {/* Medya galeri */}
        {announcement.mediaUrls && announcement.mediaUrls.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Ek Görseller</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {announcement.mediaUrls.map((url, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt={`Ek görsel ${idx + 1}`}
                    className="w-full h-32 object-cover hover:scale-105 transition-transform cursor-pointer"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ekler */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Ekler</h3>
            <div className="flex flex-wrap gap-2">
              {announcement.attachments.map((url, idx) => (
                <Button key={idx} variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-3 w-3 mr-1" />
                    Ek {idx + 1}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* CTA Butonu */}
        {announcement.ctaText && announcement.ctaLink && (
          <div className="pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto" data-testid="button-cta">
              <a href={announcement.ctaLink} target="_blank" rel="noopener noreferrer">
                {announcement.ctaText}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}

        <Separator />

        {/* Acknowledgment bölümü */}
        {announcement.requiresAcknowledgment && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-4 sm:p-6">
              {acknowledged || announcement.isRead ? (
                <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="font-medium">Bu duyuruyu onayladınız</p>
                    <p className="text-sm text-muted-foreground">
                      İçeriği okuduğunuzu ve anladığınızı teyit ettiniz.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        Bu duyuru onayınızı gerektiriyor
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        İçeriği dikkatlice okuyun ve anladığınızı onaylayın.
                        {category === "recipe" && " Reçete değişikliklerini eksiksiz uygulamanız gerekmektedir."}
                        {category === "policy" && " Bu yasal düzenlemeye uyum zorunludur."}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setAckDialogOpen(true)}
                    className="w-full sm:w-auto"
                    data-testid="button-acknowledge"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Okudum ve Anladım
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Geçerlilik bilgisi */}
        {announcement.expiresAt && (
          <p className="text-xs text-muted-foreground text-center">
            Bu duyuru {format(new Date(announcement.expiresAt), "d MMMM yyyy", { locale: tr })} tarihine kadar geçerlidir.
          </p>
        )}
      </div>

      {/* Acknowledge Confirmation Dialog */}
      <Dialog open={ackDialogOpen} onOpenChange={setAckDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Duyuru Onayı</DialogTitle>
            <DialogDescription>
              Bu duyuruyu okuduğunuzu ve içeriğini anladığınızı onaylıyor musunuz?
              {category === "recipe" && " Reçete değişikliklerini eksiksiz uygulayacağınızı teyit ediyorsunuz."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
              data-testid="button-confirm-acknowledge"
            >
              {acknowledgeMutation.isPending ? "Onaylanıyor..." : "Onaylıyorum"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
