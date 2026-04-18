# CRM Sprint 2 — İletişim Merkezi Frontend

## Context
DOSPRESSO franchise management platform. Stack: React 18 + TypeScript, Shadcn/ui, TanStack Query v5, Wouter routing.
Backend already complete: all endpoints under `/api/iletisim/` prefix.
Do NOT touch academy, factory, HR, or any non-CRM files.
users.id is VARCHAR. Dark mode mandatory on all new components.

---

## WHAT WE'RE BUILDING

A new page: `client/src/pages/iletisim-merkezi/index.tsx`
With 4 supporting tab files:
- `client/src/pages/iletisim-merkezi/DashboardTab.tsx`
- `client/src/pages/iletisim-merkezi/TicketsTab.tsx`
- `client/src/pages/iletisim-merkezi/HqTasksTab.tsx`
- `client/src/pages/iletisim-merkezi/BroadcastTab.tsx`

Plus shared components:
- `client/src/pages/iletisim-merkezi/TicketDetailSheet.tsx`
- `client/src/pages/iletisim-merkezi/NewTicketDialog.tsx`
- `client/src/pages/iletisim-merkezi/categoryConfig.ts`

Route: `/iletisim-merkezi` registered in `client/src/App.tsx`
Sidebar entry: add "İletişim Merkezi" to sidebar for roles: admin, ceo, cgo, muhasebe_ik, satinalma, coach, trainer, supervisor, mudur

---

## TASK 1 — categoryConfig.ts

Create `client/src/pages/iletisim-merkezi/categoryConfig.ts`:

```typescript
export const DEPARTMENTS = [
  {
    key: "teknik",
    label: "Teknik Destek",
    icon: "🔧",
    description: "Makine arızası, kalibrasyon, ekipman",
    slaLabel: "Kritik: 4s · Normal: 24s",
    assigneeRole: "teknik_sorumlu",
  },
  {
    key: "lojistik",
    label: "Lojistik & Sevkiyat",
    icon: "📦",
    description: "Eksik ürün, geç teslimat, kalite sorunu",
    slaLabel: "24 saat",
    assigneeRole: "satinalma",
  },
  {
    key: "muhasebe",
    label: "Finans & Muhasebe",
    icon: "💰",
    description: "Fatura, ödeme, cari hesap",
    slaLabel: "48 saat",
    assigneeRole: "muhasebe_ik",
  },
  {
    key: "marketing",
    label: "Marketing & Marka",
    icon: "📢",
    description: "Materyal, reklam, lansman desteği",
    slaLabel: "72 saat",
    assigneeRole: "cgo",
  },
  {
    key: "trainer",
    label: "Eğitim & Reçete",
    icon: "🎓",
    description: "Reçete sorusu, personel eğitimi",
    slaLabel: "48 saat",
    assigneeRole: "coach",
  },
  {
    key: "hr",
    label: "Personel & HR",
    icon: "👥",
    description: "İşe alım, izin, maaş, disiplin",
    slaLabel: "72 saat",
    assigneeRole: "muhasebe_ik",
  },
] as const;

export type DepartmentKey = typeof DEPARTMENTS[number]["key"];

export const PRIORITIES = [
  { key: "dusuk", label: "Düşük", color: "text-muted-foreground" },
  { key: "normal", label: "Normal", color: "text-blue-600 dark:text-blue-400" },
  { key: "yuksek", label: "Yüksek", color: "text-amber-600 dark:text-amber-400" },
  { key: "kritik", label: "Kritik", color: "text-red-600 dark:text-red-400" },
] as const;

export const STATUSES = [
  { key: "acik", label: "Açık", variant: "outline" as const },
  { key: "islemde", label: "İşlemde", variant: "secondary" as const },
  { key: "beklemede", label: "Beklemede", variant: "secondary" as const },
  { key: "cozuldu", label: "Çözüldü", variant: "default" as const },
  { key: "kapatildi", label: "Kapatıldı", variant: "outline" as const },
] as const;

export function getDeptConfig(key: string) {
  return DEPARTMENTS.find(d => d.key === key);
}

export function getPriorityConfig(key: string) {
  return PRIORITIES.find(p => p.key === key);
}

export function getStatusConfig(key: string) {
  return STATUSES.find(s => s.key === key);
}

// HQ roles that have access to İletişim Merkezi
export const HQ_ROLES = ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "kalite_kontrol"];

export function isHQRole(role: string): boolean {
  return HQ_ROLES.includes(role);
}

export function canSeeAllTickets(role: string): boolean {
  return ["admin", "ceo", "cgo"].includes(role);
}
```

