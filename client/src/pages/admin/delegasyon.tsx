import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit, ArrowRightLeft, Info,
  Clock, Shield, AlertTriangle, CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ModuleDelegation {
  id: number;
  moduleKey: string;
  moduleName: string;
  fromRole: string;
  toRole: string;
  delegationType: string;
  isActive: boolean;
  expiresAt: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const DELEGATABLE_MODULES = [
  { key: 'crm_teknik',    label: 'CRM — Teknik Destek',    fromRole: 'teknik_sorumlu' },
  { key: 'crm_lojistik',  label: 'CRM — Lojistik',         fromRole: 'satinalma' },
  { key: 'crm_muhasebe',  label: 'CRM — Muhasebe',         fromRole: 'muhasebe_ik' },
  { key: 'crm_marketing', label: 'CRM — Marketing',        fromRole: 'cgo' },
  { key: 'crm_hr',        label: 'CRM — İK',               fromRole: 'muhasebe_ik' },
  { key: 'akademi',       label: 'Akademi Yönetimi',       fromRole: 'coach' },
  { key: 'raporlar',      label: 'Raporlar',               fromRole: 'muhasebe_ik' },
];

const TARGET_ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'ceo', label: 'CEO' },
  { key: 'cgo', label: 'CGO' },
  { key: 'coach', label: 'Coach' },
  { key: 'trainer', label: 'Trainer' },
  { key: 'teknik_sorumlu', label: 'Teknik Sorumlu' },
  { key: 'satinalma', label: 'Satınalma' },
  { key: 'muhasebe_ik', label: 'Muhasebe/İK' },
  { key: 'kalite_kontrol', label: 'Kalite Kontrol' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', ceo: 'CEO', cgo: 'CGO', coach: 'Coach', trainer: 'Trainer',
  teknik_sorumlu: 'Teknik Sorumlu', satinalma: 'Satınalma', muhasebe_ik: 'Muhasebe/İK',
  kalite_kontrol: 'Kalite Kontrol', muhasebe: 'Muhasebe', ik: 'İK',
};

