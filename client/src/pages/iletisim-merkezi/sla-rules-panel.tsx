import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Pencil, Check, X, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DEPT_LABELS: Record<string, string> = {
  teknik: 'Teknik Destek',
  lojistik: 'Lojistik',
  muhasebe: 'Muhasebe',
  marketing: 'Marketing',
  trainer: 'Egitim',
  hr: 'IK',
};

const DEPT_ICONS: Record<string, string> = {
  teknik: 'T',
  lojistik: 'L',
  muhasebe: 'M',
  marketing: 'MK',
  trainer: 'E',
  hr: 'IK',
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  kritik: { label: 'Kritik', color: '#dc2626' },
  yuksek: { label: 'Yuksek', color: '#f97316' },
  normal: { label: 'Normal', color: '#f59e0b' },
  dusuk: { label: 'Dusuk', color: '#94a3b8' },
};

const PRIORITY_ORDER = ['kritik', 'yuksek', 'normal', 'dusuk'];

interface SlaRule {
  id: number;
  department: string;
  priority: string;
  hoursLimit: number;
  isActive: boolean;
  updatedAt: string;
  hours_limit?: number;
  is_active?: boolean;
  updated_at?: string;
}

function normalizeRule(r: SlaRule): SlaRule {
  return {
    ...r,
    hoursLimit: r.hoursLimit ?? r.hours_limit ?? 0,
    isActive: r.isActive ?? r.is_active ?? true,
    updatedAt: r.updatedAt ?? r.updated_at ?? '',
  };
}

interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  workDays: number[];
  timezone: string;
}

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Car' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 7, label: 'Paz' },
];