---

## TASK 2 — Main Shell: index.tsx

Create `client/src/pages/iletisim-merkezi/index.tsx` (max 180 lines):

```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; // use existing auth hook
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketDialog } from "./NewTicketDialog";
import { isHQRole } from "./categoryConfig";

const DashboardTab = lazy(() => import("./DashboardTab"));
const TicketsTab = lazy(() => import("./TicketsTab"));
const HqTasksTab = lazy(() => import("./HqTasksTab"));
const BroadcastTab = lazy(() => import("./BroadcastTab"));

export default function IletisimMerkezi() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNewTicket, setShowNewTicket] = useState(false);

  // Read ?tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  // Sync tab to URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // Dashboard stats for badge counts
  const { data: dashStats } = useQuery<any>({
    queryKey: ["/api/iletisim/dashboard"],
    refetchInterval: 60_000,
  });

  const openCount = dashStats?.openTickets ?? 0;
  const hqOverdue = dashStats?.hqTaskStats?.find((s: any) => s.status === "beklemede")?.count ?? 0;

  const tabsForRole = [
    { key: "dashboard", label: "Dashboard", showFor: "all" },
    { key: "tickets", label: "Şube Talepleri", badge: openCount > 0 ? openCount : null, showFor: "all" },
    { key: "hq-tasks", label: "HQ Görevler", badge: hqOverdue > 0 ? hqOverdue : null, showFor: "hq" },
    { key: "broadcast", label: "Duyurular", showFor: "hq" },
  ].filter(t => {
    if (t.showFor === "all") return true;
    if (t.showFor === "hq") return isHQRole(user?.role ?? "");
    return false;
  });

  const TabSkeleton = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium">İletişim Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Şube Talepleri · HQ Görevler · Duyurular
          </p>
        </div>
        <Button
          onClick={() => setShowNewTicket(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Yeni Ticket
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 h-auto flex-wrap gap-1 bg-transparent p-0 border-b border-border rounded-none w-full justify-start">
          {tabsForRole.map(tab => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-4 py-2 text-sm"
            >
              {tab.label}
              {tab.badge != null && (
                <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <Suspense fallback={<TabSkeleton />}>
          <TabsContent value="dashboard" className="mt-0">
            <DashboardTab stats={dashStats} />
          </TabsContent>
          <TabsContent value="tickets" className="mt-0">
            <TicketsTab />
          </TabsContent>
          {isHQRole(user?.role ?? "") && (
            <>
              <TabsContent value="hq-tasks" className="mt-0">
                <HqTasksTab />
              </TabsContent>
              <TabsContent value="broadcast" className="mt-0">
                <BroadcastTab />
              </TabsContent>
            </>
          )}
        </Suspense>
      </Tabs>

      <NewTicketDialog open={showNewTicket} onOpenChange={setShowNewTicket} />
    </div>
  );
}
```

---

## TASK 3 — DashboardTab.tsx

Create `client/src/pages/iletisim-merkezi/DashboardTab.tsx`:

Key elements:
- Mr. Dobody banner (amber border, robot emoji, dynamic message based on stats)
- 4 KPI cards: Açık Şube Talebi, SLA İhlali (red if > 0), SLA Risk (amber), Müşteri GB
- Department load bar chart (from deptBreakdown data)
- Recent activity list (last 10 tickets from recentTickets)
- Branch health mini-preview (top 5 branches, only for CGO/CEO)

