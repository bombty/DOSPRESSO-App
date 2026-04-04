import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListSkeleton } from "@/components/list-skeleton";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import {
  ClipboardCheck, Send, Calendar, Building2, CheckSquare,
  SlidersHorizontal, History, Target, User, Star, Camera, FileText,
  ToggleLeft, ListChecks, ChevronRight, ArrowLeft, Users, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────
type Template = { id: number; name: string; description: string | null; categoryCount: number; questionCount: number };
type Category = { id: number; name: string; weight: number; questions: Question[] };
type Question = {
  id: number; categoryId: number; questionText: string; questionType: string;
  options: { label: string; score: number }[] | null; isRequired: boolean; weight: number; helpText: string | null;
};
type TemplateDetail = Template & { categories: Category[] };
type Branch = { id: number; name: string; city: string | null };
type StaffMember = { id: string; firstName: string; lastName: string; role: string; profileImageUrl: string | null };

// ─── Score helpers ────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 75) return "text-amber-600 dark:text-amber-400";
  if (score >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number) {
  if (score >= 90) return "[&>div]:bg-green-500";
  if (score >= 75) return "[&>div]:bg-amber-500";
  if (score >= 50) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

// ─── Star Rating Component ─────────────────────────────────
function StarRating({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} className="focus:outline-none">
          <Star className={`${sz} transition-colors ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function CoachSubeDenetim() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("yeni");
  const [historyBranchFilter, setHistoryBranchFilter] = useState("all");

  // ─── Step state (0=seçim, 1=form, 2=personel, 3=özet) ──
  const [step, setStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [auditId, setAuditId] = useState<number | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");

  // Response state: questionId → responseValue
  const [responses, setResponses] = useState<Record<number, { value: string; score: number }>>({});

  // Personnel state
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [personnelScores, setPersonnelScores] = useState<Record<string, { dress: number; hygiene: number; customer: number; friendly: number; notes: string }>>({});

  // ─── Queries ────────────────────────────────────────────
  const { data: templates, isLoading: tmplLoading } = useQuery<Template[]>({
    queryKey: ["/api/v2/audit-templates"],
  });
  const activeTemplates = useMemo(() => templates?.filter(t => (t as any).isActive !== false) || [], [templates]);

  const { data: templateDetail } = useQuery<TemplateDetail>({
    queryKey: ["/api/v2/audit-templates", selectedTemplateId],
    enabled: !!selectedTemplateId,
  });

  const { data: branches } = useQuery<Branch[]>({ queryKey: ["/api/branches"], staleTime: 300000 });

  const { data: branchStaff } = useQuery<StaffMember[]>({
    queryKey: ["/api/v2/branch-on-shift", selectedBranchId],
    enabled: !!selectedBranchId && step >= 2,
  });

  const { data: auditHistory } = useQuery<{ audits: any[]; total: number }>({
    queryKey: ["/api/v2/audits"],
    enabled: activeTab === "gecmis",
  });

  const filteredHistory = useMemo(() => {
    if (!auditHistory?.audits) return [];
    if (historyBranchFilter === "all") return auditHistory.audits;
    return auditHistory.audits.filter((a: any) => String(a.branchId) === historyBranchFilter);
  }, [auditHistory, historyBranchFilter]);

  // ─── Score Calculations ─────────────────────────────────
  const categoryScores = useMemo(() => {
    if (!templateDetail?.categories) return {};
    const scores: Record<number, number> = {};
    templateDetail.categories.forEach(cat => {
      const qs = cat.questions || [];
      if (qs.length === 0) { scores[cat.id] = 0; return; }
      let totalWeight = 0;
      let totalWeightedScore = 0;
      qs.forEach(q => {
        const resp = responses[q.id];
        if (resp) {
          totalWeight += q.weight;
          totalWeightedScore += resp.score * q.weight;
        } else {
          totalWeight += q.weight;
        }
      });
      scores[cat.id] = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    });
    return scores;
  }, [templateDetail, responses]);

  const overallScore = useMemo(() => {
    if (!templateDetail?.categories) return 0;
    let totalWeighted = 0;
    let totalWeight = 0;
    templateDetail.categories.forEach(cat => {
      totalWeighted += (categoryScores[cat.id] || 0) * cat.weight;
      totalWeight += cat.weight;
    });
    return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
  }, [templateDetail, categoryScores]);

  // ─── Response handler ───────────────────────────────────
  const setResponse = useCallback((questionId: number, value: string, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: { value, score } }));
  }, []);

  // ─── Mutations ──────────────────────────────────────────
  const startAuditMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/v2/audits", { templateId: selectedTemplateId, branchId: parseInt(selectedBranchId) })).json(),
    onSuccess: (data: any) => { setAuditId(data.id); setStep(1); toast({ title: "Denetim başlatıldı" }); },
    onError: () => toast({ title: "Hata", description: "Denetim başlatılamadı", variant: "destructive" }),
  });

  const submitAuditMut = useMutation({
    mutationFn: async () => {
      if (!auditId || !templateDetail) throw new Error("Denetim bilgileri eksik");

      // 1. Cevapları kaydet
      const responseList = Object.entries(responses).map(([qId, resp]) => {
        const q = templateDetail.categories.flatMap(c => c.questions).find(q => q.id === parseInt(qId));
        return {
          questionId: parseInt(qId), categoryId: q?.categoryId, questionText: q?.questionText || '',
          questionType: q?.questionType || 'checkbox', responseValue: resp.value, score: resp.score,
        };
      });

      const catScoreList = templateDetail.categories.map(cat => ({
        categoryId: cat.id, categoryName: cat.name, weight: cat.weight, score: categoryScores[cat.id] || 0,
      }));

      await apiRequest("POST", `/api/v2/audits/${auditId}/responses`, { responses: responseList, categoryScores: catScoreList });

      // 2. Personel denetimi
      if (selectedStaff.length > 0) {
        const personnelList = selectedStaff.map(uid => ({
          userId: uid,
          dressCodeScore: personnelScores[uid]?.dress || null,
          hygieneScore: personnelScores[uid]?.hygiene || null,
          customerCareScore: personnelScores[uid]?.customer || null,
          friendlinessScore: personnelScores[uid]?.friendly || null,
          notes: personnelScores[uid]?.notes || null,
        }));
        await apiRequest("POST", `/api/v2/audits/${auditId}/personnel`, { personnel: personnelList });
      }

      // 3. Tamamla
      await apiRequest("PATCH", `/api/v2/audits/${auditId}/complete`, { totalScore: overallScore, notes: generalNotes });
    },
    onSuccess: () => {
      toast({ title: "Denetim tamamlandı", description: `Genel skor: ${overallScore}/100` });
      resetForm();
      setActiveTab("gecmis");
      queryClient.invalidateQueries({ queryKey: ["/api/v2/audits"] });
    },
    onError: () => toast({ title: "Hata", description: "Denetim kaydedilemedi", variant: "destructive" }),
  });

  const resetForm = () => {
    setStep(0); setSelectedTemplateId(null); setSelectedBranchId(""); setAuditId(null);
    setResponses({}); setSelectedStaff([]); setPersonnelScores({}); setGeneralNotes("");
  };

  // ─── Loading ────────────────────────────────────────────
  if (tmplLoading) return <div className="p-4"><ListSkeleton count={3} variant="card" showHeader /></div>;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Şube Denetim</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="yeni" className="gap-1"><ClipboardCheck className="h-4 w-4" /> Yeni Denetim</TabsTrigger>
          <TabsTrigger value="gecmis" className="gap-1"><History className="h-4 w-4" /> Denetim Geçmişi</TabsTrigger>
        </TabsList>

        {/* ═══ YENİ DENETİM ═══ */}
        <TabsContent value="yeni" className="mt-4 space-y-4">

          {/* STEP 0: Şablon + Şube Seçimi */}
          {step === 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Denetim Başlat</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Denetim Şablonu *</Label>
                    <Select value={selectedTemplateId?.toString() || ""} onValueChange={v => setSelectedTemplateId(parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Şablon seçin" /></SelectTrigger>
                      <SelectContent>
                        {activeTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name} ({t.categoryCount} kategori, {t.questionCount} soru)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Hedef Şube *</Label>
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger><SelectValue placeholder="Şube seçin" /></SelectTrigger>
                      <SelectContent>
                        {branches?.map(b => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name}{b.city ? ` — ${b.city}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => startAuditMut.mutate()} disabled={!selectedTemplateId || !selectedBranchId || startAuditMut.isPending} className="w-full sm:w-auto">
                  {startAuditMut.isPending ? "Başlatılıyor..." : "Denetimi Başlat"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 1: Form Doldurma */}
          {step === 1 && templateDetail && (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                </Button>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>

              <Progress value={overallScore} className={`h-2 ${getProgressColor(overallScore)}`} />

              {/* Categories */}
              {templateDetail.categories.map(cat => (
                <Card key={cat.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" /> {cat.name}
                        <Badge variant="outline" className="text-xs">%{cat.weight}</Badge>
                      </CardTitle>
                      <span className={`text-lg font-bold ${getScoreColor(categoryScores[cat.id] || 0)}`}>
                        {categoryScores[cat.id] || 0}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cat.questions.map(q => (
                      <QuestionRenderer key={q.id} question={q} value={responses[q.id]?.value || ""} score={responses[q.id]?.score || 0} onChange={setResponse} />
                    ))}
                    {cat.questions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Bu kategoride soru yok</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>İptal</Button>
                <Button onClick={() => setStep(2)}>
                  <Users className="h-4 w-4 mr-1" /> Personel Denetimi →
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: Personel Denetimi */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Forma Dön
                </Button>
                <Badge variant="secondary">{selectedStaff.length} personel seçili</Badge>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vardiyada Olan Personeli Seçin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!branchStaff || branchStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Bu şubede kayıtlı personel bulunamadı</p>
                  ) : (
                    branchStaff.map(s => {
                      const isSelected = selectedStaff.includes(s.id);
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'}`}
                          onClick={() => {
                            if (isSelected) { setSelectedStaff(prev => prev.filter(id => id !== s.id)); }
                            else { setSelectedStaff(prev => [...prev, s.id]); setPersonnelScores(prev => ({ ...prev, [s.id]: { dress: 0, hygiene: 0, customer: 0, friendly: 0, notes: "" } })); }
                          }}
                        >
                          <div className="pointer-events-none"><Checkbox checked={isSelected} /></div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={s.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">{s.firstName?.[0]}{s.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.firstName} {s.lastName || ''}</p>
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Personnel Ratings */}
              {selectedStaff.map(uid => {
                const s = branchStaff?.find(x => x.id === uid);
                if (!s) return null;
                const ps = personnelScores[uid] || { dress: 0, hygiene: 0, customer: 0, friendly: 0, notes: "" };
                const avg = [ps.dress, ps.hygiene, ps.customer, ps.friendly].filter(Boolean);
                const avgScore = avg.length > 0 ? Math.round((avg.reduce((a, b) => a + b, 0) / avg.length) * 20) : 0;

                return (
                  <Card key={uid}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" /> {s.firstName} {s.lastName || ''}
                        </CardTitle>
                        <span className={`font-bold ${getScoreColor(avgScore)}`}>{avgScore}/100</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: "dress", label: "Kıyafet / Dress Code" },
                          { key: "hygiene", label: "Hijyen" },
                          { key: "customer", label: "Müşteri İlgisi" },
                          { key: "friendly", label: "Güler Yüz" },
                        ].map(dim => (
                          <div key={dim.key} className="space-y-1">
                            <Label className="text-xs">{dim.label}</Label>
                            <StarRating value={(ps as any)[dim.key] || 0} onChange={v => setPersonnelScores(prev => ({ ...prev, [uid]: { ...prev[uid], [dim.key]: v } }))} size="sm" />
                          </div>
                        ))}
                      </div>
                      <Input placeholder="Not (opsiyonel)" value={ps.notes} onChange={e => setPersonnelScores(prev => ({ ...prev, [uid]: { ...prev[uid], notes: e.target.value } }))} />
                    </CardContent>
                  </Card>
                );
              })}

              <div className="space-y-3">
                <Label>Genel Denetim Notları</Label>
                <Textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} placeholder="Genel gözlemler, öneriler..." rows={3} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>← Forma Dön</Button>
                <Button onClick={() => submitAuditMut.mutate()} disabled={submitAuditMut.isPending} className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4 mr-1" /> {submitAuditMut.isPending ? "Kaydediliyor..." : "Denetimi Tamamla"}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ DENETİM GEÇMİŞİ ═══ */}
        <TabsContent value="gecmis" className="mt-4 space-y-4">
          {/* Branch Filter */}
          <div className="flex gap-2 items-center">
            <Select value={historyBranchFilter} onValueChange={setHistoryBranchFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tüm Şubeler" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Şubeler</SelectItem>
                {branches?.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredHistory.length > 0 && (
              <span className="text-xs text-muted-foreground">{filteredHistory.length} denetim</span>
            )}
          </div>

          {/* Trend Summary */}
          {filteredHistory.length >= 2 && (() => {
            const scored = filteredHistory.filter((a: any) => a.totalScore != null);
            if (scored.length < 2) return null;
            const latest = Number(scored[0].totalScore);
            const prev = Number(scored[1].totalScore);
            const diff = latest - prev;
            const avg = scored.reduce((s: number, a: any) => s + Number(a.totalScore || 0), 0) / scored.length;
            return (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Son Denetim</p>
                        <p className={`text-xl font-bold ${getScoreColor(latest)}`}>{latest.toFixed(0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Trend</p>
                        <p className={`text-lg font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '▲' : diff < 0 ? '▼' : '—'} {Math.abs(diff).toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ortalama</p>
                        <p className={`text-lg font-bold ${getScoreColor(avg)}`}>{avg.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-0.5 h-8">
                      {scored.slice(0, 10).reverse().map((a: any, i: number) => {
                        const score = Number(a.totalScore || 0);
                        return (
                          <div key={a.id} className={`w-3 rounded-t transition-all ${
                            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ height: `${Math.max(4, (score / 100) * 32)}px` }}
                          title={`${score.toFixed(0)} — ${a.startedAt ? format(new Date(a.startedAt), "d MMM", { locale: tr }) : ''}`} />
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Audit List */}
          {filteredHistory.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              {historyBranchFilter !== "all" ? "Bu şubede denetim yok" : "Henüz denetim geçmişi yok"}
            </CardContent></Card>
          ) : (
            filteredHistory.map((a: any) => {
              const score = Number(a.totalScore || 0);
              return (
                <Card key={a.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/denetim-v2/${a.id}`)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{a.branchName}</p>
                        <p className="text-xs text-muted-foreground">{a.auditorName} — {a.startedAt ? format(new Date(a.startedAt), "d MMM yyyy", { locale: tr }) : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.openActions > 0 && (
                          <Badge variant="destructive" className="text-xs">{a.openActions} açık</Badge>
                        )}
                        <Badge variant={a.status === 'closed' ? 'default' : a.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                          {a.status === 'in_progress' ? 'Devam' : a.status === 'completed' ? 'Tamamlandı' : a.status === 'pending_actions' ? 'Aksiyonlar' : a.status === 'closed' ? 'Kapandı' : a.status}
                        </Badge>
                        {a.totalScore != null && (
                          <span className={`text-lg font-bold min-w-[36px] text-right ${getScoreColor(score)}`}>{score.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    {a.totalScore != null && (
                      <Progress value={score} className={`h-1 ${getProgressColor(score)}`} />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTION RENDERER — 7 soru tipi
// ═══════════════════════════════════════════════════════════
function QuestionRenderer({ question: q, value, score, onChange }: {
  question: Question; value: string; score: number;
  onChange: (qId: number, value: string, score: number) => void;
}) {
  const renderByType = () => {
    switch (q.questionType) {
      case "checkbox":
        return (
          <div className="flex items-center gap-2" onClick={() => onChange(q.id, value === "true" ? "false" : "true", value === "true" ? 0 : 100)}>
            <div className="pointer-events-none"><Checkbox checked={value === "true"} /></div>
            <span className="text-sm cursor-pointer">{q.questionText}</span>
          </div>
        );

      case "yesno":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{q.questionText}</Label>
            <div className="flex gap-2">
              <Button variant={value === "true" ? "default" : "outline"} size="sm" onClick={() => onChange(q.id, "true", 100)} className={value === "true" ? "bg-green-600 hover:bg-green-700" : ""}>
                Evet
              </Button>
              <Button variant={value === "false" ? "default" : "outline"} size="sm" onClick={() => onChange(q.id, "false", 0)} className={value === "false" ? "bg-red-600 hover:bg-red-700" : ""}>
                Hayır
              </Button>
            </div>
          </div>
        );

      case "rating":
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{q.questionText}</Label>
              <span className={`text-sm font-bold ${getScoreColor(Number(value) || 0)}`}>{value || 0}</span>
            </div>
            <Slider min={0} max={100} step={5} value={[Number(value) || 0]} onValueChange={v => onChange(q.id, v[0].toString(), v[0])} />
          </div>
        );

      case "stars":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{q.questionText}</Label>
            <div className="flex items-center gap-3">
              <StarRating value={Number(value) || 0} onChange={v => onChange(q.id, v.toString(), v * 20)} />
              <span className="text-xs text-muted-foreground">({(Number(value) || 0) * 20}/100)</span>
            </div>
          </div>
        );

      case "select":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{q.questionText}</Label>
            <Select value={value} onValueChange={v => {
              const opt = q.options?.find(o => o.label === v);
              onChange(q.id, v, opt?.score || 0);
            }}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {q.options?.map((opt, i) => (
                  <SelectItem key={i} value={opt.label}>{opt.label} ({opt.score} puan)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "photo":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> {q.questionText}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onChange(q.id, "uploaded", 100)}>
                <Camera className="h-4 w-4 mr-1" /> Fotoğraf Yükle
              </Button>
              {value === "uploaded" && <Badge className="bg-green-500">Yüklendi ✓</Badge>}
            </div>
          </div>
        );

      case "text":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{q.questionText}</Label>
            <Textarea value={value} onChange={e => onChange(q.id, e.target.value, 0)} placeholder="Not yazın..." rows={2} />
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Bilinmeyen soru tipi: {q.questionType}</p>;
    }
  };

  return (
    <div className={`p-3 rounded-md border ${value ? 'border-primary/20 bg-primary/5' : 'border-border'} transition-colors`}>
      {q.questionType !== "checkbox" && q.helpText && (
        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {q.helpText}
        </p>
      )}
      {renderByType()}
    </div>
  );
}
