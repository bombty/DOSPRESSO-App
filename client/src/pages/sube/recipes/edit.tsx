import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/error-state";
import {
  ArrowLeft, Save, Upload, Image as ImageIcon, AlertCircle,
  Loader2, Camera, Trash2, CheckCircle2
} from "lucide-react";

const EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const CATEGORIES = [
  { value: 'hot_coffee', label: 'Sıcak Kahveler' },
  { value: 'iced_coffee', label: 'Buzlu Kahveler' },
  { value: 'creamice', label: 'Creamice (Kırık Buzlu)' },
  { value: 'creamice_caffeine_free', label: 'Creamice Kahvesiz' },
  { value: 'creamice_fruit_milkshake', label: 'Meyveli Milkshake' },
  { value: 'creamshake_caffeine_free', label: 'Creamshake Kahvesiz' },
  { value: 'freshess', label: 'Freshess (Mojito/Ice Tea)' },
  { value: 'frozen_yogurt', label: 'Frozen Yogurt' },
  { value: 'gourmet_shake', label: 'Gourmet Shake' },
  { value: 'hot_tea', label: 'Sıcak Çaylar' },
  { value: 'cold_tea', label: 'Soğuk Çaylar' },
  { value: 'freddo', label: 'Freddo' },
  { value: 'donut', label: 'Donutlar' },
  { value: 'pastry', label: 'Hamur İşleri' },
  { value: 'other', label: 'Diğer' },
];

interface Product {
  id: number;
  name: string;
  shortCode?: string;
  category: string;
  subCategory?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  massivoPrice?: string;
  longDivaPrice?: string;
  notes?: string;
}

