import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Star, MessageSquare, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface CustomerFeedback {
  id: number;
  branchId: number;
  rating: number;
  comment: string | null;
  feedbackDate: string;
  status: "pending" | "reviewed" | "responded";
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface FeedbackStats {
  avgRating: number;
  totalCount: number;
  rating5: number;
  rating4: number;
  rating3: number;
  rating2: number;
  rating1: number;
}

export default function MusteriGeribildirimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewingFeedback, setReviewingFeedback] = useState<CustomerFeedback | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: feedbackList, isLoading: feedbackLoading } = useQuery<CustomerFeedback[]>({
    queryKey: ["/api/customer-feedback"],
  });

  const { data: stats } = useQuery<FeedbackStats>({
    queryKey: user?.branchId ? [`/api/customer-feedback/stats/${user.branchId}`] : undefined,
    enabled: !!user?.branchId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: number; reviewNotes: string }) => {
      await apiRequest(`/api/customer-feedback/${id}/review`, "PATCH", { reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-feedback"] });
      toast({ title: "Başarılı", description: "Geri bildirim incelendi olarak işaretlendi" });
      setReviewingFeedback(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Geri bildirim güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const renderStars = (rating: number, size: "sm" | "md" = "md") => {
    const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />İncelendi</Badge>;
      case "responded":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"><MessageSquare className="w-3 h-3 mr-1" />Yanıtlandı</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Bekliyor</Badge>;
    }
  };

  if (feedbackLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-musteri-geribildirimi">Müşteri Geri Bildirimleri</h1>
        <p className="text-muted-foreground mt-1">Müşterilerimizin görüşlerini takip edin ve değerlendirin</p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ortalama Puan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                <span className="text-3xl font-bold" data-testid="text-avg-rating">
                  {stats.avgRating ? stats.avgRating.toFixed(1) : '0.0'}
                </span>
                <span className="text-muted-foreground">/ 5.0</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Toplam Değerlendirme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <span className="text-3xl font-bold" data-testid="text-total-count">{stats.totalCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Puan Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats[`rating${rating}` as keyof FeedbackStats] as number;
                  const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{rating} yıldız</span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right" data-testid={`text-rating-${rating}-count`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {!feedbackList || feedbackList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-feedback">Henüz geri bildirim bulunmuyor</p>
            </CardContent>
          </Card>
        ) : (
          feedbackList.map((feedback) => (
            <Card key={feedback.id} data-testid={`card-feedback-${feedback.id}`} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {renderStars(feedback.rating, "sm")}
                      <span className="text-sm text-muted-foreground" data-testid={`text-feedback-date-${feedback.id}`}>
                        {format(new Date(feedback.feedbackDate), "dd MMMM yyyy, HH:mm", { locale: tr })}
                      </span>
                    </div>
                    {feedback.comment && (
                      <p className="text-sm mt-2" data-testid={`text-feedback-comment-${feedback.id}`}>{feedback.comment}</p>
                    )}
                  </div>
                  {getStatusBadge(feedback.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Şube ID: <span data-testid={`text-feedback-branch-${feedback.id}`}>{feedback.branchId}</span>
                  </div>
                  {feedback.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewingFeedback(feedback)}
                      data-testid={`button-review-${feedback.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      İncele
                    </Button>
                  )}
                </div>
                {feedback.reviewNotes && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">İnceleme Notu:</p>
                    <p className="text-sm" data-testid={`text-review-notes-${feedback.id}`}>{feedback.reviewNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!reviewingFeedback} onOpenChange={(open) => !open && setReviewingFeedback(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geri Bildirimi İncele</DialogTitle>
            <DialogDescription>Geri bildirim için inceleme notu ekleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reviewingFeedback && (
              <div className="space-y-2">
                {renderStars(reviewingFeedback.rating)}
                {reviewingFeedback.comment && (
                  <p className="text-sm p-3 bg-muted rounded-md">{reviewingFeedback.comment}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">İnceleme Notu</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="İnceleme notunuzu yazın..."
                rows={4}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewingFeedback(null)}
              data-testid="button-cancel-review"
            >
              İptal
            </Button>
            <Button
              onClick={() => reviewingFeedback && reviewMutation.mutate({ id: reviewingFeedback.id, reviewNotes })}
              disabled={reviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {reviewMutation.isPending ? "Kaydediliyor..." : "İncelendi Olarak İşaretle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
