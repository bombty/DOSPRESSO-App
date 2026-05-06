/**
 * Sprint 9 (5 May 2026) - TÜRKOMP Arama & Lookup Sayfası
 * 
 * Aslan'ın talebi (#348):
 *   "Türkomp gıda DB'si araması ve besin değeri lookup"
 * 
 * TÜRKOMP: Türkiye Tarım ve Orman Bakanlığı resmi gıda kompozisyon veritabanı
 *   - 645 gıda × 100 bileşen
 *   - Resmi Türk gıda besin değerleri kaynağı
 *   - Etiket hesaplama için authoritative source
 * 
 * ⚠️ YASAL UYARI: TÜRKOMP verileri ücretsiz arama OK, ticari toplu kullanım için ücretli
 * 
 * Yetki: admin, ceo, cgo, gida_muhendisi, kalite_kontrol, kalite, satinalma
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Search, AlertTriangle, Database, Download, Beaker, Info } from "lucide-react";

const READ_ROLES = ['admin', 'ceo', 'cgo', 'gida_muhendisi', 'kalite_kontrol', 'kalite', 'satinalma', 'fabrika_mudur', 'fabrika_sorumlu'];
const APPLY_ROLES = ['admin', 'ceo', 'gida_muhendisi', 'kalite_kontrol', 'satinalma'];

interface TurkompFood {
  id: string;
  name: string;
  category?: string;
  energy_kcal?: number;
  energy_kj?: number;
  fat?: number;
  saturated_fat?: number;
  carbohydrate?: number;
  sugar?: number;
  protein?: number;
  salt?: number;
  fiber?: number;
  cached?: boolean;
}

export default function Turkomp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canRead = user && READ_ROLES.includes(user.role);
  const canApply = user && APPLY_ROLES.includes(user.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedFood, setSelectedFood] = useState<TurkompFood | null>(null);
  const [applyTargetId, setApplyTargetId] = useState<string>('');

  const { data: searchResults = [], isLoading, refetch } = useQuery<TurkompFood[]>({
    queryKey: ['/api/turkomp/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) return [];
      const res = await fetch(`/api/turkomp/search?q=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Arama başarısız');
      // API returns { source: 'cache'|'api', results: [...] } — unwrap and guard
      const data = await res.json();
      return Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
    },
    enabled: false, // Manuel trigger
  });

  const { data: cachedFoods = [] } = useQuery<TurkompFood[]>({
    queryKey: ['/api/turkomp/cache/list'],
    enabled: !!canRead,
  });

  const { data: rawMaterials = [] } = useQuery<any[]>({
    queryKey: ['/api/girdi/list'],
    enabled: !!canRead && !!selectedFood,
  });

  const fetchMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', '/api/turkomp/fetch', { id }),
    onSuccess: (data: any) => {
      toast({ title: 'TÜRKOMP\'tan çekildi', description: data?.name });
      queryClient.invalidateQueries({ queryKey: ['/api/turkomp/cache/list'] });
      refetch();
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const applyMutation = useMutation({
    mutationFn: ({ id, turkompId }: { id: string; turkompId: string }) =>
      apiRequest('POST', `/api/girdi/${id}/apply-turkomp`, { turkompId }),
    onSuccess: () => {
      toast({ title: 'Hammaddeye uygulandı', description: 'Besin değerleri güncellendi' });
      queryClient.invalidateQueries({ queryKey: ['/api/girdi/list'] });
      setSelectedFood(null);
      setApplyTargetId('');
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const handleSearch = () => {
    if (searchTerm.trim().length < 2) {
      toast({ title: 'En az 2 karakter girin', variant: 'destructive' });
      return;
    }
    setSearched(true);
    refetch();
  };

  if (!canRead) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              TÜRKOMP gıda mühendisi, kalite ve satınalma rolleri içindir.
            </p>
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
            <Globe className="h-5 w-5 text-blue-600" />
            TÜRKOMP — Türkiye Gıda Kompozisyon DB
          </CardTitle>
          <CardDescription>
            Resmi Türk gıda besin değerleri (T.C. Tarım ve Orman Bakanlığı) — 645 gıda × 100 bileşen
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Yasal Uyarı */}
      <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
        <CardContent className="p-3 text-xs">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Yasal:</strong> TÜRKOMP verileri ücretsiz arama için kullanılabilir. 
              Ticari toplu indirme/scraping için ücretli lisans gerekir. 
              Çekilen veriler etiket hesaplamasında authoritative source olarak kullanılır.
              <br />
              <span className="text-muted-foreground">Source: turkomp.tarimorman.gov.tr</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arama */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Gıda Arama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="Süt, fındık, buğday unu, matcha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-turkomp-search"
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Ara
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Türkçe ad ile ara. Sonuç gelmezse cache'den çek butonu kullan.
          </p>
        </CardContent>
      </Card>

      {/* Arama Sonuçları */}
      {searched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Arama Sonuçları ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Aranıyor...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Sonuç bulunamadı. Farklı kelime deneyin.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gıda Adı</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-center">Enerji</TableHead>
                      <TableHead className="text-center">Yağ</TableHead>
                      <TableHead className="text-center">Karb.</TableHead>
                      <TableHead className="text-center">Protein</TableHead>
                      <TableHead>Cache</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map(f => (
                      <TableRow key={f.id} data-testid={`row-turkomp-${f.id}`}>
                        <TableCell className="font-medium text-sm">{f.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.category || '-'}</TableCell>
                        <TableCell className="text-center text-xs">
                          {f.energy_kcal ? `${Math.round(f.energy_kcal)} kcal` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {f.fat != null ? `${f.fat}g` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {f.carbohydrate != null ? `${f.carbohydrate}g` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {f.protein != null ? `${f.protein}g` : '-'}
                        </TableCell>
                        <TableCell>
                          {f.cached ? (
                            <Badge variant="default" className="bg-green-600 text-xs">✓ Cache</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Fresh</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedFood(f)}
                              className="text-xs h-7"
                              data-testid={`button-detail-${f.id}`}
                            >
                              <Beaker className="h-3 w-3 mr-1" />
                              Detay
                            </Button>
                            {!f.cached && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => fetchMutation.mutate(f.id)}
                                disabled={fetchMutation.isPending}
                                className="text-xs h-7"
                                data-testid={`button-fetch-${f.id}`}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Çek
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache'deki Gıdalar */}
      {!searched && cachedFoods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              Cache'deki Gıdalar ({cachedFoods.length})
            </CardTitle>
            <CardDescription>Daha önce çekilen ve sistemde saklanan TÜRKOMP verileri</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gıda</TableHead>
                    <TableHead className="text-center">Enerji</TableHead>
                    <TableHead className="text-center">Yağ</TableHead>
                    <TableHead className="text-center">Karb.</TableHead>
                    <TableHead className="text-center">Protein</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cachedFoods.slice(0, 20).map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-sm">{f.name}</TableCell>
                      <TableCell className="text-center text-xs">{f.energy_kcal ? `${Math.round(f.energy_kcal)} kcal` : '-'}</TableCell>
                      <TableCell className="text-center text-xs">{f.fat != null ? `${f.fat}g` : '-'}</TableCell>
                      <TableCell className="text-center text-xs">{f.carbohydrate != null ? `${f.carbohydrate}g` : '-'}</TableCell>
                      <TableCell className="text-center text-xs">{f.protein != null ? `${f.protein}g` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedFood(f)} className="text-xs h-7">
                          Hammaddeye uygula
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detay + Hammaddeye Uygulama Dialog */}
      <Dialog open={!!selectedFood} onOpenChange={(o) => !o && setSelectedFood(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedFood?.name}</DialogTitle>
            <DialogDescription>TÜRKOMP besin değerleri (100g başına)</DialogDescription>
          </DialogHeader>
          {selectedFood && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Enerji</div>
                  <div className="font-bold">{selectedFood.energy_kcal ? `${Math.round(selectedFood.energy_kcal)} kcal` : '-'}</div>
                  {selectedFood.energy_kj && <div className="text-[10px] text-muted-foreground">{Math.round(selectedFood.energy_kj)} kJ</div>}
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Yağ</div>
                  <div className="font-bold">{selectedFood.fat != null ? `${selectedFood.fat} g` : '-'}</div>
                  {selectedFood.saturated_fat != null && <div className="text-[10px] text-muted-foreground">Doy: {selectedFood.saturated_fat}g</div>}
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Karbonhidrat</div>
                  <div className="font-bold">{selectedFood.carbohydrate != null ? `${selectedFood.carbohydrate} g` : '-'}</div>
                  {selectedFood.sugar != null && <div className="text-[10px] text-muted-foreground">Şeker: {selectedFood.sugar}g</div>}
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Protein</div>
                  <div className="font-bold">{selectedFood.protein != null ? `${selectedFood.protein} g` : '-'}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Tuz</div>
                  <div className="font-bold">{selectedFood.salt != null ? `${selectedFood.salt} g` : '-'}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Lif</div>
                  <div className="font-bold">{selectedFood.fiber != null ? `${selectedFood.fiber} g` : '-'}</div>
                </div>
              </div>

              {/* Hammaddeye uygula */}
              {canApply && (
                <div className="space-y-2 pt-3 border-t">
                  <label className="text-xs font-medium">Hammaddeye Uygula</label>
                  <select 
                    className="w-full text-sm p-2 border rounded"
                    value={applyTargetId}
                    onChange={(e) => setApplyTargetId(e.target.value)}
                    data-testid="select-target-raw-material"
                  >
                    <option value="">Hammadde seçin...</option>
                    {rawMaterials.slice(0, 100).map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.code || 'no-code'})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Bu işlem seçilen hammaddenin besin değerlerini TÜRKOMP verisiyle günceller.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFood(null)}>Kapat</Button>
            {canApply && (
              <Button 
                onClick={() => {
                  if (selectedFood && applyTargetId) {
                    applyMutation.mutate({ id: applyTargetId, turkompId: selectedFood.id });
                  }
                }}
                disabled={!applyTargetId || applyMutation.isPending}
              >
                Uygula
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
