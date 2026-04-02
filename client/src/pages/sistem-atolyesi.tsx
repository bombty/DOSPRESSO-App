import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Map, Users, GitBranch, FileText, Plus, Edit, Trash2, ChevronDown, ChevronRight, ArrowRight, Database, Shield, Layers } from "lucide-react";
import { ROLE_MODULES, type ModuleCardConfig } from "@/components/home-screen/role-module-config";
import { ROLE_CONTROL_PATH } from "@/lib/role-routes";

// ═══ TYPES ═══
interface SubModule { id: string; name: string; path: string; canDisable: boolean; }
interface RoleAccess { role: string; view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean; scope: string; }
interface ModuleData { id: string; name: string; flagKey: string; subModuleCount: number; subModules: SubModule[]; roles: RoleAccess[]; }
interface OrphanPage { file: string; lines: number; apis: number; status: "link"|"duplicate"|"merge"|"deprecated"|"delete"; recommendation: string; roles: string[]; category: string; }
interface SystemHealth { orphanPages: OrphanPage[]; unguardedRoutes: string[]; totalPages: number; totalRoutes: number; guardedRoutes: number; totalEndpoints: number; usedEndpoints: number; }
interface SystemMetadata { modules: ModuleData[]; roleCounts: Record<string,number>; branchCount: number; tableCount: number; totalModules: number; totalSubModules: number; totalRoles: number; health: SystemHealth; }
type WorkshopNote = { id: number; title: string; content: string; section: string; createdAt: string; };

const ROLE_LABELS: Record<string,string> = {
  admin:"Admin", ceo:"CEO", cgo:"CGO", coach:"Coach", trainer:"Trainer",
  muhasebe_ik:"Muhasebe/İK", muhasebe:"Muhasebe", satinalma:"Satınalma",
  marketing:"Marketing", teknik:"Teknik", destek:"Destek",
  mudur:"Müdür", supervisor:"Supervisor", supervisor_buddy:"SupBuddy",
  barista:"Barista", bar_buddy:"BarBuddy", stajyer:"Stajyer",
  yatirimci_branch:"Yatırımcı", yatirimci_hq:"Franchise Yatırımcı",
  fabrika_mudur:"Fabrika Müdür", fabrika_operator:"Operatör", depo_sorumlusu:"Depo",
};

const ROLE_GROUPS: Record<string,string[]> = {
  "Yönetim": ["admin","ceo","cgo"],
  "HQ": ["coach","trainer","muhasebe_ik","satinalma","marketing","teknik","destek"],
  "Şube": ["mudur","supervisor","supervisor_buddy","barista","bar_buddy","stajyer"],
  "Yatırımcı": ["yatirimci_branch","yatirimci_hq"],
  "Fabrika": ["fabrika_mudur","fabrika_operator","depo_sorumlusu"],
};

