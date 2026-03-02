import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Coffee, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PublicStaffRating() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [overallRating, setOverallRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [friendlinessRating, setFriendlinessRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState<{field: string, value: number} | null>(null);

  // Validate token and get staff info
  const { data: tokenData, isLoading, error } = useQuery({
    queryKey: ["/api/public/staff-rating/validate", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/staff-rating/validate/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Geçersiz QR kodu");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/public/staff-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Değerlendirme gönderilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Teşekkürler!",
        description: "Değerlendirmeniz başarıyla kaydedildi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (overallRating === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen genel değerlendirme puanı verin.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      token,
      overallRating,
      serviceRating: serviceRating || null,
      friendlinessRating: friendlinessRating || null,
      speedRating: speedRating || null,
      comment: comment.trim() || null,
    });
  };

  const renderStars = (
    field: string,
    value: number,
    setValue: (v: number) => void,
    label: string
  ) => {
    const displayValue = hoverRating?.field === field ? hoverRating.value : value;
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onClick={() => setValue(star)}
              onMouseEnter={() => setHoverRating({ field, value: star })}
              onMouseLeave={() => setHoverRating(null)}
              data-testid={`star-${field}-${star}`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= displayValue
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
            <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Geçersiz QR Kodu</h2>
            <p className="text-muted-foreground text-center">
              Bu değerlendirme linki geçersiz veya süresi dolmuş olabilir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Teşekkürler!</h2>
            <p className="text-muted-foreground text-center mb-6">
              Değerlendirmeniz için teşekkür ederiz. Görüşleriniz bizim için çok değerli.
            </p>
            <div className="flex items-center gap-2 text-amber-600">
              <Coffee className="h-5 w-5" />
              <span className="font-medium">DOSPRESSO</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coffee className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold text-amber-600">DOSPRESSO</span>
          </div>
          <CardTitle className="text-xl">Personel Değerlendirmesi</CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">
              {tokenData.staffName}
            </span>
            {" - "}
            {tokenData.branchName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Overall Rating - Required */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
            {renderStars("overall", overallRating, setOverallRating, "Genel Değerlendirme *")}
          </div>

          {/* Optional Ratings */}
          <div className="space-y-4">
            {renderStars("service", serviceRating, setServiceRating, "Hizmet Kalitesi")}
            {renderStars("friendliness", friendlinessRating, setFriendlinessRating, "Güler Yüzlülük")}
            {renderStars("speed", speedRating, setSpeedRating, "Hızlı Hizmet")}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Yorumunuz (Opsiyonel)</Label>
            <Textarea
              id="comment"
              placeholder="Deneyiminizi paylaşabilirsiniz..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              data-testid="input-comment"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700"
            size="lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending || overallRating === 0}
            data-testid="button-submit-rating"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              "Değerlendirmeyi Gönder"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Değerlendirmeniz anonim olarak kaydedilecektir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
