import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface Per100g {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbohydrate_g: number;
  sugar_g: number;
  fiber_g: number;
  protein_g: number;
  salt_g: number;
}

interface PublicProductData {
  name: string;
  code: string;
  category: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  expectedUnitWeight: number | null;
  per100g: Per100g;
  perPortion: Per100g | null;
  allergens: string[];
  grammageApproved: boolean;
  grammageApprovalDate: string | null;
  lastUpdated: string | null;
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOgMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

const NUTRITION_ROWS: Array<{ key: keyof Per100g; label: string; unit: string }> = [
  { key: "energy_kcal", label: "Enerji", unit: "kcal" },
  { key: "fat_g", label: "Yağ", unit: "g" },
  { key: "saturated_fat_g", label: "Doymuş yağ", unit: "g" },
  { key: "carbohydrate_g", label: "Karbonhidrat", unit: "g" },
  { key: "sugar_g", label: "Şeker", unit: "g" },
  { key: "fiber_g", label: "Lif", unit: "g" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "salt_g", label: "Tuz", unit: "g" },
];

export default function PublicUrunPage() {
  const [, params] = useRoute<{ code: string }>("/p/urun/:code");
  const code = params?.code || "";

  const { data, isLoading, isError } = useQuery<PublicProductData>({
    queryKey: ["/api/public/urun", code],
    enabled: !!code,
  });

  useEffect(() => {
    const title = data
      ? `${data.name} — Alerjen ve Besin Bilgileri | DOSPRESSO`
      : "Ürün Bilgileri | DOSPRESSO";
    document.title = title;
    const desc = data
      ? `${data.name} ürününün alerjen listesi, 100g ve porsiyon başına besin değerleri, üretim ve son güncelleme bilgileri.`
      : "DOSPRESSO ürünlerinin alerjen ve besin değerleri.";
    setMeta("description", desc);
    setOgMeta("og:title", title);
    setOgMeta("og:description", desc);
    setOgMeta("og:type", "product");
    if (data?.coverPhotoUrl) setOgMeta("og:image", data.coverPhotoUrl);
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="font-semibold tracking-tight" data-testid="text-brand">DOSPRESSO</div>
          <Badge variant="secondary" data-testid="badge-public">Ürün Bilgi Sayfası</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {isLoading && (
          <Card>
            <CardHeader><Skeleton className="h-6 w-2/3" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card data-testid="card-error">
            <CardContent className="py-8 text-center space-y-2">
              <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="font-medium">Ürün bulunamadı</div>
              <div className="text-sm text-muted-foreground">
                Aradığınız ürün artık yayınlanmıyor olabilir. Lütfen ambalajdaki QR kodu yeniden tarayın.
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {data.coverPhotoUrl && (
              <div className="rounded-md overflow-hidden border">
                <img
                  src={data.coverPhotoUrl}
                  alt={data.name}
                  className="w-full h-48 object-cover"
                  data-testid="img-cover"
                />
              </div>
            )}

            <Card>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle data-testid="text-product-name">{data.name}</CardTitle>
                  <Badge variant="outline" data-testid="badge-code">{data.code}</Badge>
                </div>
                {data.category && (
                  <div className="text-sm text-muted-foreground" data-testid="text-category">
                    {data.category}
                  </div>
                )}
                {data.description && (
                  <p className="text-sm text-muted-foreground" data-testid="text-description">
                    {data.description}
                  </p>
                )}
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alerjenler</CardTitle>
              </CardHeader>
              <CardContent>
                {data.allergens.length === 0 ? (
                  <div className="text-sm text-muted-foreground" data-testid="text-no-allergens">
                    Bilinen bir alerjen bulunmuyor.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2" data-testid="list-allergens">
                    {data.allergens.map(a => (
                      <Badge key={a} variant="destructive" data-testid={`badge-allergen-${a}`}>
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Besin Değerleri</CardTitle>
                {data.expectedUnitWeight && (
                  <span className="text-xs text-muted-foreground" data-testid="text-portion-size">
                    Porsiyon: {data.expectedUnitWeight} g
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Besin Öğesi</th>
                        <th className="py-2 px-2 font-medium text-right">100 g</th>
                        {data.perPortion && (
                          <th className="py-2 pl-2 font-medium text-right">Porsiyon</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {NUTRITION_ROWS.map(row => (
                        <tr key={row.key} className="border-t">
                          <td className="py-2 pr-2">{row.label}</td>
                          <td
                            className="py-2 px-2 text-right tabular-nums"
                            data-testid={`text-per100-${row.key}`}
                          >
                            {data.per100g[row.key]} {row.unit}
                          </td>
                          {data.perPortion && (
                            <td
                              className="py-2 pl-2 text-right tabular-nums"
                              data-testid={`text-perportion-${row.key}`}
                            >
                              {data.perPortion[row.key]} {row.unit}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Üretim Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Son güncelleme</span>
                  <span data-testid="text-last-updated">{formatDate(data.lastUpdated)}</span>
                </div>
                {data.grammageApproved && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span data-testid="text-grammage-approved">
                      Gramaj onaylı{data.grammageApprovalDate ? ` — ${formatDate(data.grammageApprovalDate)}` : ""}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Bu sayfa, ambalaj üzerindeki QR kod aracılığıyla müşteri bilgilendirme amacıyla yayınlanır.
                  Üretim tarihi ve son tüketim tarihi ambalaj üzerindeki etikette belirtilmiştir.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
