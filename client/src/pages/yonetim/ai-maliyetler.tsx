import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, DollarSign, TrendingDown, Calendar } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface AICostAggregates {
  totalCost: number;
  monthToDateCost: number;
  dailyAverage: number;
  remainingBudget: number;
  costByFeature: Array<{ feature: string; cost: number }>;
  costByModel: Array<{ model: string; cost: number }>;
  last14Days: Array<{ date: string; cost: number }>;
  cachedSavings: number;
}

const FEATURE_LABELS: Record<string, string> = {
  task_photo: "Görev Fotoğraf Analizi",
  fault_photo: "Arıza Fotoğraf Analizi",
  cleanliness: "Temizlik Kontrolü",
  dress_code: "Kıyafet Kontrolü",
  rag_chat: "AI Asistan Sohbet",
  summary: "Özet Üretimi",
};

export default function AICostDashboard() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data, isLoading, refetch, isFetching, isError } = useQuery<AICostAggregates>({
    queryKey: ['/api/admin/ai-costs'],
  });

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const highestCostFeature = data?.costByFeature[0];

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            AI Maliyet Takibi
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Yapay zeka kullanım maliyetlerini izleyin ve bütçenizi yönetin
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-sm text-muted-foreground" data-testid="text-last-updated">
            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
          </p>
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Header Cards */}
      <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
        <Card data-testid="card-month-cost">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay Harcama</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-month-cost" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-month-cost">
                {formatCurrency(data?.monthToDateCost || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Aylık bütçe: $10.00
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-remaining-budget">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kalan Bütçe</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-remaining-budget" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-remaining-budget">
                {formatCurrency(data?.remainingBudget || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {data && data.remainingBudget < 2 ? 'Bütçe azalıyor' : 'Bütçe durumu iyi'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-daily-average">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Ortalama</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" data-testid="skeleton-daily-average" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-daily-average">
                {formatCurrency(data?.dailyAverage || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ortalama günlük harcama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Highest Cost Feature Highlight */}
      {!isLoading && highestCostFeature && (
        <Card data-testid="card-highest-cost-feature">
          <CardHeader>
            <CardTitle className="text-lg">En Yüksek Maliyet</CardTitle>
            <CardDescription>
              En çok maliyet oluşturan özellik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="font-medium" data-testid="text-highest-feature">
                {FEATURE_LABELS[highestCostFeature.feature] || highestCostFeature.feature}
              </span>
              <span className="text-lg font-bold" data-testid="text-highest-cost">
                {formatCurrency(highestCostFeature.cost)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {/* Cost by Feature Table */}
        <Card data-testid="card-cost-by-feature">
          <CardHeader>
            <CardTitle>Özellik Bazında Maliyet</CardTitle>
            <CardDescription>
              AI özelliklerine göre toplam harcama
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                <Skeleton className="h-10 w-full" data-testid="skeleton-feature-table" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Özellik</TableHead>
                    <TableHead className="text-right">Maliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.costByFeature && data.costByFeature.length > 0 ? (
                    data.costByFeature.map((item) => (
                      <TableRow key={item.feature} data-testid={`row-feature-${item.feature}`}>
                        <TableCell className="font-medium">
                          {FEATURE_LABELS[item.feature] || item.feature}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-feature-cost-${item.feature}`}>
                          {formatCurrency(item.cost)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Henüz veri yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Cost by Model Table */}
        <Card data-testid="card-cost-by-model">
          <CardHeader>
            <CardTitle>Model Bazında Maliyet</CardTitle>
            <CardDescription>
              AI modellerine göre toplam harcama
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                <Skeleton className="h-10 w-full" data-testid="skeleton-model-table" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Maliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.costByModel && data.costByModel.length > 0 ? (
                    data.costByModel.map((item) => (
                      <TableRow key={item.model} data-testid={`row-model-${item.model}`}>
                        <TableCell className="font-medium font-mono text-sm">
                          {item.model}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-model-cost-${item.model}`}>
                          {formatCurrency(item.cost)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Henüz veri yok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last 14 Days Trend */}
      <Card data-testid="card-last-14-days">
        <CardHeader>
          <CardTitle>Son 14 Gün Trend</CardTitle>
          <CardDescription>
            Günlük AI kullanım maliyetleri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3 sm:gap-4">
              <Skeleton className="h-10 w-full" data-testid="skeleton-trend-list" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.last14Days && data.last14Days.length > 0 ? (
                  data.last14Days.map((item) => (
                    <TableRow key={item.date} data-testid={`row-day-${item.date}`}>
                      <TableCell className="font-medium">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-day-cost-${item.date}`}>
                        {formatCurrency(item.cost)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Henüz veri yok
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cache Savings Info */}
      {!isLoading && data && data.cachedSavings > 0 && (
        <Card data-testid="card-cache-savings">
          <CardHeader>
            <CardTitle className="text-lg">Önbellek Tasarrufu</CardTitle>
            <CardDescription>
              Önbellek sayesinde kaydedilen maliyet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="text-cache-savings">
              {formatCurrency(data.cachedSavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Önbellek kullanımı ile tasarruf edilen miktar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