export default function AdminDelegasyon() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formModuleKey, setFormModuleKey] = useState('');
  const [formToRole, setFormToRole] = useState('');
  const [formType, setFormType] = useState<'gecici' | 'kalici'>('gecici');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formNote, setFormNote] = useState('');

  const { data: delegations = [], isLoading } = useQuery<ModuleDelegation[]>({
    queryKey: ['/api/delegations'],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const mod = DELEGATABLE_MODULES.find(m => m.key === formModuleKey);
      if (!mod) throw new Error('Invalid module');
      return apiRequest("POST", "/api/delegations", {
        moduleKey: mod.key,
        moduleName: mod.label,
        fromRole: mod.fromRole,
        toRole: formToRole,
        delegationType: formType,
        expiresAt: formType === 'gecici' && formExpiresAt ? formExpiresAt : null,
        note: formNote || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Delegasyon oluşturuldu" });
      qc.invalidateQueries({ queryKey: ['/api/delegations'] });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "Delegasyon oluşturulamadı", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/delegations/${id}`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/delegations'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error('No editing ID');
      return apiRequest("PATCH", `/api/delegations/${editingId}`, {
        toRole: formToRole,
        expiresAt: formType === 'gecici' && formExpiresAt ? formExpiresAt : null,
        note: formNote || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Delegasyon g\u00fcncellendi" });
      qc.invalidateQueries({ queryKey: ['/api/delegations'] });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "G\u00fcncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/delegations/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Delegasyon silindi" });
      qc.invalidateQueries({ queryKey: ['/api/delegations'] });
    },
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormModuleKey('');
    setFormToRole('');
    setFormType('gecici');
    setFormExpiresAt('');
    setFormNote('');
  }

  const selectedModule = DELEGATABLE_MODULES.find(m => m.key === formModuleKey);
  const alreadyDelegated = delegations.filter(d => d.isActive).map(d => d.moduleKey);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl" data-testid="admin-delegasyon-page">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-delegasyon-title">Modül Delegasyonu</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modül sorumluluklarını geçici veya kalıcı olarak başka rollere devredin
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-delegation">
          <Plus className="h-4 w-4 mr-1.5" />
          Yeni Delegasyon
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-md" />)}
        </div>
      ) : delegations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">Henüz delegasyon yok</p>
            <p className="text-xs text-muted-foreground mt-1">Modül sorumluluklarını devretmek için yukarıdaki butonu kullanın</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="delegation-list">
          {delegations.map((del) => {
            const isExpired = del.delegationType === 'gecici' && del.expiresAt && new Date(del.expiresAt) < new Date();
            return (
              <Card key={del.id} className={cn(!del.isActive && "opacity-60")} data-testid={`delegation-item-${del.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold" data-testid={`text-delegation-module-${del.id}`}>
                          {del.moduleName}
                        </span>
                        <Badge variant={del.delegationType === 'kalici' ? 'default' : 'secondary'} className="text-[10px]">
                          {del.delegationType === 'kalici' ? 'Kalıcı' : 'Geçici'}
                        </Badge>
                        {!del.isActive && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Pasif</Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive" className="text-[10px]">Süresi Doldu</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{ROLE_LABELS[del.fromRole] ?? del.fromRole}</span>
                        <ArrowRightLeft className="w-3 h-3" />
                        <span className="font-medium text-foreground">{ROLE_LABELS[del.toRole] ?? del.toRole}</span>
                        {del.expiresAt && (
                          <span className="ml-2">
                            · Bitiş: {new Date(del.expiresAt).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                      {del.note && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{del.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={del.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: del.id, isActive: checked })}
                        data-testid={`switch-delegation-${del.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(del.id);
                          setFormModuleKey(del.moduleKey);
                          setFormToRole(del.toRole);
                          setFormType(del.delegationType as 'gecici' | 'kalici');
                          setFormExpiresAt(del.expiresAt ? del.expiresAt.split('T')[0] : '');
                          setFormNote(del.note ?? '');
                          setShowForm(true);
                        }}
                        data-testid={`button-edit-delegation-${del.id}`}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Bu delegasyonu silmek istediğinize emin misiniz?')) {
                            deleteMutation.mutate(del.id);
                          }
                        }}
                        data-testid={`button-delete-delegation-${del.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Delegasyon Kuralları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" />
            <span><strong>Veri bütünlüğü:</strong> Tüm ticket geçmişi erişilebilir kalır, veri kaybı olmaz</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <span><strong>Geçici devir:</strong> Bitiş tarihinde otomatik olarak etkisiz hale gelir</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
            <span><strong>Çakışma:</strong> Aynı modül aynı anda yalnızca bir role devredilebilir</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
            <span><strong>Görünürlük:</strong> Devredilen modül hedef rolün dashboard'unda görünür</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent className="max-w-md" data-testid="delegation-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Delegasyon D\u00fczenle' : 'Yeni Delegasyon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Modül</Label>
              <Select value={formModuleKey} onValueChange={setFormModuleKey} disabled={!!editingId}>
                <SelectTrigger data-testid="select-module">
                  <SelectValue placeholder="Modül seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {DELEGATABLE_MODULES.map(m => (
                    <SelectItem
                      key={m.key}
                      value={m.key}
                      disabled={alreadyDelegated.includes(m.key)}
                    >
                      {m.label} {alreadyDelegated.includes(m.key) ? '(zaten devredildi)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModule && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                Mevcut sorumlu: <strong>{ROLE_LABELS[selectedModule.fromRole] ?? selectedModule.fromRole}</strong>
              </div>
            )}

            <div>
              <Label className="text-xs">Hedef Rol</Label>
              <Select value={formToRole} onValueChange={setFormToRole}>
                <SelectTrigger data-testid="select-target-role">
                  <SelectValue placeholder="Devredilecek rol..." />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.filter(r => r.key !== selectedModule?.fromRole).map(r => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tip</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={formType === 'gecici' ? 'default' : 'outline'}
                  onClick={() => setFormType('gecici')}
                  className="toggle-elevate"
                  data-testid="button-type-gecici"
                >
                  Geçici
                </Button>
                <Button
                  size="sm"
                  variant={formType === 'kalici' ? 'default' : 'outline'}
                  onClick={() => setFormType('kalici')}
                  className="toggle-elevate"
                  data-testid="button-type-kalici"
                >
                  Kalıcı
                </Button>
              </div>
            </div>

            {formType === 'gecici' && (
              <div>
                <Label className="text-xs">Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-expires-at"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Not (opsiyonel)</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Delegasyon sebebi..."
                data-testid="input-delegation-note"
              />
            </div>

            {selectedModule && formToRole && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3" data-testid="delegation-preview">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Önizleme</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  <strong>{selectedModule.label}</strong> modülü{' '}
                  <strong>{ROLE_LABELS[selectedModule.fromRole] ?? selectedModule.fromRole}</strong> rolünden{' '}
                  <strong>{ROLE_LABELS[formToRole] ?? formToRole}</strong> rolüne{' '}
                  {formType === 'kalici' ? 'kalıcı olarak' : `geçici olarak${formExpiresAt ? ` (${new Date(formExpiresAt).toLocaleDateString('tr-TR')} tarihine kadar)` : ''}`}{' '}
                  devredilecek.
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => editingId ? editMutation.mutate() : createMutation.mutate()}
              disabled={!formModuleKey || !formToRole || createMutation.isPending || editMutation.isPending}
              data-testid="button-submit-delegation"
            >
              {(createMutation.isPending || editMutation.isPending)
                ? (editingId ? 'G\u00fcncelleniyor...' : 'Olu\u015fturuluyor...')
                : (editingId ? 'Delegasyonu G\u00fcncelle' : 'Delegasyonu Olu\u015ftur')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
