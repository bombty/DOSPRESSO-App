/**
 * Sprint 14 — Gıda Mühendisi Dashboard (Mr. Dobody akıllı anasayfa)
 *
 * D-44 Bağlam-İçi Tab Prensibi:
 *   - İçerik rol-bağımsız (Sema, İlker, Aslan, CGO aynı görür)
 *   - Aksiyonlar rol-spesifik
 *
 * Mobile-first (iPad), Türkçe UI.
 *
 * Roller: admin, ceo, cgo, gida_muhendisi, kalite_kontrol, kalite_yoneticisi, recete_gm
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import {
  AlertTriangle, ChefHat, ClipboardCheck, Sparkles, Activity,
  TrendingUp, Database, AlertCircle, CheckCircle2, Clock,
  ArrowRight, Beaker, FileText, Bell, Zap,
} from "lucide-react";

interface DashboardData {
  generatedAt: string;
  role: string;
  kpis: {
    totalRecipes: number;
    unapprovedCount: number;
    approvedCount: number;
    inProductionCount: number;
    avgApprovalDays: number;
    turkompCoverage: number;
    allergenDetectionAccuracy: number;
  };
  pendingApprovals: Array<{
    id: number;
    name: string;
    code: string;
    daysWaiting: number;
    allergenWarning: number | null;
    actionLink: string;
  }>;
  suggestions: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    severity: number;
    title: string;
    message: string;
    actionLabel?: string;
    actionLink?: string;
  }>;
  reminders: Array<any>;
  missingTurkomp: string[];
}

const SEVERITY_STYLES = {
  critical: 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800',
  warning: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800',
  info: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800',
  success: 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Sparkles,
  success: CheckCircle2,
};

const ROLE_GREETING: Record<string, string> = {
  admin: '🔧 Admin',
  ceo: '👑 CEO Aslan',
  cgo: '🎯 CGO',
  gida_muhendisi: '🥗 Gıda Mühendisi',
  kalite_kontrol: '✅ Kalite Kontrol',
  kalite_yoneticisi: '🛡️ Kalite Yöneticisi',
  recete_gm: '📚 Reçete GM',
};

export default function GidaMuhendisiDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/gida-muhendisi/dashboard'],
    refetchInterval: 60000, // 1 dakika auto-refresh
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Dashboard yüklenemedi" />;
  if (!data) return null;

  const userName = (user as any)?.firstName || (user as any)?.username || '';
  const roleLabel = ROLE_GREETING[user?.role || ''] || user?.role || '';

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 pb-20" data-testid="gida-muhendisi-dashboard">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 p-3">
          <ChefHat className="h-6 w-6 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Gıda Mühendisi Anasayfa</h1>
          <p className="text-sm text-muted-foreground">
            Hoşgeldin {userName} {roleLabel ? `(${roleLabel})` : ''} •
            {data.kpis.unapprovedCount > 0 && ` ${data.kpis.unapprovedCount} onay bekliyor`}
            {data.suggestions.length > 0 && ` • ${data.suggestions.length} öneri`}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Toplam Reçete</div>
                <div className="text-2xl font-bold">{data.kpis.totalRecipes}</div>
              </div>
              <ChefHat className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Onay Bekliyor</div>
                <div className="text-2xl font-bold text-amber-600">{data.kpis.unapprovedCount}</div>
              </div>
              <ClipboardCheck className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">TÜRKOMP Kapsamı</div>
                <div className="text-2xl font-bold text-blue-600">%{data.kpis.turkompCoverage}</div>
              </div>
              <Database className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Onay Süresi (ort.)</div>
                <div className="text-2xl font-bold text-purple-600">{data.kpis.avgApprovalDays}g</div>
              </div>
              <Clock className="h-8 w-8 text-purple-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mr. Dobody Önerileri */}
      {data.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Mr. Dobody Önerileri
            </CardTitle>
            <CardDescription>
              Yapay zeka analiziyle tespit edilen kritik durumlar ve aksiyonlar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.suggestions.map((s) => {
              const Icon = SEVERITY_ICONS[s.type];
              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border ${SEVERITY_STYLES[s.type]}`}
                  data-testid={`suggestion-${s.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{s.message}</p>
                      {s.actionLink && s.actionLabel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs"
                          onClick={() => navigate(s.actionLink!)}
                        >
                          {s.actionLabel}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bekleyen Onaylar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Bekleyen Onaylar ({data.pendingApprovals.length})
          </CardTitle>
          <CardDescription>
            En eskiden yeniye sıralı. 7+ gün bekleyen reçeteler kırmızı.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.pendingApprovals.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-sm font-medium">🎉 Tüm reçeteler onaylı!</p>
              <p className="text-xs text-muted-foreground">Aksiyon bekleyen iş yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.pendingApprovals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded border hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(p.actionLink)}
                  data-testid={`pending-approval-${p.id}`}
                >
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${p.daysWaiting >= 7 ? 'bg-red-500' : p.daysWaiting >= 3 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      <Badge variant="outline" className="text-[10px]">{p.code}</Badge>
                      {p.allergenWarning && (
                        <Badge variant="destructive" className="text-[10px]">
                          ⚠️ {p.allergenWarning} alerjen
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.daysWaiting === 0 ? 'Bugün eklendi' :
                       p.daysWaiting === 1 ? 'Dün eklendi' :
                       `${p.daysWaiting} gündür bekliyor`}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TÜRKOMP Eksik Veri */}
      {data.missingTurkomp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              TÜRKOMP Veri Eksikliği ({data.missingTurkomp.length})
            </CardTitle>
            <CardDescription>
              Bu hammaddeler için besin değeri eksik. Etiket hesaplaması bunlar olmadan eksik kalır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {data.missingTurkomp.slice(0, 12).map((name, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
              {data.missingTurkomp.length > 12 && (
                <Badge variant="secondary" className="text-xs">
                  +{data.missingTurkomp.length - 12} daha
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/turkomp')} className="text-xs">
              <Beaker className="h-3.5 w-3.5 mr-1.5" />
              TÜRKOMP'ta Ara
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hızlı Aksiyonlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Hızlı Aksiyonlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button variant="outline" onClick={() => navigate('/fabrika-receteler')} className="justify-start">
              <ChefHat className="h-4 w-4 mr-2" />
              <span className="text-xs">Reçete Listesi</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/girdi-yonetimi')} className="justify-start">
              <Database className="h-4 w-4 mr-2" />
              <span className="text-xs">Hammaddeler</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/turkomp')} className="justify-start">
              <Beaker className="h-4 w-4 mr-2" />
              <span className="text-xs">TÜRKOMP</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/fabrika-receteler?filter=unapproved')} className="justify-start">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              <span className="text-xs">Bekleyen Onaylar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notu */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        🤖 Mr. Dobody verileri 1 dakikada bir otomatik güncellenir •
        {new Date(data.generatedAt).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}
