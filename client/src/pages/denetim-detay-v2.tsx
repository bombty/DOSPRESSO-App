import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSkeleton } from "@/components/list-skeleton";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, Star, Send,
  Plus, User, Shield, MessageSquare, Lock, Calendar, Flag, Target
} from "lucide-react";
import { format, differenceInDays, differenceInHours, isPast } from "date-fns";
import { tr } from "date-fns/locale";

function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 75) return "text-amber-600 dark:text-amber-400";
  if (score >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

const statusLabels: Record<string, { label: string; color: string }> = {
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500" },
  completed: { label: "Tamamlandı", color: "bg-green-500" },
  pending_actions: { label: "Aksiyonlar Bekliyor", color: "bg-amber-500" },
  closed: { label: "Kapandı", color: "bg-slate-500" },
  cancelled: { label: "İptal", color: "bg-red-500" },
};

const actionStatusLabels: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Açık", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  in_progress: { label: "Devam", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  resolved: { label: "Çözüldü", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: CheckCircle2 },
  verified: { label: "Onaylandı", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Shield },
  overdue: { label: "Gecikmiş", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "text-slate-500" },
  medium: { label: "Orta", color: "text-blue-500" },
  high: { label: "Yüksek", color: "text-orange-500" },
  urgent: { label: "Acil", color: "text-red-500" },
};

