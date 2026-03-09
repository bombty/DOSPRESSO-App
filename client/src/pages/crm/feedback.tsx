import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  MessageSquare,
  Download,
  Send,
  Building2,
  QrCode,
  Instagram,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface FeedbackListItem {
  id: number;
  branchId: number;
  branchName: string;
  source: string;
  rating: number;
  serviceRating?: number;
  cleanlinessRating?: number;
  productRating?: number;
  staffRating?: number;
  comment?: string;
  customerName?: string;
  isAnonymous: boolean;
  priority: string;
  status: string;
  slaBreached: boolean;
  feedbackDate: string;
  photoUrls?: string[];
  isSuspicious?: boolean;
  feedbackType?: string;
}

interface FeedbackDetail extends FeedbackListItem {
  customerEmail?: string;
  customerPhone?: string;
  externalReviewUrl?: string;
  staffName?: string;
  reviewNotes?: string;
  resolvedAt?: string;
  responses: FeedbackResponse[];
}

interface FeedbackResponse {
  id: number;
  responseType: string;
  content: string;
  isVisibleToCustomer: boolean;
  createdAt: string;
  responderName: string;
}

interface Branch {
  id: number;
  name: string;
}

const sourceLabels: Record<string, { label: string; icon: typeof QrCode }> = {
  qr_code: { label: "QR Kod", icon: QrCode },
  google: { label: "Google", icon: MapPin },
  instagram: { label: "Instagram", icon: Instagram },
  in_person: { label: "Yüz Yüze", icon: Users },
  phone: { label: "Telefon", icon: Phone },
  email: { label: "E-posta", icon: Mail },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Yeni", variant: "destructive" },
  in_progress: { label: "İnceleniyor", variant: "default" },
  awaiting_response: { label: "Yanıt Bekliyor", variant: "secondary" },
  resolved: { label: "Çözüldü", variant: "outline" },
  closed: { label: "Kapatıldı", variant: "outline" },
};

