import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutGrid, Users, GitBranch, FileText, Edit2, Trash2,
  Plus, XCircle, ArrowRight, Factory, Store, GraduationCap,
  Megaphone, Settings, Map
} from "lucide-react";

const ALLOWED_ROLES = ["admin", "ceo", "cgo", "coach", "trainer"];

// ─── SYSTEM MAP DATA ────────────────────────────────────────────
const MODULE_DOMAINS = [
  {
    id: "sube",
    label: "Şube Operasyonları",
    color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
    headerColor: "bg-green-500",
    modules: [
      "tasks", "checklists", "equipment", "faults", "shifts", "attendance",
      "branch_dashboard", "branch_kiosk", "lost_found", "qr_scanner",
      "branch_orders", "vardiya",
    ],
  },
  {
    id: "hq",
    label: "HQ Merkez",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
    headerColor: "bg-blue-500",
    modules: [
      "hr", "employees", "leave_requests", "overtime_requests", "shifts", "staff_evaluation",
      "employee_of_month", "announcements", "notifications", "crm_dashboard", "crm_feedback",
    ],
  },
  {
    id: "fabrika",
    label: "Fabrika",
    color: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
    headerColor: "bg-orange-500",
    modules: [
      "factory", "factory_dashboard", "factory_kiosk", "factory_production",
      "factory_quality", "factory_compliance", "factory_hq_analytics",
    ],
  },
  {
    id: "akademi",
    label: "Akademi & Eğitim",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
    headerColor: "bg-purple-500",
    modules: [
      "training", "academy_general", "academy_hq", "knowledge_base",
      "academy_certificates", "academy_badges", "academy_leaderboard", "academy_learning_paths",
    ],
  },
  {
    id: "crm",
    label: "CRM & İletişim",
    color: "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400",
    headerColor: "bg-pink-500",
    modules: [
      "crm_dashboard", "crm_feedback", "support", "complaints", "messages",
      "customer_satisfaction", "audits", "quality_audit",
    ],
  },
  {
    id: "admin",
    label: "Sistem & Admin",
    color: "bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400",
    headerColor: "bg-slate-500",
    modules: [
      "admin_panel", "users", "settings", "authorization", "email_settings",
      "ai_settings", "activity_logs", "backup", "module_flags",
    ],
  },
];

const MODULE_LABELS: Record<string, string> = {
  tasks: "Görevler", checklists: "Checklistler", equipment: "Ekipman", faults: "Arızalar",
  shifts: "Vardiyalar", attendance: "Devam", branch_dashboard: "Şube Paneli",
  branch_kiosk: "Şube Kiosk", lost_found: "Kayıp Eşya", qr_scanner: "QR Tarama",
  branch_orders: "Stok & Sipariş", vardiya: "Vardiya Planlama",
  hr: "İnsan Kaynakları", employees: "Personel", leave_requests: "İzin Talepleri",
  overtime_requests: "Mesai Talepleri", staff_evaluation: "Değerlendirme",
  employee_of_month: "Ayın Elemanı", announcements: "Duyurular",
  notifications: "Bildirimler", crm_dashboard: "CRM Dashboard", crm_feedback: "Geri Bildirim",
  factory: "Fabrika Genel", factory_dashboard: "Fabrika Paneli", factory_kiosk: "Fabrika Kiosk",
  factory_production: "Üretim Planlama", factory_quality: "Fabrika Kalite",
  factory_compliance: "Fabrika Uyumluluk", factory_hq_analytics: "HQ Fabrika Analitik",
  training: "Eğitimler", academy_general: "Genel Akademi", academy_hq: "HQ Akademi",
  knowledge_base: "Bilgi Bankası", academy_certificates: "Sertifikalar",
  academy_badges: "Rozetler", academy_leaderboard: "Liderlik Tablosu",
  academy_learning_paths: "Öğrenme Yolları",
  support: "Destek Talepleri", complaints: "Şikayetler", messages: "Mesajlar",
  customer_satisfaction: "Müşteri Memnuniyeti", audits: "Denetimler", quality_audit: "Kalite Denetimi",
  admin_panel: "Admin Panel", users: "Kullanıcılar", settings: "Ayarlar",
  authorization: "Rol Yetkileri", email_settings: "Email Ayarları",
  ai_settings: "AI Ayarları", activity_logs: "Aktivite Logları", backup: "Yedekleme",
  module_flags: "Modül Bayrakları",
};