```typescript
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { canSeeAllTickets, getDeptConfig } from "./categoryConfig";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface DashboardTabProps {
  stats: any;
}

export default function DashboardTab({ stats }: DashboardTabProps) {
  const { user } = useAuth();

  if (!stats) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const { openTickets, slaBreaches, slaRisk, b2cFeedbackCount, deptBreakdown, recentTickets } = stats;

  // Dobody message
  const dobodyMessage = slaBreaches > 0
    ? `${slaBreaches} ticket SLA süresini aştı. ${deptBreakdown?.[0]?.department ? `${getDeptConfig(deptBreakdown[0].department)?.label} departmanı en yüklü.` : ""} Hemen inceleyin.`
    : openTickets > 0
    ? `${openTickets} açık şube talebi var. Tümü zamanında yanıtlanıyor.`
    : "Aktif SLA ihlali yok. Tüm talepler zamanında yanıtlanıyor.";

  const maxDeptCount = Math.max(...(deptBreakdown?.map((d: any) => parseInt(d.count)) ?? [1]));

  return (
    <div className="space-y-4">
      {/* Dobody Banner */}
      <div className="flex gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg flex-shrink-0">
          🤖
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Mr. Dobody</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{dobodyMessage}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Açık Şube Talebi</p>
            <p className={cn("text-2xl font-medium", openTickets > 5 ? "text-amber-500" : "text-foreground")}>{openTickets}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{slaRisk > 0 ? `${slaRisk} SLA riski` : "Tümü zamanında"}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">SLA İhlali</p>
            <p className={cn("text-2xl font-medium", slaBreaches > 0 ? "text-red-500" : "text-foreground")}>{slaBreaches}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{slaBreaches > 0 ? "Acil aksiyon gerekiyor" : "İhlal yok"}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">SLA Risk</p>
            <p className={cn("text-2xl font-medium", slaRisk > 0 ? "text-amber-500" : "text-foreground")}>{slaRisk}</p>
            <p className="text-[10px] text-muted-foreground mt-1">2 saat içinde aşılır</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Müşteri GB</p>
            <p className="text-2xl font-medium text-foreground">{b2cFeedbackCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Son 30 gün</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Department Load */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Departman Yük Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(deptBreakdown ?? []).map((dept: any) => {
              const cfg = getDeptConfig(dept.department);
              const count = parseInt(dept.count);
              const breached = parseInt(dept.sla_breached_count ?? 0);
              const pct = maxDeptCount > 0 ? (count / maxDeptCount) * 100 : 0;
              return (
                <div key={dept.department}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{cfg?.icon} {cfg?.label ?? dept.department}</span>
                    <span className={breached > 0 ? "text-red-500" : "text-muted-foreground"}>
                      {count} açık{breached > 0 ? ` · ${breached} ihlal` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", breached > 0 ? "bg-red-500" : count > 2 ? "bg-amber-500" : "bg-blue-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!deptBreakdown || deptBreakdown.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-3">Açık talep yok</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {(recentTickets ?? []).slice(0, 6).map((ticket: any) => {
              const cfg = getDeptConfig(ticket.department);
              return (
                <div key={ticket.id} className="flex items-start gap-2.5 py-2.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    ticket.sla_breached ? "bg-red-500" :
                    ticket.priority === "kritik" ? "bg-red-400" :
                    ticket.priority === "yuksek" ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ticket.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {ticket.branch_name} · {cfg?.label ?? ticket.department} · {
                        formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                      }
                    </p>
                  </div>
                  {ticket.sla_breached && (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1.5 flex-shrink-0">SLA</Badge>
                  )}
                </div>
              );
            })}
            {(!recentTickets || recentTickets.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">Henüz aktivite yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## TASK 4 — TicketsTab.tsx

Create `client/src/pages/iletisim-merkezi/TicketsTab.tsx`:

Features:
- 6 department tile cards at top (icon + name + open count + SLA status)
- Filter row: Tümü / SLA İhlali / İşlemde / Çözüldü + Şube dropdown + Öncelik dropdown
- Ticket table with columns: dot indicator, title+meta, branch, dept badge, priority badge, status badge
- Click row → opens TicketDetailSheet (side drawer)

```typescript
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, getDeptConfig, getPriorityConfig, getStatusConfig } from "./categoryConfig";
import { TicketDetailSheet } from "./TicketDetailSheet";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

