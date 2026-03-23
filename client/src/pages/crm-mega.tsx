import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HQ_ROLES } from "@shared/schema";
import {
  Plus,
  ShieldAlert,
  Users,
  Coffee,
  Building2,
  TicketCheck,
  AlertTriangle,
  Clock,
  Star,
  TrendingUp,
  CheckCircle2,
  ListTodo,
  Timer,
  PlayCircle,
} from "lucide-react";

import { CrmNav } from "@/pages/iletisim-merkezi/crm-nav";
import { TicketListPanel } from "@/pages/iletisim-merkezi/ticket-list-panel";
import type { TicketListItem } from "@/pages/iletisim-merkezi/ticket-list-panel";
import { TicketChatPanel } from "@/pages/iletisim-merkezi/ticket-chat-panel";
import { NewTicketDialog } from "@/pages/iletisim-merkezi/NewTicketDialog";
import { SlaRulesPanel } from "@/pages/iletisim-merkezi/sla-rules-panel";
import {
  isHQRole,
  canAccessIletisimMerkezi,
  canCreateTicket,
  DEPARTMENTS,
  getDeptConfig,
} from "@/pages/iletisim-merkezi/categoryConfig";

const DashboardTab = lazy(() => import("@/pages/iletisim-merkezi/DashboardTab"));
const HqTasksTab = lazy(() => import("@/pages/iletisim-merkezi/HqTasksTab"));
const BroadcastTab = lazy(() => import("@/pages/iletisim-merkezi/BroadcastTab"));

type Channel = "franchise" | "misafir" | "task";

interface DashboardData {
  openTickets: number;
  slaBreaches: number;
  slaRisk: number;
  resolvedThisWeek: number;
  avgRating: number | null;
  ratingCount: number;
  avgResolveTimeHours: number | null;
  hqTaskStats: Array<{ status: string; count: string }>;
  deptBreakdown: Array<{ department: string; count: string; sla_breached_count: string }>;
  recentTickets: Array<{
    id: number;
    ticket_number: string;
    title: string;
    department: string;
    priority: string;
    status: string;
    sla_breached: boolean;
    created_at: string;
    branch_name: string;
    channel: string;
    ticket_type: string;
    rating: number | null;
  }>;
  channel: string;
}

interface TicketDetailResponse {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  status: string;
  branch_name: string | null;
  created_by_name: string | null;
  assigned_to_name: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  created_at: string;
  related_equipment_id: number | null;
  comments: { id: number; content: string; author_name: string; created_at: string; is_internal: boolean; comment_type: string }[];
  attachments?: { id: number; fileName: string; storageKey: string; mimeType: string; fileSize: number }[];
  isCoworkMember: boolean;
  assigned_to_user_id: string | null;
}

