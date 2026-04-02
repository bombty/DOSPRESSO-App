import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Map, Users, GitBranch, StickyNote, Plus, Edit, Trash2, ChevronRight, CheckCircle2, Circle, ArrowRight, Building2, Factory, GraduationCap, MessageSquare, Settings, Coffee } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ═══ TAB 1: SİSTEM HARİTASI VERİSİ ═══
const SYSTEM_DOMAINS = [
  { key: "sube", title: "Şube Operasyonları", color: "#22c55e", icon: Coffee, modules: [
    { id: "tasks", name: "Görevler" }, { id: "checklists", name: "Kontrol Listeleri" },
    { id: "ekipman", name: "Ekipman & Arıza" }, { id: "lost-found", name: "Kayıp-Buluntu" },
    { id: "stok", name: "Stok Yönetimi" }, { id: "denetim", name: "Denetim & Skor" },
  ]},
  { key: "hq", title: "HQ Merkez", color: "#3b82f6", icon: Building2, modules: [
    { id: "dashboard", name: "Dashboard" }, { id: "ik", name: "İK / Personel" },
    { id: "bordro", name: "Bordro" }, { id: "pdks", name: "PDKS / Puantaj" },
    { id: "vardiya", name: "Vardiya Planlama" }, { id: "satinalma", name: "Satınalma" },
    { id: "finans", name: "Finans & Muhasebe" },
  ]},
  { key: "fabrika", title: "Fabrika", color: "#f59e0b", icon: Factory, modules: [
    { id: "uretim", name: "Üretim" }, { id: "fabrika-kiosk", name: "Fabrika Kiosk" },
    { id: "kalite", name: "Kalite Kontrol" }, { id: "sevkiyat", name: "Sevkiyat" },
    { id: "hammadde", name: "Hammadde" }, { id: "fabrika-stok", name: "Fabrika Stok" },
  ]},
  { key: "akademi", title: "Akademi & Eğitim", color: "#a855f7", icon: GraduationCap, modules: [
    { id: "akademi", name: "Akademi V3" }, { id: "egitim", name: "Eğitim Programları" },
    { id: "sertifika", name: "Sertifikalar" }, { id: "liderboard", name: "Liderboard" },
  ]},
  { key: "crm", title: "CRM & İletişim", color: "#ec4899", icon: MessageSquare, modules: [
    { id: "feedback", name: "Müşteri GB" }, { id: "tickets", name: "Ticketing" },
    { id: "kampanya", name: "Kampanyalar" }, { id: "iletisim", name: "İletişim Merkezi" },
  ]},
  { key: "sistem", title: "Sistem & Admin", color: "#6b7280", icon: Settings, modules: [
    { id: "admin", name: "Admin Paneli" }, { id: "dobody", name: "Mr. Dobody" },
    { id: "delegasyon", name: "Delegasyon" }, { id: "franchise", name: "Franchise" },
    { id: "modul-flags", name: "Modül Yönetimi" },
  ]},
];