export default function TicketsTab() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/iletisim/tickets", statusFilter, deptFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (deptFilter !== "all") params.set("department", deptFilter);
      const res = await fetch(`/api/iletisim/tickets?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Count per department
  const deptCounts = DEPARTMENTS.map(d => ({
    ...d,
    count: tickets.filter((t: any) => t.department === d.key && !["cozuldu","kapatildi"].includes(t.status)).length,
    breached: tickets.filter((t: any) => t.department === d.key && t.sla_breached).length,
  }));

  const priorityColors: Record<string, string> = {
    kritik: "text-red-500",
    yuksek: "text-amber-500",
    normal: "text-blue-500",
    dusuk: "text-muted-foreground",
  };

  const dotColors: Record<string, string> = {
    kritik: "bg-red-500",
    yuksek: "bg-amber-500",
    normal: "bg-blue-500",
    dusuk: "bg-muted-foreground",
  };

  return (
    <div className="space-y-4" data-testid="tickets-tab">
      {/* Department tiles */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {deptCounts.map(dept => (
          <button
            key={dept.key}
            onClick={() => setDeptFilter(deptFilter === dept.key ? "all" : dept.key)}
            className={cn(
              "text-left p-3 rounded-lg border transition-all",
              deptFilter === dept.key
                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                : "border-border bg-muted/30 hover:border-border/80"
            )}
            data-testid={`dept-tile-${dept.key}`}
          >
            <div className="text-base mb-1">{dept.icon}</div>
            <div className="text-[11px] font-medium leading-tight">{dept.label}</div>
            <div className={cn("text-[10px] mt-1", dept.breached > 0 ? "text-red-500" : "text-muted-foreground")}>
              {dept.count} açık{dept.breached > 0 ? ` · ${dept.breached} SLA` : ""}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          { key: "all", label: "Tümü" },
          { key: "sla", label: "SLA İhlali" },
          { key: "islemde", label: "İşlemde" },
          { key: "cozuldu", label: "Çözüldü" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-all",
              statusFilter === f.key
                ? "bg-red-600 border-red-600 text-white"
                : "border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <Card>
        {/* Header */}
        <div className="grid grid-cols-[12px_1fr_80px_70px_70px_75px] gap-2 px-4 py-2 border-b border-border text-[10px] text-muted-foreground font-medium">
          <div />
          <div>Talep</div>
          <div>Şube</div>
          <div>Dept.</div>
          <div>Öncelik</div>
          <div>Durum</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Yükleniyor...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Talep bulunamadı</div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket: any) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="w-full grid grid-cols-[12px_1fr_80px_70px_70px_75px] gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                data-testid={`ticket-row-${ticket.id}`}
              >
                <div className="flex items-start pt-1.5">
                  <div className={cn("w-2 h-2 rounded-full", ticket.sla_breached ? "bg-red-500" : dotColors[ticket.priority] ?? "bg-muted")} />
                </div>
                <div>
                  <p className="text-xs font-medium truncate">{ticket.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {ticket.ticket_number} · {ticket.assigned_to_name ? `Atandı: ${ticket.assigned_to_name}` : "Atanmadı"} · {
                      formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                    }
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground self-center">{ticket.branch_name ?? "—"}</div>
                <div className="self-center">
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {getDeptConfig(ticket.department)?.icon} {getDeptConfig(ticket.department)?.label?.split(" ")[0]}
                  </Badge>
                </div>
                <div className={cn("text-[11px] font-medium self-center", priorityColors[ticket.priority])}>
                  {getPriorityConfig(ticket.priority)?.label}
                </div>
                <div className="self-center">
                  {ticket.sla_breached ? (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1.5">SLA İhlal</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {getStatusConfig(ticket.status)?.label}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Ticket detail sheet */}
      {selectedTicketId && (
        <TicketDetailSheet
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={(open) => { if (!open) setSelectedTicketId(null); }}
        />
      )}
    </div>
  );
}
```

---

## TASK 5 — TicketDetailSheet.tsx

Create `client/src/pages/iletisim-merkezi/TicketDetailSheet.tsx`:

Side drawer (Sheet from Shadcn) showing full ticket detail.

Features:
- Ticket metadata: number, branch, dept, priority, status, SLA countdown
- Description
- Activity timeline (comments + status changes)
- Reply input (branch sees non-internal only; HQ can toggle internal)
- HQ actions: Change status, Reassign
- SLA countdown: green if > 4h, amber if 1-4h, red if < 1h or breached

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getDeptConfig, getPriorityConfig, isHQRole, STATUSES } from "./categoryConfig";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { tr } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient"; // use existing apiRequest helper