// ─── ROLE MAP DATA ────────────────────────────────────────────
const ROLE_CATEGORIES = [
  {
    label: "Sistem",
    color: "bg-red-500/10 border-red-500/30",
    roles: ["admin"],
  },
  {
    label: "Yönetim",
    color: "bg-yellow-500/10 border-yellow-500/30",
    roles: ["ceo", "cgo"],
  },
  {
    label: "HQ Departmanları",
    color: "bg-blue-500/10 border-blue-500/30",
    roles: ["muhasebe", "muhasebe_ik", "satinalma", "marketing", "pazarlama", "teknik", "destek", "trainer", "coach", "kalite_kontrol", "gida_muhendisi", "ekipman_teknik", "ik"],
  },
  {
    label: "Şube",
    color: "bg-green-500/10 border-green-500/30",
    roles: ["mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer", "yatirimci_branch"],
  },
  {
    label: "Fabrika",
    color: "bg-orange-500/10 border-orange-500/30",
    roles: ["fabrika_mudur", "uretim_sefi", "fabrika_operator", "fabrika_sorumlu", "fabrika_personel"],
  },
  {
    label: "Kiosk",
    color: "bg-slate-500/10 border-slate-500/30",
    roles: ["sube_kiosk", "fabrika"],
  },
];

const ROLE_INFO: Record<string, { label: string; description: string; dashboard: string; modules: string[] }> = {
  admin: { label: "Admin", description: "Tüm sisteme tam erişim. Modül bayrakları, kullanıcılar, rol yetkileri yönetir.", dashboard: "/ceo-command-center", modules: ["Tüm modüller"] },
  ceo: { label: "CEO", description: "Şirketin en üst yöneticisi. Finansal raporlar, franchise KPI, şube sağlık.", dashboard: "/ceo-command-center", modules: ["Raporlar", "Şubeler", "Finans", "CRM"] },
  cgo: { label: "CGO", description: "Teknik operasyonlar direktörü. Ekipman, arıza, sistem izleme.", dashboard: "/cgo-teknik-komuta", modules: ["Ekipman", "Raporlar", "CRM"] },
  coach: { label: "Coach", description: "Şube performans koçu. Uyumluluk, denetim, görev atama.", dashboard: "/coach-kontrol-merkezi", modules: ["Operasyonlar", "Eğitim", "Raporlar", "CRM"] },
  trainer: { label: "Trainer", description: "Eğitim uzmanı. Akademi içerikleri, eğitim programları.", dashboard: "/trainer-egitim-merkezi", modules: ["Eğitim", "CRM"] },
  muhasebe: { label: "Muhasebe", description: "Mali işlemler ve raporlama.", dashboard: "/muhasebe-centrum", modules: ["Raporlar", "Finans", "İK"] },
  muhasebe_ik: { label: "Muhasebe & İK", description: "Hem muhasebe hem İK süreçleri.", dashboard: "/muhasebe-centrum", modules: ["Raporlar", "Finans", "İK"] },
  satinalma: { label: "Satınalma", description: "Tedarik zinciri ve stok yönetimi.", dashboard: "/satinalma-centrum", modules: ["Satınalma", "Raporlar", "Fabrika"] },
  marketing: { label: "Marketing", description: "Kampanya ve iletişim yönetimi.", dashboard: "/hq-dashboard", modules: ["Raporlar"] },
  pazarlama: { label: "Pazarlama", description: "Pazarlama departmanı.", dashboard: "/hq-dashboard", modules: ["Raporlar"] },
  teknik: { label: "Teknik", description: "Teknik servis ve ekipman bakım.", dashboard: "/cgo-teknik-komuta", modules: ["Ekipman", "Raporlar"] },
  destek: { label: "Destek", description: "Müşteri ve iç destek servisi.", dashboard: "/destek-centrum", modules: ["Ekipman", "Operasyonlar", "Raporlar"] },
  kalite_kontrol: { label: "Kalite Kontrol", description: "Ürün ve hizmet kalite denetimi.", dashboard: "/fabrika-centrum", modules: ["Fabrika", "Raporlar"] },
  gida_muhendisi: { label: "Gıda Mühendisi", description: "Gıda güvenliği ve kalite.", dashboard: "/fabrika-centrum", modules: ["Fabrika", "Raporlar", "Operasyonlar"] },
  ekipman_teknik: { label: "Ekipman Teknik", description: "Ekipman bakım uzmanı.", dashboard: "/cgo-teknik-komuta", modules: ["Ekipman"] },
  ik: { label: "İK", description: "İnsan kaynakları uzmanı.", dashboard: "/muhasebe-centrum", modules: ["İK", "Operasyonlar", "Raporlar"] },
  mudur: { label: "Şube Müdürü", description: "Şube yöneticisi. Tüm şube operasyonları.", dashboard: "/sube-centrum", modules: ["Operasyonlar", "Ekipman", "Eğitim", "İK", "Raporlar"] },
  supervisor: { label: "Supervisor", description: "Vardiya sorumlusu.", dashboard: "/supervisor-centrum", modules: ["Operasyonlar", "Ekipman", "Eğitim", "İK"] },
  supervisor_buddy: { label: "Supervisor Buddy", description: "Yardımcı supervisor.", dashboard: "/supbuddy-centrum", modules: ["Operasyonlar", "Ekipman", "Eğitim"] },
  barista: { label: "Barista", description: "Şube çalışanı.", dashboard: "/personel-centrum", modules: ["Operasyonlar", "Eğitim"] },
  bar_buddy: { label: "Bar Buddy", description: "Yardımcı çalışan.", dashboard: "/personel-centrum", modules: ["Operasyonlar", "Eğitim"] },
  stajyer: { label: "Stajyer", description: "Staj yapan personel.", dashboard: "/personel-centrum", modules: ["Eğitim"] },
  yatirimci_branch: { label: "Şube Yatırımcı", description: "Şube ortağı ve yatırımcı.", dashboard: "/yatirimci-centrum", modules: ["Raporlar"] },
  fabrika_mudur: { label: "Fabrika Müdür", description: "Fabrika yöneticisi.", dashboard: "/fabrika-centrum", modules: ["Fabrika", "Satınalma", "Raporlar", "İK"] },
  uretim_sefi: { label: "Üretim Şefi", description: "Üretim sorumlusu.", dashboard: "/fabrika-centrum", modules: ["Fabrika", "Raporlar"] },
  fabrika_operator: { label: "Fabrika Operatör", description: "Üretim hattı çalışanı.", dashboard: "/fabrika/kiosk", modules: ["Fabrika"] },
  fabrika_sorumlu: { label: "Fabrika Sorumlu", description: "Fabrika vardiya sorumlusu.", dashboard: "/fabrika/kiosk", modules: ["Fabrika"] },
  fabrika_personel: { label: "Fabrika Personel", description: "Fabrika çalışanı.", dashboard: "/fabrika/kiosk", modules: ["Fabrika"] },
  sube_kiosk: { label: "Şube Kiosk", description: "Şube kiosk terminali.", dashboard: "/sube/kiosk", modules: ["Operasyonlar"] },
  fabrika: { label: "Fabrika (Genel)", description: "Fabrika genel erişim.", dashboard: "/fabrika/kiosk", modules: ["Fabrika"] },
  yatirimci_hq: { label: "HQ Yatırımcı", description: "Merkez yatırımcı ortağı.", dashboard: "/yatirimci-hq-centrum", modules: ["Raporlar"] },
};

