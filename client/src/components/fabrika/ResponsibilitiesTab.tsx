/**
 * ResponsibilitiesTab — Üretim Sorumlulukları
 *
 * Yeni Sistem B (TASK-URETIM-PLANLAMA-V2 — 4 May 2026)
 *
 * "Hangi üretim şefi hangi üründen sorumlu?"
 *
 * Backend:
 *   GET    /api/production-planning/responsibilities
 *   POST   /api/production-planning/responsibilities (admin/ceo/cgo/mudur/coach)
 *   DELETE /api/production-planning/responsibilities/:id
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Target, User, Plus, Trash2, Loader2, Star, AlertCircle, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Responsibility {
  id: number;
  user_id: string;
  product_id: number;
  product_name: string;
  product_category: string;
  sku: string | null;
  user_name: string;
  user_role: string;
  role: string;
  is_primary: boolean;
  notes: string | null;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
}

const RESPONSIBLE_ROLES = ["uretim_sefi", "fabrika_sorumlu", "fabrika_mudur", "kalite_kontrol", "gida_muhendisi"];

export default function ResponsibilitiesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    userId: "",
    productId: "",
    role: "uretim_sefi",
    notes: "",
    isPrimary: true,
  });

  // Sorumluluk listesi
  const { data: responsibilities = [], isLoading } = useQuery<Responsibility[]>({
    queryKey: ["/api/production-planning/responsibilities"],
  });

  // Üretim rollerindeki kullanıcılar
  const { data: usersData = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { roles: RESPONSIBLE_ROLES.join(",") }],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      const all = await res.json();
      const list = Array.isArray(all) ? all : (all.users || []);
      return list.filter((u: any) => RESPONSIBLE_ROLES.includes(u.role));
    },
  });

  // Ürün listesi
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/factory/catalog/products"],
  });

  // Atama
  const addMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      return apiRequest("POST", "/api/production-planning/responsibilities", {
        userId: data.userId,
        productId: Number(data.productId),
        role: data.role,
        isPrimary: data.isPrimary,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/responsibilities"] });
      toast({ title: "Sorumluluk atandı" });
      setAddDialogOpen(false);
      setNewAssignment({ userId: "", productId: "", role: "uretim_sefi", notes: "", isPrimary: true });
    },
    onError: (e: any) => {
      toast({ title: "Atama başarısız", description: e?.message || "Hata", variant: "destructive" });
    },
  });

  // Silme
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/production-planning/responsibilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-planning/responsibilities"] });
      toast({ title: "Sorumluluk silindi" });
    },
    onError: () => {
      toast({ title: "Silme başarısız", variant: "destructive" });
    },
  });

  // Kategorilere göre grupla
  const grouped = useMemo(() => {
    const filtered = responsibilities.filter(r => {
      if (filterCategory !== "all" && r.product_category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.product_name.toLowerCase().includes(q) ||
          r.user_name.toLowerCase().includes(q) ||
          (r.sku || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    const g: Record<string, Responsibility[]> = {};
    for (const r of filtered) {
      const cat = r.product_category || "Diğer";
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    }
    return g;
  }, [responsibilities, searchQuery, filterCategory]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const r of responsibilities) cats.add(r.product_category || "Diğer");
    return Array.from(cats).sort();
  }, [responsibilities]);

  // Sorumlu olmayan ürünler
  const productsWithoutResponsible = useMemo(() => {
    const assignedProductIds = new Set(responsibilities.filter(r => r.is_primary).map(r => r.product_id));
    return products.filter((p: Product) => !assignedProductIds.has(p.id));
  }, [products, responsibilities]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4" data-testid="responsibilities-tab">
      {/* Üst bar */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Üretim Sorumlulukları
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Toplam {responsibilities.length} atama • {responsibilities.filter(r => r.is_primary).length} birincil sorumlu
            </p>
          </div>
          <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-resp">
                <Plus className="h-3 w-3" />
                Yeni Atama
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Yeni Sorumluluk Atama</AlertDialogTitle>
                <AlertDialogDescription>
                  Bir kullanıcıyı bir ürünün üretim sorumlusu olarak ata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kullanıcı</Label>
                  <Select
                    value={newAssignment.userId}
                    onValueChange={(v) => setNewAssignment(prev => ({ ...prev, userId: v }))}
                  >
                    <SelectTrigger data-testid="select-user">
                      <SelectValue placeholder="Kullanıcı seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersData.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Üretim rolünde kullanıcı yok
                        </SelectItem>
                      ) : (
                        usersData.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ürün</Label>
                  <Select
                    value={newAssignment.productId}
                    onValueChange={(v) => setNewAssignment(prev => ({ ...prev, productId: v }))}
                  >
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="Ürün seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rol</Label>
                  <Select
                    value={newAssignment.role}
                    onValueChange={(v) => setNewAssignment(prev => ({ ...prev, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uretim_sefi">Üretim Şefi</SelectItem>
                      <SelectItem value="fabrika_sorumlu">Fabrika Sorumlusu</SelectItem>
                      <SelectItem value="kalite_kontrol">Kalite Kontrol</SelectItem>
                      <SelectItem value="gida_muhendisi">Gıda Mühendisi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Not (opsiyonel)</Label>
                  <Input
                    value={newAssignment.notes}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Pazartesi-Çarşamba vardiyası vb."
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    if (!newAssignment.userId || !newAssignment.productId) {
                      toast({ title: "Kullanıcı ve ürün seç", variant: "destructive" });
                      return;
                    }
                    addMutation.mutate(newAssignment);
                  }}
                  disabled={addMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Ata
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Filtre */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün veya kişi ara..."
                className="h-8 text-sm pl-7"
                data-testid="search-input"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sorumlu olmayan ürün uyarısı */}
      {productsWithoutResponsible.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                {productsWithoutResponsible.length} ürün için birincil sorumlu atanmamış
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                İlk 5: {productsWithoutResponsible.slice(0, 5).map(p => p.name).join(", ")}
                {productsWithoutResponsible.length > 5 ? `, +${productsWithoutResponsible.length - 5} ürün daha` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kategori bazlı liste */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Sorumluluk yok</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterCategory !== "all"
                ? "Filtrene uyan kayıt bulunamadı."
                : "Henüz sorumluluk atanmamış. \"Yeni Atama\" ile başla."}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                {cat}
                <Badge variant="outline" className="ml-2 text-[9px]">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 p-2 rounded border bg-background"
                  data-testid={`resp-${r.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {r.is_primary && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <span className="font-medium text-sm truncate">{r.product_name}</span>
                      {r.sku && (
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {r.sku}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <User className="h-3 w-3" />
                      <span>{r.user_name}</span>
                      <Badge variant="secondary" className="text-[9px]">
                        {r.role}
                      </Badge>
                      {r.user_role && (
                        <span className="text-[10px]">({r.user_role})</span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">
                        💬 {r.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => {
                      if (confirm(`${r.user_name} → ${r.product_name} sorumluluğunu sil?`)) {
                        deleteMutation.mutate(r.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`delete-${r.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
