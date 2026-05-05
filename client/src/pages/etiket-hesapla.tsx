/**
 * Sprint 7 v3 (5 May 2026) - Etiket Hesapla Sayfası
 * 
 * Reçete → otomatik besin değeri hesabı → TGK 2017/2284 etiket
 * 
 * Akış:
 *   1. URL: /etiket-hesapla?productId=X&productType=branch_product
 *   2. Backend smart matching ile reçete → rawMaterials
 *   3. Eşleşen ingredient'ler → besin değeri toplamı
 *   4. Eşleşmeyenler için uyarı
 *   5. Önizleme → PDF indir → tgk_labels'a kaydet (taslak)
 *   6. Gıda mühendisi onayı
 */

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Beaker, Download, Save, AlertTriangle, CheckCircle2, 
  XCircle, Loader2, ShieldCheck, FileText, Sparkles
} from "lucide-react";
import { downloadTGKLabel } from "@/lib/tgk-label-pdf";

const APPROVE_ROLES = ['admin', 'gida_muhendisi'];

export default function EtiketHesaplaPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();

  const params = new URLSearchParams(search);
  const productId = parseInt(params.get('productId') || '0');
  const productType = params.get('productType') || 'branch_product';

  const [calcResult, setCalcResult] = useState<any>(null);
  const [labelData, setLabelData] = useState<any>({
    netQuantityG: 100,
    storageConditions: '',
    shelfLifeDays: 1,
    countryOfOrigin: 'Türkiye',
  });

  const canApprove = user?.role && APPROVE_ROLES.includes(user.role);

  // Reçete → besin değeri hesapla mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const endpoint = productType === 'branch_product' 
        ? '/api/recipe-label/calculate-branch'
        : '/api/recipe-label/calculate-factory';
      const body = productType === 'branch_product' 
        ? { branchProductId: productId }
        : { factoryRecipeId: productId };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Hesaplama başarısız');
      return res.json();
    },
    onSuccess: (data) => {
      setCalcResult(data);
      toast({ 
        title: 'Etiket hesaplandı',
        description: `${data.matchedCount}/${data.totalIngredients} ingredient eşleşti`,
      });
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  // Otomatik hesapla (sayfa açılınca)
  useEffect(() => {
    if (productId && !calcResult) {
      calculateMutation.mutate();
    }
  }, [productId]);

  // Etiketi tgk_labels'a kaydet
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!calcResult?.nutrition) throw new Error('Besin değeri yok');
      
      const body = {
        productId,
        productType,
        productName: calcResult.productName || calcResult.recipeName,
        ingredientsText: calcResult.ingredientsText,
        allergenWarning: calcResult.allergenWarning,
        crossContaminationWarning: calcResult.crossContaminationWarning,
        netQuantityG: labelData.netQuantityG,
        storageConditions: labelData.storageConditions,
        shelfLifeDays: labelData.shelfLifeDays,
        ...calcResult.nutrition,
      };
      
      const res = await fetch('/api/recipe-label/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Kaydetme başarısız');
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: `Etiket kaydedildi (v${data.version})`,
        description: 'Gıda mühendisi onayı bekliyor.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tgk-label/list'] });
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const handleDownloadPDF = () => {
<<<<<<< HEAD
    if (!calcResult) {
      toast({ title: 'Önce hesaplama yapın', variant: 'destructive' });
      return;
    }
    const n = calcResult.nutrition;
=======
    if (!calcResult || calcResult.matchedCount === 0) {
      toast({ title: 'Önce hesaplama yapın', variant: 'destructive' });
      return;
    }
    
    // Nutrition null olsa bile PDF üret (alerjen + ingredient listesi yine kullanılabilir)
    const hasNutrition = !!calcResult.nutrition;
    
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58
    downloadTGKLabel({
      productName: calcResult.productName || calcResult.recipeName,
      ingredientsText: calcResult.ingredientsText,
      allergenWarning: calcResult.allergenWarning,
      crossContaminationWarning: calcResult.crossContaminationWarning,
      netQuantityG: labelData.netQuantityG,
      storageConditions: labelData.storageConditions,
      shelfLifeDays: labelData.shelfLifeDays,
      countryOfOrigin: labelData.countryOfOrigin,
<<<<<<< HEAD
      energyKcal: n?.energyKcal ?? 0,
      energyKj: n?.energyKj ?? 0,
      fat: n?.fat ?? 0,
      saturatedFat: n?.saturatedFat ?? 0,
      carbohydrate: n?.carbohydrate ?? 0,
      sugar: n?.sugar ?? 0,
      protein: n?.protein ?? 0,
      salt: n?.salt ?? 0,
      fiber: n?.fiber ?? 0,
      version: 1,
    });
    const warn = !n ? ' (besin değeri eksik — hammadde veritabanı güncellenmeli)' : '';
    toast({ title: 'PDF indirildi', description: `TGK 2017/2284 uyumlu etiket${warn}` });
=======
      energyKcal: hasNutrition ? calcResult.nutrition.energyKcal : undefined,
      energyKj: hasNutrition ? calcResult.nutrition.energyKj : undefined,
      fat: hasNutrition ? calcResult.nutrition.fat : undefined,
      saturatedFat: hasNutrition ? calcResult.nutrition.saturatedFat : undefined,
      carbohydrate: hasNutrition ? calcResult.nutrition.carbohydrate : undefined,
      sugar: hasNutrition ? calcResult.nutrition.sugar : undefined,
      protein: hasNutrition ? calcResult.nutrition.protein : undefined,
      salt: hasNutrition ? calcResult.nutrition.salt : undefined,
      fiber: hasNutrition ? calcResult.nutrition.fiber : undefined,
      version: 1,
    });
    
    toast({ 
      title: 'PDF indirildi', 
      description: hasNutrition 
        ? 'TGK 2017/2284 uyumlu etiket' 
        : 'PDF indirildi (besin değeri eksik — hammadde veritabanı güncellenmeli)',
      variant: hasNutrition ? 'default' : 'destructive',
    });
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58
  };

  if (!productId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Eksik parametre</h2>
        <p className="text-muted-foreground">URL'de productId belirtilmedi.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => setLocation(-1 as any)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            data-testid="button-recalculate"
          >
            {calculateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Beaker className="h-4 w-4 mr-2" />}
            Yeniden Hesapla
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            TGK 2017/2284 Etiket Hesaplama
          </CardTitle>
          <CardDescription>
            Reçeteden otomatik besin değeri ve alerjen hesabı
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Hesaplama sonucu */}
      {calculateMutation.isPending && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-blue-500" />
            <p>Reçete analiz ediliyor...</p>
            <p className="text-xs text-muted-foreground mt-2">Smart matching ile her ingredient hammadde DB'sine bağlanıyor</p>
          </CardContent>
        </Card>
      )}

      {calcResult && (
        <>
          {/* Özet */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Toplam Ingredient</div>
                <div className="text-2xl font-bold mt-1">{calcResult.totalIngredients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Eşleşen</div>
                <div className="text-2xl font-bold mt-1 text-green-600">{calcResult.matchedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Eşleşmeyen</div>
                <div className="text-2xl font-bold mt-1 text-red-600">{calcResult.unmatchedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Uyarılar */}
          {calcResult.warnings?.length > 0 && (
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="text-xs">
                  {calcResult.warnings.map((w: string, i: number) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eşleşmeyen ingredient'ler */}
          {calcResult.unmatched?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Eşleşmeyen Ingredient'ler ({calcResult.unmatched.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Bu ingredient'ler rawMaterials listesinde yok. Önce Girdi Yönetimi'nden ekleyin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {calcResult.unmatched.map((u: any, i: number) => (
                    <div key={i} className="text-xs flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{u.ingredientName}</span>
                      <Badge variant="outline" className="text-xs">{u.quantityText || u.amount}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eşleşen ingredient tablosu */}
          {calcResult.matched?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Eşleşen Ingredient'ler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reçete'deki</TableHead>
                        <TableHead>Eşleşen</TableHead>
                        <TableHead className="text-center">Miktar</TableHead>
                        <TableHead className="text-center">Eşleşme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calcResult.matched.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{m.ingredientName}</TableCell>
                          <TableCell className="text-xs font-medium">{m.matchedTo}</TableCell>
                          <TableCell className="text-center text-xs">
                            {m.quantityText || `${m.amount} ${m.unit}`}
                            {m.quantityGrams > 0 && <div className="text-[10px] text-muted-foreground">≈{m.quantityGrams.toFixed(0)}g</div>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={m.matchScore >= 0.85 ? 'default' : m.matchScore >= 0.7 ? 'secondary' : 'outline'}
                              className="text-[10px]"
                            >
                              {(m.matchScore * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hesaplanan Besin Değerleri */}
<<<<<<< HEAD
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Hesaplanan Besin Değerleri (100g başına)
              </CardTitle>
              <CardDescription className="text-xs">
                TGK Ek-13 uyumlu format
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!calcResult.nutrition ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Besin değeri hesaplanamadı — eşleşen hammaddeler için enerji verisi yok. PDF yine de indirilebilir (değerler 0 gösterilir).</span>
                </div>
              ) : (
=======
          {calcResult.nutrition ? (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Hesaplanan Besin Değerleri (100g başına)
                </CardTitle>
                <CardDescription className="text-xs">
                  TGK Ek-13 uyumlu format
                </CardDescription>
              </CardHeader>
              <CardContent>
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Enerji</div>
                    <div className="font-bold text-base">{calcResult.nutrition.energyKcal} kcal</div>
                    <div className="text-muted-foreground text-[10px]">{calcResult.nutrition.energyKj} kJ</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Yağ</div>
                    <div className="font-bold text-base">{calcResult.nutrition.fat} g</div>
                    <div className="text-muted-foreground text-[10px]">doy: {calcResult.nutrition.saturatedFat} g</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Karbonhidrat</div>
                    <div className="font-bold text-base">{calcResult.nutrition.carbohydrate} g</div>
                    <div className="text-muted-foreground text-[10px]">şeker: {calcResult.nutrition.sugar} g</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Protein</div>
                    <div className="font-bold text-base">{calcResult.nutrition.protein} g</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Tuz</div>
                    <div className="font-bold text-base">{calcResult.nutrition.salt} g</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-muted rounded">
                    <div className="text-muted-foreground">Lif</div>
                    <div className="font-bold text-base">{calcResult.nutrition.fiber} g</div>
                  </div>
                </div>
<<<<<<< HEAD
              )}
            </CardContent>
          </Card>
=======
              </CardContent>
            </Card>
          ) : (
            // Nutrition null — eşleşen hammaddelerin besin değeri eksik
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <strong>Besin değeri hesaplanamadı.</strong>
                  <p className="text-muted-foreground mt-1">
                    Eşleşen hammaddelerin energy_kcal değerleri NULL. PDF yine indirilebilir 
                    (içindekiler + alerjen ile) ama besin değeri tablosu boş çıkar. 
                    Çözüm: Girdi Yönetimi'nden bu hammaddelere besin değerlerini ekle 
                    (TÜRKOMP'tan getir veya manuel gir).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58

          {/* Alerjen + Çapraz Bulaşma */}
          {(calcResult.allergenWarning || calcResult.crossContaminationWarning) && (
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
              <CardContent className="p-3 space-y-2">
                {calcResult.allergenWarning && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="text-xs">
                      <strong>ALERJEN:</strong> {calcResult.allergenWarning}
                    </div>
                  </div>
                )}
                {calcResult.crossContaminationWarning && (
                  <div className="text-xs italic text-muted-foreground pl-6">
                    Çapraz bulaşma: {calcResult.crossContaminationWarning}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

<<<<<<< HEAD
          {/* Etiket meta bilgisi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Etiket Bilgileri</CardTitle>
              <CardDescription className="text-xs">PDF için ek bilgiler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Net Miktar (g)</Label>
                  <Input 
                    type="number" 
                    value={labelData.netQuantityG}
                    onChange={(e) => setLabelData({...labelData, netQuantityG: Number(e.target.value)})}
                    data-testid="input-net-quantity"
                  />
=======
          {/* Etiket meta bilgisi — matchedCount > 0 ise göster (PDF için gerekli) */}
          {calcResult.matchedCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Etiket Bilgileri</CardTitle>
                <CardDescription className="text-xs">PDF için ek bilgiler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Net Miktar (g)</Label>
                    <Input 
                      type="number" 
                      value={labelData.netQuantityG}
                      onChange={(e) => setLabelData({...labelData, netQuantityG: Number(e.target.value)})}
                      data-testid="input-net-quantity"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Raf Ömrü (gün)</Label>
                    <Input 
                      type="number" 
                      value={labelData.shelfLifeDays}
                      onChange={(e) => setLabelData({...labelData, shelfLifeDays: Number(e.target.value)})}
                      data-testid="input-shelf-life"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Saklama Koşulları</Label>
                    <Input 
                      value={labelData.storageConditions}
                      onChange={(e) => setLabelData({...labelData, storageConditions: e.target.value})}
                      placeholder="örn: Soğuk zincirde 4°C altında saklayınız"
                      data-testid="input-storage"
                    />
                  </div>
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58
                </div>
                <div>
                  <Label className="text-xs">Raf Ömrü (gün)</Label>
                  <Input 
                    type="number" 
                    value={labelData.shelfLifeDays}
                    onChange={(e) => setLabelData({...labelData, shelfLifeDays: Number(e.target.value)})}
                    data-testid="input-shelf-life"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Saklama Koşulları</Label>
                  <Input 
                    value={labelData.storageConditions}
                    onChange={(e) => setLabelData({...labelData, storageConditions: e.target.value})}
                    placeholder="örn: Soğuk zincirde 4°C altında saklayınız"
                    data-testid="input-storage"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

<<<<<<< HEAD
          {/* Aksiyonlar */}
          <Card className="border-blue-300">
            <CardContent className="p-4 flex flex-wrap gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF İndir
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !calcResult.nutrition}
                data-testid="button-save-label"
                title={!calcResult.nutrition ? 'Besin değeri olmadan kayıt yapılamaz' : undefined}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Etiketi Kaydet
                {!canApprove && <span className="text-xs ml-1">(taslak)</span>}
              </Button>
            </CardContent>
          </Card>
=======
          {/* Aksiyonlar — PDF her zaman, Save sadece nutrition varsa (Sprint 7 hotfix) */}
          {calcResult.matchedCount > 0 && (
            <Card className="border-blue-300">
              <CardContent className="p-4 flex flex-wrap gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadPDF}
                  data-testid="button-download-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                  {!calcResult.nutrition && <span className="text-xs ml-1 text-orange-500">(eksik)</span>}
                </Button>
                {calcResult.nutrition && (
                  <Button 
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-label"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Etiketi Kaydet
                    {!canApprove && <span className="text-xs ml-1">(taslak)</span>}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
>>>>>>> 764671383fe7f936456bbe677d22d9ec733f6a58
        </>
      )}
    </div>
  );
}
