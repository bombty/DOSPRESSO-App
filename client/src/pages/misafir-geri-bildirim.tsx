import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Coffee, CheckCircle2, Loader2, MapPin, User, Sparkles, Brush, Package } from "lucide-react";

interface BranchInfo {
  branch: { id: number; name: string; city: string };
  staff: { id: string; firstName: string; lastName: string }[];
}

export default function MisafirGeriBildirim() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [staffId, setStaffId] = useState("");
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const { data: branchInfo, isLoading, error } = useQuery<BranchInfo>({
    queryKey: ['/api/feedback/branch', token],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/branch/${token}`);
      if (!res.ok) throw new Error('Branch not found');
      return res.json();
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Gönderim başarısız');
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    submitMutation.mutate({
      branchToken: token,
      rating,
      serviceRating: serviceRating || null,
      cleanlinessRating: cleanlinessRating || null,
      productRating: productRating || null,
      staffRating: staffRating || null,
      staffId: staffId || null,
      comment,
      customerName,
      customerEmail,
      customerPhone,
      isAnonymous,
    });
  };

  const StarRating = ({ value, onChange, label, icon: Icon }: { value: number; onChange: (v: number) => void; label: string; icon?: any }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
            data-testid={`star-${label.toLowerCase().replace(/\s/g, '-')}-${star}`}
          >
            <Star
              className={`h-8 w-8 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !branchInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Coffee className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Geçersiz QR Kod</h2>
            <p className="text-muted-foreground">Bu QR kod artık geçerli değil veya şube bulunamadı.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Teşekkür Ederiz!</h2>
            <p className="text-muted-foreground mb-4">
              Geri bildiriminiz başarıyla alındı. Değerli görüşleriniz için teşekkür ederiz.
            </p>
            <p className="text-sm text-muted-foreground">
              {branchInfo.branch.name} - {branchInfo.branch.city}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <Coffee className="h-12 w-12 mx-auto text-amber-700 mb-2" />
          <h1 className="text-2xl font-bold text-amber-900">DOSPRESSO</h1>
          <p className="text-amber-700">Misafir Geri Bildirim Formu</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {branchInfo.branch.name} - {branchInfo.branch.city}
            </div>
            <CardTitle className="text-lg">Deneyiminizi Değerlendirin</CardTitle>
            <CardDescription>
              Görüşleriniz bizim için çok değerli. Lütfen deneyiminizi puanlayın.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <StarRating
                value={rating}
                onChange={setRating}
                label="Genel Değerlendirme *"
                icon={Star}
              />

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">Detaylı Puanlama (Opsiyonel)</p>
                <div className="grid gap-4">
                  <StarRating
                    value={serviceRating}
                    onChange={setServiceRating}
                    label="Hizmet Kalitesi"
                    icon={Sparkles}
                  />
                  <StarRating
                    value={cleanlinessRating}
                    onChange={setCleanlinessRating}
                    label="Temizlik"
                    icon={Brush}
                  />
                  <StarRating
                    value={productRating}
                    onChange={setProductRating}
                    label="Ürün Kalitesi"
                    icon={Package}
                  />
                  <StarRating
                    value={staffRating}
                    onChange={setStaffRating}
                    label="Personel"
                    icon={User}
                  />
                </div>
              </div>

              {branchInfo.staff.length > 0 && (
                <div className="space-y-2">
                  <Label>Hizmet Aldığınız Personel (Opsiyonel)</Label>
                  <Select value={staffId} onValueChange={setStaffId}>
                    <SelectTrigger data-testid="select-staff">
                      <SelectValue placeholder="Personel seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Belirtmek istemiyorum</SelectItem>
                      {branchInfo.staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comment">Yorumunuz</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  className="min-h-[100px]"
                  data-testid="input-comment"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(!!checked)}
                  data-testid="checkbox-anonymous"
                />
                <Label htmlFor="anonymous" className="text-sm">
                  Anonim olarak gönder
                </Label>
              </div>

              {!isAnonymous && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">İletişim Bilgileriniz</p>
                  <div className="space-y-2">
                    <Label htmlFor="name">Adınız</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ad Soyad"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={rating === 0 || submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gönderiliyor...</>
                ) : (
                  'Geri Bildirimi Gönder'
                )}
              </Button>

              {submitMutation.isError && (
                <p className="text-sm text-red-500 text-center">
                  Bir hata oluştu. Lütfen tekrar deneyin.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-amber-700/70 mt-4">
          DOSPRESSO Franchise Management System
        </p>
      </div>
    </div>
  );
}