function BusinessHoursSection({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState(8);
  const [editEnd, setEditEnd] = useState(18);
  const [editDays, setEditDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const { data: config, isLoading } = useQuery<BusinessHoursConfig>({
    queryKey: ['/api/iletisim/business-hours'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { startHour: number; endHour: number; workDays: number[] }) => {
      const res = await apiRequest('PATCH', '/api/iletisim/business-hours', data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/iletisim/business-hours'] });
      setEditing(false);
      toast({ title: 'Mesai saatleri guncellendi' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Güncelleme basarisiz', variant: 'destructive' });
    },
  });

  const startEdit = () => {
    if (config) {
      setEditStart(config.startHour);
      setEditEnd(config.endHour);
      setEditDays([...config.workDays]);
    }
    setEditing(true);
  };

  const toggleDay = (day: number) => {
    setEditDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="business-hours-section">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Mesai Saatleri</span>
        </div>
        {isAdmin && !editing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={startEdit}
            data-testid="button-edit-business-hours"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Duzenle
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Baslangic:</span>
                <select
                  value={editStart}
                  onChange={(e) => setEditStart(parseInt(e.target.value))}
                  className="text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground outline-none"
                  data-testid="select-start-hour"
                >
                  {hours.map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bitis:</span>
                <select
                  value={editEnd}
                  onChange={(e) => setEditEnd(parseInt(e.target.value))}
                  className="text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground outline-none"
                  data-testid="select-end-hour"
                >
                  {hours.filter(h => h > 0).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground mb-2 block">Calisma Gunleri:</span>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors',
                      editDays.includes(d.value)
                        ? 'border-[#122549] bg-[#122549] text-white'
                        : 'border-border bg-transparent text-muted-foreground'
                    )}
                    data-testid={`toggle-day-${d.value}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  if (editStart >= editEnd) {
                    toast({ title: 'Hata', description: 'Baslangic saati bitis saatinden kucuk olmali', variant: 'destructive' });
                    return;
                  }
                  if (editDays.length === 0) {
                    toast({ title: 'Hata', description: 'En az bir calisma gunu secin', variant: 'destructive' });
                    return;
                  }
                  updateMutation.mutate({ startHour: editStart, endHour: editEnd, workDays: editDays });
                }}
                disabled={updateMutation.isPending}
                data-testid="button-save-business-hours"
              >
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                Kaydet
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} data-testid="button-cancel-business-hours">
                <X className="w-3.5 h-3.5 mr-1.5" />
                Iptal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Saat:</span>
              <span className="text-sm font-bold text-foreground">
                {String(config?.startHour ?? 8).padStart(2, '0')}:00 — {String(config?.endHour ?? 18).padStart(2, '0')}:00
              </span>
              <Badge variant="outline" className="text-xs">
                {(config?.endHour ?? 18) - (config?.startHour ?? 8)} saat/gun
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Gunler:</span>
              <div className="flex gap-1">
                {DAY_LABELS.map(d => (
                  <span
                    key={d.value}
                    className={cn(
                      'text-xs font-semibold px-1.5 py-0.5 rounded',
                      (config?.workDays ?? [1, 2, 3, 4, 5]).includes(d.value)
                        ? 'bg-[#122549] text-white'
                        : 'bg-muted text-muted-foreground/50'
                    )}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Zaman Dilimi:</span>
              <span className="text-xs text-foreground">{config?.timezone ?? 'Europe/Istanbul'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SlaRulesPanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data: rawRules = [], isLoading } = useQuery<SlaRule[]>({
    queryKey: ['/api/iletisim/sla-rules'],
  });

  const rules = rawRules.map(normalizeRule);

  const updateMutation = useMutation({
    mutationFn: async ({ id, hoursLimit }: { id: number; hoursLimit: number }) => {
      const res = await apiRequest('PATCH', `/api/iletisim/sla-rules/${id}`, { hoursLimit });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/iletisim/sla-rules'] });
      setEditingId(null);
      toast({ title: 'SLA kurali guncellendi' });
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Güncelleme basarisiz', variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/iletisim/sla-rules/reset');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/iletisim/sla-rules'] });
      toast({ title: 'SLA kurallari varsayilana sifirlandi' });
    },
  });

  const grouped = rules.reduce((acc, rule) => {
    if (!acc[rule.department]) acc[rule.department] = [];
    acc[rule.department].push(rule);
    return acc;
  }, {} as Record<string, SlaRule[]>);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid="sla-rules-panel">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-foreground" data-testid="text-sla-title">SLA Kurallari</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Departman ve oncelik bazli yanit sureleri (saat cinsinden)
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            data-testid="button-reset-sla"
          >
            {resetMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
            Varsayilana Sifirla
          </Button>
        )}
      </div>

      <BusinessHoursSection isAdmin={isAdmin} />

      <div className="space-y-5 mt-5">
        {Object.entries(DEPT_LABELS).map(([dept, deptLabel]) => {
          const deptRules = grouped[dept] ?? [];
          if (!deptRules.length) return null;

          return (
            <div key={dept} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`sla-dept-${dept}`}>
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#122549] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {DEPT_ICONS[dept]}
                </div>
                <span className="text-sm font-bold text-foreground">{deptLabel}</span>
              </div>
              <div className="divide-y divide-border">
                {PRIORITY_ORDER.map(priority => {
                  const rule = deptRules.find(r => r.priority === priority);
                  if (!rule) return null;
                  const pInfo = PRIORITY_LABELS[priority];
                  const isEditing = editingId === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center px-4 py-3 gap-3"
                      data-testid={`sla-rule-${rule.id}`}
                    >
                      <div className="w-16 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold border-0 px-2"
                          style={{ color: pInfo.color, backgroundColor: `${pInfo.color}15` }}
                        >
                          {pInfo.label}
                        </Badge>
                      </div>

                      <div className="flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              min={1}
                              max={720}
                              className="w-16 text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground outline-none focus:border-[#122549]"
                              autoFocus
                              data-testid="input-sla-hours"
                            />
                            <span className="text-xs text-muted-foreground">saat</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const val = parseInt(editValue);
                                if (val >= 1 && val <= 720) updateMutation.mutate({ id: rule.id, hoursLimit: val });
                              }}
                              disabled={updateMutation.isPending || !editValue || parseInt(editValue) < 1}
                              data-testid="button-save-sla"
                            >
                              {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              data-testid="button-cancel-sla"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {rule.hoursLimit}s
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({rule.hoursLimit >= 24
                                ? `${Math.floor(rule.hoursLimit / 24)} gun${rule.hoursLimit % 24 > 0 ? ` ${rule.hoursLimit % 24}s` : ''}`
                                : `${rule.hoursLimit} saat`})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block w-20 text-right">
                        {rule.updatedAt ? new Date(rule.updatedAt).toLocaleDateString('tr-TR') : '-'}
                      </div>

                      {isAdmin && !isEditing && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(rule.id);
                            setEditValue(rule.hoursLimit.toString());
                          }}
                          data-testid={`button-edit-sla-${rule.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