const categoryLabels: Record<string, string> = {
  feedback: "Geri Bildirim",
  complaint: "Şikayet",
};

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  

  return (
    <div className="flex gap-0.5" data-testid="star-display">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"} ${
            s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function CRMFeedback() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    branchId: "",
    startDate: "",
    endDate: "",
    rating: "",
    status: "",
    category: "",
    source: "",
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.branchId) params.append("branchId", filters.branchId);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.status) params.append("status", filters.status);
    if (filters.source) params.append("source", filters.source);
    if (filters.category) params.append("feedbackType", filters.category);
    if (filters.rating) params.append("rating", filters.rating);
    return params.toString();
  };

  const { data: feedbacks = [], isLoading, isError, refetch } = useQuery<FeedbackListItem[]>({
    queryKey: ["/api/customer-feedback", filters],
    queryFn: async () => {
      const qs = buildParams();
      const url = qs ? `/api/customer-feedback?${qs}` : "/api/customer-feedback";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/crm/branches"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<FeedbackDetail>({
    queryKey: ["/api/customer-feedback", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/customer-feedback/${selectedId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: !!selectedId && showDetail,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest("POST", `/api/customer-feedback/${id}/response`, {
        responseType: "defense",
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-feedback"] });
      setShowResponse(false);
      setResponseText("");
      toast({ title: "Yanıt eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yanıt eklenemedi", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/customer-feedback/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-feedback"] });
      toast({ title: "Durum güncellendi" });
    },
  });

  const exportCSV = () => {
    const headers = ["Tarih", "Şube", "Puan", "Hizmet", "Temizlik", "Ürün", "Personel", "Yorum", "Durum", "Kaynak", "Kategori"];
    const rows = feedbacks.map((fb) => [
      fb.feedbackDate ? format(new Date(fb.feedbackDate), "dd.MM.yyyy") : "",
      fb.branchName || "",
      fb.rating?.toString() || "",
      fb.serviceRating?.toString() || "",
      fb.cleanlinessRating?.toString() || "",
      fb.productRating?.toString() || "",
      fb.staffRating?.toString() || "",
      (fb.comment || "").replace(/"/g, '""'),
      statusConfig[fb.status]?.label || fb.status,
      sourceLabels[fb.source]?.label || fb.source,
      categoryLabels[fb.feedbackType || ""] || fb.feedbackType || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `geri-bildirimler-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    setPhotoIndex(0);
    setShowDetail(true);
  };

  return (
    <div className="p-4 space-y-4" data-testid="crm-feedback-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Geri Bildirimler</h1>
          <p className="text-sm text-muted-foreground">Müşteri geri bildirimleri ve değerlendirmeler</p>
        </div>
        <Button onClick={exportCSV} variant="outline" data-testid="button-export-csv">
          <Download className="mr-2 h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      <Card data-testid="filter-bar">
        <CardContent className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="filter-scroll">
            <Select value={filters.branchId || "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, branchId: v === "_all" ? "" : v }))}>
              <SelectTrigger className="w-[150px] shrink-0" data-testid="filter-branch">
                <SelectValue placeholder="Şube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tüm Şubeler</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className="w-[140px] shrink-0"
              data-testid="filter-start-date"
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              className="w-[140px] shrink-0"
              data-testid="filter-end-date"
            />

            <Select value={filters.rating || "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, rating: v === "_all" ? "" : v }))}>
              <SelectTrigger className="w-[120px] shrink-0" data-testid="filter-rating">
                <SelectValue placeholder="Puan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tüm Puanlar</SelectItem>
                {[5, 4, 3, 2, 1].map((r) => (
                  <SelectItem key={r} value={r.toString()}>{r} Yıldız</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status || "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "_all" ? "" : v }))}>
              <SelectTrigger className="w-[140px] shrink-0" data-testid="filter-status">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tüm Durumlar</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.category || "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, category: v === "_all" ? "" : v }))}>
              <SelectTrigger className="w-[140px] shrink-0" data-testid="filter-category">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tüm Kategoriler</SelectItem>
                <SelectItem value="feedback">Geri Bildirim</SelectItem>
                <SelectItem value="complaint">Şikayet</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.source || "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, source: v === "_all" ? "" : v }))}>
              <SelectTrigger className="w-[130px] shrink-0" data-testid="filter-source">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tüm Kaynaklar</SelectItem>
                {Object.entries(sourceLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3" data-testid="loading-skeleton">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-empty">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Geri bildirim bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="feedback-list">
          {feedbacks.map((fb) => {
            const srcInfo = sourceLabels[fb.source];
            const SrcIcon = srcInfo?.icon || MessageSquare;
            const stInfo = statusConfig[fb.status] || statusConfig.new;

            return (
              <Card
                key={fb.id}
                className="hover-elevate cursor-pointer"
                onClick={() => openDetail(fb.id)}
                data-testid={`feedback-row-${fb.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground" data-testid={`text-date-${fb.id}`}>
                          {fb.feedbackDate ? format(new Date(fb.feedbackDate), "dd MMM yyyy", { locale: tr }) : "-"}
                        </span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-branch-${fb.id}`}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {fb.branchName}
                        </Badge>
                        <Badge variant={stInfo.variant} data-testid={`badge-status-${fb.id}`}>
                          {stInfo.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-source-${fb.id}`}>
                          <SrcIcon className="h-3 w-3 mr-1" />
                          {srcInfo?.label || fb.source}
                        </Badge>
                        {fb.slaBreached && (
                          <Badge variant="destructive" className="text-xs">SLA</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <StarDisplay rating={fb.rating} />
                        {fb.serviceRating != null && (
                          <Badge variant="secondary" className="text-xs">Hizmet: {fb.serviceRating}</Badge>
                        )}
                        {fb.cleanlinessRating != null && (
                          <Badge variant="secondary" className="text-xs">Temizlik: {fb.cleanlinessRating}</Badge>
                        )}
                        {fb.productRating != null && (
                          <Badge variant="secondary" className="text-xs">Ürün: {fb.productRating}</Badge>
                        )}
                        {fb.staffRating != null && (
                          <Badge variant="secondary" className="text-xs">Personel: {fb.staffRating}</Badge>
                        )}
                      </div>

                      {fb.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-comment-${fb.id}`}>
                          {fb.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle>Geri Bildirim Detayı</DialogTitle>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {detail.feedbackDate ? format(new Date(detail.feedbackDate), "dd MMMM yyyy HH:mm", { locale: tr }) : "-"}
                </span>
                <Badge variant="outline">
                  <Building2 className="h-3 w-3 mr-1" />
                  {detail.branchName}
                </Badge>
                <Badge variant={statusConfig[detail.status]?.variant || "default"} data-testid="badge-detail-status">
                  {statusConfig[detail.status]?.label || detail.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Genel Puan:</span>
                  <StarDisplay rating={detail.rating} size="md" />
                  <span className="font-bold">{detail.rating}/5</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {detail.serviceRating != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Hizmet:</span>
                      <StarDisplay rating={detail.serviceRating} />
                    </div>
                  )}
                  {detail.cleanlinessRating != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Temizlik:</span>
                      <StarDisplay rating={detail.cleanlinessRating} />
                    </div>
                  )}
                  {detail.productRating != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Ürün:</span>
                      <StarDisplay rating={detail.productRating} />
                    </div>
                  )}
                  {detail.staffRating != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Personel:</span>
                      <StarDisplay rating={detail.staffRating} />
                    </div>
                  )}
                </div>
              </div>

              {detail.comment && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-full-comment">{detail.comment}</p>
                  </CardContent>
                </Card>
              )}

              {detail.photoUrls && detail.photoUrls.length > 0 && (
                <div data-testid="photo-gallery">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Fotoğraflar ({detail.photoUrls.length})
                  </p>
                  <div className="relative rounded-md overflow-hidden bg-muted">
                    <img
                      src={detail.photoUrls[photoIndex]}
                      alt={`Fotoğraf ${photoIndex + 1}`}
                      className="w-full h-48 object-contain"
                      data-testid={`img-photo-${photoIndex}`}
                    />
                    {detail.photoUrls.length > 1 && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => Math.max(0, i - 1)); }}
                          disabled={photoIndex === 0}
                          data-testid="button-photo-prev"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs bg-background/80 px-2 py-1 rounded">{photoIndex + 1}/{detail.photoUrls.length}</span>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => Math.min(detail.photoUrls!.length - 1, i + 1)); }}
                          disabled={photoIndex === detail.photoUrls.length - 1}
                          data-testid="button-photo-next"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!detail.isAnonymous && (detail.customerName || detail.customerEmail || detail.customerPhone) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <User className="h-4 w-4" /> Müşteri Bilgisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1">
                    {detail.customerName && (
                      <p className="text-sm" data-testid="text-customer-name">{detail.customerName}</p>
                    )}
                    {detail.customerEmail && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-customer-email">
                        <Mail className="h-3 w-3" /> {detail.customerEmail}
                      </p>
                    )}
                    {detail.customerPhone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-customer-phone">
                        <Phone className="h-3 w-3" /> {detail.customerPhone}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {detail.responses && detail.responses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Yanıtlar ({detail.responses.length})</p>
                  {detail.responses.map((resp) => (
                    <Card key={resp.id} data-testid={`response-${resp.id}`}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium">{resp.responderName}</span>
                          <span className="text-xs text-muted-foreground">
                            {resp.createdAt ? format(new Date(resp.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{resp.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={detail.status}
                  onValueChange={(v) => statusMutation.mutate({ id: detail.id, status: v })}
                >
                  <SelectTrigger className="w-[160px]" data-testid="select-update-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowResponse(true)} data-testid="button-respond">
                  <Send className="mr-2 h-4 w-4" />
                  Yanıtla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showResponse} onOpenChange={setShowResponse}>
        <DialogContent data-testid="dialog-response">
          <DialogHeader>
            <DialogTitle>Yanıt Ekle</DialogTitle>
          </DialogHeader>
          <Textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Yanıtınızı yazın..."
            className="min-h-[120px]"
            data-testid="input-response-text"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponse(false)}
              data-testid="button-cancel-response"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                if (selectedId && responseText.trim()) {
                  respondMutation.mutate({ id: selectedId, content: responseText.trim() });
                }
              }}
              disabled={!responseText.trim() || respondMutation.isPending}
              data-testid="button-submit-response"
            >
              {respondMutation.isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
