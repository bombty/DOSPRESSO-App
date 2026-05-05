/**
 * Sprint 7 (5 May 2026) - Girdi Yönetimi / TGK 2017/2284 Uyumu
 * 
 * Aslan: 'Tam TGK uyumlu (etiket oluşturma + alerjen + besin değeri)'
 * Yetki: admin, ceo, satinalma, gida_muhendisi (write)
 *        + cgo, kalite_kontrol, fabrika_mudur (read)
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Package, Search, Plus, Filter, AlertTriangle, ShieldCheck, 
  FileText, Tag, Building2, Edit, Trash2, Download, Upload, 
  CheckCircle2, XCircle, Beaker, Eye, Pencil
} from "lucide-react";

const READ_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'fabrika_mudur', 'fabrika_sorumlu', 'kalite'];
const WRITE_ROLES = ['admin', 'ceo', 'satinalma', 'gida_muhendisi'];

export default function GirdiYonetimiPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("liste");
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [tgkOnly, setTgkOnly] = useState(false);
  const [allergenOnly, setAllergenOnly] = useState(false);
  const [selectedGirdi, setSelectedGirdi] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const canWrite = user && WRITE_ROLES.includes(user.role);
  const canRead = user && READ_ROLES.includes(user.role);

  // Yetki kontrolü
  if (!canRead) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Yetkisiz Erişim</h2>
        <p className="text-muted-foreground mt-2">
          Girdi Yönetimi sayfasını görüntüleme yetkiniz yok.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Bu sayfa: admin, satınalma, gıda mühendisi, kalite kontrol erişimine açıktır.
        </p>
      </div>
    );
  }

  // Queries
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/girdi-stats/overview"],
  });

  const { data: girdiList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/girdi/list", searchQuery, supplierFilter, groupFilter, tgkOnly, allergenOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (supplierFilter) params.set('supplierId', supplierFilter);
      if (groupFilter) params.set('materialGroup', groupFilter);
      if (tgkOnly) params.set('tgkOnly', 'true');
      if (allergenOnly) params.set('allergenOnly', 'true');
      const res = await fetch(`/api/girdi/list?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: allergenMatrix = [] } = useQuery<any[]>({
    queryKey: ["/api/girdi-stats/allergen-matrix"],
  });

  const { data: tgkLabels = [] } = useQuery<any[]>({
    queryKey: ["/api/tgk-label/list"],
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/girdi/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Girdi güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/girdi/list"] });
      setIsEditOpen(false);
    },
    onError: () => toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/girdi", data);
    },
    onSuccess: () => {
      toast({ title: "Yeni girdi eklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/girdi/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/girdi-stats/overview"] });
      setIsAddOpen(false);
      setEditForm({});
    },
    onError: () => toast({ title: "Hata", description: "Ekleme başarısız", variant: "destructive" }),
  });

  // Unique groups (filter için)
  const uniqueGroups = Array.from(new Set(girdiList.map((g: any) => g.materialGroup).filter(Boolean))) as string[];

  const handleEdit = (girdi: any) => {
    setEditForm({ ...girdi });
    setIsEditOpen(true);
  };

  const handleDetail = (girdi: any) => {
    setSelectedGirdi(girdi);
    setIsDetailOpen(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Girdi Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            TGK 2017/2284 uyumlu hammadde, tedarikçi ve etiket yönetimi
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" data-testid="button-import-girdi">
              <Upload className="h-4 w-4 mr-2" />
              Excel İçe Aktar
            </Button>
            <Button onClick={() => { setEditForm({}); setIsAddOpen(true); }} data-testid="button-add-girdi">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Girdi
            </Button>
          </div>
        )}
      </div>

      {/* Özet Kartlar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Toplam Girdi</div>
              <div className="text-2xl font-bold mt-1">{stats.totalGirdi}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">TGK Uyumlu</div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.tgkCompliant}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.totalGirdi > 0 ? ((stats.tgkCompliant / stats.totalGirdi) * 100).toFixed(0) : 0}% uyumlu
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Alerjen İçeren</div>
              <div className="text-2xl font-bold mt-1 text-orange-500">{stats.withAllergen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Tedarikçi</div>
              <div className="text-2xl font-bold mt-1">{stats.totalSuppliers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="liste" data-testid="tab-girdi-liste">
            <Package className="h-4 w-4 mr-1" />
            Girdi Listesi
          </TabsTrigger>
          <TabsTrigger value="alerjen" data-testid="tab-alerjen">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Alerjen Matrisi
          </TabsTrigger>
          <TabsTrigger value="etiket" data-testid="tab-tgk-etiket">
            <Tag className="h-4 w-4 mr-1" />
            TGK Etiketleri
          </TabsTrigger>
          <TabsTrigger value="tedarikci" data-testid="tab-tedarikci-performans">
            <Building2 className="h-4 w-4 mr-1" />
            Tedarikçi Performans
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Girdi Listesi */}
        <TabsContent value="liste" className="space-y-3 mt-4">
          {/* Filtreler */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Arama</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Ürün adı, kod, marka..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="input-girdi-search"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier">Tedarikçi</Label>
                  <Select value={supplierFilter || "all"} onValueChange={(v) => setSupplierFilter(v === "all" ? "" : v)}>
                    <SelectTrigger id="supplier" data-testid="select-supplier-filter">
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="group">Girdi Grubu</Label>
                  <Select value={groupFilter || "all"} onValueChange={(v) => setGroupFilter(v === "all" ? "" : v)}>
                    <SelectTrigger id="group" data-testid="select-group-filter">
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {uniqueGroups.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="tgkOnly" 
                    checked={tgkOnly} 
                    onCheckedChange={(c) => setTgkOnly(c === true)}
                    data-testid="checkbox-tgk-only"
                  />
                  <Label htmlFor="tgkOnly" className="text-sm cursor-pointer">Sadece TGK uyumlu</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="allergenOnly" 
                    checked={allergenOnly} 
                    onCheckedChange={(c) => setAllergenOnly(c === true)}
                    data-testid="checkbox-allergen-only"
                  />
                  <Label htmlFor="allergenOnly" className="text-sm cursor-pointer">Sadece alerjen içerenler</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{girdiList.length} Girdi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
              ) : girdiList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Filtreye uygun girdi bulunamadı</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kod</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead>Marka</TableHead>
                        <TableHead>Tedarikçi</TableHead>
                        <TableHead>Grup</TableHead>
                        <TableHead className="text-center">Alerjen</TableHead>
                        <TableHead className="text-center">TGK</TableHead>
                        <TableHead className="text-right">Kcal</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {girdiList.map((g: any) => (
                        <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" data-testid={`row-girdi-${g.id}`}>
                          <TableCell className="font-mono text-xs" onClick={() => handleDetail(g)}>{g.code || '-'}</TableCell>
                          <TableCell className="font-medium" onClick={() => handleDetail(g)}>{g.name}</TableCell>
                          <TableCell className="text-sm" onClick={() => handleDetail(g)}>{g.brand || '-'}</TableCell>
                          <TableCell className="text-sm" onClick={() => handleDetail(g)}>{g.supplierName || '-'}</TableCell>
                          <TableCell className="text-sm" onClick={() => handleDetail(g)}>{g.materialGroup || '-'}</TableCell>
                          <TableCell className="text-center" onClick={() => handleDetail(g)}>
                            {g.allergenPresent ? (
                              <Badge variant="destructive" className="text-xs">Var</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Yok</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center" onClick={() => handleDetail(g)}>
                            {g.tgkCompliant ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm" onClick={() => handleDetail(g)}>
                            {g.energyKcal ? Number(g.energyKcal).toFixed(0) : '-'}
                          </TableCell>
                          <TableCell>
                            {canWrite && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEdit(g)}
                                data-testid={`button-edit-girdi-${g.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Alerjen Matrisi */}
        <TabsContent value="alerjen" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Alerjen Matrisi
              </CardTitle>
              <CardDescription>
                TGK Madde 9 - 14 büyük alerjen takibi. {allergenMatrix.length} girdi alerjen içerir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Alerjen Detayı</TableHead>
                      <TableHead>Çapraz Bulaşma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allergenMatrix.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {a.allergenDetail || 'Detay yok'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.crossContamination || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: TGK Etiketleri */}
        <TabsContent value="etiket" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                TGK 2017/2284 Etiketleri
              </CardTitle>
              <CardDescription>
                Reçeteden otomatik besin değeri hesaplama + gıda mühendisi onayı
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tgkLabels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz etiket oluşturulmadı</p>
                  <p className="text-xs mt-2">Reçete sayfasından "Etiket Oluştur" butonuyla başlayın</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Versiyon</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tgkLabels.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.productName}</TableCell>
                          <TableCell>v{l.version}</TableCell>
                          <TableCell>
                            <Badge variant={
                              l.status === 'onaylandi' ? 'default' :
                              l.status === 'onay_bekliyor' ? 'outline' :
                              l.status === 'reddedildi' ? 'destructive' : 'secondary'
                            }>
                              {l.status === 'onaylandi' ? 'Onaylı' :
                               l.status === 'onay_bekliyor' ? 'Onay Bekliyor' :
                               l.status === 'reddedildi' ? 'Reddedildi' : 'Taslak'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(l.createdAt).toLocaleDateString("tr-TR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Tedarikçi Performans */}
        <TabsContent value="tedarikci" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Tedarikçi Performans Özeti
              </CardTitle>
              <CardDescription>
                Her tedarikçi için QC kabul oranı, uygunsuzluk ve red sayıları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Tedarikçi performans verisi gelecek QC kayıtlarından hesaplanacak.</p>
                <p className="text-xs mt-2">QC kayıt eklemek için: Hammadde girişinde "Kalite Kontrol" butonuyla başlayın</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detay Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedGirdi?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedGirdi?.code} • {selectedGirdi?.brand || 'Marka belirtilmemiş'}
            </DialogDescription>
          </DialogHeader>
          {selectedGirdi && (
            <div className="space-y-4">
              {/* Temel Bilgi */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Tedarikçi:</strong> {selectedGirdi.supplierName || '-'}</div>
                <div><strong>Grup:</strong> {selectedGirdi.materialGroup || '-'}</div>
                <div><strong>Birim:</strong> {selectedGirdi.unit}</div>
                <div><strong>Menşei:</strong> {selectedGirdi.countryOfOrigin || '-'}</div>
              </div>

              {/* İçerik */}
              {selectedGirdi.contentInfo && (
                <div>
                  <strong className="text-sm">İçerik:</strong>
                  <p className="text-xs mt-1 p-3 bg-muted rounded">{selectedGirdi.contentInfo}</p>
                </div>
              )}

              {/* Alerjen */}
              {selectedGirdi.allergenPresent && (
                <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <strong>Alerjen:</strong> {selectedGirdi.allergenDetail || 'Detay yok'}
                        {selectedGirdi.crossContamination && (
                          <div className="mt-1 text-muted-foreground">
                            <strong>Çapraz bulaşma:</strong> {selectedGirdi.crossContamination}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Besin Değerleri */}
              <div>
                <strong className="text-sm">Besin Değerleri (100g başına):</strong>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Enerji</div><div className="font-bold">{selectedGirdi.energyKcal || '-'} kcal</div></div>
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Yağ</div><div className="font-bold">{selectedGirdi.fat || '-'} g</div></div>
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Karbonhidrat</div><div className="font-bold">{selectedGirdi.carbohydrate || '-'} g</div></div>
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Şeker</div><div className="font-bold">{selectedGirdi.sugar || '-'} g</div></div>
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Protein</div><div className="font-bold">{selectedGirdi.protein || '-'} g</div></div>
                  <div className="p-2 bg-muted rounded"><div className="text-muted-foreground">Tuz</div><div className="font-bold">{selectedGirdi.salt || '-'} g</div></div>
                </div>
              </div>

              {/* TGK Durum */}
              <div className="flex items-center gap-2">
                {selectedGirdi.tgkCompliant ? (
                  <Badge className="bg-green-600">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    TGK 2017/2284 Uyumlu
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    TGK Uyum Bekleniyor
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {canWrite && selectedGirdi && (
              <Button onClick={() => { handleEdit(selectedGirdi); setIsDetailOpen(false); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Düzenle
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog open={isEditOpen || isAddOpen} onOpenChange={(o) => { if (!o) { setIsEditOpen(false); setIsAddOpen(false); }}}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAddOpen ? "Yeni Girdi Ekle" : "Girdi Düzenle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ürün Kodu</Label>
                <Input value={editForm.code || ""} onChange={(e) => setEditForm({...editForm, code: e.target.value})} placeholder="Otomatik oluşturulur" data-testid="input-code" />
              </div>
              <div>
                <Label>Ürün Adı *</Label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required data-testid="input-name" />
              </div>
              <div>
                <Label>Marka</Label>
                <Input value={editForm.brand || ""} onChange={(e) => setEditForm({...editForm, brand: e.target.value})} data-testid="input-brand" />
              </div>
              <div>
                <Label>Birim *</Label>
                <Select value={editForm.unit || "kg"} onValueChange={(v) => setEditForm({...editForm, unit: v})}>
                  <SelectTrigger data-testid="select-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="lt">lt</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="adet">adet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tedarikçi</Label>
                <Select value={String(editForm.supplierId || "")} onValueChange={(v) => setEditForm({...editForm, supplierId: parseInt(v)})}>
                  <SelectTrigger data-testid="select-supplier"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Girdi Grubu</Label>
                <Input value={editForm.materialGroup || ""} onChange={(e) => setEditForm({...editForm, materialGroup: e.target.value})} placeholder="örn: süt ve süt ürünleri" data-testid="input-group" />
              </div>
            </div>

            <div>
              <Label>İçerik Bilgisi (TGK Madde 9)</Label>
              <Textarea value={editForm.contentInfo || ""} onChange={(e) => setEditForm({...editForm, contentInfo: e.target.value})} rows={3} placeholder="E-numaraları, %ler dahil tam içerik listesi" data-testid="input-content" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={!!editForm.allergenPresent} onCheckedChange={(c) => setEditForm({...editForm, allergenPresent: c === true})} data-testid="check-allergen" />
                  <Label>Alerjen İçerir</Label>
                </div>
                {editForm.allergenPresent && (
                  <Input className="mt-2" value={editForm.allergenDetail || ""} onChange={(e) => setEditForm({...editForm, allergenDetail: e.target.value})} placeholder="Alerjen detayı" data-testid="input-allergen-detail" />
                )}
              </div>
              <div>
                <Label>Çapraz Bulaşma</Label>
                <Input value={editForm.crossContamination || ""} onChange={(e) => setEditForm({...editForm, crossContamination: e.target.value})} placeholder="Eser miktarda gluten, soya..." data-testid="input-cross" />
              </div>
            </div>

            {/* Besin Değerleri */}
            <div>
              <Label className="text-base">Besin Değerleri (100g başına)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div><Label className="text-xs">Enerji (kcal)</Label><Input type="number" step="0.01" value={editForm.energyKcal || ""} onChange={(e) => setEditForm({...editForm, energyKcal: e.target.value})} data-testid="input-kcal" /></div>
                <div><Label className="text-xs">Yağ (g)</Label><Input type="number" step="0.001" value={editForm.fat || ""} onChange={(e) => setEditForm({...editForm, fat: e.target.value})} data-testid="input-fat" /></div>
                <div><Label className="text-xs">Doy. Yağ (g)</Label><Input type="number" step="0.001" value={editForm.saturatedFat || ""} onChange={(e) => setEditForm({...editForm, saturatedFat: e.target.value})} data-testid="input-satfat" /></div>
                <div><Label className="text-xs">Karb. (g)</Label><Input type="number" step="0.001" value={editForm.carbohydrate || ""} onChange={(e) => setEditForm({...editForm, carbohydrate: e.target.value})} data-testid="input-carb" /></div>
                <div><Label className="text-xs">Şeker (g)</Label><Input type="number" step="0.001" value={editForm.sugar || ""} onChange={(e) => setEditForm({...editForm, sugar: e.target.value})} data-testid="input-sugar" /></div>
                <div><Label className="text-xs">Protein (g)</Label><Input type="number" step="0.001" value={editForm.protein || ""} onChange={(e) => setEditForm({...editForm, protein: e.target.value})} data-testid="input-protein" /></div>
                <div><Label className="text-xs">Tuz (g)</Label><Input type="number" step="0.001" value={editForm.salt || ""} onChange={(e) => setEditForm({...editForm, salt: e.target.value})} data-testid="input-salt" /></div>
                <div><Label className="text-xs">Lif (g)</Label><Input type="number" step="0.001" value={editForm.fiber || ""} onChange={(e) => setEditForm({...editForm, fiber: e.target.value})} data-testid="input-fiber" /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Saklama Koşulları</Label>
                <Textarea value={editForm.storageConditions || ""} onChange={(e) => setEditForm({...editForm, storageConditions: e.target.value})} rows={2} data-testid="input-storage" />
              </div>
              <div>
                <Label>Menşei</Label>
                <Input value={editForm.countryOfOrigin || ""} onChange={(e) => setEditForm({...editForm, countryOfOrigin: e.target.value})} placeholder="Türkiye" data-testid="input-origin" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={!!editForm.tgkCompliant} onCheckedChange={(c) => setEditForm({...editForm, tgkCompliant: c === true})} data-testid="check-tgk" />
              <Label>TGK 2017/2284 uyum onaylandı</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setIsAddOpen(false); }}>İptal</Button>
            <Button 
              onClick={() => isAddOpen ? createMutation.mutate(editForm) : updateMutation.mutate(editForm)}
              disabled={!editForm.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-girdi"
            >
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : isAddOpen ? "Ekle" : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
