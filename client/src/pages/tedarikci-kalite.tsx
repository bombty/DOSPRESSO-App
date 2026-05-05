/**
 * Sprint 9 (5 May 2026) - Tedarikçi Kalite QC Sayfası
 * 
 * Aslan'ın talebi (#348):
 *   "Tedarikçi kalite kayıtları ve Türkomp sayfaları frontend ekleme"
 * 
 * Backend: /api/tedarikci-kalite/* endpoint'leri Sprint 7'de yapıldı
 * 
 * Bu sayfa:
 *   - QC kayıt girişi (yeni denetim)
 *   - Tedarikçi bazlı QC geçmişi
 *   - Tedarikçi skorlama (yeşil/sarı/kırmızı)
 *   - Reddedilenler analizi
 * 
 * Yetki: admin, ceo, cgo, satinalma, gida_muhendisi, kalite_kontrol, kalite
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldCheck, Plus, AlertTriangle, CheckCircle2, XCircle, TrendingDown, TrendingUp, Search } from "lucide-react";

const READ_ROLES = ['admin', 'ceo', 'cgo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'fabrika_mudur', 'fabrika_sorumlu', 'kalite'];
const WRITE_ROLES = ['admin', 'ceo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'kalite'];

interface QcRecord {
  id: number;
  supplierId: number;
  supplierName?: string;
  rawMaterialId?: number;
  rawMaterialName?: string;
  inspectionDate: string;
  status: 'yesil' | 'sari' | 'kirmizi';
  defectType?: string;
  notes?: string;
  inspectorId?: string;
  createdAt: string;
}

interface SupplierPerformance {
  supplierId: number;
  supplierName: string;
  totalRecords: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  defectRate: number; // %
  trend: 'up' | 'down' | 'stable';
}

export default function TedarikciKalite() {
  const { user } = useAuth();
  const { toast } = useToast();

  const canRead = user && READ_ROLES.includes(user.role);
  const canWrite = user && WRITE_ROLES.includes(user.role);

  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'yesil' | 'sari' | 'kirmizi'>('all');
  const [searchText, setSearchText] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<QcRecord>>({
    inspectionDate: new Date().toISOString().slice(0, 10),
    status: 'yesil',
  });

  const { data: records = [], isLoading } = useQuery<QcRecord[]>({
    queryKey: ['/api/tedarikci-kalite/list', filterSupplier, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSupplier !== 'all') params.set('supplierId', filterSupplier);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/tedarikci-kalite/list?${params}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Yüklenemedi');
      }
      return res.json();
    },
    enabled: !!canRead,
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    enabled: !!canRead,
  });

  const { data: rawMaterials = [] } = useQuery<any[]>({
    queryKey: ['/api/girdi/list'],
    enabled: !!canRead,
  });

  const { data: summary } = useQuery<{ suppliers: SupplierPerformance[] }>({
    queryKey: ['/api/tedarikci-kalite/summary-all'],
    enabled: !!canRead,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest('POST', '/api/tedarikci-kalite', body),
    onSuccess: () => {
      toast({ title: 'QC kaydı eklendi' });
      queryClient.invalidateQueries({ queryKey: ['/api/tedarikci-kalite/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tedarikci-kalite/summary-all'] });
      setIsAddOpen(false);
      setNewRecord({ inspectionDate: new Date().toISOString().slice(0, 10), status: 'yesil' });
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  if (!canRead) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Bu sayfa <strong>satınalma, gıda mühendisi, kalite</strong> rolleri içindir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = records.filter(r => {
    if (searchText && !r.supplierName?.toLowerCase().includes(searchText.toLowerCase()) && 
        !r.rawMaterialName?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4 pb-20">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Tedarikçi Kalite QC
              </CardTitle>
              <CardDescription>
                Hammadde teslimat kontrolü · Tedarikçi performans skorlama
              </CardDescription>
            </div>
            {canWrite && (
              <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-qc">
                <Plus className="h-4 w-4 mr-2" />
                Yeni QC Kaydı
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tedarikçi Performans Özeti */}
      {summary?.suppliers && summary.suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tedarikçi Performans Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {summary.suppliers.slice(0, 6).map(s => (
                <div key={s.supplierId} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{s.supplierName}</span>
                    {s.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                    {s.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-green-50">✓ {s.greenCount}</Badge>
                    <Badge variant="outline" className="bg-yellow-50">⚠ {s.yellowCount}</Badge>
                    <Badge variant="outline" className="bg-red-50">✗ {s.redCount}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Hata oranı: <strong className={s.defectRate > 10 ? 'text-red-500' : 'text-green-500'}>
                      %{s.defectRate.toFixed(1)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtreler */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger><SelectValue placeholder="Tedarikçi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tedarikçiler</SelectItem>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="yesil">✓ Yeşil (Onaylı)</SelectItem>
                <SelectItem value="sari">⚠ Sarı (Uyarı)</SelectItem>
                <SelectItem value="kirmizi">✗ Kırmızı (Reddedildi)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-3 text-muted-foreground" />
              <Input 
                placeholder="Tedarikçi/Hammadde ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-7"
                data-testid="input-search-qc"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kayıt Tablosu */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">Henüz QC kaydı yok</p>
              {canWrite && (
                <p className="text-xs text-muted-foreground mt-2">
                  "Yeni QC Kaydı" butonu ile başlayın
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead>Hammadde</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Hata Tipi</TableHead>
                    <TableHead>Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} data-testid={`row-qc-${r.id}`}>
                      <TableCell className="text-xs">
                        {new Date(r.inspectionDate).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.supplierName || '-'}</TableCell>
                      <TableCell className="text-xs">{r.rawMaterialName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'yesil' ? 'default' :
                          r.status === 'sari' ? 'outline' : 'destructive'
                        } className={r.status === 'yesil' ? 'bg-green-600' : r.status === 'sari' ? 'bg-yellow-500' : ''}>
                          {r.status === 'yesil' ? '✓ Onaylı' : r.status === 'sari' ? '⚠ Uyarı' : '✗ Red'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.defectType || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate" title={r.notes}>
                        {r.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni QC Kaydı Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni QC Kaydı</DialogTitle>
            <DialogDescription>Hammadde teslimatı kalite kontrol kaydı</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tedarikçi *</Label>
              <Select 
                value={newRecord.supplierId ? String(newRecord.supplierId) : ''} 
                onValueChange={(v) => setNewRecord({...newRecord, supplierId: Number(v)})}
              >
                <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hammadde</Label>
              <Select 
                value={newRecord.rawMaterialId ? String(newRecord.rawMaterialId) : ''} 
                onValueChange={(v) => setNewRecord({...newRecord, rawMaterialId: Number(v)})}
              >
                <SelectTrigger><SelectValue placeholder="(opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  {rawMaterials.slice(0, 50).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tarih</Label>
                <Input 
                  type="date"
                  value={newRecord.inspectionDate}
                  onChange={(e) => setNewRecord({...newRecord, inspectionDate: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs">Durum *</Label>
                <Select 
                  value={newRecord.status} 
                  onValueChange={(v: any) => setNewRecord({...newRecord, status: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yesil">✓ Yeşil (Onaylı)</SelectItem>
                    <SelectItem value="sari">⚠ Sarı (Uyarı)</SelectItem>
                    <SelectItem value="kirmizi">✗ Kırmızı (Red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newRecord.status !== 'yesil' && (
              <div>
                <Label className="text-xs">Hata Tipi</Label>
                <Input 
                  value={newRecord.defectType || ''}
                  onChange={(e) => setNewRecord({...newRecord, defectType: e.target.value})}
                  placeholder="Örn: Ambalaj hasarı, son kullanma tarihi geçmiş..."
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Notlar</Label>
              <Textarea 
                value={newRecord.notes || ''}
                onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                rows={3}
                placeholder="Detaylı açıklama..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>İptal</Button>
            <Button 
              onClick={() => createMutation.mutate(newRecord)}
              disabled={!newRecord.supplierId || createMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
