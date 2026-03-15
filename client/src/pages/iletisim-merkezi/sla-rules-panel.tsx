import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Pencil, Check, X } from 'lucide-react';
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
      toast({ title: 'Hata', description: 'Guncelleme basarisiz', variant: 'destructive' });
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

      <div className="space-y-5">
        {Object.entries(DEPT_LABELS).map(([dept, deptLabel]) => {
          const deptRules = grouped[dept] ?? [];
          if (!deptRules.length) return null;

          return (
            <div key={dept} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`sla-dept-${dept}`}>
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#122549] text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
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
                          className="text-[9px] font-semibold border-0 px-2"
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
                            <span className="text-[10px] text-muted-foreground">
                              ({rule.hoursLimit >= 24
                                ? `${Math.floor(rule.hoursLimit / 24)} gun${rule.hoursLimit % 24 > 0 ? ` ${rule.hoursLimit % 24}s` : ''}`
                                : `${rule.hoursLimit} saat`})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block w-20 text-right">
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
