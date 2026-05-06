/**
 * Mr. Dobody Hammadde Eksiklik Raporu
 *
 * Aslan'ın asıl talebi: "AI eksikleri uyarmıyor"
 *
 * Severity-sorted hammadde veri eksikliği listesi.
 * Kritik (TGK zorunlu) > Yüksek (üretim) > Orta (tam uyum) > Düşük
 *
 * Route: /mr-dobody/hammadde-eksiklik
 * Yetki: admin, ceo, cgo, satinalma, gida_muhendisi, kalite, fabrika_mudur
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/loading-state";
import {
  ArrowLeft, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Sparkles, ChevronRight, RefreshCw,
} from "lucide-react";

interface MissingField {
  field: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface HammaddeIssue {
  id: number;
  code: string;
  name: string;
  category: string | null;
  brand: string | null;
  unit: string;
  missingFields: MissingField[];
  highestSeverity: 'critical' | 'high' | 'medium' | 'low';
  totalMissing: number;
}

interface ReportData {
  kpis: {
    totalRawMaterials: number;
    completeCount: number;
    completionRate: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  issues: HammaddeIssue[];
  generatedAt: string;
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'Kritik',
    color: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-100 dark:border-red-700',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
  },
  high: {
    label: 'Yüksek',
    color: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-700',
    icon: AlertCircle,
    iconColor: 'text-orange-600',
  },
  medium: {
    label: 'Orta',
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-100 dark:border-yellow-700',
    icon: Info,
    iconColor: 'text-yellow-600',
  },
  low: {
    label: 'Düşük',
    color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-700',
    icon: Info,
    iconColor: 'text-blue-600',
  },
};

export default function MrDobodyHammaddeEksiklik() {
  const [, navigate] = useLocation();

  const { data, isLoading, refetch, isFetching } = useQuery<ReportData>({
    queryKey: ['/api/mr-dobody/hammadde-eksiklik-raporu'],
  });

  if (isLoading) return <LoadingState />;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Veri yüklenemedi</div>;

  const { kpis, issues } = data;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Mr. Dobody — Hammadde Eksiklik Raporu
          </h1>
          <p className="text-sm text-muted-foreground">
            TGK 2017/2284 uyumluluğu için kritik alanların eksik olduğu hammaddeler
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Toplam Hammadde</div>
            <div className="text-2xl font-bold">{kpis.totalRawMaterials}</div>
          </CardContent>
        </Card>
        <Card className="border-green-300 bg-green-50/30 dark:bg-green-950/10">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Tamamlanan
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {kpis.completeCount}
              <span className="text-sm text-muted-foreground ml-1">/{kpis.totalRawMaterials}</span>
            </div>
            <div className="text-xs mt-1 text-green-700 dark:text-green-400">
              %{kpis.completionRate} tamamlama
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              Kritik
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{kpis.criticalCount}</div>
            <div className="text-xs mt-1 text-muted-foreground">TGK zorunlu eksik</div>
          </CardContent>
        </Card>
        <Card className="border-orange-300 bg-orange-50/30 dark:bg-orange-950/10">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-orange-600" />
              Yüksek
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{kpis.highCount}</div>
            <div className="text-xs mt-1 text-muted-foreground">Üretim için kritik</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-300 bg-yellow-50/30 dark:bg-yellow-950/10">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3 text-yellow-600" />
              Orta + Düşük
            </div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {kpis.mediumCount + kpis.lowCount}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">İyileştirme</div>
          </CardContent>
        </Card>
      </div>

      {/* Eksiklik Listesi */}
      {issues.length === 0 ? (
        <Card className="border-green-300 bg-green-50/30 dark:bg-green-950/10">
          <CardContent className="text-center py-16">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
              🎉 Tüm Hammaddeler Tamamlandı!
            </h2>
            <p className="text-sm text-green-700 dark:text-green-300">
              {kpis.totalRawMaterials} hammadde için TGK uyumluluğu %100 tamamlandı.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Eksikliği Olan Hammaddeler ({issues.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Severity'ye göre sıralı: Kritik → Yüksek → Orta → Düşük
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.map(issue => {
              const config = SEVERITY_CONFIG[issue.highestSeverity];
              const Icon = config.icon;
              return (
                <Card
                  key={issue.id}
                  className={`cursor-pointer hover:bg-muted/30 border-l-4 ${
                    issue.highestSeverity === 'critical' ? 'border-l-red-500' :
                    issue.highestSeverity === 'high' ? 'border-l-orange-500' :
                    issue.highestSeverity === 'medium' ? 'border-l-yellow-500' :
                    'border-l-blue-500'
                  }`}
                  onClick={() => navigate(`/girdi-yonetimi/${issue.id}`)}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${config.iconColor} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
                          <span className="font-medium">{issue.name}</span>
                          <Badge className={`text-[10px] ${config.color}`}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {issue.totalMissing} eksik
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {issue.missingFields.slice(0, 5).map(f => (
                            <span
                              key={f.field}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                f.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                f.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                            >
                              {f.label}
                            </span>
                          ))}
                          {issue.missingFields.length > 5 && (
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                              +{issue.missingFields.length - 5} daha
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-center text-muted-foreground">
        🤖 Mr. Dobody otomatik veri analizi • Son güncelleme: {new Date(data.generatedAt).toLocaleString('tr-TR')}
      </p>
    </div>
  );
}
