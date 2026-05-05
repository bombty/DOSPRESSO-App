/**
 * Sprint 8 (5 May 2026) - Skor Parametreleri Admin Paneli
 * 
 * Aslan'ın talebi:
 *   "skor kriterleri net belirlenmeli. icabında admin tarafından
 *    güncellenebilir olmalı kriterler ve verilen ağırlıklar."
 * 
 * Yetki: sadece admin/ceo
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Save, History, AlertTriangle, Plus, Edit, Trash } from "lucide-react";

const ADMIN_ROLES = ['admin', 'ceo'];

interface ScoreParameter {
  id: number;
  category: string;
  displayName: string;
  description: string;
  maxPoints: number;
  weight: string;
  formula: string;
  formulaCode: string;
  sortOrder: number;
  version: number;
  isActive: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'devam', label: 'Devam ve Mesai' },
  { value: 'checklist', label: 'Günlük Checklist' },
  { value: 'gorev', label: 'Görev Tamamlama' },
  { value: 'musteri', label: 'Müşteri Memnuniyeti' },
  { value: 'yonetici', label: 'Yönetici Değerlendirmesi' },
  { value: 'satis', label: 'Satış Performansı' },
  { value: 'kalite', label: 'Kalite Skoru' },
  { value: 'egitim', label: 'Eğitim Tamamlama' },
];

const FORMULA_CODES = [
  { value: 'pdks_compliance', label: 'PDKS uyum oranı' },
  { value: 'checklist_completion', label: 'Checklist tamamlama oranı' },
  { value: 'task_completion', label: 'Görev tamamlama oranı' },
  { value: 'customer_satisfaction', label: 'Müşteri memnuniyeti (NPS)' },
  { value: 'manager_evaluation', label: 'Yönetici puanlaması' },
  { value: 'sales_target', label: 'Satış hedefi yakalama' },
  { value: 'quality_audit', label: 'Kalite denetim skoru' },
  { value: 'training_completion', label: 'Eğitim tamamlama' },
  { value: 'custom', label: 'Özel formül (manuel)' },
];

export default function SkorParametreleri() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);

  const [editingParam, setEditingParam] = useState<ScoreParameter | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [reason, setReason] = useState('');
  // Sprint 15: Yeni kriter form state
  const [newParam, setNewParam] = useState<Partial<ScoreParameter>>({
    category: 'devam',
    maxPoints: 10,
    weight: '1.0',
    sortOrder: 100,
  });

  const { data, isLoading, refetch } = useQuery<{ parameters: ScoreParameter[]; totalMaxPoints: number }>({
    queryKey: ['/api/score-parameters'],
  });

  const params = data?.parameters || [];
  const totalMax = data?.totalMaxPoints || 0;

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest('POST', '/api/score-parameters', body),
    onSuccess: () => {
      toast({ title: '✓ Parametre eklendi', description: 'Toplam max puan güncellendi' });
      refetch();
      setIsAddOpen(false);
      // Reset form
      setNewParam({ category: 'devam', maxPoints: 10, weight: '1.0', sortOrder: 100 });
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => apiRequest('PUT', `/api/score-parameters/${editingParam?.id}`, body),
    onSuccess: () => {
      toast({ title: 'Parametre güncellendi (yeni versiyon kayıtlı)' });
      refetch();
      setEditingParam(null);
      setReason('');
    },
    onError: (e: any) => toast({ title: 'Hata', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/score-parameters/${id}`),
    onSuccess: () => {
      toast({ title: 'Parametre pasifleştirildi' });
      refetch();
    },
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-bold">Yetki Yok</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Skor parametrelerini düzenlemek için <strong>admin/CEO</strong> yetkisi gerekli.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4 pb-20">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                Skor Parametreleri
              </CardTitle>
              <CardDescription>
                Performans skor kriterleri ve ağırlıkları (admin)
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-param">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kriter
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Toplam */}
      <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Toplam Maksimum Puan</div>
            <div className="text-xs text-muted-foreground">Tüm aktif kriterlerin toplamı</div>
          </div>
          <div className="text-3xl font-bold text-purple-600">{totalMax}</div>
        </CardContent>
      </Card>

      {/* Parametre Listesi */}
      {isLoading ? (
        <div className="p-8 text-center">Yükleniyor...</div>
      ) : (
        <div className="space-y-3">
          {params.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{p.displayName}</h3>
                      <Badge variant="outline" className="text-xs">v{p.version}</Badge>
                      <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Formül: {p.formula}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{p.maxPoints}</div>
                      <div className="text-xs text-muted-foreground">puan max</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingParam(p)}
                      data-testid={`button-edit-${p.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm(`"${p.displayName}" parametresini pasifleştirmek istiyor musunuz?`)) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                      data-testid={`button-delete-${p.id}`}
                    >
                      <Trash className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingParam} onOpenChange={(o) => !o && setEditingParam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kriteri Düzenle</DialogTitle>
            <DialogDescription>
              Yeni versiyon olarak kaydedilecek. Eski versiyon audit için saklanır.
            </DialogDescription>
          </DialogHeader>
          {editingParam && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Görüntüleme Adı</Label>
                <Input 
                  value={editingParam.displayName}
                  onChange={(e) => setEditingParam({...editingParam, displayName: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs">Açıklama</Label>
                <Textarea 
                  value={editingParam.description || ''}
                  onChange={(e) => setEditingParam({...editingParam, description: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Max Puan</Label>
                  <Input 
                    type="number"
                    value={editingParam.maxPoints}
                    onChange={(e) => setEditingParam({...editingParam, maxPoints: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ağırlık (1.0 = normal)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={editingParam.weight}
                    onChange={(e) => setEditingParam({...editingParam, weight: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Formül</Label>
                <Input 
                  value={editingParam.formula || ''}
                  onChange={(e) => setEditingParam({...editingParam, formula: e.target.value})}
                  placeholder="örn: PDKS uyum oranı × 20"
                />
              </div>
              <div>
                <Label className="text-xs">Değişiklik Sebebi (audit için)</Label>
                <Textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Neden değiştiriliyor?"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingParam(null)}>İptal</Button>
            <Button 
              onClick={() => updateMutation.mutate({ ...editingParam, reason })}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Yeni Versiyon Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog (Sprint 15: Full form) */}
      <Dialog open={isAddOpen} onOpenChange={(o) => { 
        setIsAddOpen(o); 
        if (!o) setNewParam({ category: 'devam', maxPoints: 10, weight: '1.0', sortOrder: (params.length + 1) * 10 });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kriter Ekle</DialogTitle>
            <DialogDescription>
              Bu kriter tüm aktif kriterlerin yanına eklenir. Toplam max puan değişir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Kategori *</Label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={newParam.category || 'devam'}
                onChange={(e) => setNewParam({...newParam, category: e.target.value})}
                data-testid="select-new-category"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Görüntüleme Adı *</Label>
              <Input 
                value={newParam.displayName || ''}
                onChange={(e) => setNewParam({...newParam, displayName: e.target.value})}
                placeholder="Örn: Üretkenlik"
                data-testid="input-new-display-name"
              />
            </div>
            <div>
              <Label className="text-xs">Açıklama</Label>
              <Textarea 
                value={newParam.description || ''}
                onChange={(e) => setNewParam({...newParam, description: e.target.value})}
                rows={2}
                placeholder="Bu kriter ne ölçüyor?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max Puan *</Label>
                <Input 
                  type="number"
                  min="1"
                  max="100"
                  value={newParam.maxPoints || 10}
                  onChange={(e) => setNewParam({...newParam, maxPoints: Number(e.target.value)})}
                  data-testid="input-new-max-points"
                />
              </div>
              <div>
                <Label className="text-xs">Ağırlık</Label>
                <Input 
                  type="number"
                  step="0.1"
                  value={newParam.weight || '1.0'}
                  onChange={(e) => setNewParam({...newParam, weight: e.target.value})}
                  data-testid="input-new-weight"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Formül Kodu *</Label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={newParam.formulaCode || ''}
                onChange={(e) => setNewParam({...newParam, formulaCode: e.target.value})}
                data-testid="select-new-formula-code"
              >
                <option value="">Seçin...</option>
                {FORMULA_CODES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Formül Açıklaması (insan-okur)</Label>
              <Input 
                value={newParam.formula || ''}
                onChange={(e) => setNewParam({...newParam, formula: e.target.value})}
                placeholder="Örn: Üretkenlik puanı × max_points"
              />
            </div>
            <div>
              <Label className="text-xs">Sıralama (UI'da)</Label>
              <Input 
                type="number"
                value={newParam.sortOrder || (params.length + 1) * 10}
                onChange={(e) => setNewParam({...newParam, sortOrder: Number(e.target.value)})}
                placeholder="100, 200, 300..."
              />
            </div>
            <div>
              <Label className="text-xs">Hangi Rollere Uygulanır (boş=hepsine)</Label>
              <Input 
                value={newParam.applicableRoles || ''}
                onChange={(e) => setNewParam({...newParam, applicableRoles: e.target.value})}
                placeholder="barista,bar_buddy,supervisor (CSV)"
              />
            </div>

            {/* Önizleme */}
            <Card className="bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="p-2 text-xs">
                <strong>Önizleme:</strong>
                <div>{newParam.displayName || '(ad gir)'} - {newParam.maxPoints || 0} puan</div>
                <div className="text-muted-foreground">
                  Yeni toplam: {(data?.totalMaxPoints || 0) + (newParam.maxPoints || 0)} puan
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>İptal</Button>
            <Button 
              onClick={() => {
                if (!newParam.displayName || !newParam.maxPoints || !newParam.formulaCode) {
                  toast({ title: 'Eksik alan', description: 'Ad, Max Puan ve Formül Kodu zorunlu', variant: 'destructive' });
                  return;
                }
                createMutation.mutate(newParam);
              }}
              disabled={createMutation.isPending || !newParam.displayName || !newParam.maxPoints || !newParam.formulaCode}
              data-testid="button-confirm-add-param"
            >
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bilgilendirme */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <CardContent className="p-3 text-xs">
          <strong>ℹ️ Skor Sistemi:</strong>
          <p className="text-muted-foreground mt-1">
            • Her kriter ayrı satırda · max_points × weight = etkisi<br/>
            • Toplam max puan = aktif tüm kriterlerin maxPoints toplamı<br/>
            • Personel skoru = puan_kazanılan / toplam_max × 100 (yüzde)<br/>
            • Düzenleme yeni versiyon olarak kaydedilir, history kayıtlı (audit)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