export default function DenetimDetayV2() {
  const params = useParams();
  const auditId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [actionForm, setActionForm] = useState({ title: "", description: "", assignedToId: "", priority: "medium", deadline: "", slaHours: 72 });
  const [resolveActionId, setResolveActionId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  // ─── Queries ────────────────────────────────────────────
  const { data: audit, isLoading } = useQuery<any>({
    queryKey: ["/api/v2/audits", auditId],
    enabled: !!auditId,
  });

  const { data: branchStaff } = useQuery<any[]>({
    queryKey: ["/api/v2/branch-on-shift", audit?.branchId],
    enabled: !!audit?.branchId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/v2/audits", auditId] });

  // ─── Mutations ──────────────────────────────────────────
  const addActionMut = useMutation({
    mutationFn: async (data: typeof actionForm) => (await apiRequest("POST", `/api/v2/audits/${auditId}/actions`, data)).json(),
    onSuccess: () => { invalidate(); setIsAddActionOpen(false); setActionForm({ title: "", description: "", assignedToId: "", priority: "medium", deadline: "", slaHours: 72 }); toast({ title: "Aksiyon oluşturuldu" }); },
  });

  const updateActionMut = useMutation({
    mutationFn: async ({ id, ...data }: any) => (await apiRequest("PATCH", `/api/v2/audit-actions/${id}`, data)).json(),
    onSuccess: () => { invalidate(); setResolveActionId(null); setResolveNote(""); toast({ title: "Aksiyon güncellendi" }); },
  });

  const closeAuditMut = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", `/api/v2/audits/${auditId}/close`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Denetim kapatıldı" }); },
    onError: (err: any) => toast({ title: "Hata", description: err?.message || "Açık aksiyonlar var", variant: "destructive" }),
  });

  // ─── Loading ────────────────────────────────────────────
  if (isLoading) return <div className="p-4"><ListSkeleton count={6} variant="card" showHeader /></div>;
  if (!audit) return <div className="p-4 text-center text-muted-foreground">Denetim bulunamadı</div>;

  const status = statusLabels[audit.status] || statusLabels.in_progress;
  const totalScore = Number(audit.totalScore || 0);
  const personnelScore = Number(audit.personnelScore || 0);
  const actions = audit.actions || [];
  const openActionCount = actions.filter((a: any) => a.status === 'open' || a.status === 'in_progress').length;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/coach-sube-denetim")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">Denetim — {audit.branchName}</h1>
          <p className="text-xs text-muted-foreground">
            {audit.auditorName} · {audit.startedAt ? format(new Date(audit.startedAt), "d MMM yyyy HH:mm", { locale: tr }) : ''}
          </p>
        </div>
        <Badge className={`${status.color} text-white`}>{status.label}</Badge>
        <span className={`text-2xl font-bold ${getScoreColor(totalScore)}`}>{totalScore}</span>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Genel Skor</p>
            <p className={`text-xl font-bold ${getScoreColor(totalScore)}`}>{totalScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Personel</p>
            <p className={`text-xl font-bold ${getScoreColor(personnelScore)}`}>{personnelScore > 0 ? personnelScore.toFixed(0) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Aksiyonlar</p>
            <p className={`text-xl font-bold ${openActionCount > 0 ? 'text-amber-500' : 'text-green-500'}`}>{openActionCount}/{actions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Uyum</p>
            <p className={`text-xl font-bold ${getScoreColor(Number(audit.actionComplianceScore || 100))}`}>
              {audit.actionComplianceScore ? `${Number(audit.actionComplianceScore).toFixed(0)}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scores">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="scores" className="text-xs sm:text-sm">Skorlar</TabsTrigger>
          <TabsTrigger value="personnel" className="text-xs sm:text-sm">Personel ({audit.personnel?.length || 0})</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm">
            Aksiyonlar ({actions.length})
            {openActionCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4">{openActionCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── Skorlar Tab ─── */}
        <TabsContent value="scores" className="mt-4 space-y-3">
          {audit.categoryScores?.map((cs: any) => (
            <Card key={cs.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{cs.categoryName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">%{cs.weight}</Badge>
                    <span className={`font-bold ${getScoreColor(Number(cs.score))}`}>{Number(cs.score).toFixed(0)}</span>
                  </div>
                </div>
                <Progress value={Number(cs.score)} className="h-1.5" />
              </CardContent>
            </Card>
          ))}
          {(!audit.categoryScores || audit.categoryScores.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Kategori skoru bulunamadı</p>
          )}
        </TabsContent>

        {/* ─── Personel Tab ─── */}
        <TabsContent value="personnel" className="mt-4 space-y-3">
          {audit.personnel?.map((p: any) => {
            const pScore = Number(p.overallScore || 0);
            return (
              <Card key={p.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.firstName} {p.lastName || ''}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</p>
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(pScore)}`}>{pScore.toFixed(0)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {[
                      { label: "Kıyafet", score: p.dressCodeScore },
                      { label: "Hijyen", score: p.hygieneScore },
                      { label: "Müşteri", score: p.customerCareScore },
                      { label: "Güler Yüz", score: p.friendlinessScore },
                    ].map((dim, i) => (
                      <div key={i}>
                        <p className="text-muted-foreground">{dim.label}</p>
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= (dim.score || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground mt-2 italic">{p.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
          {(!audit.personnel || audit.personnel.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Personel denetimi yapılmamış</p>
          )}
        </TabsContent>

        {/* ─── Aksiyonlar Tab ─── */}
        <TabsContent value="actions" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-muted-foreground">Aksiyon Maddeleri</h3>
            {(audit.status === 'completed' || audit.status === 'pending_actions') && (
              <Button size="sm" onClick={() => setIsAddActionOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Aksiyon Ekle
              </Button>
            )}
          </div>

          {actions.map((action: any) => {
            const as = actionStatusLabels[action.status] || actionStatusLabels.open;
            const ActionIcon = as.icon;
            const isOverdue = action.deadline && isPast(new Date(action.deadline)) && !['verified', 'resolved'].includes(action.status);
            const daysLeft = action.deadline ? differenceInDays(new Date(action.deadline), new Date()) : null;
            const pri = priorityLabels[action.priority] || priorityLabels.medium;

            return (
              <Card key={action.id} className={isOverdue ? 'border-red-300 dark:border-red-800' : ''}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{action.title}</p>
                      {action.description && <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>}
                    </div>
                    <Badge className={as.color}><ActionIcon className="h-3 w-3 mr-1" />{as.label}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {action.assignedName && (
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{action.assignedName}</span>
                    )}
                    {action.deadline && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(action.deadline), "d MMM", { locale: tr })}
                        {daysLeft !== null && !isOverdue && daysLeft <= 3 && ` (${daysLeft} gün kaldı)`}
                        {isOverdue && ` (${Math.abs(daysLeft!)} gün gecikmiş!)`}
                      </span>
                    )}
                    <span className={pri.color}><Flag className="h-3 w-3 inline mr-0.5" />{pri.label}</span>
                    {action.slaBreached && <Badge variant="destructive" className="text-[10px]">SLA İhlali</Badge>}
                  </div>

                  {/* Resolution info */}
                  {action.resolvedNote && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded text-xs">
                      <p className="font-medium text-green-700 dark:text-green-400">Çözüm Notu:</p>
                      <p className="text-muted-foreground">{action.resolvedNote}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {action.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => updateActionMut.mutate({ id: action.id, status: 'in_progress' })}>
                        Başla
                      </Button>
                    )}
                    {(action.status === 'open' || action.status === 'in_progress') && (
                      <Button variant="outline" size="sm" onClick={() => { setResolveActionId(action.id); setResolveNote(""); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Çöz
                      </Button>
                    )}
                    {action.status === 'resolved' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateActionMut.mutate({ id: action.id, status: 'verified' })}>
                        <Shield className="h-3 w-3 mr-1" /> Onayla
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {actions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Henüz aksiyon maddesi yok</p>
          )}

          {/* Close Audit Button */}
          {audit.status === 'pending_actions' && openActionCount === 0 && (
            <Button className="w-full" onClick={() => closeAuditMut.mutate()} disabled={closeAuditMut.isPending}>
              <Lock className="h-4 w-4 mr-1" /> {closeAuditMut.isPending ? "Kapatılıyor..." : "Denetimi Kapat"}
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Add Action Dialog ─── */}
      <Dialog open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Aksiyon Maddesi</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Başlık *</Label>
              <Input value={actionForm.title} onChange={e => setActionForm({ ...actionForm, title: e.target.value })} placeholder="Eksiklik veya düzeltme başlığı" />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} placeholder="Detaylı açıklama" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sorumlu</Label>
                <Select value={actionForm.assignedToId} onValueChange={v => setActionForm({ ...actionForm, assignedToId: v })}>
                  <SelectTrigger><SelectValue placeholder="Kişi seçin" /></SelectTrigger>
                  <SelectContent>
                    {branchStaff?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName || ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Öncelik</Label>
                <Select value={actionForm.priority} onValueChange={v => setActionForm({ ...actionForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Son Tarih *</Label>
                <Input type="date" value={actionForm.deadline} onChange={e => setActionForm({ ...actionForm, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>SLA (saat)</Label>
                <Input type="number" min={1} value={actionForm.slaHours} onChange={e => setActionForm({ ...actionForm, slaHours: parseInt(e.target.value) || 72 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddActionOpen(false)}>İptal</Button>
            <Button onClick={() => {
              if (!actionForm.title.trim() || !actionForm.deadline) { toast({ title: "Başlık ve tarih gerekli", variant: "destructive" }); return; }
              addActionMut.mutate(actionForm);
            }} disabled={addActionMut.isPending}>
              {addActionMut.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Resolve Action Dialog ─── */}
      <Dialog open={resolveActionId !== null} onOpenChange={open => { if (!open) setResolveActionId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aksiyon Çözümü</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Çözüm Notu *</Label>
              <Textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Yapılan düzeltme / çözüm açıklaması" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveActionId(null)}>İptal</Button>
            <Button onClick={() => {
              if (!resolveNote.trim()) { toast({ title: "Çözüm notu gerekli", variant: "destructive" }); return; }
              updateActionMut.mutate({ id: resolveActionId, status: 'resolved', resolvedNote: resolveNote });
            }} disabled={updateActionMut.isPending}>
              Çözüldü Olarak İşaretle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