// ─── WORKFLOW DATA ────────────────────────────────────────────
const WORKFLOWS = [
  {
    id: "fabrika-stok",
    title: "Fabrika Üretimi → Şube Stoğu",
    icon: Factory,
    color: "text-orange-500",
    steps: [
      { title: "Üretim Planı", description: "Haftalık üretim planı oluşturulur ve onaylanır.", role: "fabrika_mudur", module: "factory_production" },
      { title: "Üretim Gerçekleşme", description: "Kiosk üzerinden üretim kayıtları yapılır.", role: "fabrika_operator", module: "factory_kiosk" },
      { title: "Kalite Kontrol", description: "Kalite kriterleri kontrol edilir, lot kapatılır.", role: "kalite_kontrol", module: "factory_quality" },
      { title: "Depodan Sevkiyat", description: "Ürünler depodan şubelere sevk edilir.", role: "fabrika_mudur", module: "factory" },
      { title: "Şube Teslim Alma", description: "Şube stok teslim alır, sisteme giriş yapar.", role: "mudur", module: "branch_orders" },
    ],
  },
  {
    id: "kiosk-pdks",
    title: "Kiosk → PDKS → Bordro",
    icon: Store,
    color: "text-green-500",
    steps: [
      { title: "Kiosk Giriş", description: "Personel PIN veya NFC ile kiosk üzerinden giriş yapar.", role: "barista", module: "branch_kiosk" },
      { title: "Vardiya Takip", description: "PDKS sistemi otomatik devam kaydeder.", role: "mudur", module: "attendance" },
      { title: "Mola & Çıkış", description: "Mola ve vardiya bitişi kiosk'tan yapılır.", role: "barista", module: "branch_kiosk" },
      { title: "Aylık Puantaj", description: "Aylık devam özeti muhasebece kontrol edilir.", role: "muhasebe_ik", module: "hr" },
      { title: "Bordro Hesabı", description: "Maaş bordrosu hazırlanır ve onaylanır.", role: "muhasebe", module: "employees" },
    ],
  },
  {
    id: "crm-ticket",
    title: "CRM Ticket → SLA → Çözüm",
    icon: Megaphone,
    color: "text-pink-500",
    steps: [
      { title: "Ticket Oluşturma", description: "Müşteri veya personel ticket açar, öncelik belirlenir.", role: "destek", module: "crm_dashboard" },
      { title: "Atama", description: "Ticket ilgili departmana veya teknik personele atanır.", role: "destek", module: "crm_dashboard" },
      { title: "SLA Takip", description: "Çözüm süresi SLA kurallarına göre izlenir, ihlal uyarısı gönderilir.", role: "teknik", module: "crm_dashboard" },
      { title: "Çözüm", description: "Problem çözülür, müşteriye geri bildirim sağlanır.", role: "teknik", module: "support" },
      { title: "Kapatma", description: "Ticket kapatılır, memnuniyet skoru alınır.", role: "destek", module: "crm_feedback" },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding → Akademi → Sertifika",
    icon: GraduationCap,
    color: "text-purple-500",
    steps: [
      { title: "İşe Başlama", description: "Yeni personel sisteme eklenir, onboarding görevi oluşturulur.", role: "mudur", module: "employees" },
      { title: "Temel Eğitimler", description: "Zorunlu modüller akademi üzerinden tamamlatılır.", role: "barista", module: "training" },
      { title: "Quiz Değerlendirme", description: "Eğitim sonrası quizler çözülür, başarı puanları hesaplanır.", role: "barista", module: "academy_general" },
      { title: "Sertifika", description: "Başarılı personele sertifika verilir, rozet kazanılır.", role: "trainer", module: "academy_certificates" },
      { title: "Kariyer İlerleme", description: "Sertifika kariyer profiline işlenir, seviye güncellenir.", role: "coach", module: "academy_badges" },
    ],
  },
  {
    id: "denetim",
    title: "Şube Denetim → Skor → Alarm",
    icon: Map,
    color: "text-blue-500",
    steps: [
      { title: "Denetim Şablonu", description: "Denetim kategorileri ve soruları admin tarafından yapılandırılır.", role: "admin", module: "quality_audit" },
      { title: "Denetim Yürütme", description: "Coach veya kalite ekibi sahaya çıkarak formu doldurur.", role: "coach", module: "audits" },
      { title: "Skor Hesaplama", description: "Yanıtlara göre otomatik skor hesaplanır.", role: "kalite_kontrol", module: "quality_audit" },
      { title: "Şube Sağlık Skoru", description: "Skor şube profili ve health dashboard'a yansır.", role: "ceo", module: "audits" },
      { title: "CAPA & Alarm", description: "Kritik bulgular için düzeltici aksiyon planı başlatılır.", role: "coach", module: "audits" },
    ],
  },
  {
    id: "dobody",
    title: "Mr. Dobody → Görev → Bildirim",
    icon: Settings,
    color: "text-cyan-500",
    steps: [
      { title: "Tetikleyici", description: "Sistem olayı (arıza, SLA ihlali, uyumsuzluk) Dobody ajanını tetikler.", role: "admin", module: "admin_panel" },
      { title: "Analiz", description: "Dobody bağlamı analiz eder, aksiyon önerileri üretir.", role: "admin", module: "admin_panel" },
      { title: "Görev Atama", description: "Onaylanan öneri ilgili role görev olarak atanır.", role: "coach", module: "tasks" },
      { title: "Bildirim", description: "Atanan kişiye push notification ve CRM mesajı gönderilir.", role: "barista", module: "notifications" },
      { title: "Takip & Kapanış", description: "Görev tamamlanınca Dobody kapanış bildirimini kaydeder.", role: "coach", module: "tasks" },
    ],
  },
];

// ─── NOTE SECTIONS ────────────────────────────────────────────
const NOTE_SECTIONS = ["Vizyon", "Teknik", "Süreç", "Karar"];

const noteFormSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir").max(255),
  section: z.string().min(1, "Bölüm seçiniz"),
  content: z.string().min(1, "İçerik gereklidir"),
});
type NoteFormValues = z.infer<typeof noteFormSchema>;

