/**
 * Sprint 14 Phase 7 — Fabrika Üretim Personel Performans Takibi
 *
 * Roller: admin, ceo, cgo, fabrika_mudur, fabrika_sorumlu
 * Route: /fabrika-personel-performans
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import {
  Activity, TrendingUp, TrendingDown, Award, AlertTriangle,
  Clock, Factory, Users, Trophy, BarChart3,
} from "lucide-react";

interface PersonnelPerformance {
  userId: string;
  name: string;
  username: string;
  role: string;
  totalProduced: number;
  totalWaste: number;
  wasteRate: number;
  avgQuality: number;
  runCount: number;
  completedCount: number;
  completionRate: number;
  hoursWorked: number;
  productionPerHour: number;
  efficiencyScore: number;
}

interface PerformanceData {
  generatedAt: string;
  period: { startDate: string; endDate: string };
  personnel: PersonnelPerformance[];
  summary: {
    totalPersonnel: number;
    totalProduced: number;
    totalWaste: number;
    avgEfficiency: number;
  };
}

const ROLE_LABELS: Record<string, string> = {
  fabrika_mudur: 'Fabrika Müdürü',
  fabrika_sorumlu: 'Fabrika Sorumlusu',
  fabrika_personel: 'Fabrika Personeli',
  sef: 'Şef',
  recete_gm: 'Reçete GM',
  kalite: 'Kalite',
  kalite_kontrol: 'Kalite Kontrol',
};

function formatDateInput(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function FabrikaPersonelPerformans() {
  const [, navigate] = useLocation();
  const today = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState<string>(formatDateInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateInput(today));

  const { data, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ['/api/fabrika/personel-performans', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/fabrika/personel-performans?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Veri alınamadı');
      return res.json();
    },
  });

  const getEfficiencyColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-950/20';
    if (score >= 60) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
    if (score >= 40) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
    return 'text-red-600 bg-red-50 dark:bg-red-950/20';
  };

  const getEfficiencyLabel = (score: number): string => {
    if (score >= 80) return 'Mükemmel';
    if (score >= 60) return 'İyi';
    if (score >= 40) return 'Orta';
    if (score >= 20) return 'Zayıf';
    return 'Kritik';
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Performans verileri alınamadı" />;
  if (!data) return null;

  const sortedPersonnel = [...data.personnel].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  const topPerformer = sortedPersonnel[0];
  const lowPerformers = sortedPersonnel.filter(p => p.efficiencyScore < 40);

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 pb-20" data-testid="fabrika-personel-performans">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-3">
          <Factory className="h-6 w-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Fabrika Üretim Personel Performansı</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(data.period.startDate).toLocaleDateString('tr-TR')} —
            {new Date(data.period.endDate).toLocaleDateString('tr-TR')} •
            {data.summary.totalPersonnel} personel
          </p>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label htmlFor="start-date" className="text-xs">Başlangıç</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs">Bitiş</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              setStartDate(formatDateInput(thirtyDaysAgo));
              setEndDate(formatDateInput(today));
            }}>
              Son 30 Gün
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              setStartDate(formatDateInput(sevenDaysAgo));
              setEndDate(formatDateInput(today));
            }}>
              Son 7 Gün
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              setStartDate(formatDateInput(firstOfMonth));
              setEndDate(formatDateInput(today));
            }}>
              Bu Ay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Özet KPI'lar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Toplam Personel</div>
                <div className="text-2xl font-bold">{data.summary.totalPersonnel}</div>
              </div>
              <Users className="h-8 w-8 text-purple-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Toplam Üretim</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.totalProduced.toLocaleString('tr-TR')}</div>
              </div>
              <Activity className="h-8 w-8 text-green-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Toplam Fire</div>
                <div className="text-2xl font-bold text-amber-600">{data.summary.totalWaste.toLocaleString('tr-TR')}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Ort. Verimlilik</div>
                <div className="text-2xl font-bold text-blue-600">{data.summary.avgEfficiency}/100</div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* En İyi Performans */}
      {topPerformer && topPerformer.efficiencyScore >= 80 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/10 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 text-amber-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">🏆 Bu Dönemin Yıldızı</div>
                <div className="text-lg font-bold">{topPerformer.name}</div>
                <div className="text-xs text-muted-foreground">
                  Verimlilik: {topPerformer.efficiencyScore}/100 •
                  Üretim: {topPerformer.totalProduced} •
                  Kalite: {topPerformer.avgQuality}/100
                </div>
              </div>
              <Badge variant="default" className="bg-amber-600">
                Mükemmel
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Düşük Performans Uyarısı */}
      {lowPerformers.length > 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/10 dark:border-red-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">{lowPerformers.length} personel düşük performans gösteriyor</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Verimlilik skoru 40'ın altında. Eğitim veya istasyon değişikliği değerlendirilmeli.
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {lowPerformers.map(p => (
                    <Badge key={p.userId} variant="destructive" className="text-xs">
                      {p.name} ({p.efficiencyScore}/100)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personel Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detaylı Performans Tablosu
          </CardTitle>
          <CardDescription>
            Verimlilik skoru: kalite × (1 - fire oranı) × üretim yoğunluğu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPersonnel.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Factory className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Bu tarih aralığında üretim kaydı yok
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Personel</TableHead>
                    <TableHead className="text-right">Üretim</TableHead>
                    <TableHead className="text-right">Fire</TableHead>
                    <TableHead className="text-right">Fire %</TableHead>
                    <TableHead className="text-right">Kalite</TableHead>
                    <TableHead className="text-right">Saat</TableHead>
                    <TableHead className="text-right">Adet/Saat</TableHead>
                    <TableHead className="text-right">Verimlilik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPersonnel.map((p, idx) => (
                    <TableRow key={p.userId} className="cursor-pointer hover:bg-muted/30" data-testid={`personnel-row-${p.userId}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {idx === 0 && '🥇 '}
                        {idx === 1 && '🥈 '}
                        {idx === 2 && '🥉 '}
                        {idx >= 3 && `${idx + 1}.`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {ROLE_LABELS[p.role] || p.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.totalProduced.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right text-amber-600">{p.totalWaste.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right">
                        <span className={p.wasteRate > 10 ? 'text-red-600' : p.wasteRate > 5 ? 'text-amber-600' : 'text-green-600'}>
                          %{p.wasteRate.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={p.avgQuality >= 80 ? 'text-green-600' : p.avgQuality >= 60 ? 'text-blue-600' : 'text-amber-600'}>
                          {p.avgQuality.toFixed(1)}/100
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{p.hoursWorked}s</TableCell>
                      <TableCell className="text-right">{p.productionPerHour.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`text-xs ${getEfficiencyColor(p.efficiencyScore)}`} variant="outline">
                          {p.efficiencyScore}/100 ({getEfficiencyLabel(p.efficiencyScore)})
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bilgilendirme */}
      <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
        💡 <strong>Verimlilik formülü:</strong> Kalite faktörü × Fire çarpanı × Üretim yoğunluğu × 100<br />
        - Kalite faktörü: avgQuality / 100<br />
        - Fire çarpanı: 1 - (fire oranı / 100)<br />
        - Üretim yoğunluğu: min(adet/saat / 100, 1) — 100 adet/saat = max
      </div>
    </div>
  );
}