const HQ_TICKET_NAV_KEYS = ["talepler", "teknik", "lojistik", "muhasebe", "marketing", "trainer", "hr"];
const BRANCH_TICKET_NAV_KEYS = ["taleplerim", "teknik", "lojistik", "muhasebe", "marketing", "hr"];

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ChannelToggle({
  channel,
  onChange,
  className,
}: {
  channel: Channel;
  onChange: (c: Channel) => void;
  className?: string;
}) {
  const channels: { key: Channel; label: string; icon: typeof Building2 }[] = [
    { key: "franchise", label: "Franchise", icon: Building2 },
    { key: "misafir", label: "Misafir", icon: Coffee },
    { key: "task", label: "Gorevler", icon: ListTodo },
  ];

  return (
    <div className={cn("flex rounded-lg border border-border p-0.5 bg-muted/50", className)} role="radiogroup" aria-label="Kanal secimi" data-testid="channel-toggle">
      {channels.map(ch => (
        <button
          key={ch.key}
          role="radio"
          aria-checked={channel === ch.key}
          onClick={() => onChange(ch.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            channel === ch.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
          data-testid={`channel-btn-${ch.key}`}
        >
          <ch.icon className="h-3.5 w-3.5" />
          <span>{ch.label}</span>
        </button>
      ))}
    </div>
  );
}

function ChannelKPIStrip({ data, channel }: { data: DashboardData | undefined; channel: Channel }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px]" />)}
      </div>
    );
  }

  const kpis = channel === "franchise"
    ? [
        {
          label: "Acik Talepler",
          value: data.openTickets,
          icon: TicketCheck,
          color: data.openTickets > 5 ? "text-amber-500" : "text-foreground",
          sub: data.slaRisk > 0 ? `${data.slaRisk} SLA riski` : "Tumü zamanında",
        },
        {
          label: "SLA Ihlali",
          value: data.slaBreaches,
          icon: AlertTriangle,
          color: data.slaBreaches > 0 ? "text-red-500" : "text-foreground",
          sub: data.slaBreaches > 0 ? "Acil aksiyon" : "Ihlal yok",
        },
        {
          label: "Bu Hafta Cozulen",
          value: data.resolvedThisWeek,
          icon: CheckCircle2,
          color: "text-green-600 dark:text-green-400",
          sub: data.avgResolveTimeHours ? `Ort. ${data.avgResolveTimeHours}s` : "—",
        },
        {
          label: "SLA Risk",
          value: data.slaRisk,
          icon: Clock,
          color: data.slaRisk > 0 ? "text-amber-500" : "text-foreground",
          sub: "2 saat icinde",
        },
      ]
    : [
        {
          label: "Acik Geri Bildirimler",
          value: data.openTickets,
          icon: TicketCheck,
          color: data.openTickets > 5 ? "text-amber-500" : "text-foreground",
          sub: `${data.ratingCount} degerlendirilmis`,
        },
        {
          label: "Ort. Puan",
          value: data.avgRating ?? "—",
          icon: Star,
          color: (data.avgRating ?? 0) >= 4 ? "text-green-600 dark:text-green-400" : (data.avgRating ?? 0) >= 3 ? "text-amber-500" : "text-red-500",
          sub: `${data.ratingCount} degerlendirme`,
        },
        {
          label: "Bu Hafta Cozulen",
          value: data.resolvedThisWeek,
          icon: CheckCircle2,
          color: "text-green-600 dark:text-green-400",
          sub: data.avgResolveTimeHours ? `Ort. ${data.avgResolveTimeHours}s` : "—",
        },
        {
          label: "SLA Ihlali",
          value: data.slaBreaches,
          icon: AlertTriangle,
          color: data.slaBreaches > 0 ? "text-red-500" : "text-foreground",
          sub: data.slaBreaches > 0 ? "Acil aksiyon" : "Ihlal yok",
        },
      ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3" data-testid="channel-kpi-strip">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <Card key={i} className="bg-muted/50 border-0" data-testid={`kpi-card-${i}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{kpi.label}</p>
              </div>
              <p className={cn("text-xl font-medium", kpi.color)}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedUserName: string | null;
  branchName: string | null;
  completedAt: string | null;
  createdAt: string;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Bekleyen",
  in_progress: "Devam",
  done: "Tamamlanan",
  completed: "Tamamlanan",
  overdue: "Gecikmis",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  done: "bg-green-500/10 text-green-700 dark:text-green-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function TaskChannelContent() {
  const [taskFilter, setTaskFilter] = useState<string>("all");

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ["/api/ajanda/todos", "crm-task-channel"],
    queryFn: async () => {
      const res = await fetch("/api/ajanda/todos?status=all");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const overdue = tasks.filter(t => t.status === "pending" && t.dueDate && new Date(t.dueDate) < new Date());
  const pending = tasks.filter(t => t.status === "pending" && (!t.dueDate || new Date(t.dueDate) >= new Date()));
  const done = tasks.filter(t => t.status === "done");

  const kpis = [
    { label: "Gecikmis", value: overdue.length, icon: AlertTriangle, color: overdue.length > 0 ? "text-red-500" : "text-foreground" },
    { label: "Bekleyen", value: pending.length, icon: Clock, color: pending.length > 3 ? "text-amber-500" : "text-foreground" },
    { label: "Devam", value: tasks.filter(t => t.status === "in_progress").length, icon: PlayCircle, color: "text-blue-500" },
    { label: "Tamamlanan", value: done.length, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  ];

  const displayTasks = taskFilter === "overdue"
    ? overdue
    : taskFilter === "pending"
    ? pending
    : taskFilter === "done"
    ? done
    : tasks;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="task-channel">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="bg-muted/50 border-0" data-testid={`task-kpi-${i}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className={cn("text-xl font-medium", kpi.color)}>{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {[
          { key: "all", label: "Tumu" },
          { key: "overdue", label: "Gecikmis" },
          { key: "pending", label: "Bekleyen" },
          { key: "done", label: "Tamamlanan" },
        ].map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={taskFilter === f.key ? "default" : "ghost"}
            onClick={() => setTaskFilter(f.key)}
            data-testid={`task-filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-8">
          <ListTodo className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Gorev bulunamadi</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayTasks.map(task => {
            const isTaskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
            return (
              <Card key={task.id} className="hover-elevate" data-testid={`task-item-${task.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium flex-1">{task.title}</span>
                    <Badge variant="secondary" className={`text-[10px] ${TASK_STATUS_COLORS[isTaskOverdue ? "overdue" : task.status] || ""}`}>
                      {isTaskOverdue ? "Gecikmis" : TASK_STATUS_LABELS[task.status] || task.status}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${isTaskOverdue ? "text-red-500 font-medium" : ""}`}>
                        <Timer className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {task.priority && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CRMMegaModule() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const userIsHQ = user ? (HQ_ROLES.has(user.role as any) || user.role === "admin") : false;
  const isHQ = isHQRole(user?.role ?? "");

  const [channel, setChannel] = useState<Channel>(() => {
    const params = new URLSearchParams(window.location.search);
    const ch = params.get("channel");
    if (ch === "misafir") return "misafir";
    if (ch === "task") return "task";
    return "franchise";
  });

  const [activeTab, setActiveTab] = useState(isHQ ? "dashboard" : "tickets");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [crmNavKey, setCrmNavKey] = useState(isHQ ? "talepler" : "taleplerim");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("channel", channel);
    window.history.replaceState({}, "", url.toString());
  }, [channel]);

  const handleChannelChange = (newChannel: Channel) => {
    setChannel(newChannel);
    setSelectedTicketId(null);
    setCrmNavKey(isHQ ? "talepler" : "taleplerim");
  };

  const TICKET_NAV_KEYS = isHQ ? HQ_TICKET_NAV_KEYS : BRANCH_TICKET_NAV_KEYS;

  const { data: dashStats } = useQuery<DashboardData>({
    queryKey: ["/api/iletisim/dashboard", channel],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/dashboard?channel=${channel}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60_000,
    enabled: canAccessIletisimMerkezi(user?.role ?? "") && isHQ,
  });

  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery<TicketListItem[]>({
    queryKey: ["/api/iletisim/tickets", "channel", channel],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets?channel=${channel}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: canAccessIletisimMerkezi(user?.role ?? ""),
  });

  const safeTickets: TicketListItem[] = Array.isArray(allTickets) ? allTickets : [];

  const filteredTickets = useMemo(() => {
    const allKey = isHQ ? "talepler" : "taleplerim";
    if (crmNavKey === allKey) return safeTickets;
    return safeTickets.filter((t) => t.department === crmNavKey);
  }, [crmNavKey, safeTickets, isHQ]);

  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const openStatuses = ["acik", "islemde", "beklemede"];
    const allKey = isHQ ? "talepler" : "taleplerim";
    counts[allKey] = safeTickets.filter((t) => openStatuses.includes(t.status)).length;
    for (const dept of DEPARTMENTS) {
      counts[dept.key] = safeTickets.filter((t) => t.department === dept.key && openStatuses.includes(t.status)).length;
    }
    return counts;
  }, [safeTickets, isHQ]);

  const { data: selectedTicketDetail, isLoading: ticketDetailLoading } = useQuery<TicketDetailResponse>({
    queryKey: ["/api/iletisim/tickets", selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${selectedTicketId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedTicketId,
  });

  const { data: branchInfo } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/branches", user?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${user?.branchId}`, { credentials: "include" });
      if (!res.ok) return { id: 0, name: "Subem" };
      return res.json();
    },
    enabled: !isHQ && !!user?.branchId,
  });

  interface DelegationItem {
    moduleKey: string;
    delegatedToUserId?: string;
  }

  const { data: activeDelegations = [] } = useQuery<DelegationItem[]>({
    queryKey: ["/api/delegations/active"],
    enabled: isHQ,
  });

  const delegatedDepts = useMemo(() => {
    if (!isHQ) return [];
    const keyToDept: Record<string, string> = {
      crm_teknik: "teknik",
      crm_lojistik: "lojistik",
      crm_muhasebe: "muhasebe",
      crm_marketing: "marketing",
      crm_ik: "hr",
    };
    return activeDelegations.map((d) => keyToDept[d.moduleKey]).filter(Boolean) as string[];
  }, [activeDelegations, isHQ]);

  const openCount = dashStats?.openTickets ?? 0;
  const hqPending = dashStats?.hqTaskStats?.find((s) => s.status === "beklemede")?.count ?? 0;

  const tabsForRole = useMemo(() => {
    if (isHQ) {
      return [
        { key: "dashboard", label: "Dashboard", badge: null },
        { key: "tickets", label: channel === "franchise" ? "Sube Talepleri" : "Misafir GB", badge: openCount > 0 ? openCount : null },
        ...(channel === "franchise"
          ? [
              { key: "hq-tasks", label: "HQ Gorevler", badge: Number(hqPending) > 0 ? Number(hqPending) : null },
              { key: "broadcast", label: "Duyurular", badge: null },
            ]
          : []),
      ];
    }
    return [{ key: "tickets", label: channel === "franchise" ? "Taleplerim" : "Misafir Geri Bildirimleri", badge: null }];
  }, [isHQ, openCount, hqPending, channel]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (!user) return null;

  if (!canAccessIletisimMerkezi(user.role)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6" data-testid="crm-unauthorized">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-1">Erisim Yetkisi Yok</h2>
          <p className="text-sm text-muted-foreground">Bu sayfaya erisim yetkiniz bulunmamaktadir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="crm-page">
      <div className="px-4 pt-3 pb-2 border-b flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-crm-title">
            CRM
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {channel === "franchise" ? "Franchise talep ve destek yonetimi" : channel === "misafir" ? "Misafir geri bildirim ve memnuniyet" : "Gorev takibi ve yonetimi"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ChannelToggle channel={channel} onChange={handleChannelChange} />
          {channel !== "task" && canCreateTicket(user.role) && (
            <Button onClick={() => setShowNewTicket(true)} size="sm" data-testid="button-new-ticket">
              <Plus className="h-4 w-4 mr-1.5" />
              {channel === "franchise" ? "Yeni Ticket" : "Yeni GB"}
            </Button>
          )}
        </div>
      </div>

      {isHQ && channel !== "task" && <ChannelKPIStrip data={dashStats} channel={channel} />}

      {channel === "task" ? (
        <TaskChannelContent />
      ) : (
      <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        <div className="px-4 w-full">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {tabsForRole.length > 1 && (
              <TabsList className="mb-3 h-auto flex-wrap gap-1 bg-transparent p-0 border-b border-border rounded-none w-full justify-start">
                {tabsForRole.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-4 py-2 text-sm"
                    data-testid={`tab-${tab.key}`}
                  >
                    {tab.label}
                    {tab.badge != null && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            <Suspense fallback={<TabSkeleton />}>
              {isHQ && (
                <TabsContent value="dashboard" className="mt-0">
                  <DashboardTab stats={dashStats as any} />
                </TabsContent>
              )}
              <TabsContent value="tickets" className="mt-0">
                <div className="space-y-2">
                  {safeTickets.length === 0 && !ticketsLoading && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {channel === "franchise" ? "Henuz talep yok" : "Henuz geri bildirim yok"}
                    </p>
                  )}
                  {ticketsLoading && <TabSkeleton />}
                  {safeTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      data-testid={`mobile-ticket-${ticket.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge variant={ticket.sla_breached ? "destructive" : "secondary"} className="text-xs">
                            {getDeptConfig(ticket.department)?.label?.split(" ")[0] ?? ticket.department}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.branch_name ?? "—"} · {ticket.status}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              {isHQ && channel === "franchise" && (
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
        </div>
      </div>

      {/* DESKTOP 3-COLUMN SPLIT PANEL */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <CrmNav
          activeKey={crmNavKey}
          onSelect={(key) => {
            setCrmNavKey(key);
            setSelectedTicketId(null);
          }}
          ticketCounts={ticketCounts}
          delegatedDepts={delegatedDepts}
          isHQ={isHQ}
          branchName={branchInfo?.name}
        />

        {TICKET_NAV_KEYS.includes(crmNavKey) && (
          <TicketListPanel
            tickets={filteredTickets}
            selectedId={selectedTicketId}
            onSelect={setSelectedTicketId}
            isLoading={ticketsLoading}
            onNewTicket={canCreateTicket(user.role) ? () => setShowNewTicket(true) : undefined}
          />
        )}

        {TICKET_NAV_KEYS.includes(crmNavKey) ? (
          <TicketChatPanel
            ticket={selectedTicketDetail ?? null}
            isLoading={ticketDetailLoading && !!selectedTicketId}
          />
        ) : crmNavKey === "dashboard" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<TabSkeleton />}>
              <DashboardTab stats={dashStats as any} />
            </Suspense>
          </div>
        ) : crmNavKey === "sla" ? (
          <SlaRulesPanel isAdmin={["admin", "ceo", "cgo"].includes(user.role)} />
        ) : (
          <div className="flex-1 overflow-y-auto p-6" />
        )}
      </div>

      </>
      )}

      <NewTicketDialog open={showNewTicket} onOpenChange={setShowNewTicket} channel={channel} />
    </div>
  );
}
