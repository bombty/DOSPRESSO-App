/**
 * Sprint 14 Phase 8 — Hammadde Fiyat Listesi
 *
 * Tüm aktif hammaddelerin güncel fiyatlarını topluca gösterir.
 * Her satır tıklanabilir → /girdi-yonetimi/:id (D-44 detay sayfası)
 *
 * Roller: admin, ceo, cgo, gida_muhendisi, satinalma, fabrika roller
 * Route: /fiyat-listesi
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import {
  DollarSign, TrendingUp, TrendingDown, Search, Package,
  ChevronRight, AlertCircle, ArrowUpDown,
} from "lucide-react";

interface Material {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  unit: string;
  brand?: string | null;
  supplier?: { id: number; name: string } | null;
  currentPrice: number;
  averagePrice: number;
  lastPurchasePrice: number;
  deviationFromAvg: number;
  priceLastUpdated?: string | null;
  lastChange: {
    previousPrice: number | null;
    newPrice: number;
    changePercent: number | null;
    changedAt: string;
  } | null;
  isKeyblend: boolean;
}

interface FiyatListesi {
  generatedAt: string;
  materials: Material[];
  summary: {
    total: number;
    avgPrice: number;
    recentlyChanged: number;
    priceIncreased: number;
    priceDecreased: number;
  };
}

type SortKey = 'name' | 'currentPrice' | 'lastChangePercent' | 'priceLastUpdated' | 'deviationFromAvg';

export default function FiyatListesi() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterChanged, setFilterChanged] = useState<'all' | 'increased' | 'decreased' | 'recent'>('all');

  const { data, isLoading, error } = useQuery<FiyatListesi>({
    queryKey: ['/api/fiyat-listesi'],
  });

  const filteredMaterials = useMemo(() => {
    if (!data) return [];
    let result = data.materials;

    // Arama
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.supplier?.name?.toLowerCase().includes(q)) ||
        (m.brand?.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filterChanged === 'increased') {
      result = result.filter(m => m.lastChange?.changePercent && m.lastChange.changePercent > 0);
    } else if (filterChanged === 'decreased') {
      result = result.filter(m => m.lastChange?.changePercent && m.lastChange.changePercent < 0);
    } else if (filterChanged === 'recent') {
      result = result.filter(m => {
        if (!m.lastChange) return false;
        const ageMs = Date.now() - new Date(m.lastChange.changedAt).getTime();
        return ageMs < 30 * 24 * 60 * 60 * 1000;
      });
    }

    // Sıralama
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'tr');
      else if (sortKey === 'currentPrice') cmp = a.currentPrice - b.currentPrice;
      else if (sortKey === 'lastChangePercent') {
        const aP = a.lastChange?.changePercent || 0;
        const bP = b.lastChange?.changePercent || 0;
        cmp = aP - bP;
      } else if (sortKey === 'priceLastUpdated') {
        const aD = a.priceLastUpdated ? new Date(a.priceLastUpdated).getTime() : 0;
        const bD = b.priceLastUpdated ? new Date(b.priceLastUpdated).getTime() : 0;
        cmp = aD - bD;
      } else if (sortKey === 'deviationFromAvg') {
        cmp = Math.abs(a.deviationFromAvg) - Math.abs(b.deviationFromAvg);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [data, searchTerm, filterChanged, sortKey, sortOrder]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Fiyat listesi yüklenemedi" />;
  if (!data) return null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 pb-20" data-testid="fiyat-listesi">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3">
          <DollarSign className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Hammadde Fiyat Listesi</h1>
          <p className="text-sm text-muted-foreground">
            {data.summary.total} aktif hammadde • Ortalama: {data.summary.avgPrice.toFixed(2)} TL •
            Son 30 gün: {data.summary.recentlyChanged} değişiklik
          </p>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Toplam</div>
                <div className="text-2xl font-bold">{data.summary.total}</div>
              </div>
              <Package className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-amber-500/50" onClick={() => setFilterChanged('recent')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Son 30 Gün Değişen</div>
                <div className="text-2xl font-bold text-amber-600">{data.summary.recentlyChanged}</div>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/50" onClick={() => setFilterChanged('increased')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Fiyatı Artan</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.priceIncreased}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50" onClick={() => setFilterChanged('decreased')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Fiyatı Düşen</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.priceDecreased}</div>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hammadde, kod, marka, tedarikçi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              variant={filterChanged === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterChanged('all')}
            >
              Tümü
            </Button>
            <Button
              size="sm"
              variant={filterChanged === 'recent' ? 'default' : 'outline'}
              onClick={() => setFilterChanged('recent')}
            >
              Son 30 Gün
            </Button>
            <Button
              size="sm"
              variant={filterChanged === 'increased' ? 'default' : 'outline'}
              onClick={() => setFilterChanged('increased')}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Artanlar
            </Button>
            <Button
              size="sm"
              variant={filterChanged === 'decreased' ? 'default' : 'outline'}
              onClick={() => setFilterChanged('decreased')}
            >
              <TrendingDown className="h-3.5 w-3.5 mr-1" />
              Düşenler
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fiyat Listesi ({filteredMaterials.length})
          </CardTitle>
          <CardDescription>
            Tıklayarak detaya git (Bağlam-İçi 5 sekme)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Eşleşen hammadde bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="h-7 -ml-2">
                        Hammadde <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>Marka / Tedarikçi</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('currentPrice')} className="h-7">
                        Güncel Fiyat <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('deviationFromAvg')} className="h-7">
                        Ort. Sapma <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('lastChangePercent')} className="h-7">
                        Son Değişim <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort('priceLastUpdated')} className="h-7">
                        Güncelleme <ArrowUpDown className="h-3 w-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((m) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/girdi-yonetimi/${m.id}`)}
                      data-testid={`material-row-${m.id}`}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{m.name}</span>
                            {m.isKeyblend && <Badge className="text-[9px] bg-purple-600">🔒</Badge>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {m.code} • {m.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{m.brand || '—'}</div>
                          {m.supplier && (
                            <div className="text-muted-foreground">{m.supplier.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{m.currentPrice.toFixed(2)} TL</div>
                        <div className="text-[10px] text-muted-foreground">/{m.unit}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.averagePrice > 0 ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              Math.abs(m.deviationFromAvg) < 5 ? 'text-muted-foreground'
                              : m.deviationFromAvg > 0 ? 'text-red-600 border-red-300'
                              : 'text-green-600 border-green-300'
                            }`}
                          >
                            {m.deviationFromAvg > 0 ? '+' : ''}{m.deviationFromAvg.toFixed(1)}%
                          </Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.lastChange?.changePercent != null ? (
                          <div className="flex items-center justify-end gap-1">
                            {m.lastChange.changePercent > 0 ? (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            ) : m.lastChange.changePercent < 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            ) : null}
                            <span className={`text-xs font-medium ${
                              m.lastChange.changePercent > 0 ? 'text-red-600'
                              : m.lastChange.changePercent < 0 ? 'text-green-600'
                              : 'text-muted-foreground'
                            }`}>
                              {m.lastChange.changePercent > 0 ? '+' : ''}{m.lastChange.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {m.priceLastUpdated
                          ? new Date(m.priceLastUpdated).toLocaleDateString('tr-TR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
        💡 <strong>Sapma:</strong> Güncel fiyat ile ortalama fiyat arasındaki yüzde fark.<br />
        🔒 Kilit ikonu: Keyblend (gizli formül) hammadde, fiyatı sadece admin görür.<br />
        📊 Detaylı geçmiş için satıra tıklayın → 'Stok & Fiyat' sekmesine gidin.
      </div>
    </div>
  );
}
