/**
 * İK Merkezi v2 — Mahmut-First Dashboard (6 May 2026 redesign)
 *
 * v1 (5 May 2026, 295 satır): Sadece menü hub'ı. 13 quick action card linki.
 * v2 (bu dosya, IK redesign): Gerçek dashboard:
 *   - Bekleyen İşler banner (kritik aksiyonlar göz seviyesinde)
 *   - KPI strip — bu ay bordro/izin/mesai durumu (rol bazlı görünüm)
 *   - 4 role-based panel (Kişisel / Yönetici / HQ İK / Admin)
 *   - Mahmut-first prensibi: "Bu ay kim eksik bordro?" 1 tıklamayla görünür
 *   - Mobile-first (pilot tablette kullanılacak)
 *
 * 5 PERSPEKTİF REVIEW (D-07):
 *   - Principal Eng: useQuery doğru queryKey, Array.isArray normalize, Number() wrap
 *   - F&B Ops:        Mahmut bekleyen bordrolar, müdür onay kuyruğu, barista bordro+izin tek tık
 *   - Senior QA:      isLoading/isError her query'de, fallback değerler, data-testid
 *   - Product Mgr:    Role'a göre filtreli, sıfır gürültü; en aksiyonlu görev en üstte
 *   - Compliance:     Muhasebe scope HQ+Fabrika+Işıklar (D-12), KVKK personel detay sadece yetkiliye
 *
 * BAĞIMLILIKLAR (mevcut sistemden değiştirmiyor):
 *   - GET /api/leave-requests?status=pending          (mevcut)
 *   - GET /api/overtime-requests?status=pending       (mevcut)
 *   - GET /api/payroll/monthly-status (yoksa skip)    (Faz 3'te eklenecek)
 *   - GET /api/personnel/birthday-this-month (yoksa skip)
 *
 * MEVCUT SAYFALARI BOZMUYOR — sadece link veriyor.
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Clock, Calendar, CreditCard, TrendingUp,
  ClipboardCheck, FileText, Coffee, Star, AlertTriangle,
  ArrowRight, BarChart2, UserPlus, Wallet, CheckCircle2,
  XCircle, Cake, Briefcase, Settings,
} from "lucide-react";

/* ───────────────────────────────────────────────────────────────────
 * Tip & Yardımcı Sabitler
 * ─────────────────────────────────────────────────────────────────── */

type RoleScope = "personal" | "manager" | "hq" | "admin";

const HQ_ROLES = ["admin", "ceo", "cgo", "coach", "trainer", "muhasebe", "muhasebe_ik"];
const MANAGER_ROLES = ["admin", "ceo", "cgo", "manager", "mudur", "supervisor", "fabrika_mudur"];
const ADMIN_ROLES = ["admin", "ceo"];
// D-12 — Muhasebe scope: HQ + Fabrika + Işıklar branchları sadece
const ACCOUNTING_BRANCH_IDS = [5, 23, 24];

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && !isNaN(v) ? v : fallback;
}
function asArray<T = any>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object") {
    const obj = d as any;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}