// ═══ TAB 2: ROL HARİTASI VERİSİ ═══
const ROLE_CATEGORIES = [
  { title: "Yönetim", roles: [
    { id: "admin", label: "Admin", dashboard: "/admin", desc: "Sistem yöneticisi — tüm modüllere tam erişim" },
    { id: "ceo", label: "CEO", dashboard: "/ceo-command-center", desc: "Genel müdür — üst düzey KPI ve karar merkezi" },
    { id: "cgo", label: "CGO", dashboard: "/cgo-teknik-komuta", desc: "Teknik direktör — ekipman, arıza, teknik operasyon" },
  ]},
  { title: "HQ Departmanları", roles: [
    { id: "coach", label: "Coach", dashboard: "/coach-kontrol-merkezi", desc: "Şube koçu — denetim, eğitim, performans takibi" },
    { id: "trainer", label: "Trainer", dashboard: "/trainer-egitim-merkezi", desc: "Eğitmen — akademi, onboarding, sertifikasyon" },
    { id: "muhasebe_ik", label: "Muhasebe/İK", dashboard: "/muhasebe-centrum", desc: "HQ+Fabrika+Işıklar İK ve bordro sorumlusu" },
    { id: "satinalma", label: "Satınalma", dashboard: "/satinalma-centrum", desc: "Tedarik, sipariş, fiyat takibi" },
    { id: "marketing", label: "Marketing", dashboard: "/marketing-centrum", desc: "Kampanya, NPS, marka uyumu" },
    { id: "teknik", label: "Teknik", dashboard: "/ekipman", desc: "Teknik servis, ekipman bakım" },
    { id: "destek", label: "Destek", dashboard: "/destek-centrum", desc: "Destek talepleri, SLA takibi" },
  ]},
  { title: "Şube", roles: [
    { id: "mudur", label: "Müdür", dashboard: "/sube-centrum", desc: "Şube müdürü — operasyon, personel, finans" },
    { id: "supervisor", label: "Supervisor", dashboard: "/supervisor-centrum", desc: "Vardiya amiri — checklist, personel, misafir GB" },
    { id: "supervisor_buddy", label: "SupBuddy", dashboard: "/supbuddy-centrum", desc: "Supervisor yardımcısı — sınırlı operasyon" },
    { id: "barista", label: "Barista", dashboard: "/personel-centrum", desc: "Barista — vardiya, görev, eğitim" },
    { id: "stajyer", label: "Stajyer", dashboard: "/personel-centrum", desc: "Stajyer — sınırlı erişim, eğitim odaklı" },
    { id: "yatirimci_branch", label: "Yatırımcı (Şube)", dashboard: "/yatirimci-centrum", desc: "Franchise sahibi — kendi şubesi read-only" },
  ]},
  { title: "Fabrika", roles: [
    { id: "fabrika_mudur", label: "Fabrika Müdürü", dashboard: "/fabrika-centrum", desc: "Fabrika yönetimi — üretim, sevkiyat, kalite" },
    { id: "fabrika", label: "Fabrika Personeli", dashboard: "/fabrika-centrum", desc: "Fabrika çalışanı — üretim kaydı" },
  ]},
  { title: "Özel", roles: [
    { id: "yatirimci_hq", label: "Franchise Yatırımcı", dashboard: "/yatirimci-hq-centrum", desc: "Çoklu şube yatırımcısı — tüm şubeleri read-only" },
  ]},
];

// ═══ TAB 3: AKIŞ GÖRÜNTÜLEYİCİ VERİSİ ═══
const WORKFLOWS = [
  { id: "fabrika-stok", title: "Fabrika Üretimi → Şube Stoğu", steps: [
    { title: "Üretim Planı", desc: "Şef haftalık üretim planı girer", role: "fabrika_mudur", module: "Üretim" },
    { title: "Üretim Kaydı", desc: "Operatör ürün, miktar, süre kaydeder", role: "fabrika", module: "Kiosk" },
    { title: "Kalite Kontrol", desc: "QC onay/red kararı verir", role: "kalite_kontrol", module: "Kalite" },
    { title: "Sevkiyat Hazırlık", desc: "Sipariş bazlı paketleme + QR etiket", role: "fabrika", module: "Sevkiyat" },
    { title: "Şubeye Teslimat", desc: "Araç ataması, GPS takip, teslim onayı", role: "supervisor", module: "Stok" },
    { title: "Stok Güncelleme", desc: "Şube stoğu otomatik güncellenir", role: "sistem", module: "Stok" },
  ]},
  { id: "pdks-bordro", title: "Kiosk → PDKS → Bordro", steps: [
    { title: "Vardiya Girişi", desc: "QR/NFC ile kiosk'tan giriş", role: "barista", module: "Kiosk" },
    { title: "PDKS Kaydı", desc: "Giriş/çıkış saatleri otomatik kaydedilir", role: "sistem", module: "PDKS" },
    { title: "Anomali Tespiti", desc: "Geç kalma, mola aşımı → uyarı", role: "dobody", module: "PDKS" },
    { title: "Puantaj Hesaplama", desc: "Mesai, fazla mesai, devamsızlık hesabı", role: "muhasebe_ik", module: "Bordro" },
    { title: "Bordro Onay", desc: "Maaş hesaplanır, onaya sunulur", role: "muhasebe_ik", module: "Bordro" },
  ]},
  { id: "crm-sla", title: "CRM Ticket → SLA → Çözüm", steps: [
    { title: "Geri Bildirim", desc: "Misafir QR kod ile puan verir", role: "misafir", module: "CRM" },
    { title: "Ticket Oluşturma", desc: "Düşük puan otomatik ticket açar", role: "sistem", module: "Ticketing" },
    { title: "SLA Başlatma", desc: "Öncelik bazlı SLA süresi başlar", role: "sistem", module: "SLA" },
    { title: "Çözüm", desc: "Supervisor/müdür yanıt ve aksiyon alır", role: "supervisor", module: "CRM" },
    { title: "Kapatma", desc: "Çözüm doğrulanır, ticket kapatılır", role: "destek", module: "Ticketing" },
  ]},
  { id: "onboarding", title: "Onboarding → Akademi → Sertifika", steps: [
    { title: "İşe Alım", desc: "Yeni personel sisteme kaydedilir", role: "muhasebe_ik", module: "İK" },
    { title: "Onboarding Başlangıç", desc: "Otomatik eğitim planı atanır", role: "trainer", module: "Onboarding" },
    { title: "Eğitim Modülleri", desc: "Video, quiz, pratik görevler", role: "barista", module: "Akademi" },
    { title: "Mentor Takibi", desc: "Coach/trainer ilerlemeyi izler", role: "coach", module: "Akademi" },
    { title: "Değerlendirme", desc: "Final sınavı ve pratik değerlendirme", role: "trainer", module: "Sertifika" },
    { title: "Sertifika", desc: "Başarılı → dijital sertifika verilir", role: "sistem", module: "Sertifika" },
  ]},
  { id: "denetim-skor", title: "Şube Denetim → Skor → Alarm", steps: [
    { title: "Denetim Planı", desc: "Coach haftalık denetim takvimi oluşturur", role: "coach", module: "Denetim" },
    { title: "Denetim Gerçekleştirme", desc: "Checklist bazlı puanlama yapılır", role: "coach", module: "Checklist" },
    { title: "Sağlık Skoru", desc: "6 boyutlu şube sağlık skoru hesaplanır", role: "sistem", module: "Dashboard" },
    { title: "Alarm & Aksiyon", desc: "Düşük skor → otomatik uyarı ve görev", role: "dobody", module: "Mr. Dobody" },
  ]},
  { id: "dobody-gorev", title: "Mr. Dobody → Görev → Bildirim", steps: [
    { title: "Pattern Tespiti", desc: "AI veri analizi — anomali ve trend", role: "dobody", module: "Mr. Dobody" },
    { title: "Aksiyon Önerisi", desc: "Rol bazlı aksiyon kartı oluşturur", role: "dobody", module: "Mr. Dobody" },
    { title: "Görev Atama", desc: "Onay ile otomatik görev oluşturulur", role: "coach", module: "Görevler" },
    { title: "Bildirim", desc: "İlgili kişiye push + in-app bildirim", role: "sistem", module: "Bildirim" },
  ]},
];