interface TicketDetailSheetProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailSheet({ ticketId, open, onOpenChange }: TicketDetailSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ["/api/iletisim/tickets", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${ticketId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && !!ticketId,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/iletisim/tickets/${ticketId}/comments`, {
        content: comment.trim(),
        isInternal,
      });
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets", ticketId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/iletisim/tickets/${ticketId}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets", ticketId] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
    },
  });

  // SLA countdown
  const getSlaStatus = () => {
    if (!ticket?.sla_deadline) return null;
    if (ticket.sla_breached) return { label: "SLA Aşıldı", color: "text-red-500 dark:text-red-400" };
    const hoursLeft = (new Date(ticket.sla_deadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) return { label: "SLA Aşıldı", color: "text-red-500" };
    if (hoursLeft < 1) return { label: `${Math.floor(hoursLeft * 60)} dk kaldı`, color: "text-red-500" };
    if (hoursLeft < 4) return { label: `${hoursLeft.toFixed(1)} saat kaldı`, color: "text-amber-500" };
    return { label: `${hoursLeft.toFixed(0)} saat kaldı`, color: "text-green-600 dark:text-green-400" };
  };

  const slaStatus = getSlaStatus();
  const dept = getDeptConfig(ticket?.department ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-testid="ticket-detail-sheet">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-sm text-muted-foreground">Yükleniyor...</div>
          </div>
        ) : !ticket ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-sm text-muted-foreground">Ticket bulunamadı</div>
          </div>
        ) : (
          <div className="space-y-5 pb-8">
            <SheetHeader>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-muted-foreground">{ticket.ticket_number}</span>
                <Badge variant="outline" className="text-[10px]">
                  {dept?.icon} {dept?.label}
                </Badge>
                <Badge
                  variant={ticket.sla_breached ? "destructive" : "outline"}
                  className="text-[10px]"
                >
                  {ticket.priority?.toUpperCase()}
                </Badge>
              </div>
              <SheetTitle className="text-base leading-snug">{ticket.title}</SheetTitle>
            </SheetHeader>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Şube</p>
                <p className="text-xs font-medium">{ticket.branch_name ?? "—"}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Atanan</p>
                <p className="text-xs font-medium">{ticket.assigned_to_name ?? "Atanmadı"}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Durum</p>
                <p className="text-xs font-medium">{STATUSES.find(s => s.key === ticket.status)?.label ?? ticket.status}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-[10px] text-muted-foreground mb-1">SLA Durumu</p>
                <p className={cn("text-xs font-medium", slaStatus?.color ?? "text-foreground")}>
                  {slaStatus?.label ?? "—"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-muted/30 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Açıklama</p>
              <p className="text-sm leading-relaxed">{ticket.description}</p>
            </div>

            {/* HQ Actions */}
            {isHQRole(user?.role ?? "") && ticket.status !== "cozuldu" && ticket.status !== "kapatildi" && (
              <div className="flex gap-2 flex-wrap">
                <Select onValueChange={(v) => statusMutation.mutate(v)}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue placeholder="Durum Değiştir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="islemde">İşlemde</SelectItem>
                    <SelectItem value="beklemede">Beklemede</SelectItem>
                    <SelectItem value="cozuldu">Çözüldü</SelectItem>
                    <SelectItem value="kapatildi">Kapatıldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Activity / Comments */}
            <div>
              <p className="text-xs font-medium mb-3">Aktivite Geçmişi</p>
              <div className="space-y-3">
                {/* Created event */}
                <div className="flex gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">
                      {ticket.created_by_name ?? "Sistem"} tarafından açıldı · {
                        formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                      }
                    </span>
                  </div>
                </div>
                {/* Comments */}
                {(ticket.comments ?? []).map((c: any) => (
                  <div key={c.id} className={cn("flex gap-2.5 text-xs", c.is_internal && "opacity-70")}>
                    <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", c.is_internal ? "bg-purple-500" : "bg-green-500")} />
                    <div>
                      <p className="font-medium">{c.author_name} {c.is_internal && <span className="text-purple-500 font-normal">(dahili)</span>}</p>
                      <p className="text-muted-foreground mt-0.5">{c.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply box */}
            {ticket.status !== "kapatildi" && (
              <div className="space-y-2 border-t border-border pt-4">
                <Textarea
                  placeholder="Yanıt yazın..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="text-sm min-h-[80px] resize-none"
                  data-testid="comment-input"
                />
                {isHQRole(user?.role ?? "") && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-toggle"
                      checked={isInternal}
                      onCheckedChange={setIsInternal}
                      className="scale-75"
                    />
                    <Label htmlFor="internal-toggle" className="text-xs text-muted-foreground cursor-pointer">
                      Dahili not (şube göremez)
                    </Label>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => commentMutation.mutate()}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="w-full"
                  data-testid="submit-comment-btn"
                >
                  {commentMutation.isPending ? "Gönderiliyor..." : "Yanıt Gönder"}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

---

## TASK 6 — NewTicketDialog.tsx

Create `client/src/pages/iletisim-merkezi/NewTicketDialog.tsx`:

Features:
- Department selection (6 tile buttons with icon+label)
- Auto-shows assignee and SLA info when dept selected
- Title input, description textarea
- Priority selection (4 buttons)
- Submit → POST /api/iletisim/tickets → invalidate queries

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, PRIORITIES } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const qc = useQueryClient();
  const [dept, setDept] = useState("");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedDept = DEPARTMENTS.find(d => d.key === dept);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/iletisim/tickets", {
        department: dept,
        title: title.trim(),
        description: description.trim(),
        priority,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
      onOpenChange(false);
      setDept(""); setPriority("normal"); setTitle(""); setDescription("");
    },
  });

  const canSubmit = dept && title.trim().length >= 5 && description.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="new-ticket-dialog">
        <DialogHeader>
          <DialogTitle>Yeni Destek Talebi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Department selection */}
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Departman Seçin</p>
            <div className="grid grid-cols-3 gap-2">
              {DEPARTMENTS.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDept(d.key)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    dept === d.key
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                      : "border-border hover:border-border/60 bg-muted/30"
                  )}
                  data-testid={`dept-btn-${d.key}`}
                >
                  <div className="text-base mb-1">{d.icon}</div>
                  <div className="text-[11px] font-medium leading-tight">{d.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-assign info */}
          {selectedDept && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              <div className="text-xs text-green-700 dark:text-green-300">
                <span className="font-medium">Otomatik yönlendirilecek</span> · SLA: {selectedDept.slaLabel}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Konu Başlığı</p>
            <Input
              placeholder="Kısaca açıklayın..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-sm"
              data-testid="ticket-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Detay</p>
            <Textarea
              placeholder="Sorunu detaylı açıklayın..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="text-sm resize-none"
              rows={4}
              data-testid="ticket-desc-input"
            />
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Öncelik</p>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={cn(
                    "flex-1 py-1.5 text-xs rounded-md border transition-all",
                    priority === p.key
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                  data-testid={`priority-btn-${p.key}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            data-testid="submit-ticket-btn"
          >
            {mutation.isPending ? "Gönderiliyor..." : "Ticket Aç → Otomatik Yönlendir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## TASK 7 — HqTasksTab.tsx

Create `client/src/pages/iletisim-merkezi/HqTasksTab.tsx`:

Features:
- Filter: Tümüm / Bana Atanan / Ben Atadım / Gecikmiş
- Task cards with: progress bar, assignee info, due date, priority
- New HQ task modal (title, assign to HQ member, priority, due date)
- Progress update (percentage slider)

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HqTasksTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDueDate, setNewDueDate] = useState("");

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/iletisim/hq-tasks", filter],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/hq-tasks?filter=${filter}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Get HQ users for assignee dropdown
  const { data: hqUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users/hq"],
    queryFn: async () => {
      const res = await fetch("/api/users?hqOnly=true");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/iletisim/hq-tasks", {
      title: newTitle.trim(),
      description: newDesc.trim(),
      assignedToUserId: newAssignee,
      priority: newPriority,
      dueDate: newDueDate || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/hq-tasks"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
      setShowNew(false);
      setNewTitle(""); setNewDesc(""); setNewAssignee(""); setNewPriority("normal"); setNewDueDate("");
    },
  });

  const progressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) =>
      apiRequest("PATCH", `/api/iletisim/hq-tasks/${id}`, { progressPercent: progress }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/iletisim/hq-tasks"] }),
  });

  const statusColors: Record<string, string> = {
    beklemede: "text-muted-foreground",
    devam_ediyor: "text-blue-500",
    tamamlandi: "text-green-500",
    iptal: "text-red-500",
  };

  return (
    <div className="space-y-4" data-testid="hq-tasks-tab">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tümü" },
            { key: "assigned_to_me", label: "Bana Atanan" },
            { key: "i_assigned", label: "Ben Atadım" },
            { key: "overdue", label: "Gecikmiş" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all",
                filter === f.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Yeni Görev
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Görev bulunamadı</div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task: any) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "tamamlandi";
            return (
              <Card key={task.id} className={cn("transition-all", isOverdue && "border-red-200 dark:border-red-900")} data-testid={`hq-task-${task.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium">{task.task_number}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {PRIORITIES.find(p => p.key === task.priority)?.label}
                        </Badge>
                        <span className={cn("text-[11px]", statusColors[task.status])}>
                          {task.status === "beklemede" ? "Beklemede" : task.status === "devam_ediyor" ? "Devam Ediyor" : task.status === "tamamlandi" ? "Tamamlandı" : "İptal"}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.assigned_by_name} → {task.assigned_to_name}
                        {task.due_date && (
                          <span className={cn("ml-2", isOverdue ? "text-red-500" : "")}>
                            · Son: {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: tr })}
                          </span>
                        )}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>İlerleme</span>
                          <span>%{task.progress_percent}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${task.progress_percent}%` }}
                          />
                        </div>
                        {/* Progress buttons */}
                        {(task.assigned_to_user_id === user?.id || task.assigned_by_user_id === user?.id) && task.status !== "tamamlandi" && (
                          <div className="flex gap-1 mt-2">
                            {[25, 50, 75, 100].map(pct => (
                              <button
                                key={pct}
                                onClick={() => progressMutation.mutate({ id: task.id, progress: pct })}
                                className={cn(
                                  "flex-1 text-[10px] py-0.5 rounded border transition-all",
                                  task.progress_percent === pct ? "bg-blue-500 text-white border-blue-500" : "border-border text-muted-foreground hover:border-foreground/30"
                                )}
                              >
                                %{pct}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New task dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md" data-testid="new-hq-task-dialog">
          <DialogHeader>
            <DialogTitle>Yeni HQ Görevi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Görev başlığı" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="text-sm" />
            <Textarea placeholder="Açıklama (opsiyonel)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="text-sm resize-none" />
            <Select value={newAssignee} onValueChange={setNewAssignee}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Kişi Seç" /></SelectTrigger>
              <SelectContent>
                {hqUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setNewPriority(p.key)}
                  className={cn(
                    "flex-1 py-1.5 text-xs rounded border transition-all",
                    newPriority === p.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="text-sm" />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || !newAssignee || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Görevi Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## TASK 8 — BroadcastTab.tsx

Create `client/src/pages/iletisim-merkezi/BroadcastTab.tsx`:

Uses existing `/api/announcements` endpoint (already exists). Adds receipt tracking.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Check } from "lucide-react";

const BROADCAST_TYPES = [
  { key: "urgent", label: "Acil Uyarı", icon: "🚨", borderColor: "border-l-red-500" },
  { key: "product", label: "Ürün", icon: "📦", borderColor: "border-l-blue-500" },
  { key: "campaign", label: "Kampanya", icon: "📅", borderColor: "border-l-amber-500" },
  { key: "price", label: "Fiyat", icon: "💰", borderColor: "border-l-green-500" },
  { key: "training", label: "Eğitim", icon: "🎓", borderColor: "border-l-purple-500" },
  { key: "operation", label: "Operasyon", icon: "📋", borderColor: "border-l-gray-400" },
];

export default function BroadcastTab() {
  const qc = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
  });

  const confirmMutation = useMutation({
    mutationFn: async (announcementId: number) =>
      apiRequest("POST", `/api/iletisim/broadcast/${announcementId}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/announcements"] }),
  });

  return (
    <div className="space-y-3" data-testid="broadcast-tab">
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Duyuru bulunamadı</div>
      ) : (
        announcements.map((ann: any) => (
          <div
            key={ann.id}
            className={cn("border-l-[3px] rounded-r-lg bg-muted/30 p-3", "border-l-blue-500")}
            data-testid={`announcement-${ann.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
                  {ann.priority === "urgent" ? "🚨 Acil" : "📢 Duyuru"}
                </p>
                <p className="text-sm font-medium">{ann.title}</p>
                {ann.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(ann.createdAt ?? ann.created_at), { addSuffix: true, locale: tr })}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 h-7 text-xs"
                onClick={() => confirmMutation.mutate(ann.id)}
                disabled={confirmMutation.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Onayladım
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

---

## TASK 9 — App.tsx Route + Sidebar

### 9A. In `client/src/App.tsx`, add route:

```typescript
import IletisimMerkezi from "@/pages/iletisim-merkezi/index";

// Inside the Router, add:
<Route path="/iletisim-merkezi" component={IletisimMerkezi} />
```

### 9B. Sidebar entry

Find the sidebar navigation file (likely `client/src/components/sidebar.tsx` or similar).
Add "İletişim Merkezi" entry for roles: admin, ceo, cgo, muhasebe_ik, satinalma, coach, trainer, supervisor, mudur

```typescript
{
  label: "İletişim Merkezi",
  path: "/iletisim-merkezi",
  icon: MessageSquare, // from lucide-react
  roles: ["admin", "ceo", "cgo", "muhasebe_ik", "satinalma", "coach", "trainer", "supervisor", "mudur"],
}
```

---

## TASK 10 — Verification

After all tasks complete:

1. Open `/iletisim-merkezi` as CGO — confirm all 4 tabs visible
2. Open as a Supervisor — confirm only Dashboard + Şube Talepleri visible (HQ tabs hidden)
3. Click "Yeni Ticket" → select Teknik → enter title + desc → submit → confirm ticket appears in list
4. Click a ticket row → confirm detail sheet opens with comments section
5. Show file listing:
   ```
   ls client/src/pages/iletisim-merkezi/
   ```
6. Confirm route is registered:
   ```
   grep -n "iletisim-merkezi" client/src/App.tsx
   ```

---

## IMPORTANT RULES
- Do NOT use `any` types where possible — use proper TypeScript interfaces
- All new components must support dark mode via Tailwind dark: variants
- Use `date-fns/locale/tr` for all date formatting (Turkish locale)
- Use `apiRequest` helper from `@/lib/queryClient` for mutations
- Use existing `useAuth` hook for user/role access
- All interactive elements need `data-testid` attributes
- Do NOT touch: academy, factory, HR, existing crm-routes.ts files
- Shadcn components only: Card, Badge, Button, Dialog, Sheet, Textarea, Input, Select, Switch, Tabs, Skeleton
- users.id is VARCHAR — never assume integer
- Soft delete only — no hard deletes
- Every query that needs auth uses the default fetcher (which already includes credentials)