function tlFormat(kurus: number | null | undefined): string {
  return Number(safeNum(kurus) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

/* ───────────────────────────────────────────────────────────────────
 * Quick Action — link button
 * ─────────────────────────────────────────────────────────────────── */

interface QuickAction {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: any;
  color: keyof typeof COLOR_CLASSES;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "outline";
}

const COLOR_CLASSES = {
  green: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400",
  red: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-400",
  yellow: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-400",
  gray: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400",
  indigo: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-400",
  teal: "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-400",
} as const;

function QuickActionButton({ action, onClick }: { action: QuickAction; onClick: () => void }) {
  const Icon = action.icon;
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg transition-all text-left ${COLOR_CLASSES[action.color]} cursor-pointer w-full`}
      data-testid={`action-${action.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className="h-6 w-6" />
        {action.badge && (
          <Badge variant={action.badgeVariant || "default"} className="text-xs">
            {action.badge}
          </Badge>
        )}
      </div>
      <div className="font-semibold text-sm">{action.label}</div>
      <div className="text-xs opacity-80 mt-1">{action.description}</div>
      <ArrowRight className="h-4 w-4 mt-3 opacity-60" />
    </button>
  );
}

/* ───────────────────────────────────────────────────────────────────
 * KPI Tile (HQ + Manager)
 * ─────────────────────────────────────────────────────────────────── */

function KpiTile({
  icon: Icon, label, value, hint, tone = "neutral", onClick,
}: {
  icon: any; label: string; value: string | number; hint?: string;
  tone?: "good" | "warn" | "alert" | "neutral"; onClick?: () => void;
}) {
  const toneClass = {
    good: "text-green-600 dark:text-green-400",
    warn: "text-yellow-600 dark:text-yellow-400",
    alert: "text-red-600 dark:text-red-400",
    neutral: "text-blue-600 dark:text-blue-400",
  }[tone];

  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${toneClass}`} />
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────────────────────────────────────────────
 * Ana sayfa
 * ─────────────────────────────────────────────────────────────────── */

export default function IKMerkezi() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Rol kapsamı — bir kullanıcı birden fazla scope'a sahip olabilir
  const scopes = useMemo<Set<RoleScope>>(() => {
    const s = new Set<RoleScope>(["personal"]); // herkes kişisel
    const role = user?.role || "";
    if (MANAGER_ROLES.includes(role)) s.add("manager");
    if (HQ_ROLES.includes(role)) s.add("hq");
    if (ADMIN_ROLES.includes(role)) s.add("admin");
    return s;
  }, [user?.role]);

  // D-12 muhasebe scope kontrolü — bu kullanıcı Mahmut/CEO/Admin gibi mali rapor yetkilisi mi?
  const isAccountingScope = scopes.has("hq") &&
    ["admin", "ceo", "muhasebe", "muhasebe_ik"].includes(user?.role || "");

  /* Bekleyen İzin Sayısı — yöneticiler & HQ için */
  const { data: pendingLeaves = 0, isLoading: leavesLoading } = useQuery<number>({
    queryKey: ["/api/leave-requests/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/leave-requests?status=pending", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return asArray(data).length || safeNum((data as any)?.count);
    },
    enabled: !!user && (scopes.has("manager") || scopes.has("hq")),
  });

  /* Bekleyen Mesai Sayısı */
  const { data: pendingOvertimes = 0, isLoading: otLoading } = useQuery<number>({
    queryKey: ["/api/overtime-requests/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/overtime-requests?status=pending", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return asArray(data).length || safeNum((data as any)?.count);
    },
    enabled: !!user && (scopes.has("manager") || scopes.has("hq")),
  });

  /* Bu Ay Bordro Durumu — Mahmut/Admin için (graceful degradation) */
  const { data: payrollStatus, isLoading: payrollLoading } = useQuery<any>({
    queryKey: ["/api/payroll/monthly-status"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/monthly-status", { credentials: "include" });
      if (!res.ok) return null; // endpoint henüz yok → silently skip
      return res.json();
    },
    enabled: !!user && isAccountingScope,
    retry: false,
  });

  /* Bu hafta doğum günü olanlar (yumuşak değer — endpoint yoksa skip) */
  const { data: birthdays } = useQuery<any[]>({
    queryKey: ["/api/personnel/birthday-this-week"],
    queryFn: async () => {
      const res = await fetch("/api/personnel/birthday-this-week", { credentials: "include" });
      if (!res.ok) return [];
      return asArray(await res.json());
    },
    enabled: !!user && (scopes.has("manager") || scopes.has("hq")),
    retry: false,
  });

  const totalPending = safeNum(pendingLeaves) + safeNum(pendingOvertimes);

  /* ─── Quick Action listeleri (rol bazlı) ─────────────────────────── */
  const personalActions: QuickAction[] = [
    { id: "bordrom", label: "Bordrom", description: "Aylık maaş ve kesinti detayı", path: "/bordrom", icon: CreditCard, color: "green" },
    { id: "izinlerim", label: "İzinlerim", description: "Hak edilen + kalan + talep", path: "/izin-talepleri", icon: Calendar, color: "orange" },
    { id: "mesai-talep", label: "Mesai Talebi", description: "Fazla mesai başvurusu", path: "/mesai-talepleri", icon: Clock, color: "purple" },
    { id: "performansim", label: "Performansım", description: "Skorum, sıralamam, AI öneri", path: "/performansim", icon: TrendingUp, color: "blue" },
  ];
  const managerActions: QuickAction[] = [
    {
      id: "manager-onay-kuyrugu", label: "Onay Kuyruğu",
      description: "Bekleyen izin & mesai talepleri",
      path: "/izin-talepleri", icon: ClipboardCheck, color: "yellow",
      badge: totalPending > 0 ? String(totalPending) : undefined,
      badgeVariant: totalPending > 5 ? "destructive" : "default",
    },
    { id: "vardiya-planla", label: "Vardiya Planla", description: "Haftalık vardiya planlama", path: "/vardiya-planlama", icon: Coffee, color: "blue" },
    { id: "manager-rating", label: "Personel Puanla", description: "Aylık manager rating", path: "/yonetici-puanlama", icon: Star, color: "yellow" },
    { id: "sube-bordro", label: "Şube Bordro Özeti", description: "Şube personel bordro durumu", path: "/sube-bordro-ozet", icon: Wallet, color: "green" },
  ];
  const hqActions: QuickAction[] = [
    { id: "personel-yonetim", label: "Personel Yönetimi", description: "Tüm personel listesi & CRUD", path: "/ik", icon: Users, color: "indigo" },
    { id: "performans-yonetim", label: "Performans Yönetim", description: "Tüm personel skor takibi", path: "/performans-yonetim", icon: BarChart2, color: "red" },
    { id: "ik-raporlar", label: "İK Raporları", description: "PDKS, devam, performans rapor", path: "/ik-raporlari", icon: FileText, color: "gray" },
    { id: "onboarding", label: "Onboarding", description: "Yeni personel akışı", path: "/personel-onboarding-akisi", icon: UserPlus, color: "teal" },
  ];
  const adminActions: QuickAction[] = [
    { id: "bordro-toplu", label: "Toplu Bordro", description: "Aylık tüm personel bordro hesaplama", path: "/maas", icon: CreditCard, color: "green" },
    { id: "skor-parametre", label: "Skor Kriterleri", description: "Performans skor parametreleri", path: "/admin/skor-parametreleri", icon: Settings, color: "purple" },
    { id: "pozisyon-maas", label: "Pozisyon × Maaş", description: "Şube pozisyon maaş matrisi (Lara modeli)", path: "/admin/pozisyon-maas", icon: Briefcase, color: "indigo" },
  ];

  /* ─── Loading state ──────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4 pb-20">
      {/* Header — kullanıcı karşılama */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-blue-600" />
            İK Merkezi
          </CardTitle>
          <CardDescription>
            Merhaba <strong>{user.firstName || user.username}</strong>
            {scopes.has("admin") && " · Admin"}
            {!scopes.has("admin") && scopes.has("hq") && " · HQ"}
            {!scopes.has("admin") && !scopes.has("hq") && scopes.has("manager") && " · Yönetici"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bekleyen İşler — kritik banner (yöneticiler) */}
      {(scopes.has("manager") || scopes.has("hq")) && totalPending > 0 && (
        <Card
          className={`border-l-4 ${totalPending > 5 ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${totalPending > 5 ? "text-red-600" : "text-yellow-600"}`} />
              {totalPending} bekleyen aksiyon
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {pendingLeaves > 0 && (
              <Button
                variant="outline"
                onClick={() => setLocation("/izin-talepleri")}
                className="bg-orange-50 dark:bg-orange-950/30"
                data-testid="button-pending-leaves"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {pendingLeaves} izin talebi
              </Button>
            )}
            {pendingOvertimes > 0 && (
              <Button
                variant="outline"
                onClick={() => setLocation("/mesai-talepleri")}
                className="bg-purple-50 dark:bg-purple-950/30"
                data-testid="button-pending-overtimes"
              >
                <Clock className="h-4 w-4 mr-2" />
                {pendingOvertimes} mesai talebi
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI strip — Mahmut & HQ için bordro/personel durumu */}
      {isAccountingScope && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {payrollLoading ? (
            <>
              <Skeleton className="h-24" /><Skeleton className="h-24" />
              <Skeleton className="h-24" /><Skeleton className="h-24" />
            </>
          ) : payrollStatus ? (
            <>
              <KpiTile
                icon={CheckCircle2}
                label="Bu ay tamamlanan bordro"
                value={`${safeNum(payrollStatus.completed)}/${safeNum(payrollStatus.total)}`}
                tone={safeNum(payrollStatus.completed) === safeNum(payrollStatus.total) ? "good" : "warn"}
                onClick={() => setLocation("/maas")}
              />
              <KpiTile
                icon={XCircle}
                label="Eksik bordro"
                value={safeNum(payrollStatus.missing)}
                tone={safeNum(payrollStatus.missing) > 0 ? "alert" : "good"}
                hint={safeNum(payrollStatus.missing) > 0 ? "tıkla → bordro hesapla" : undefined}
                onClick={() => setLocation("/maas")}
              />
              <KpiTile
                icon={Wallet}
                label="Toplam brüt (TL)"
                value={tlFormat(payrollStatus.totalGross)}
                tone="neutral"
                hint={`${safeNum(payrollStatus.completed)} personel`}
              />
              <KpiTile
                icon={Calendar}
                label="Aktif izinde"
                value={safeNum(payrollStatus.onLeaveToday)}
                tone={safeNum(payrollStatus.onLeaveToday) > 5 ? "warn" : "neutral"}
                onClick={() => setLocation("/izin-talepleri")}
              />
            </>
          ) : (
            <Card className="col-span-2 md:col-span-4 bg-gray-50 dark:bg-gray-900/50">
              <CardContent className="p-4 text-xs text-muted-foreground text-center">
                Bu ay bordro KPI'ları için <code>/api/payroll/monthly-status</code> endpoint'i Faz 3'te eklenecek.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Doğum günü kutusu (yumuşak — manager/HQ) */}
      {(scopes.has("manager") || scopes.has("hq")) && asArray(birthdays).length > 0 && (
        <Card className="bg-pink-50 dark:bg-pink-950/30 border-pink-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-600" />
              Bu hafta doğum günü ({asArray(birthdays).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {asArray<any>(birthdays).slice(0, 5).map((b: any, i: number) => (
              <span key={i} className="inline-block mr-3">
                🎂 <strong>{b.firstName} {b.lastName}</strong> · {b.dateLabel}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Kişisel İşlemler — herkes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kişisel</CardTitle>
          <CardDescription>Bordro, izin, mesai, performans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {personalActions.map((a) => (
              <QuickActionButton key={a.id} action={a} onClick={() => setLocation(a.path)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Yönetici İşlemleri */}
      {scopes.has("manager") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yönetici</CardTitle>
            <CardDescription>Takım yönetimi, vardiya, onay kuyruğu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {managerActions.map((a) => (
                <QuickActionButton key={a.id} action={a} onClick={() => setLocation(a.path)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HQ İK Panel */}
      {scopes.has("hq") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">HQ / Merkez</CardTitle>
            <CardDescription>Tüm şubeler, raporlama, personel yönetimi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hqActions.map((a) => (
                <QuickActionButton key={a.id} action={a} onClick={() => setLocation(a.path)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Panel */}
      {scopes.has("admin") && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </CardTitle>
            <CardDescription>Bordro, sistem parametreleri, pozisyon × maaş</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {adminActions.map((a) => (
                <QuickActionButton key={a.id} action={a} onClick={() => setLocation(a.path)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yardım */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong>💡 İK Merkezi v2 — değişiklik özeti:</strong>{" "}
          Bekleyen aksiyonlar üstte, KPI'lar Mahmut için, role-based panel filtreleme aşağıda.
          Mevcut sayfalar olduğu gibi çalışır — bu hub onları organize ediyor, içeriklerini değiştirmiyor.
        </CardContent>
      </Card>
    </div>
  );
}