// ═══ NOT BÖLÜM RENKLERİ ═══
const SECTION_COLORS: Record<string, string> = {
  vizyon: "#3b82f6", teknik: "#f59e0b", surec: "#22c55e", karar: "#ef4444", genel: "#6b7280"
};
const SECTION_LABELS: Record<string, string> = {
  vizyon: "Vizyon", teknik: "Teknik", surec: "Süreç", karar: "Karar", genel: "Genel"
};

// ═══ ANA KOMPONENT ═══
export default function SistemAtolyesi() {
  const [activeTab, setActiveTab] = useState("harita");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(0);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", section: "genel" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notes = [] } = useQuery<any[]>({ queryKey: ["/api/workshop/notes"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return apiRequest("PATCH", `/api/workshop/notes/${editingId}`, data);
      }
      return apiRequest("POST", "/api/workshop/notes", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/workshop/notes"] });
      setNoteForm({ title: "", content: "", section: "genel" });
      setEditingId(null);
      setNoteDialogOpen(false);
      toast({ title: "Kaydedildi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/workshop/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/workshop/notes"] });
      toast({ title: "Silindi" });
    },
  });

  const selectedRoleData = ROLE_CATEGORIES.flatMap(c => c.roles).find(r => r.id === selectedRole);
  const activeWorkflow = WORKFLOWS[selectedWorkflow];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">Sistem Atölyesi</h1>
          <p className="text-sm text-muted-foreground mt-1">DOSPRESSO sistem haritası, roller, iş akışları ve toplantı notları</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="harita" className="text-xs sm:text-sm"><Map className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Sistem Haritası</TabsTrigger>
            <TabsTrigger value="roller" className="text-xs sm:text-sm"><Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Rol Haritası</TabsTrigger>
            <TabsTrigger value="akislar" className="text-xs sm:text-sm"><GitBranch className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Akışlar</TabsTrigger>
            <TabsTrigger value="notlar" className="text-xs sm:text-sm"><StickyNote className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Notlar</TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: SİSTEM HARİTASI ═══ */}
          <TabsContent value="harita" className="space-y-4">
            {SYSTEM_DOMAINS.map(domain => (
              <Card key={domain.key}>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <domain.icon className="h-4 w-4" style={{ color: domain.color }} />
                    <span style={{ color: domain.color }}>{domain.title}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{domain.modules.length} modül</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    {domain.modules.map(mod => (
                      <Badge key={mod.id} variant="secondary" className="text-xs py-1 px-2.5 cursor-default">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                        {mod.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ═══ TAB 2: ROL HARİTASI ═══ */}
          <TabsContent value="roller">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sol: Rol listesi */}
              <div className="lg:col-span-1 space-y-3">
                {ROLE_CATEGORIES.map(cat => (
                  <Card key={cat.title}>
                    <CardHeader className="pb-1 pt-2.5">
                      <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{cat.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {cat.roles.map(role => (
                          <Badge
                            key={role.id}
                            variant={selectedRole === role.id ? "default" : "outline"}
                            className="cursor-pointer text-xs py-1 hover:bg-primary/10 transition-colors"
                            onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                          >
                            {role.label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Sağ: Seçili rol detayı */}
              <div className="lg:col-span-2">
                {selectedRoleData ? (
                  <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {selectedRoleData.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{selectedRoleData.desc}</p>
                      <div>
                        <p className="text-xs font-medium mb-1 text-muted-foreground">Dashboard</p>
                        <Badge variant="outline" className="text-xs font-mono">{selectedRoleData.dashboard}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1.5 text-muted-foreground">Erişebildiği Modüller</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SYSTEM_DOMAINS.flatMap(d => d.modules).slice(0, 12).map(m => (
                            <Badge key={m.id} variant="secondary" className="text-[10px]">{m.name}</Badge>
                          ))}
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">+ daha fazla</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Detay görmek için bir rol seçin</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB 3: AKIŞ GÖRÜNTÜLEYİCİ ═══ */}
          <TabsContent value="akislar" className="space-y-4">
            {/* Akış seçici */}
            <div className="flex flex-wrap gap-1.5">
              {WORKFLOWS.map((wf, idx) => (
                <Badge
                  key={wf.id}
                  variant={selectedWorkflow === idx ? "default" : "outline"}
                  className="cursor-pointer text-xs py-1 px-2"
                  onClick={() => { setSelectedWorkflow(idx); setSelectedStep(null); }}
                >
                  {wf.title}
                </Badge>
              ))}
            </div>

            {/* Adım çizgisi */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {activeWorkflow.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center shrink-0">
                      <button
                        onClick={() => setSelectedStep(selectedStep === idx ? null : idx)}
                        className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all text-center min-w-[80px] ${
                          selectedStep === idx
                            ? "bg-primary/10 ring-1 ring-primary"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedStep === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-[10px] leading-tight font-medium">{step.title}</span>
                      </button>
                      {idx < activeWorkflow.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seçili adım detayı */}
            {selectedStep !== null && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 pb-3 space-y-2">
                  <h3 className="font-semibold text-sm">
                    Adım {selectedStep + 1}: {activeWorkflow.steps[selectedStep].title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{activeWorkflow.steps[selectedStep].desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">Rol: {activeWorkflow.steps[selectedStep].role}</Badge>
                    <Badge variant="secondary" className="text-[10px]">Modül: {activeWorkflow.steps[selectedStep].module}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ TAB 4: TOPLANTI NOTLARI ═══ */}
          <TabsContent value="notlar" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{notes.length} not</p>
              <Dialog open={noteDialogOpen} onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) { setEditingId(null); setNoteForm({ title: "", content: "", section: "genel" }); }}}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Yeni Not</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Notu Düzenle" : "Yeni Not"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input placeholder="Başlık" value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} />
                    <Select value={noteForm.section} onValueChange={v => setNoteForm(p => ({ ...p, section: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SECTION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Not içeriği..." rows={5} value={noteForm.content} onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))} />
                    <Button
                      className="w-full"
                      disabled={!noteForm.title.trim() || !noteForm.content.trim() || saveMutation.isPending}
                      onClick={() => saveMutation.mutate(noteForm)}
                    >
                      {saveMutation.isPending ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {notes.length === 0 ? (
              <Card className="flex items-center justify-center min-h-[120px]">
                <p className="text-sm text-muted-foreground">Henüz not yok — toplantı notlarınızı buraya ekleyin</p>
              </Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(notes as any[]).map((note: any) => (
                  <Card key={note.id}>
                    <CardContent className="pt-3 pb-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SECTION_COLORS[note.section] || "#6b7280" }} />
                          <h4 className="font-medium text-sm truncate">{note.title}</h4>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            setNoteForm({ title: note.title, content: note.content, section: note.section });
                            setEditingId(note.id);
                            setNoteDialogOpen(true);
                          }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(note.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: SECTION_COLORS[note.section], color: SECTION_COLORS[note.section] }}>
                          {SECTION_LABELS[note.section] || note.section}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {note.createdAt ? new Date(note.createdAt).toLocaleDateString('tr-TR') : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