// ─── SYSTEM MAP TAB ────────────────────────────────────────────
function SistemHaritasiTab() {
  const { data: moduleFlags } = useQuery<any[]>({
    queryKey: ["/api/module-flags"],
    retry: false,
  });

  const flagMap: Record<string, boolean> = {};
  if (Array.isArray(moduleFlags)) {
    for (const f of moduleFlags) {
      flagMap[f.moduleKey] = f.isEnabled;
    }
  }

  return (
    <div className="space-y-4" data-testid="sistem-haritasi-tab">
      <p className="text-sm text-muted-foreground">
        Tüm DOSPRESSO modülleri domain'e göre gruplandırılmıştır. Aktif modüller yeşil nokta, pasif modüller gri nokta ile gösterilir.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULE_DOMAINS.map((domain) => (
          <Card key={domain.id} className={`border ${domain.color}`} data-testid={`domain-card-${domain.id}`}>
            <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
              <div className={`w-3 h-3 rounded-full ${domain.headerColor}`} />
              <CardTitle className="text-sm font-semibold">{domain.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {domain.modules.map((moduleKey) => {
                  const isActive = flagMap[moduleKey] !== false;
                  const label = MODULE_LABELS[moduleKey] || moduleKey;
                  return (
                    <div
                      key={moduleKey}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-xs"
                      data-testid={`module-badge-${moduleKey}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-muted-foreground/40"}`}
                        title={isActive ? "Aktif" : "Pasif"}
                      />
                      <span className="text-foreground/80">{label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ROLE MAP TAB ────────────────────────────────────────────
function RolHaritasiTab() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const info = selectedRole ? ROLE_INFO[selectedRole] : null;

  return (
    <div className="flex flex-col xl:flex-row gap-4" data-testid="rol-haritasi-tab">
      <div className="flex-1 space-y-4">
        {ROLE_CATEGORIES.map((cat) => (
          <Card key={cat.label} className={`border ${cat.color}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{cat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cat.roles.map((role) => {
                  const rInfo = ROLE_INFO[role];
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role === selectedRole ? null : role)}
                      data-testid={`role-badge-${role}`}
                      className={`px-3 py-1 rounded-md text-sm border transition-colors cursor-pointer ${
                        selectedRole === role
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted hover-elevate border-border"
                      }`}
                    >
                      {rInfo?.label || role}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="xl:w-80 flex-shrink-0">
        {info ? (
          <Card data-testid="role-detail-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{info.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{info.description}</p>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Dashboard Yolu</p>
                <code className="text-xs bg-muted px-2 py-1 rounded-md block">{info.dashboard}</code>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Erişebildiği Modüller</p>
                <div className="flex flex-wrap gap-1">
                  {info.modules.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Detayları görmek için bir rol seçin
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── FLOW VIEWER TAB ────────────────────────────────────────────
function AkisGoruntuleyiciTab() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>(WORKFLOWS[0].id);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const workflow = WORKFLOWS.find((w) => w.id === selectedWorkflow)!;

  return (
    <div className="space-y-4" data-testid="akis-goruntuleme-tab">
      <div className="flex flex-wrap gap-2">
        {WORKFLOWS.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              onClick={() => { setSelectedWorkflow(w.id); setSelectedStep(null); }}
              data-testid={`workflow-btn-${w.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedWorkflow === w.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted hover-elevate border-border"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${selectedWorkflow === w.id ? "" : w.color}`} />
              <span>{w.title}</span>
            </button>
          );
        })}
      </div>

      {workflow && (
        <Card data-testid={`workflow-${workflow.id}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <workflow.icon className={`w-4 h-4 ${workflow.color}`} />
              {workflow.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1 flex-wrap">
              {workflow.steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <button
                    onClick={() => setSelectedStep(selectedStep === idx ? null : idx)}
                    data-testid={`step-${idx}`}
                    className={`flex flex-col items-center px-3 py-2 rounded-md border text-center min-w-[80px] transition-colors ${
                      selectedStep === idx
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted hover-elevate border-border"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                      selectedStep === idx ? "bg-primary-foreground text-primary" : "bg-muted-foreground/20 text-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs leading-tight">{step.title}</span>
                  </button>
                  {idx < workflow.steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {selectedStep !== null && (
              <Card className="bg-muted/30" data-testid="step-detail">
                <CardContent className="pt-4 space-y-2">
                  <p className="font-semibold text-sm">{workflow.steps[selectedStep].title}</p>
                  <p className="text-sm text-muted-foreground">{workflow.steps[selectedStep].description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Rol:</span>
                      <Badge variant="outline" className="text-xs">{ROLE_INFO[workflow.steps[selectedStep].role]?.label || workflow.steps[selectedStep].role}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Modül:</span>
                      <Badge variant="outline" className="text-xs">{MODULE_LABELS[workflow.steps[selectedStep].module] || workflow.steps[selectedStep].module}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── NOTES TAB ────────────────────────────────────────────
function ToplantiNotlariTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSection, setEditSection] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/sistem-atolyesi/notlar"],
  });

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { title: "", section: "Vizyon", content: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: NoteFormValues) =>
      apiRequest("POST", "/api/sistem-atolyesi/notlar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sistem-atolyesi/notlar"] });
      form.reset();
      setShowForm(false);
      toast({ title: "Not oluşturuldu" });
    },
    onError: () => toast({ title: "Hata", description: "Not oluşturulamadı", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/sistem-atolyesi/notlar/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sistem-atolyesi/notlar"] });
      setEditingId(null);
      toast({ title: "Not güncellendi" });
    },
    onError: () => toast({ title: "Hata", description: "Not güncellenemedi", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sistem-atolyesi/notlar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sistem-atolyesi/notlar"] });
      toast({ title: "Not silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Not silinemedi", variant: "destructive" }),
  });

  function startEdit(note: any) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditSection(note.section);
    setEditContent(note.content);
  }

  function saveEdit() {
    if (editingId === null) return;
    updateMutation.mutate({ id: editingId, data: { title: editTitle, section: editSection, content: editContent } });
  }

  const sectionColors: Record<string, string> = {
    Vizyon: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    Teknik: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    Süreç: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
    Karar: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  };

  return (
    <div className="space-y-4" data-testid="toplanti-notlari-tab">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Toplantı notlarını bölüme göre organize edin. Notlar size özeldir.</p>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-note"
        >
          <Plus className="w-4 h-4 mr-1" />
          Not Ekle
        </Button>
      </div>

      {showForm && (
        <Card data-testid="note-form-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Yeni Not</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input placeholder="Not başlığı" {...field} data-testid="input-note-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bölüm</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-note-section">
                              <SelectValue placeholder="Bölüm seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NOTE_SECTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İçerik</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Not içeriği..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-note-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={createMutation.isPending} data-testid="button-save-note">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-note">
                    İptal
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Henüz not eklenmemiş</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notes.map((note: any) => (
          <Card key={note.id} data-testid={`note-card-${note.id}`}>
            <CardContent className="pt-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="font-semibold"
                    data-testid={`input-edit-title-${note.id}`}
                  />
                  <Select value={editSection} onValueChange={setEditSection}>
                    <SelectTrigger data-testid={`select-edit-section-${note.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px]"
                    data-testid={`textarea-edit-content-${note.id}`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} data-testid={`button-save-edit-${note.id}`}>
                      {updateMutation.isPending ? "..." : "Kaydet"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${note.id}`}>
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{note.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${sectionColors[note.section] || ""}`}
                      >
                        {note.section}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(note)}
                        data-testid={`button-edit-note-${note.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(note.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(note.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────
const TABS = [
  { id: "harita", label: "Sistem Haritası", icon: LayoutGrid },
  { id: "rol", label: "Rol Haritası", icon: Users },
  { id: "akis", label: "Akış Görüntüleyici", icon: GitBranch },
  { id: "notlar", label: "Toplantı Notları", icon: FileText },
];

export default function SistemAtolyesi() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("harita");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Erişim Reddedildi</h2>
            <p className="text-sm text-muted-foreground">
              Bu sayfaya erişim yetkiniz bulunmamaktadır.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} data-testid="button-go-home">
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="sistem-atolyesi-page">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Sistem Atölyesi
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistem haritası, roller, iş akışları ve planlama aracı
            </p>
          </div>
        </div>

        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === "harita" && <SistemHaritasiTab />}
          {activeTab === "rol" && <RolHaritasiTab />}
          {activeTab === "akis" && <AkisGoruntuleyiciTab />}
          {activeTab === "notlar" && <ToplantiNotlariTab />}
        </div>
      </div>
    </div>
  );
}
