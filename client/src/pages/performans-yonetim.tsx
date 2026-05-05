/**
 * Sprint 8 (5 May 2026) - Yönetici Performans Sayfası
 * 
 * Aslan'ın talebi (5 May 20:00):
 *   "performans sayfasında personellerin şubelere veya rollere göre
 *    filtreleyerek performans skorlarını görmem gerekir"
 * 
 * Mevcut /performans (performance.tsx) şube bazlı, /performansim kişisel.
 * Bu sayfa: tüm personel listesi + şube/rol filtresi + skor breakdown.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type UserRoleType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, TrendingDown, Search, Filter, Users, BarChart3 } from "lucide-react";
import type { Branch } from "@shared/schema";

interface PersonnelScore {
  userId: string;
  fullName: string;
  branchName: string;
  branchId: number | null;
  role: string;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  breakdown: {
    devam: number;
    checklist: number;
    gorev: number;
    musteri: number;
    yonetici: number;
  };
  trend: number; // önceki aya göre %
}

const ROLE_LABELS: Record<string, string> = {
  barista: 'Barista',
  bar_buddy: 'Bar Buddy',
  supervisor_buddy: 'Supervisor Buddy',
  supervisor: 'Süpervizör',
  manager: 'Müdür',
  fabrika_personel: 'Fabrika Personeli',
  fabrika_operator: 'Fabrika Operatörü',
  fabrika_mudur: 'Fabrika Müdürü',
  stajyer: 'Stajyer',
  muhasebe: 'Muhasebe',
  muhasebe_ik: 'Muhasebe İK',
  satinalma: 'Satınalma',
  gida_muhendisi: 'Gıda Mühendisi',
  kalite: 'Kalite',
  sef: 'Şef',
};

export default function PerformansYonetim() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isHQ = user ? isHQRole(user.role as UserRoleType) : false;

  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc' | 'name'>('score-desc');

  // Şube listesi (HQ için)
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
    enabled: isHQ,
  });

  // Personel + skorları
  const { data, isLoading, error } = useQuery<{ personnel: PersonnelScore[] }>({
    queryKey: ['/api/performance/personnel', filterBranch, filterRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterBranch !== 'all') params.set('branchId', filterBranch);
      if (filterRole !== 'all') params.set('role', filterRole);
      
      const res = await fetch(`/api/performance/personnel?${params}`, { credentials: 'include' });
      if (!res.ok) {
        // Backend henüz hazır değilse fallback
        if (res.status === 404) {
          return { personnel: [] };
        }
        throw new Error('Personel performansı yüklenemedi');
      }
      return res.json();
    },
  });

  const personnel = data?.personnel || [];

  // Filter + sort
  const filtered = personnel.filter(p => {
    if (searchName && !p.fullName.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score-desc') return b.scorePercent - a.scorePercent;
    if (sortBy === 'score-asc') return a.scorePercent - b.scorePercent;
    return a.fullName.localeCompare(b.fullName, 'tr');
  });

  if (!isHQ) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <Filter className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Bu sayfa HQ rolleri için (admin, CEO, CGO, coach, trainer, muhasebe).
              Kendi performansını görmek için <strong>/performansim</strong>'a git.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/performansim')}
            >
              Kişisel Performansım
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Personel Performans Yönetimi
          </CardTitle>
          <CardDescription>
            Tüm personelin skor takibi · Şube/rol filtresi · Detay için tıkla
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Şube</label>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger data-testid="filter-branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {branches?.filter(b => b.isActive).map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger data-testid="filter-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ad ara</label>
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-3 text-muted-foreground" />
                <Input 
                  placeholder="Personel adı..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-7"
                  data-testid="search-name"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sıralama</label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger data-testid="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score-desc">Skor (yüksek → düşük)</SelectItem>
                  <SelectItem value="score-asc">Skor (düşük → yüksek)</SelectItem>
                  <SelectItem value="name">Ada göre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet kartları */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">{sorted.length}</div>
              <div className="text-xs text-muted-foreground">Toplam Personel</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold text-green-600">
                {sorted.filter(p => p.scorePercent >= 80).length}
              </div>
              <div className="text-xs text-muted-foreground">≥%80 Skor</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold text-orange-500">
                {sorted.filter(p => p.scorePercent < 50).length}
              </div>
              <div className="text-xs text-muted-foreground">&lt;%50 Skor</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold">
                {sorted.length > 0 
                  ? Math.round(sorted.reduce((s, p) => s + p.scorePercent, 0) / sorted.length)
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Ortalama</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">Personel skoru henüz yok</p>
              <p className="text-xs text-muted-foreground mt-2">
                PDKS, görev ve müşteri datası girildikten sonra skorlar otomatik hesaplanır.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Skor kriterlerini düzenlemek için: <strong>/admin/skor-parametreleri</strong>
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Personel</TableHead>
                    <TableHead>Şube</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Devam</TableHead>
                    <TableHead className="text-center">Checklist</TableHead>
                    <TableHead className="text-center">Görev</TableHead>
                    <TableHead className="text-center">Müşteri</TableHead>
                    <TableHead className="text-center">Yönetici</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p, idx) => (
                    <TableRow 
                      key={p.userId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/personel-detay/${p.userId}?tab=performance`)}
                      data-testid={`row-personnel-${p.userId}`}
                    >
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{p.fullName}</TableCell>
                      <TableCell className="text-xs">{p.branchName}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[p.role] || p.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">{p.breakdown.devam}/20</TableCell>
                      <TableCell className="text-center text-xs">{p.breakdown.checklist}/20</TableCell>
                      <TableCell className="text-center text-xs">{p.breakdown.gorev}/15</TableCell>
                      <TableCell className="text-center text-xs">{p.breakdown.musteri}/15</TableCell>
                      <TableCell className="text-center text-xs">{p.breakdown.yonetici}/20</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={p.scorePercent >= 80 ? 'default' : p.scorePercent >= 50 ? 'secondary' : 'destructive'}
                          className="font-bold"
                        >
                          {p.totalScore}/{p.maxScore} (%{p.scorePercent})
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
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <CardContent className="p-3 text-xs">
          <strong>📊 Skor Kriterleri:</strong>
          <p className="text-muted-foreground mt-1">
            Devam (20) + Checklist (20) + Görev (15) + Müşteri (15) + Yönetici (20) = <strong>90 puan</strong> max.
            <br/>
            Admin olarak kriterleri düzenlemek için: <a href="/admin/skor-parametreleri" className="text-blue-600 underline">/admin/skor-parametreleri</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
