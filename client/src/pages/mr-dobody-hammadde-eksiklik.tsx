/**
 * Mr. Dobody — Hammadde Veri Eksikliği Sayfası
 *
 * Aslan'ın 7 May 2026 talebi:
 * "yapay zeka yani Mr.Dobody hangi hammaddelerde besin değeri içerik
 *  bilgi alerjenler olmadığının uyarısı verip bu eksiklerin gidermesini
 *  istemeli"
 *
 * Route: /mr-dobody/hammadde-eksiklik
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import {
  Sparkles, AlertTriangle, AlertCircle, CheckCircle2,
  ArrowRight, Database, FileText, Beaker, Package,
  Shield, Activity, Zap,
} from "lucide-react";

interface EksiklikData {
  generatedAt: string;
  kpis: {
    totalRawMaterials: number;
    complete: number;
    partiallyMissing: number;
    completelyMissing: number;
    completionRate: number;
    criticalCount: number;
    highCount: number;
  };
  missingByField: {
    contentInfo: Array<{ id: number; name: string; code: string }>;
    allergenDetail: Array<{ id: number; name: string; code: string }>;
    energyKcal: Array<{ id: number; name: string; code: string }>;
    crossContamination: Array<{ id: number; name: string; code: string }>;
    storageConditions: Array<{ id: number; name: string; code: string }>;
  };
  priority: Array<{
    id: number;
    code: string;
    name: string;
    category: string | null;
    missingFields: string[];
    missingLabels: string[];
    missingCount: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    actionLink: string;
  }>;
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'KRİTİK',
    color: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
    icon: AlertCircle,
  },
  high: {
    label: 'YÜKSEK',
    color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
  },
  medium: {
    label: 'ORTA',
    color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
    icon: Activity,
  },
  low: {
    label: 'DÜŞÜK',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Activity,
  },
};

const FIELD_CONFIG = {
  contentInfo: {
    label: 'İçerik Bilgisi',
    icon: FileText,
    color: 'text-red-600',
    description: 'TGK 2017/2284 m.9/b — etikette zorunlu (içindekiler listesi)',
  },
  allergenDetail: {
    label: 'Alerjen Detayı',
    icon: AlertTriangle,
    color: 'text-red-600',
    description: 'TGK 2017/2284 m.10 — koyu/altı çizili gösterim için',
  },
  energyKcal: {
    label: 'Enerji (Besin Değeri)',
    icon: Beaker,
    color: 'text-amber-600',
    description: 'TGK 2017/2284 m.30 — besin değeri tablosu için zorunlu',
  },
  crossContamination: {
    label: 'Çapraz Bulaşma',
    icon: Shield,
    color: 'text-amber-600',
    description: 'Eser miktar alerjen riski (örn: "...içerebilir")',
  },
  storageConditions: {
    label: 'Saklama Koşulları',
    icon: Package,
    color: 'text-blue-600',
    description: 'TGK 2017/2284 m.9/i — son tüketim tarihi ile birlikte zorunlu',
  },
};

export default function MrDobodyHammaddeEksiklik() {
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<EksiklikData>({
    queryKey: ['/api/mr-dobody/hammadde-eksiklik-raporu'],
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Mr. Dobody raporu yüklenemedi" />;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-3">
          <Sparkles className="h-6 w-6 text-purple-700 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">🤖 Mr. Dobody — Hammadde Veri Eksikliği Raporu</h1>
          <p className="text-sm text-muted-foreground">
            TGK 2017/2284 zorunlu alanları kontrol eder. Eksik veri varsa etiket basılamaz, besin değeri hesaplanamaz.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Toplam Hammadde</div>
            <div className="text-2xl font-bold">{data.kpis.totalRawMaterials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Tam Veri ✓</div>
            <div className="text-2xl font-bold text-green-600">{data.kpis.complete}</div>
            <div className="text-[10px] text-muted-foreground">%{data.kpis.completionRate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Kısmi Eksik</div>
            <div className="text-2xl font-bold text-amber-600">{data.kpis.partiallyMissing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground">Kritik Eksik</div>
            <div className="text-2xl font-bold text-red-600">{data.kpis.criticalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tamamlama oranı progress bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">TGK Veri Tamamlama Oranı</span>
            <span className="text-sm font-bold">%{data.kpis.completionRate}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.kpis.completionRate >= 90 ? 'bg-green-500' :
                data.kpis.completionRate >= 70 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${data.kpis.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.kpis.completionRate >= 90 ? '🎉 Mükemmel! Pilot için hazır.' :
             data.kpis.completionRate >= 70 ? '⚠️ Çoğu hammadde eksik veri içeriyor.' :
             '🔴 Kritik durum: TGK uyumu için acil veri girişi gerekli.'}
          </p>
        </CardContent>
      </Card>

      {/* Alana Göre Eksiklikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(Object.keys(data.missingByField) as Array<keyof typeof data.missingByField>).map((field) => {
          const items = data.missingByField[field];
          const config = FIELD_CONFIG[field];
          if (!config || items.length === 0) return null;
          const Icon = config.icon;

          return (
            <Card key={field}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  {config.label}
                  <Badge variant="secondary" className="ml-auto">
                    {items.length} eksik
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">{config.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {items.slice(0, 15).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 p-2 rounded border hover:bg-muted/30 cursor-pointer text-sm"
                      onClick={() => navigate(`/girdi-yonetimi/${m.id}`)}
                    >
                      <span className="flex-1 truncate">{m.name}</span>
                      <Badge variant="outline" className="text-[10px]">{m.code}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                  {items.length > 15 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{items.length - 15} daha
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Öncelikli Hammaddeler (kritik + yüksek) */}
      {data.priority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Öncelikli Aksiyon ({data.priority.length})
            </CardTitle>
            <CardDescription>
              Bu hammaddeler etiket/besin/alerjen için kritik veri eksikliği içeriyor.
              Tıklayın → düzenle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.priority.map((p) => {
              const sev = SEVERITY_CONFIG[p.severity];
              const SevIcon = sev.icon;
              return (
                <div
                  key={p.id}
                  className={`flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-muted/30 ${sev.color}`}
                  onClick={() => navigate(`/girdi-yonetimi/${p.id}`)}
                  data-testid={`priority-${p.id}`}
                >
                  <SevIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-[10px]">{p.code}</Badge>
                      <Badge className={`text-[10px] ${sev.color}`}>
                        {sev.label}
                      </Badge>
                    </div>
                    <div className="text-xs mt-1">
                      <strong>{p.missingCount} alan eksik:</strong> {p.missingLabels.join(', ')}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 mt-0.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {data.priority.length === 0 && data.kpis.completionRate >= 90 && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold">🎉 Tüm Hammaddeler TGK Uyumlu!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Etiket basımı, besin değeri hesabı, alerjen kontrolü için tüm veri tam.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground pt-4">
        🤖 Mr. Dobody verileri 30 saniyede bir auto-refresh •
        {new Date(data.generatedAt).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}
