import { useMemo, useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { AlertTriangle, RefreshCw, Search, ShieldCheck } from "lucide-react";

interface CategoryAuditItem {
  id: number;
  code: string;
  name: string;
  category: string;
  subCategory: string | null;
  unit: string;
  isActive: boolean;
  factoryRecipeCount: number;
  productRecipeCount: number;
  totalRecipeCount: number;
}

interface CategoryAuditResponse {
  validCategories: string[];
  items: CategoryAuditItem[];
}

const ALLOWED_ROLES = [
  "admin",
  "genel_mudur",
  "ceo",
  "cgo",
  "fabrika_mudur",
  "satinalma",
];

export default function AdminEnvanterKategoriDenetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [pendingChoice, setPendingChoice] = useState<Record<number, string>>({});

  const { data, isLoading, isError, refetch, isFetching } = useQuery<CategoryAuditResponse>({
    queryKey: ["/api/inventory/category-audit"],
    enabled: !!user && ALLOWED_ROLES.includes(user.role || ""),
  });

  const fixMutation = useMutation({
    mutationFn: async ({ id, category }: { id: number; category: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}/category`, { category });
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "Kategori güncellendi",
        description: result?.message || "Envanter kategorisi başarıyla güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/category-audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
    onError: (err: any) => {
      toast({
        title: "Güncelleme başarısız",
        description: err?.message || "Bilinmeyen hata",
        variant: "destructive",
      });
    },
  });

  const items = data?.items ?? [];
  const validCategories = data?.validCategories ?? ["hammadde", "yarimamul", "konsantre", "ambalaj"];

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLocaleLowerCase("tr").includes(q) ||
        (it.code || "").toLocaleLowerCase("tr").includes(q) ||
        (it.category || "").toLocaleLowerCase("tr").includes(q),
    );
  }, [items, search]);

  if (!user) return null;
  if (!ALLOWED_ROLES.includes(user.role || "")) {
    return <Redirect to="/" />;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2" data-testid="text-page-title">
                <ShieldCheck className="h-5 w-5" />
                Envanter Kategori Denetimi
              </CardTitle>
              <CardDescription>
                Reçetede (fabrika veya ürün reçetesi) kullanılan ama{" "}
                <span className="font-medium">{validCategories.join(", ")}</span> dışında bir
                kategoride duran envanter kayıtlarını listeler. Tek tıkla doğru kategoriye
                taşıyabilirsiniz.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-audit"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ad, kod veya mevcut kategoriye göre ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                data-testid="input-search-audit"
              />
            </div>
            <Badge variant="outline" data-testid="badge-total-count">
              Tutarsız kayıt: {items.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div
              className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive"
              data-testid="text-audit-error"
            >
              <AlertTriangle className="h-4 w-4" />
              Denetim verisi alınamadı. Yetkinizi ve bağlantınızı kontrol edin.
            </div>
          ) : items.length === 0 ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
              data-testid="text-audit-empty"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Tüm reçete malzemeleri uygun kategorilerde. Tutarsız kayıt yok.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>İsim</TableHead>
                    <TableHead>Mevcut Kategori</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead className="text-right">Fab. Reçete</TableHead>
                    <TableHead className="text-right">Ürün Reçete</TableHead>
                    <TableHead>Yeni Kategori</TableHead>
                    <TableHead className="text-right">Aksiyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => {
                    const choice = pendingChoice[it.id] ?? validCategories[0];
                    return (
                      <TableRow key={it.id} data-testid={`row-audit-${it.id}`}>
                        <TableCell className="font-mono text-xs" data-testid={`text-code-${it.id}`}>
                          {it.code}
                        </TableCell>
                        <TableCell data-testid={`text-name-${it.id}`}>
                          <div className="flex flex-col">
                            <span>{it.name}</span>
                            {!it.isActive && (
                              <span className="text-xs text-muted-foreground">(pasif)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-current-category-${it.id}`}>
                          <Badge variant="destructive">{it.category}</Badge>
                          {it.subCategory && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              / {it.subCategory}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.unit}</TableCell>
                        <TableCell className="text-right tabular-nums" data-testid={`text-fac-count-${it.id}`}>
                          {it.factoryRecipeCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums" data-testid={`text-prod-count-${it.id}`}>
                          {it.productRecipeCount}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={choice}
                            onValueChange={(v) =>
                              setPendingChoice((prev) => ({ ...prev, [it.id]: v }))
                            }
                          >
                            <SelectTrigger
                              className="w-36"
                              data-testid={`select-new-category-${it.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {validCategories.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={fixMutation.isPending}
                            onClick={() =>
                              fixMutation.mutate({ id: it.id, category: choice })
                            }
                            data-testid={`button-fix-${it.id}`}
                          >
                            Taşı
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