// ═══ TAB 1: SİTE HARİTASI (CANLI VERİ) ═══
function SiteHaritasi({ data }: { data: SystemMetadata }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline"><Database className="h-3 w-3 mr-1" />{data.tableCount} tablo</Badge>
        <Badge variant="outline"><Layers className="h-3 w-3 mr-1" />{data.totalModules} modül</Badge>
        <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />{data.totalSubModules} alt modül</Badge>
        <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{data.totalRoles} rol</Badge>
        <Badge variant="outline">{data.branchCount} şube</Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 space-y-1.5">
          {data.modules.map(m => (
            <Card key={m.id} className={`cursor-pointer transition-colors ${selectedModule?.id === m.id ? "border-primary" : ""}`}>
              <CardContent className="py-2 px-3">
                <div className="flex items-center gap-2" onClick={() => { toggle(m.id); setSelectedModule(m); }}>
                  {expanded.has(m.id) ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <span className="font-medium text-sm flex-1">{m.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{m.subModuleCount} alt</Badge>
                </div>
                {expanded.has(m.id) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {m.subModules.map(sm => (
                      <div key={sm.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${sm.canDisable ? "bg-yellow-500" : "bg-green-500"}`} />
                        <span className="flex-1">{sm.name}</span>
                        <code className="text-[10px] bg-muted px-1 rounded">{sm.path}</code>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedModule && (
          <Card className="md:w-72 shrink-0">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">{selectedModule.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">{selectedModule.subModuleCount} alt modül</p>
              <div className="font-medium">Erişen Roller:</div>
              <div className="flex flex-wrap gap-1">
                {selectedModule.roles.filter(r => r.view).map(r => (
                  <Badge key={r.role} variant="outline" className="text-[10px]">
                    {ROLE_LABELS[r.role] || r.role}
                    {r.create && <span className="ml-0.5 text-green-500">+</span>}
                    {r.approve && <span className="ml-0.5 text-blue-500">✓</span>}
                  </Badge>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-green-500">+</span> oluşturabilir &nbsp;
                <span className="text-blue-500">✓</span> onaylayabilir
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══ TAB 2: ROL MATRİSİ + SİMÜLASYON ═══
function RolMatrisi({ data }: { data: SystemMetadata }) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [simMode, setSimMode] = useState(false);

  const roleModuleMap = useMemo(() => {
    const map: Record<string, { module: string; view: boolean; create: boolean; edit: boolean; approve: boolean; scope: string; }[]> = {};
    for (const m of data.modules) {
      for (const r of m.roles) {
        if (!map[r.role]) map[r.role] = [];
        map[r.role].push({ module: m.name, view: r.view, create: r.create, edit: r.edit, approve: r.approve, scope: r.scope });
      }
    }
    return map;
  }, [data]);

  const homeCards: ModuleCardConfig[] = selectedRole ? (ROLE_MODULES[selectedRole] || []) : [];
  const dashboardPath = selectedRole ? (ROLE_CONTROL_PATH[selectedRole] || "/") : "/";
  const userCount = selectedRole ? (data.roleCounts[selectedRole] || 0) : 0;
  const permissions = selectedRole ? (roleModuleMap[selectedRole] || []).filter(m => m.view) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 space-y-2">
          {Object.entries(ROLE_GROUPS).map(([group, roles]) => (
            <Card key={group}>
              <CardHeader className="pb-1 pt-2">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {roles.map(r => (
                    <Badge
                      key={r}
                      variant={selectedRole === r ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1"
                      onClick={() => { setSelectedRole(selectedRole === r ? null : r); setSimMode(false); }}
                    >
                      {ROLE_LABELS[r] || r}
                      <span className="ml-1 text-[10px] opacity-60">{data.roleCounts[r] || 0}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedRole && (
          <Card className="md:w-96 shrink-0">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {ROLE_LABELS[selectedRole] || selectedRole}
                  <Badge variant="secondary" className="text-[10px]">{userCount} kişi</Badge>
                </CardTitle>
                <Button size="sm" variant={simMode ? "default" : "outline"} className="text-xs h-7"
                  onClick={() => setSimMode(!simMode)}>
                  {simMode ? "İzinlere Dön" : "🖥️ Simüle Et"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs max-h-[500px] overflow-y-auto">
              
              {/* Dashboard bilgisi - her zaman göster */}
              <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50">
                <span className="text-muted-foreground">Giriş Sayfası:</span>
                <code className="text-[10px] bg-background px-1.5 py-0.5 rounded font-mono">{dashboardPath}</code>
              </div>

              {simMode ? (
                /* ═══ SİMÜLASYON MODU ═══ */
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ana Sayfa Kartları ({homeCards.length})</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {homeCards.map(card => (
                      <div key={card.id} className="flex items-center gap-1.5 p-1.5 rounded border bg-background text-[10px]">
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: card.iconBg }}>
                          <card.icon className="h-3 w-3" style={{ color: card.iconColor }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{card.title}</div>
                          <div className="text-muted-foreground truncate text-[9px]">{card.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-3">Erişebildiği Modüller ({permissions.length})</div>
                  <div className="space-y-0.5">
                    {permissions.map((m, i) => (
                      <div key={i} className="flex items-center justify-between py-0.5">
                        <span>{m.module}</span>
                        <div className="flex gap-0.5">
                          {m.create && <span className="text-green-500 text-[9px]">+Oluştur</span>}
                          {m.edit && <span className="text-blue-500 text-[9px]">✎Düzenle</span>}
                          {m.approve && <span className="text-purple-500 text-[9px]">✓Onayla</span>}
                          {!m.create && !m.edit && !m.approve && <span className="text-muted-foreground text-[9px]">Sadece gör</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-3">Kapsam</div>
                  <div className="text-muted-foreground">
                    {permissions[0]?.scope === "all_branches" && "✅ Tüm şubelerin verisini görür"}
                    {permissions[0]?.scope === "own_branch" && "📍 Sadece kendi şubesinin verisini görür"}
                    {permissions[0]?.scope === "own_data" && "👤 Sadece kendi verisini görür"}
                    {permissions[0]?.scope === "managed_branches" && "🏢 Yönettiği şubelerin verisini görür"}
                    {!permissions[0]?.scope && "—"}
                  </div>
                </div>
              ) : (
                /* ═══ İZİN MODU ═══ */
                <div className="space-y-1.5">
                  {permissions.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <span>{m.module}</span>
                      <div className="flex gap-1">
                        {m.view && <Badge variant="outline" className="text-[9px] px-1">Gör</Badge>}
                        {m.create && <Badge className="text-[9px] px-1 bg-green-600">Oluştur</Badge>}
                        {m.edit && <Badge className="text-[9px] px-1 bg-blue-600">Düzenle</Badge>}
                        {m.approve && <Badge className="text-[9px] px-1 bg-purple-600">Onayla</Badge>}
                      </div>
                    </div>
                  ))}
                  {permissions.length === 0 && <p className="text-muted-foreground py-2">İzin tanımı yok</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══ TAB 3: AKIŞ GÖRÜNTÜLEYİCİ ═══
const WORKFLOWS = [
  { id: "fabrika-sube", name: "Fabrika → Şube Stok", steps: [
    { title: "Üretim Planı", role: "Fabrika Müdür", module: "Üretim", desc: "Haftalık üretim planı oluşturulur, reçeteler kontrol edilir." },
    { title: "Üretim Kaydı", role: "Operatör", module: "Kiosk", desc: "Günlük üretim miktarları kiosk'tan kaydedilir." },
    { title: "Kalite Kontrol", role: "Fabrika Müdür", module: "Kalite", desc: "QC sonucu girilir (onay/red)." },
    { title: "Sevkiyat", role: "Depo", module: "Sevkiyat", desc: "QR kod ile paketleme ve çıkış." },
    { title: "Şube Teslim", role: "Supervisor", module: "Stok", desc: "Teslim alınır, stok güncellenir." },
    { title: "Rapor", role: "Coach/CEO", module: "Dashboard", desc: "Hedef vs gerçek karşılaştırma." },
  ]},
  { id: "kiosk-pdks", name: "Kiosk → PDKS → Bordro", steps: [
    { title: "Vardiya Giriş", role: "Personel", module: "Kiosk", desc: "QR/NFC ile giriş. Geç kalma otomatik tespit." },
    { title: "PDKS Kaydı", role: "Sistem", module: "PDKS", desc: "Giriş/çıkış saatleri kaydedilir." },
    { title: "Anomali", role: "Mr. Dobody", module: "PDKS", desc: "Geç kalma, eksik giriş tespiti." },
    { title: "Bordro", role: "Muhasebe", module: "Bordro", desc: "PDKS + fazla mesai + kesinti hesaplanır." },
    { title: "Maaş Onayı", role: "Muhasebe", module: "Bordro", desc: "Aylık bordro onaylanır." },
  ]},
  { id: "crm-ticket", name: "CRM Ticket → Çözüm", steps: [
    { title: "GB Girişi", role: "Misafir", module: "CRM", desc: "QR kod ile geri bildirim." },
    { title: "SLA Başlangıç", role: "Sistem", module: "CRM", desc: "Öncelik atanır, sayaç başlar." },
    { title: "İşleme", role: "Destek", module: "CRM", desc: "İlgili kişi atanır." },
    { title: "Çözüm", role: "Supervisor", module: "CRM", desc: "Sorun çözülür." },
    { title: "Kapanış", role: "Sistem", module: "CRM", desc: "Ticket kapatılır, NPS güncellenir." },
  ]},
  { id: "onboarding", name: "Onboarding → Sertifika", steps: [
    { title: "Kayıt", role: "İK", module: "İK", desc: "Yeni personel sisteme kaydedilir." },
    { title: "Eğitim Planı", role: "Trainer", module: "Akademi", desc: "Eğitim programı atanır." },
    { title: "Eğitim", role: "Personel", module: "Akademi", desc: "Video + quiz tamamlanır." },
    { title: "Değerlendirme", role: "Trainer", module: "Akademi", desc: "Pratik sınav yapılır." },
    { title: "Sertifika", role: "Sistem", module: "Sertifika", desc: "Dijital sertifika verilir." },
  ]},
  { id: "denetim", name: "Denetim → Skor → Alarm", steps: [
    { title: "Plan", role: "Coach", module: "Denetim", desc: "Denetim takvimi oluşturulur." },
    { title: "Yürütme", role: "Coach", module: "Denetim", desc: "Checklist bazlı denetim yapılır." },
    { title: "Sağlık Skoru", role: "Sistem", module: "Dashboard", desc: "5 boyutlu skor hesaplanır." },
    { title: "Alarm", role: "Dobody", module: "Dobody", desc: "Düşük skor → otomatik uyarı." },
  ]},
  { id: "ariza", name: "Arıza → Servis → Çözüm", steps: [
    { title: "Troubleshoot", role: "Personel", module: "Ekipman", desc: "Sorun giderme adımları tamamlanır." },
    { title: "Arıza Kaydı", role: "Supervisor", module: "Ekipman", desc: "Form doldurulur, fotoğraf eklenir." },
    { title: "Yönlendirme", role: "Sistem", module: "Ekipman", desc: "HQ veya şube servise yönlendirilir." },
    { title: "Servis", role: "CGO/Şube", module: "Ekipman", desc: "Teknik servis mail ile bilgilendirilir." },
    { title: "Takip", role: "CGO/Coach", module: "Ekipman", desc: "7 aşamalı durum takibi yapılır." },
    { title: "Kapanış", role: "CGO", module: "Ekipman", desc: "Test edilir, arıza kapatılır." },
  ]},
];

function AkisGoruntüleyici() {
  const [flow, setFlow] = useState(WORKFLOWS[0]);
  const [step, setStep] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {WORKFLOWS.map(w => (
          <Badge key={w.id} variant={flow.id === w.id ? "default" : "outline"} className="cursor-pointer text-xs py-1"
            onClick={() => { setFlow(w); setStep(null); }}>{w.name}</Badge>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{flow.name}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-1">
            {flow.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <Badge variant={step === i ? "default" : "secondary"} className="cursor-pointer text-xs py-1.5 px-2"
                  onClick={() => setStep(step === i ? null : i)}>{i+1}. {s.title}</Badge>
                {i < flow.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
          {step !== null && (
            <Card className="mt-3 border-primary/30">
              <CardContent className="pt-3 pb-3 space-y-1 text-sm">
                <div className="font-medium">{flow.steps[step].title}</div>
                <p className="text-muted-foreground text-xs">{flow.steps[step].desc}</p>
                <div className="flex gap-3 text-xs">
                  <span><strong>Rol:</strong> {flow.steps[step].role}</span>
                  <span><strong>Modül:</strong> {flow.steps[step].module}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ TAB 4: TOPLANTI NOTLARI ═══
const SECTIONS = ["Vizyon", "Teknik", "Süreç", "Karar"];
const sectionColors: Record<string,string> = { Vizyon:"#8b5cf6", Teknik:"#3b82f6", Süreç:"#22c55e", Karar:"#ef4444" };

function ToplantiNotlari() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery<WorkshopNote[]>({ queryKey: ["/api/sistem-atolyesi/notlar"] });
  const [editNote, setEditNote] = useState<WorkshopNote | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [section, setSection] = useState("Vizyon");

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editNote) {
        await apiRequest("PATCH", `/api/sistem-atolyesi/notlar/${editNote.id}`, { title, content, section });
      } else {
        await apiRequest("POST", "/api/sistem-atolyesi/notlar", { title, content, section });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sistem-atolyesi/notlar"] });
      toast({ title: "Kaydedildi" });
      setIsNew(false); setEditNote(null); setTitle(""); setContent("");
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/sistem-atolyesi/notlar/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sistem-atolyesi/notlar"] }); toast({ title: "Silindi" }); },
  });

  const openNew = () => { setEditNote(null); setTitle(""); setContent(""); setSection("Vizyon"); setIsNew(true); };
  const openEdit = (n: WorkshopNote) => { setEditNote(n); setTitle(n.title); setContent(n.content); setSection(n.section); setIsNew(true); };

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Yeni Not</Button>
      {notes.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">Henüz not yok.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {notes.map((n: WorkshopNote) => (
          <Card key={n.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: sectionColors[n.section], color: sectionColors[n.section] }}>{n.section}</Badge>
                    <span className="font-medium text-sm truncate">{n.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(n)}><Edit className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => delMut.mutate(n.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={isNew} onOpenChange={setIsNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editNote ? "Notu Düzenle" : "Yeni Not"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Başlık" value={title} onChange={e => setTitle(e.target.value)} />
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="İçerik..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNew(false)}>İptal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!title.trim() || saveMut.isPending}>
              {saveMut.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══ TAB 5: SİSTEM SAĞLIĞI ═══
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  link: { label: "🔗 Bağlanmalı", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
  duplicate: { label: "♻️ Birleştirilmeli", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  merge: { label: "🔀 Mega modüle taşınmalı", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30" },
  deprecated: { label: "🗑️ Eski — Silinebilir", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
  delete: { label: "❌ Sil", color: "text-red-600", bg: "bg-red-600/10 border-red-600/30" },
};

function SistemSagligi({ data }: { data: SystemMetadata }) {
  const h = data.health;
  const [filter, setFilter] = useState<string>("all");
  const guardPercent = Math.round((h.guardedRoutes / h.totalRoutes) * 100);
  const endpointPercent = Math.round((h.usedEndpoints / h.totalEndpoints) * 100);

  const linkCount = h.orphanPages.filter(p => p.status === "link").length;
  const dupCount = h.orphanPages.filter(p => p.status === "duplicate" || p.status === "merge").length;
  const delCount = h.orphanPages.filter(p => p.status === "deprecated" || p.status === "delete").length;

  const filtered = filter === "all" ? h.orphanPages : h.orphanPages.filter(p => p.status === filter);
  const categories = [...new Set(h.orphanPages.map(p => p.category))].sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-2xl font-bold text-blue-500">{linkCount}</div>
          <div className="text-xs text-muted-foreground">Bağlanmalı</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-2xl font-bold text-yellow-500">{dupCount}</div>
          <div className="text-xs text-muted-foreground">Birleştirilmeli</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className="text-2xl font-bold text-red-500">{delCount}</div>
          <div className="text-xs text-muted-foreground">Silinebilir</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <div className={`text-2xl font-bold ${guardPercent >= 80 ? "text-green-500" : "text-yellow-500"}`}>{guardPercent}%</div>
          <div className="text-xs text-muted-foreground">Route Koruması</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant={filter === "all" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setFilter("all")}>Tümü ({h.orphanPages.length})</Badge>
        <Badge variant={filter === "link" ? "default" : "outline"} className="cursor-pointer text-xs text-blue-500" onClick={() => setFilter("link")}>Bağlanmalı ({linkCount})</Badge>
        <Badge variant={filter === "duplicate" ? "default" : "outline"} className="cursor-pointer text-xs text-yellow-500" onClick={() => setFilter(filter === "duplicate" ? "all" : "duplicate")}>Duplicate ({dupCount})</Badge>
        <Badge variant={filter === "deprecated" ? "default" : "outline"} className="cursor-pointer text-xs text-red-500" onClick={() => setFilter(filter === "deprecated" ? "all" : "deprecated")}>Silinebilir ({delCount})</Badge>
      </div>

      <div className="space-y-2">
        {categories.map(cat => {
          const catPages = filtered.filter(p => p.category === cat);
          if (catPages.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader className="pb-1 pt-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{cat} ({catPages.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {catPages.map(p => {
                  const sc = STATUS_CONFIG[p.status];
                  return (
                    <div key={p.file} className={`rounded-lg border p-2.5 ${sc.bg}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-mono font-bold">{p.file}.tsx</code>
                            <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                            <span className="text-[10px] text-muted-foreground">{p.lines} satır · {p.apis} API</span>
                          </div>
                          <p className="text-xs mt-1">{p.recommendation}</p>
                          {p.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <span className="text-[10px] text-muted-foreground">Önerilen roller:</span>
                              {p.roles.map(r => <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">{ROLE_LABELS[r] || r}</Badge>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-red-500">Korumasız Route'lar ({h.unguardedRoutes.length})</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">ProtectedRoute guard'ı olmayan sayfalar — giriş yapan herkes erişebilir.</p>
          <div className="flex flex-wrap gap-1">
            {h.unguardedRoutes.map(r => <Badge key={r} variant="outline" className="text-[10px] text-red-600 border-red-600/30">{r}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">API Kullanım</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between"><span>Backend Endpoint</span><span className="font-mono">{h.totalEndpoints}</span></div>
          <div className="flex justify-between"><span>Frontend Kullanılan</span><span className="font-mono text-green-500">{h.usedEndpoints}</span></div>
          <div className="flex justify-between"><span>Bağlanmamış</span><span className="font-mono text-yellow-500">{h.totalEndpoints - h.usedEndpoints}</span></div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${endpointPercent}%` }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══ ANA SAYFA ═══
export default function SistemAtolyesi() {
  const { data: metadata, isLoading } = useQuery<SystemMetadata>({ queryKey: ["/api/sistem-atolyesi/metadata"] });

  if (isLoading || !metadata) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Sistem Atölyesi</h1>
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Sistem Atölyesi</h1>
        <p className="text-sm text-muted-foreground">
          {metadata.totalModules} modül · {metadata.totalSubModules} alt modül · {metadata.totalRoles} rol · {metadata.branchCount} şube · {metadata.tableCount} tablo
        </p>
      </div>
      <Tabs defaultValue="site" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="site" className="text-xs gap-1"><Map className="h-3.5 w-3.5" />Harita</TabsTrigger>
          <TabsTrigger value="roller" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Roller</TabsTrigger>
          <TabsTrigger value="akis" className="text-xs gap-1"><GitBranch className="h-3.5 w-3.5" />Akışlar</TabsTrigger>
          <TabsTrigger value="saglik" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" />Sağlık</TabsTrigger>
          <TabsTrigger value="notlar" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" />Notlar</TabsTrigger>
        </TabsList>
        <TabsContent value="site"><SiteHaritasi data={metadata} /></TabsContent>
        <TabsContent value="roller"><RolMatrisi data={metadata} /></TabsContent>
        <TabsContent value="akis"><AkisGoruntüleyici /></TabsContent>
        <TabsContent value="saglik"><SistemSagligi data={metadata} /></TabsContent>
        <TabsContent value="notlar"><ToplantiNotlari /></TabsContent>
      </Tabs>
    </div>
  );
}
