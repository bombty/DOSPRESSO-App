import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Send, CheckCircle } from "lucide-react";

export default function MusteriFeedbackPublic() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [branchId, setBranchId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!branchId || !rating) {
        throw new Error("Lütfen şube seçin ve puan verin");
      }

      const data: any = {
        branchId: parseInt(branchId),
        rating,
        comment: comment.trim() || null,
        isAnonymous,
      };

      if (!isAnonymous) {
        if (customerName.trim()) data.customerName = customerName.trim();
        if (customerEmail.trim()) data.customerEmail = customerEmail.trim();
      }

      await apiRequest("POST", "/api/customer-feedback/public", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ 
        title: "Başarılı", 
        description: "Geri bildiriminiz için teşekkür ederiz!" 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Geri bildirim gönderilemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600" data-testid="icon-success" />
            <h2 className="text-2xl font-bold" data-testid="heading-thank-you">Teşekkür Ederiz!</h2>
            <p className="text-center text-muted-foreground" data-testid="text-success-message">
              Geri bildiriminiz başarıyla kaydedildi. Görüşleriniz bizim için çok değerli.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setComment("");
                setBranchId("");
                setIsAnonymous(false);
                setCustomerName("");
                setCustomerEmail("");
              }}
              data-testid="button-submit-another"
            >
              Yeni Geri Bildirim Gönder
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="heading-feedback-form">
            DOSPRESSO - Misafir Geri Bildirimi
          </CardTitle>
          <CardDescription>
            Deneyiminizi bizimle paylaşın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="branchId">Şube ID *</Label>
              <Input
                id="branchId"
                type="number"
                placeholder="Şube ID numarasını girin"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                data-testid="input-branch-id"
              />
              <p className="text-xs text-muted-foreground">
                Ziyaret ettiğiniz şubenin ID numarasını girin
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label>Puanınız *</Label>
              <div className="flex gap-2" data-testid="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                    data-testid={`button-star-${star}`}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-selected-rating">
                  Seçilen puan: {rating} / 5
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="comment">Yorumunuz (İsteğe bağlı)</Label>
              <Textarea
                id="comment"
                placeholder="Deneyiminizi detaylı anlatmak ister misiniz?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                data-testid="textarea-comment"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                data-testid="checkbox-anonymous"
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Anonim geri bildirim göndermek istiyorum
              </Label>
            </div>

            {!isAnonymous && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="name">Adınız (İsteğe bağlı)</Label>
                  <Input
                    id="name"
                    placeholder="Adınızı girin"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="email">E-posta (İsteğe bağlı)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@ornek.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    data-testid="input-customer-email"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending || !rating || !branchId}
              data-testid="button-submit-feedback"
            >
              {submitMutation.isPending ? (
                "Gönderiliyor..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Geri Bildirimi Gönder
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