export default function RecipeEditPage() {
  const [match, params] = useRoute("/sube/recipes/:id/edit");
  const [, setLocation] = useLocation();
  const productId = params?.id ? Number(params.id) : null;
  const isNew = !productId;

  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    shortCode: '',
    category: 'hot_coffee',
    subCategory: '',
    description: '',
    displayOrder: 0,
    isActive: true,
    massivoPrice: '',
    longDivaPrice: '',
    notes: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Yetki kontrol
  if (!user || !EDIT_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold mb-2">Yetkisiz Erişim</h2>
            <p className="text-sm text-gray-600 mb-4">
              Bu sayfaya sadece HQ rolleri erişebilir (admin, ceo, cgo, coach, trainer).
            </p>
            <Link href="/sube/recipes">
              <Button>Reçete Listesine Dön</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mevcut ürün yükle (edit modunda)
  const { data: existingProduct, isLoading } = useQuery<{ product: Product; recipes: any[] }>({
    queryKey: [`/api/branch-products/${productId}`],
    queryFn: async () => {
      const res = await fetch(`/api/branch-products/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ürün yüklenemedi");
      return res.json();
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (existingProduct?.product) {
      setForm(existingProduct.product);
    }
  }, [existingProduct]);

  // Mutation: Yeni ürün ekle
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const res = await apiRequest('POST', '/api/branch-products', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Ürün eklendi", description: `${data.name} oluşturuldu` });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
      setLocation(`/sube/recipes/${data.id}/edit`);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Ekleme başarısız", variant: "destructive" });
    },
  });

  // Mutation: Ürün güncelle
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const res = await apiRequest('PATCH', `/api/branch-products/${productId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Güncellendi", description: "Değişiklikler kaydedildi" });
      queryClient.invalidateQueries({ queryKey: [`/api/branch-products/${productId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Güncelleme başarısız", variant: "destructive" });
    },
  });

  // Mutation: Soft delete
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/branch-products/${productId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pasif edildi", description: "Ürün listeden kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
      setLocation('/sube/recipes');
    },
  });

  // Görsel upload
  const handleImageUpload = async (file: File) => {
    if (!productId) {
      toast({ title: "Önce ürün kaydedin", description: "Görsel için ürün ID gerekli" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Dosya çok büyük", description: "Maksimum 10 MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);

    try {
      // File → base64 dataUrl
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiRequest('POST', `/api/branch-products/${productId}/image`, { dataUrl });
      const result = await res.json();

      toast({
        title: "Görsel yüklendi",
        description: `3 boyut oluşturuldu (${(result.sizes.card.bytes / 1024).toFixed(0)} KB)`,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/branch-products/${productId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
    } catch (err: any) {
      toast({ title: "Yükleme başarısız", description: err.message || "Hata oluştu", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.category) {
      toast({ title: "Eksik bilgi", description: "Ad ve kategori zorunlu", variant: "destructive" });
      return;
    }

    if (isNew) {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate(form);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`"${form.name}" pasif edilecek. Devam edilsin mi?`)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edeae4] dark:bg-[#0c0f14]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#c0392b] text-white px-3 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <Link href={isNew ? "/sube/recipes" : `/sube/recipes/${productId}`}>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold">
              {isNew ? "Yeni Ürün" : "Ürünü Düzenle"}
            </h1>
            <p className="text-xs opacity-80">
              {isNew ? "HQ - Reçete oluştur" : `ID: ${productId}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="btn-save"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="ml-1">Kaydet</span>
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 pb-24 max-w-2xl mx-auto space-y-4">
        {/* Görsel Bölümü (sadece var olan ürünler için) */}
        {!isNew && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Ürün Görseli
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {form.imageUrl ? (
                  <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={form.imageUrl}
                      alt={form.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex-1"
                    data-testid="btn-upload-image"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-1" />
                        {form.imageUrl ? 'Değiştir' : 'Yükle'}
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-500">
                  3 boyut otomatik oluşturulur: 200×200 (liste), 600×400 (kart - varsayılan), 1200×800 (detay).
                  Format: WebP (JPEG/PNG/WebP yüklenebilir). Max 10 MB.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Temel Bilgiler */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Ürün Adı *</Label>
              <Input
                id="name"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Latte"
                data-testid="input-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="shortCode">Kısa Kod</Label>
                <Input
                  id="shortCode"
                  value={form.shortCode || ''}
                  onChange={(e) => setForm({ ...form, shortCode: e.target.value })}
                  placeholder="L"
                  maxLength={10}
                  data-testid="input-short-code"
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">Sıralama</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={form.displayOrder ?? 0}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  data-testid="input-display-order"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subCategory">Alt Kategori (opsiyonel)</Label>
              <Input
                id="subCategory"
                value={form.subCategory || ''}
                onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                placeholder="milk_based, kahvesiz, vb."
                data-testid="input-sub-category"
              />
            </div>

            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Espresso ve buharlanmış süt"
                rows={2}
                data-testid="textarea-description"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fiyat */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fiyatlar (₺)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="massivoPrice">Massivo (200ml)</Label>
              <Input
                id="massivoPrice"
                type="number"
                step="0.01"
                value={form.massivoPrice || ''}
                onChange={(e) => setForm({ ...form, massivoPrice: e.target.value })}
                placeholder="65.00"
                data-testid="input-massivo-price"
              />
            </div>
            <div>
              <Label htmlFor="longDivaPrice">Long Diva (280ml)</Label>
              <Input
                id="longDivaPrice"
                type="number"
                step="0.01"
                value={form.longDivaPrice || ''}
                onChange={(e) => setForm({ ...form, longDivaPrice: e.target.value })}
                placeholder="80.00"
                data-testid="input-long-diva-price"
              />
            </div>
          </CardContent>
        </Card>

        {/* Aktif/Notlar */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive" className="text-sm font-medium">Aktif (menüde göster)</Label>
                <p className="text-xs text-gray-500">Pasif ürünler liste/kart'ta görünmez</p>
              </div>
              <Switch
                id="isActive"
                checked={form.isActive ?? true}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                data-testid="switch-is-active"
              />
            </div>

            <div>
              <Label htmlFor="notes">İç Notlar (HQ için)</Label>
              <Textarea
                id="notes"
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Sezonluk ürün, kasım-mart arası aktif"
                rows={2}
                data-testid="textarea-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reçete linki (sadece var olan ürünler için) */}
        {!isNew && existingProduct?.recipes && existingProduct.recipes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reçete Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">
                Bu ürünün {existingProduct.recipes.length} boy reçetesi var.
                Malzeme/adım/quiz düzenleme sayfası gelecek sürümde.
              </p>
              <div className="flex flex-wrap gap-2">
                {existingProduct.recipes.map((r: any) => (
                  <Link key={r.id} href={`/sube/recipes/${productId}?size=${r.size}`}>
                    <Button variant="outline" size="sm">
                      {r.size === 'massivo' ? 'Massivo' : r.size === 'long_diva' ? 'Long Diva' : 'Tek Boy'}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tehlikeli alan */}
        {!isNew && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-4">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="w-full"
                data-testid="btn-delete"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Ürünü Pasif Et (Soft Delete)
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                isActive=false. Veriler korunur, tekrar aktif edilebilir.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
