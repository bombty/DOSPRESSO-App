/**
 * BRANCH RECIPES ADMIN — HQ Yönetim Paneli
 *
 * Yetki: admin, ceo, cgo, coach, trainer
 *
 * Özellikler:
 *   - Ürün listesi + filtre (kategori, aktif/pasif)
 *   - Yeni ürün ekleme (modal)
 *   - Ürün düzenleme (inline + modal)
 *   - Görsel upload (3 boyut otomatik transform)
 *   - Soft delete (isActive=false)
 *   - Reçete listesi (boy bazlı)
 *
 * URL: /branch-recipes/admin
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Pencil, Trash2, ImageIcon, Upload, Sparkles,
  ChefHat, Eye, EyeOff, AlertCircle, Save, X, Camera,
} from "lucide-react";

const HQ_EDIT_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer'];

const CATEGORIES = [
  { value: 'hot_coffee', label: 'Sıcak Kahveler' },
  { value: 'iced_coffee', label: 'Buzlu Kahveler' },
  { value: 'creamice', label: 'Creamice' },
  { value: 'creamshake_caffeine_free', label: 'Creamshake (Kahvesiz)' },
  { value: 'freshess', label: 'Freshess' },
  { value: 'frozen_yogurt', label: 'Frozen Yogurt' },
  { value: 'creamice_fruit_milkshake', label: 'Meyveli Milkshake' },
  { value: 'hot_tea', label: 'Sıcak Çaylar' },
  { value: 'cold_tea', label: 'Soğuk Çaylar' },
  { value: 'gourmet_shake', label: 'Gourmet Shake' },
  { value: 'freddo', label: 'Freddo' },
];

interface BranchProduct {
  id: number;
  name: string;
  shortCode: string | null;
  category: string;
  subCategory: string | null;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  massivoPrice: string | null;
  longDivaPrice: string | null;
  notes: string | null;
}

export default function BranchRecipesAdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showInactive, setShowInactive] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<BranchProduct | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const canEdit = user?.role && HQ_EDIT_ROLES.includes(user.role);

  // Yetki kontrolü
  if (!canEdit) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Yetkisiz Erişim</h2>
            <p className="text-muted-foreground mb-4">
              Bu sayfaya erişmek için HQ yetkisi gerekir
              (admin, ceo, cgo, coach, trainer).
            </p>
            <Button onClick={() => setLocation("/branch-recipes")}>
              Reçeteler Listesine Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tüm ürünler (aktif + pasif)
  const { data: products = [], isLoading } = useQuery<BranchProduct[]>({
    queryKey: ["/api/branch-products", { showAll: showInactive }],
    queryFn: async () => {
      const url = showInactive
        ? "/api/branch-products"
        : "/api/branch-products?isActive=true";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Ürünler yüklenemedi");
      return res.json();
    },
  });

  // Filtrelenmiş ürünler
  const filteredProducts = products.filter(p => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    return true;
  });

  // Soft delete
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/branch-products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Silme başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
      toast({ title: "Ürün pasif edildi", description: "Soft delete uygulandı" });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Aktif/Pasif toggle
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/branch-products/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Güncelleme başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/branch-recipes")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-[#c0392b]" />
            Reçete Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">
            HQ paneli — Ürün ekle, düzenle, görsel yükle
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/branch-recipes/admin/onboarding")}
            data-testid="button-onboarding-admin"
            className="gap-1.5"
          >
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Onboarding</span>
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#c0392b] hover:bg-[#a73225]"
                data-testid="button-new-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ürün
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ProductFormDialog
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
                  setCreateDialogOpen(false);
                }}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtreler */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-inactive" className="cursor-pointer">
              Pasif olanları göster
            </Label>
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
              data-testid="switch-show-inactive"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]" data-testid="select-category">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kategoriler</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-muted-foreground">
            {filteredProducts.length} / {products.length} ürün
          </div>
        </CardContent>
      </Card>

      {/* Ürün Tablosu */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Bu filtrede ürün yok</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk ürünü ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map(product => (
            <Card key={product.id} className={!product.isActive ? "opacity-60" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                {/* Görsel veya placeholder */}
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{product.name}</span>
                    {product.shortCode && (
                      <Badge variant="outline" className="text-xs">{product.shortCode}</Badge>
                    )}
                    {!product.isActive && (
                      <Badge variant="destructive" className="text-xs">Pasif</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                    {product.massivoPrice && ` · M: ${product.massivoPrice}₺`}
                    {product.longDivaPrice && ` · LD: ${product.longDivaPrice}₺`}
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center gap-1">
                  {/* Aktif/Pasif Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({
                      id: product.id,
                      isActive: !product.isActive,
                    })}
                    disabled={toggleActiveMutation.isPending}
                    data-testid={`button-toggle-${product.id}`}
                  >
                    {product.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Görsel Upload */}
                  <ImageUploadButton productId={product.id} />

                  {/* Edit */}
                  <Dialog
                    open={editingProduct?.id === product.id}
                    onOpenChange={(open) => !open && setEditingProduct(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProduct(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    {editingProduct?.id === product.id && (
                      <DialogContent>
                        <ProductFormDialog
                          product={editingProduct}
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
                            setEditingProduct(null);
                          }}
                          onCancel={() => setEditingProduct(null)}
                        />
                      </DialogContent>
                    )}
                  </Dialog>

                  {/* Soft Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ürünü pasif et?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{product.name}</strong> ürünü pasif edilecek (soft delete).
                          DOSPRESSO kuralı gereği veriler korunur, sonradan tekrar aktif edilebilir.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(product.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Pasif Et
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Ürün Form Dialog (Yeni / Düzenle)
// ─────────────────────────────────────────────

interface ProductFormDialogProps {
  product?: BranchProduct;
  onSuccess: () => void;
  onCancel: () => void;
}

function ProductFormDialog({ product, onSuccess, onCancel }: ProductFormDialogProps) {
  const { toast } = useToast();
  const isEdit = !!product;

  const [formData, setFormData] = useState({
    name: product?.name ?? "",
    shortCode: product?.shortCode ?? "",
    category: product?.category ?? "hot_coffee",
    subCategory: product?.subCategory ?? "",
    description: product?.description ?? "",
    massivoPrice: product?.massivoPrice ?? "",
    longDivaPrice: product?.longDivaPrice ?? "",
    displayOrder: product?.displayOrder ?? 0,
    notes: product?.notes ?? "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/branch-products/${product.id}`
        : "/api/branch-products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          shortCode: formData.shortCode || null,
          category: formData.category,
          subCategory: formData.subCategory || null,
          description: formData.description || null,
          massivoPrice: formData.massivoPrice ? parseFloat(formData.massivoPrice) : null,
          longDivaPrice: formData.longDivaPrice ? parseFloat(formData.longDivaPrice) : null,
          displayOrder: formData.displayOrder,
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kayıt başarısız");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Ürün güncellendi" : "Yeni ürün eklendi",
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? `Ürün Düzenle: ${product.name}` : "Yeni Ürün Ekle"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3 py-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name">Ürün Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Mango Mojito"
              data-testid="input-name"
            />
          </div>
          <div>
            <Label htmlFor="shortCode">Kısa Kod</Label>
            <Input
              id="shortCode"
              value={formData.shortCode}
              onChange={(e) => setFormData(f => ({ ...f, shortCode: e.target.value }))}
              placeholder="ML"
              maxLength={10}
              data-testid="input-short-code"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Kategori *</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}
            >
              <SelectTrigger id="category" data-testid="select-form-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subCategory">Alt Kategori</Label>
            <Input
              id="subCategory"
              value={formData.subCategory}
              onChange={(e) => setFormData(f => ({ ...f, subCategory: e.target.value }))}
              placeholder="kahvesiz, espresso_based..."
              data-testid="input-sub-category"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
            placeholder="Ürün açıklaması..."
            rows={2}
            data-testid="textarea-description"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="massivoPrice">Massivo Fiyat (₺)</Label>
            <Input
              id="massivoPrice"
              type="number"
              step="0.01"
              value={formData.massivoPrice}
              onChange={(e) => setFormData(f => ({ ...f, massivoPrice: e.target.value }))}
              placeholder="0.00"
              data-testid="input-massivo-price"
            />
          </div>
          <div>
            <Label htmlFor="longDivaPrice">Long Diva Fiyat (₺)</Label>
            <Input
              id="longDivaPrice"
              type="number"
              step="0.01"
              value={formData.longDivaPrice}
              onChange={(e) => setFormData(f => ({ ...f, longDivaPrice: e.target.value }))}
              placeholder="0.00"
              data-testid="input-long-diva-price"
            />
          </div>
          <div>
            <Label htmlFor="displayOrder">Sıralama</Label>
            <Input
              id="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
              data-testid="input-display-order"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notlar</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
            placeholder="İç notlar (sadece HQ görür)"
            rows={2}
            data-testid="textarea-notes"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          İptal
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !formData.name || !formData.category}
          className="bg-[#c0392b] hover:bg-[#a73225]"
          data-testid="button-save"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─────────────────────────────────────────────
// Görsel Upload Butonu
// ─────────────────────────────────────────────

function ImageUploadButton({ productId }: { productId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Sadece görsel yükleyebilirsiniz", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Dosya çok büyük", description: "Maksimum 10 MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      // Base64'e çevir
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/branch-products/${productId}/image`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Yükleme başarısız");
      }

      const result = await res.json();
      toast({
        title: "Görsel yüklendi",
        description: `3 boyut oluşturuldu (thumbnail/card/hero)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-products"] });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        id={`upload-${productId}`}
        className="hidden"
        disabled={isUploading}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => document.getElementById(`upload-${productId}`)?.click()}
        disabled={isUploading}
        data-testid={`button-upload-${productId}`}
      >
        {isUploading ? (
          <span className="text-xs">...</span>
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
