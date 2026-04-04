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

                  {/* Katıldığı Akışlar */}
                  {(() => {
                    const roleFlows = WORKFLOWS.filter(w => w.roles.includes(selectedRole!));
                    if (roleFlows.length === 0) return null;
                    return (
                      <>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-3">Katıldığı Akışlar ({roleFlows.length})</div>
                        <div className="space-y-0.5">
                          {roleFlows.map(f => (
                            <div key={f.id} className="flex items-center gap-1.5 py-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.status === 'aktif' ? 'bg-green-500' : 'bg-amber-500'}`} />
                              <span className="text-[10px]">{f.direction}</span>
                              <span className="text-xs">{f.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
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

// ═══ TAB 3: AKIŞ GÖRÜNTÜLEYİCİ (GENİŞLETİLMİŞ) ═══
type WfStep = { title: string; role: string; module: string; desc: string };
type Workflow = { id: string; name: string; group: string; direction: "→"|"↔"; status: "aktif"|"kısmen"|"plan"; roles: string[]; steps: WfStep[] };

const WORKFLOW_GROUPS = ["Fabrika","Şube Operasyon","HQ Denetim & Yönetim","Mr. Dobody","Finans & İK"] as const;
const GROUP_COLORS: Record<string,string> = { "Fabrika":"bg-orange-500","Şube Operasyon":"bg-blue-500","HQ Denetim & Yönetim":"bg-purple-500","Mr. Dobody":"bg-red-500","Finans & İK":"bg-green-500" };

const WORKFLOWS: Workflow[] = [
  // ─── FABRİKA ───
  { id:"A1", name:"Hammadde → Üretim → Mamül", group:"Fabrika", direction:"→", status:"aktif", roles:["satinalma","fabrika_mudur","fabrika_operator"], steps:[
    { title:"Hammadde Sipariş", role:"Satınalma", module:"Satınalma", desc:"Tedarikçiden hammadde siparişi verilir." },
    { title:"Teslim Alma", role:"Depo", module:"Stok", desc:"Hammadde teslim alınır, stok kaydı oluşturulur." },
    { title:"Reçete Seçimi", role:"Fabrika Müdür", module:"Üretim", desc:"Hangi ürün üretilecek, reçete seçilir." },
    { title:"Üretim Başlat", role:"Operatör", module:"Kiosk", desc:"İstasyon bazlı üretim kaydı." },
    { title:"Mamül Çıkış", role:"Operatör", module:"Üretim", desc:"Bitmiş ürün çıktı olarak kaydedilir." },
  ]},
  { id:"A2", name:"Kalite Kontrol (2 Aşama)", group:"Fabrika", direction:"→", status:"aktif", roles:["fabrika_operator","fabrika_mudur"], steps:[
    { title:"Görsel Kontrol", role:"Fabrika Müdür", module:"Kalite", desc:"Renk, boyut, koku kontrolü." },
    { title:"Ölçüm", role:"Fabrika Müdür", module:"Kalite", desc:"Ağırlık, nem ölçümü. Fotoğraf çekimi." },
    { title:"Detaylı Test", role:"Fabrika Müdür", module:"Kalite", desc:"Lab ölçümü, cupping score." },
    { title:"ONAY veya RED", role:"Fabrika Müdür", module:"Kalite", desc:"Onay→LOT oluştur. Red→iade/imha." },
    { title:"LOT Oluşturma", role:"Sistem", module:"Stok", desc:"LOT no + SKT + miktar kaydı." },
  ]},
  { id:"A3", name:"Sevkiyat → Şube Teslim", group:"Fabrika", direction:"→", status:"aktif", roles:["fabrika_mudur","depo_sorumlusu","supervisor"], steps:[
    { title:"Sevkiyat Planı", role:"Fabrika Müdür", module:"Sevkiyat", desc:"Hangi şubeye ne kadar gönderilecek." },
    { title:"LOT Seçimi (FIFO)", role:"Sistem", module:"Stok", desc:"En eski SKT'li LOT otomatik seçilir." },
    { title:"Paketleme", role:"Depo", module:"Sevkiyat", desc:"QR etiketleme ve paketleme." },
    { title:"Çıkış Onayı", role:"Fabrika Müdür", module:"Sevkiyat", desc:"Sevkiyat onaylanır, yola çıkar." },
    { title:"Şube Teslim", role:"Supervisor", module:"Stok", desc:"Teslim alınır, stok güncellenir." },
  ]},
  { id:"A4", name:"Reçete Yönetimi", group:"Fabrika", direction:"→", status:"aktif", roles:["ceo","cgo","fabrika_mudur"], steps:[
    { title:"Reçete Oluştur", role:"CEO/CGO", module:"Reçete", desc:"Yeni ürün reçetesi tanımlanır." },
    { title:"Malzeme + Maliyet", role:"Fabrika Müdür", module:"Reçete", desc:"Malzeme listesi, miktar, birim fiyat." },
    { title:"Versiyon Kaydet", role:"Sistem", module:"Reçete", desc:"Her değişiklik yeni versiyon." },
    { title:"Bildirim", role:"Sistem", module:"Bildirim", desc:"Şubelere değişiklik bildirimi." },
  ]},
  { id:"A5", name:"Fire & Atık Kaydı", group:"Fabrika", direction:"→", status:"aktif", roles:["fabrika_operator","fabrika_mudur","muhasebe"], steps:[
    { title:"Fire Tespit", role:"Operatör", module:"Üretim", desc:"Üretim, QC veya SKT firesi." },
    { title:"Neden + Miktar", role:"Operatör", module:"Üretim", desc:"Fire nedeni seçilir, miktar girilir." },
    { title:"LOT İmha", role:"Fabrika Müdür", module:"Stok", desc:"İlgili LOT'tan düşülür." },
    { title:"Fire Raporu", role:"Muhasebe", module:"Rapor", desc:"Aylık fire oranı raporlanır." },
  ]},

  // ─── ŞUBE OPERASYON ───
  { id:"B1", name:"Vardiya → Kiosk → PDKS → Bordro", group:"Şube Operasyon", direction:"→", status:"aktif", roles:["supervisor","barista","muhasebe"], steps:[
    { title:"Haftalık Plan", role:"Supervisor", module:"Vardiya", desc:"Vardiya planı oluşturulur." },
    { title:"Kiosk Check-in", role:"Personel", module:"Kiosk", desc:"QR/PIN ile giriş. Geç kalma tespiti." },
    { title:"PDKS Kaydı", role:"Sistem", module:"PDKS", desc:"Giriş/çıkış saatleri otomatik kaydedilir." },
    { title:"Gün Sınıflandırma", role:"Sistem", module:"PDKS", desc:"worked/absent/no_shift/leave ayrımı." },
    { title:"Aylık Özet", role:"Sistem", module:"PDKS", desc:"Çalışılan gün, fazla mesai, devamsızlık." },
    { title:"Bordro Hesaplama", role:"Muhasebe", module:"Bordro", desc:"Maaş - kesinti + mesai = net." },
  ]},
  { id:"B2", name:"Checklist Döngüsü", group:"Şube Operasyon", direction:"→", status:"aktif", roles:["barista","supervisor"], steps:[
    { title:"Açılış/Kapanış", role:"Barista", module:"Checklist", desc:"Günlük checklist açılır." },
    { title:"Madde Tikleme", role:"Barista", module:"Checklist", desc:"Her madde tik + opsiyonel fotoğraf." },
    { title:"Tamamla", role:"Barista", module:"Checklist", desc:"Checklist tamamlanır." },
    { title:"Skor", role:"Sistem", module:"Skor", desc:"Checklist skoru hesaplanır." },
  ]},
  { id:"B3", name:"Stok Sayım & Sipariş", group:"Şube Operasyon", direction:"↔", status:"aktif", roles:["supervisor","satinalma"], steps:[
    { title:"Fiziksel Sayım", role:"Supervisor", module:"Stok", desc:"Manuel stok sayımı yapılır." },
    { title:"Fark Tespiti", role:"Sistem", module:"Stok", desc:"Sistem stoku vs fiziksel fark." },
    { title:"Sipariş Talebi", role:"Supervisor", module:"Stok", desc:"Eksik ürünler için talep." },
    { title:"Satınalma Onayı", role:"Satınalma", module:"Satınalma", desc:"Talep incelenir ve sipariş verilir." },
    { title:"Teslim + Güncelle", role:"Supervisor", module:"Stok", desc:"Teslim alınır, stok güncellenir." },
  ]},
  { id:"B4", name:"Müşteri Geri Bildirim (QR)", group:"Şube Operasyon", direction:"→", status:"aktif", roles:["supervisor","coach","cgo"], steps:[
    { title:"QR Okutma", role:"Müşteri", module:"CRM", desc:"Şubedeki QR kodu okutulur." },
    { title:"Form + Puan", role:"Müşteri", module:"CRM", desc:"Puan (1-5) ve yorum girilir." },
    { title:"Anlık Bildirim", role:"Supervisor", module:"Bildirim", desc:"Düşük puan → supervisor'a uyarı." },
    { title:"Şikayet İşleme", role:"Destek", module:"CRM", desc:"Ticket oluşturulur, SLA başlar." },
    { title:"NPS Güncelleme", role:"Sistem", module:"CRM", desc:"Şube NPS skoru güncellenir." },
  ]},
  { id:"B5", name:"Arıza → Servis → Çözüm", group:"Şube Operasyon", direction:"↔", status:"aktif", roles:["barista","supervisor","cgo"], steps:[
    { title:"Troubleshoot", role:"Personel", module:"Ekipman", desc:"Adımlı sorun giderme denenır." },
    { title:"Arıza Bildir", role:"Supervisor", module:"Ekipman", desc:"Fotoğraf + açıklama ile bildirim." },
    { title:"HQ Yönlendirme", role:"CGO/Teknik", module:"Ekipman", desc:"Dahili çözüm veya dış servis kararı." },
    { title:"Servis Takip", role:"CGO", module:"Ekipman", desc:"7 aşamalı durum takibi." },
    { title:"Test + Kapanış", role:"CGO", module:"Ekipman", desc:"Çözüm doğrulanır, arıza kapatılır." },
  ]},
  { id:"B6", name:"İzin Talebi → Onay", group:"Şube Operasyon", direction:"↔", status:"aktif", roles:["barista","supervisor","muhasebe_ik"], steps:[
    { title:"Talep Oluştur", role:"Personel", module:"İK", desc:"İzin tipi, tarih seçimi." },
    { title:"Çakışma Kontrol", role:"Sistem", module:"Vardiya", desc:"Vardiya çakışması kontrol edilir." },
    { title:"Supervisor Onay", role:"Supervisor", module:"İK", desc:"Onay veya ret." },
    { title:"PDKS + Bakiye", role:"Sistem", module:"PDKS", desc:"İzin günleri kaydedilir, bakiye düşer." },
  ]},

  // ─── HQ DENETİM & YÖNETİM ───
  { id:"C1", name:"Denetim Döngüsü (v2)", group:"HQ Denetim & Yönetim", direction:"→", status:"aktif", roles:["coach","trainer","supervisor"], steps:[
    { title:"Şablon Seç", role:"Coach", module:"Denetim", desc:"Kategoriler + 7 tip soru." },
    { title:"Şube Seç + Başlat", role:"Coach", module:"Denetim", desc:"Hedef şube belirlenir." },
    { title:"Form Doldur", role:"Coach", module:"Denetim", desc:"Checkbox, yıldız, slider, fotoğraf..." },
    { title:"Personel Denetimi", role:"Coach", module:"Denetim", desc:"4 boyut: kıyafet, hijyen, güler yüz, müşteri." },
    { title:"Skor Hesapla", role:"Sistem", module:"Skor", desc:"Kategori ağırlıklı genel skor." },
    { title:"Aksiyon Oluştur", role:"Coach", module:"Denetim", desc:"Eksiklik + sorumlu + deadline + SLA." },
    { title:"Çözüm Bildir", role:"Supervisor", module:"Denetim", desc:"Aksiyon çözülür, not eklenir." },
    { title:"Onay + Kapat", role:"Coach", module:"Denetim", desc:"Denetçi onaylar, denetim kapanır." },
  ]},
  { id:"C2", name:"Proje Yönetimi (v2)", group:"HQ Denetim & Yönetim", direction:"↔", status:"aktif", roles:["ceo","cgo","coach","mudur"], steps:[
    { title:"Proje Oluştur", role:"Proje Yöneticisi", module:"Proje", desc:"Kategori, ekip, tarih seçimi." },
    { title:"Milestone Planla", role:"Proje Yöneticisi", module:"Proje", desc:"Kilometre taşları belirlenir." },
    { title:"Görev Ata", role:"Proje Yöneticisi", module:"Proje", desc:"Kanban board'da görev yönetimi." },
    { title:"İlerleme Takip", role:"Ekip", module:"Proje", desc:"Görev durumu güncelleme." },
    { title:"Tamamla + Arşiv", role:"Proje Yöneticisi", module:"Proje", desc:"Proje kapatılır, arşivlenir." },
  ]},
  { id:"C3", name:"Eğitim → Quiz → Sertifika", group:"HQ Denetim & Yönetim", direction:"→", status:"aktif", roles:["trainer","coach","barista"], steps:[
    { title:"Modül Oluştur", role:"Trainer", module:"Akademi", desc:"Video + metin + materyal." },
    { title:"Quiz Ekle", role:"Trainer", module:"Akademi", desc:"Çoktan seçmeli sorular." },
    { title:"Eğitim Ata", role:"Coach/Trainer", module:"Akademi", desc:"Personele eğitim atanır." },
    { title:"İzle + Quiz Çöz", role:"Personel", module:"Akademi", desc:"Eğitim tamamlanır, sınav yapılır." },
    { title:"Sertifika", role:"Sistem", module:"Akademi", desc:"Başarılı → dijital sertifika." },
  ]},
  { id:"C4", name:"Onboarding (Yeni Personel)", group:"HQ Denetim & Yönetim", direction:"→", status:"aktif", roles:["muhasebe_ik","trainer","supervisor"], steps:[
    { title:"Sisteme Kayıt", role:"İK", module:"İK", desc:"Personel bilgileri girilir." },
    { title:"Program Ata", role:"Trainer", module:"Onboarding", desc:"Haftalık program belirlenir." },
    { title:"Eğitim + Görevler", role:"Personel", module:"Onboarding", desc:"Adım adım tamamlama." },
    { title:"Check-in", role:"Supervisor", module:"Onboarding", desc:"Haftalık değerlendirme." },
    { title:"Bağımsız Çalışma", role:"Personel", module:"Operasyon", desc:"Onboarding tamamlanır." },
  ]},
  { id:"C5", name:"Duyuru Yayınlama", group:"HQ Denetim & Yönetim", direction:"→", status:"aktif", roles:["admin","ceo","cgo"], steps:[
    { title:"Oluştur", role:"Admin/CEO", module:"Duyuru", desc:"Başlık, içerik, hedef seçimi." },
    { title:"Hedef Belirle", role:"Admin", module:"Duyuru", desc:"Rol veya şube bazlı hedef." },
    { title:"Yayınla", role:"Admin", module:"Duyuru", desc:"Tüm hedeflere gönderilir." },
    { title:"Okundu Takibi", role:"Sistem", module:"Duyuru", desc:"Kim okudu, kim okumadı." },
  ]},

  // ─── MR. DOBODY ───
  { id:"D1", name:"Event → Analiz → Öneri → Onay", group:"Mr. Dobody", direction:"↔", status:"aktif", roles:["coach","ceo","supervisor"], steps:[
    { title:"Olay Algıla", role:"Sistem", module:"Event", desc:"Denetim, SLA, skor değişimi..." },
    { title:"Scope Kontrol", role:"Dobody", module:"Güvenlik", desc:"Bu rol bu veriyi görebilir mi?" },
    { title:"Analiz", role:"Dobody", module:"Analiz", desc:"Pattern tespiti, trend analizi." },
    { title:"Limit Kontrol", role:"Dobody", module:"Sistem", desc:"Günde max 3, duplikasyon engel." },
    { title:"Öneri Oluştur", role:"Dobody", module:"Proposal", desc:"Kullanıcıya sunulacak öneri." },
    { title:"Onayla / Reddet", role:"Kullanıcı", module:"Dashboard", desc:"Tek dokunuş onay veya ret." },
    { title:"Öğrenme", role:"Dobody", module:"Öğrenme", desc:"Onay=+2, Ret=-3, güven güncelle." },
  ]},
  { id:"D2", name:"SLA Takip & Escalation", group:"Mr. Dobody", direction:"→", status:"aktif", roles:["supervisor","coach","cgo"], steps:[
    { title:"Deadline Kontrol", role:"Dobody", module:"SLA", desc:"Açık aksiyonların deadline'ı kontrol edilir." },
    { title:"Gün-3 Uyarı", role:"Supervisor", module:"Bildirim", desc:"3 gün kala hatırlatma." },
    { title:"Gün-1 Acil", role:"Coach", module:"Bildirim", desc:"1 gün kala escalation." },
    { title:"SLA İhlali", role:"CGO", module:"Bildirim", desc:"Deadline geçti → CGO bilgilendirilir." },
  ]},
  { id:"D3", name:"Haftalık Brief (WF-8)", group:"Mr. Dobody", direction:"→", status:"aktif", roles:["ceo","coach"], steps:[
    { title:"Veri Topla", role:"Dobody", module:"Analiz", desc:"Geçen haftanın tüm metrikleri." },
    { title:"CEO Briifi", role:"Dobody", module:"Brief", desc:"Denetim + aksiyon + proje özeti." },
    { title:"Coach Briifi", role:"Dobody", module:"Brief", desc:"Denetim + eğitim + riskli şubeler." },
  ]},

  // ─── FİNANS & İK ───
  { id:"E1", name:"Bordro Hesaplama", group:"Finans & İK", direction:"→", status:"aktif", roles:["muhasebe","muhasebe_ik","admin"], steps:[
    { title:"PDKS Özet", role:"Sistem", module:"PDKS", desc:"Aylık çalışma verileri çekilir." },
    { title:"Maaş Eşleme", role:"Sistem", module:"Bordro", desc:"Pozisyon → maaş tablosu." },
    { title:"Kesinti Hesapla", role:"Sistem", module:"Bordro", desc:"Devamsızlık × günlük ücret." },
    { title:"Mesai Hesapla", role:"Sistem", module:"Bordro", desc:"Fazla mesai × 1.5 çarpanı." },
    { title:"Net Maaş", role:"Muhasebe", module:"Bordro", desc:"Brüt - kesinti + mesai = net." },
    { title:"Kilitle", role:"Admin", module:"Bordro", desc:"Onaylanan bordro kilitlenir." },
  ]},
  { id:"E2", name:"Personel Yaşam Döngüsü", group:"Finans & İK", direction:"→", status:"aktif", roles:["muhasebe_ik","trainer","supervisor"], steps:[
    { title:"İşe Alım", role:"İK", module:"İK", desc:"Personel sisteme kaydedilir." },
    { title:"Onboarding", role:"Trainer", module:"Onboarding", desc:"Eğitim programı başlar." },
    { title:"Aktif Çalışma", role:"Personel", module:"Operasyon", desc:"Günlük operasyona katılım." },
    { title:"Performans", role:"Supervisor", module:"Skor", desc:"Composite score takibi." },
    { title:"Ayrılış", role:"İK", module:"İK", desc:"İşten ayrılış kaydı, soft delete." },
  ]},
];

function AkisGoruntüleyici() {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [flow, setFlow] = useState(WORKFLOWS[0]);
  const [step, setStep] = useState<number | null>(null);

  const filtered = selectedGroup === "all" ? WORKFLOWS : WORKFLOWS.filter(w => w.group === selectedGroup);

  return (
    <div className="space-y-3">
      {/* Modül Filtre */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={selectedGroup === "all" ? "default" : "outline"} className="cursor-pointer text-xs py-1"
          onClick={() => setSelectedGroup("all")}>Tümü ({WORKFLOWS.length})</Badge>
        {WORKFLOW_GROUPS.map(g => {
          const count = WORKFLOWS.filter(w => w.group === g).length;
          return (
            <Badge key={g} variant={selectedGroup === g ? "default" : "outline"} className="cursor-pointer text-xs py-1"
              onClick={() => { setSelectedGroup(g); setStep(null); }}>
              {g} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Akış Listesi */}
      <div className="flex flex-wrap gap-1.5">
        {filtered.map(w => (
          <Badge key={w.id} variant={flow.id === w.id ? "default" : "outline"}
            className={`cursor-pointer text-xs py-1 ${flow.id === w.id ? '' : ''}`}
            onClick={() => { setFlow(w); setStep(null); }}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${w.status === 'aktif' ? 'bg-green-500' : w.status === 'kısmen' ? 'bg-amber-500' : 'bg-slate-400'}`} />
            {w.direction === "↔" ? "↔" : "→"} {w.name}
          </Badge>
        ))}
      </div>

      {/* Seçili Akış Detay */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              {flow.name}
              <Badge variant="outline" className="text-[10px]">{flow.direction === "↔" ? "Çift Yön" : "Tek Yön"}</Badge>
              <Badge className={`text-[10px] ${GROUP_COLORS[flow.group] || 'bg-slate-500'} text-white`}>{flow.group}</Badge>
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {flow.roles.map(r => (
              <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ROLE_LABELS[r] || r}</span>
            ))}
          </div>
        </CardHeader>
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
