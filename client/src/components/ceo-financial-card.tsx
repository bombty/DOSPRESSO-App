import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users,
  AlertTriangle, BarChart3, Minus
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  'personel': 'Personel',
  'hammadde': 'Hammadde',
  'kira': 'Kira',
  'enerji': 'Enerji',
  'pazarlama': 'Pazarlama',
  'ulasim': 'Ulaşım',
  'bakim_onarim': 'Bakım & Onarım',
  'sigorta': 'Sigorta',
  'vergi': 'Vergi',
  'ambalaj': 'Ambalaj',
  'temizlik': 'Temizlik',
  'teknoloji': 'Teknoloji',
  'diger_gider': 'Diğer',
  'satis': 'Satış',
  'franchise_royalty': 'Royalty',
  'kira_geliri': 'Kira Geliri',
  'diger_gelir': 'Diğer Gelir',
};

function formatTL(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function CEOFinancialCard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/financial/ceo-summary"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-financial-loading">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Mali Özet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { gelirGider, stokMaliyeti, enCokKazandiran, enAzKazandiran, personelMaliyeti, giderDagilimi, uretimFire } = data;

  const trendPositive = gelirGider.revenueTrend >= 0;
  const profitPositive = gelirGider.netProfit >= 0;

  return (
    <Card data-testid="card-ceo-financial-summary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Mali Özet
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]" data-testid="badge-financial-period">
            {data.period}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="space-y-3" data-testid="section-gelir-gider">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" />
            Gelir / Gider Özeti
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Gelir</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-total-revenue">
                {formatTL(gelirGider.totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Gider</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                {formatTL(gelirGider.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net Kar</p>
              <p className={`text-sm font-bold ${profitPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-net-profit">
                {formatTL(gelirGider.netProfit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Kar Marjı</p>
              <div className="flex items-center gap-1">
                <p className={`text-sm font-bold ${profitPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-profit-margin">
                  %{gelirGider.profitMargin}
                </p>
                {gelirGider.revenueTrend !== 0 && (
                  <span className={`flex items-center text-[10px] ${trendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-revenue-trend">
                    {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trendPositive ? '+' : ''}{gelirGider.revenueTrend}%
                  </span>
                )}
                {gelirGider.revenueTrend === 0 && (
                  <span className="flex items-center text-[10px] text-muted-foreground" data-testid="text-revenue-trend">
                    <Minus className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {giderDagilimi && giderDagilimi.length > 0 && (
          <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-gider-dagilimi">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              Gider Dağılımı (İlk 5)
            </div>
            <div className="space-y-1">
              {giderDagilimi.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs" data-testid={`expense-category-${i}`}>
                  <span className="text-muted-foreground">{CATEGORY_LABELS[item.category] || item.category}</span>
                  <span className="font-medium">{formatTL(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-stok-maliyeti">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            Stok Maliyeti
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" data-testid="text-stock-value">{formatTL(stokMaliyeti.totalStockValue)}</p>
              <p className="text-[10px] text-muted-foreground">{stokMaliyeti.totalItems} kalem</p>
            </div>
          </div>
        </div>

        {enCokKazandiran && enCokKazandiran.length > 0 && (
          <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-en-cok-kazandiran">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              En Çok Kazandıran (İlk 5)
            </div>
            <div className="space-y-1">
              {enCokKazandiran.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2" data-testid={`top-product-${i}`}>
                  <span className="text-xs truncate">{p.productName}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    %{(p.profitMargin ?? 0).toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {enAzKazandiran && enAzKazandiran.length > 0 && (
          <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-en-az-kazandiran">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              En Az Kazandıran (İlk 5)
            </div>
            <div className="space-y-1">
              {enAzKazandiran.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2" data-testid={`bottom-product-${i}`}>
                  <span className="text-xs truncate">{p.productName}</span>
                  <Badge variant={p.profitMargin < 0 ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                    %{(p.profitMargin ?? 0).toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-personel-maliyeti">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            Personel Maliyeti
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Personel</p>
              <p className="text-sm font-bold" data-testid="text-total-employees">{personelMaliyeti.totalEmployees}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net Maaş</p>
              <p className="text-sm font-bold" data-testid="text-net-salaries">{formatTL(personelMaliyeti.totalNetSalaries)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Brüt Maliyet</p>
              <p className="text-sm font-bold" data-testid="text-gross-cost">{formatTL(personelMaliyeti.totalGrossCost)}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t space-y-2" data-testid="section-uretim-fire">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            Üretim Fire Maliyeti
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" data-testid="text-waste-cost">{formatTL(uretimFire.monthlyWasteCost)}</p>
              <p className="text-[10px] text-muted-foreground">{uretimFire.batchCount} parti</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
