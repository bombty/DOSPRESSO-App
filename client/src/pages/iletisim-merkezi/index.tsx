import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketDialog } from "./NewTicketDialog";
import { isHQRole, canAccessIletisimMerkezi, DEPARTMENTS } from "./categoryConfig";
import { CrmNav } from "./crm-nav";
import { TicketListPanel } from "./ticket-list-panel";
import type { TicketListItem } from "./ticket-list-panel";
import { TicketChatPanel } from "./ticket-chat-panel";
import { SlaRulesPanel } from "./sla-rules-panel";

const DashboardTab = lazy(() => import("./DashboardTab"));
const TicketsTab = lazy(() => import("./TicketsTab"));
const HqTasksTab = lazy(() => import("./HqTasksTab"));
const BroadcastTab = lazy(() => import("./BroadcastTab"));

const TICKET_NAV_KEYS = ['talepler', 'teknik', 'lojistik', 'muhasebe', 'marketing', 'trainer', 'hr'];

export default function IletisimMerkezi() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNewTicket, setShowNewTicket] = useState(false);

  const [crmNavKey, setCrmNavKey] = useState('talepler');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: dashStats } = useQuery<{
    openTickets: number;
    slaBreaches: number;
    slaRisk: number;
    b2cFeedbackCount: number;
    hqTaskStats: Array<{ status: string; count: string }>;
    deptBreakdown: Array<{ department: string; count: string; sla_breached_count: string }>;
    recentTickets: Array<{
      id: number; ticket_number: string; title: string; department: string;
      priority: string; status: string; sla_breached: boolean; created_at: string; branch_name: string;
    }>;
  }>({
    queryKey: ["/api/iletisim/dashboard"],
    refetchInterval: 60_000,
    enabled: canAccessIletisimMerkezi(user?.role ?? ""),
  });

  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery<TicketListItem[]>({
    queryKey: ["/api/iletisim/tickets", "all", "all"],
    queryFn: async () => {
      const res = await fetch("/api/iletisim/tickets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: canAccessIletisimMerkezi(user?.role ?? ""),
  });

  const { data: activeDelegations = [] } = useQuery<any[]>({
    queryKey: ['/api/delegations/active'],
  });

  const delegatedDepts = useMemo(() => {
    const keyToDept: Record<string, string> = {
      crm_teknik: 'teknik',
      crm_lojistik: 'lojistik',
      crm_muhasebe: 'muhasebe',
      crm_marketing: 'marketing',
      crm_ik: 'hr',
    };
    return activeDelegations
      .map((d: any) => keyToDept[d.moduleKey])
      .filter(Boolean) as string[];
  }, [activeDelegations]);

  const safeTickets: TicketListItem[] = Array.isArray(allTickets) ? allTickets : [];

  const filteredTickets = useMemo(() => {
    if (crmNavKey === 'talepler') return safeTickets;
    return safeTickets.filter(t => t.department === crmNavKey);
  }, [crmNavKey, safeTickets]);

  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const openStatuses = ['acik', 'islemde', 'beklemede'];
    counts.talepler = safeTickets.filter(t => openStatuses.includes(t.status)).length;
    for (const dept of DEPARTMENTS) {
      counts[dept.key] = safeTickets.filter(t => t.department === dept.key && openStatuses.includes(t.status)).length;
    }
    return counts;
  }, [safeTickets]);

  const { data: selectedTicketDetail, isLoading: ticketDetailLoading } = useQuery<any>({
    queryKey: ['/api/iletisim/tickets', selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${selectedTicketId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedTicketId,
  });

  const openCount = dashStats?.openTickets ?? 0;
  const hqPending = dashStats?.hqTaskStats?.find((s) => s.status === "beklemede")?.count ?? 0;

  const tabsForRole = useMemo(() => [
    { key: "dashboard", label: "Dashboard", badge: null, showFor: "all" as const },
    { key: "tickets", label: "Şube Talepleri", badge: openCount > 0 ? openCount : null, showFor: "all" as const },
    { key: "hq-tasks", label: "HQ Görevler", badge: Number(hqPending) > 0 ? Number(hqPending) : null, showFor: "hq" as const },
    { key: "broadcast", label: "Duyurular", badge: null, showFor: "hq" as const },
  ].filter(t => {
    if (t.showFor === "all") return true;
    if (t.showFor === "hq") return isHQRole(user?.role ?? "");
    return false;
  }), [user?.role, openCount, hqPending]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const allowedKeys = tabsForRole.map(t => t.key);
    if (tab && allowedKeys.includes(tab)) {
      setActiveTab(tab);
    } else if (tab && !allowedKeys.includes(tab)) {
      const fallback = allowedKeys[0] ?? "dashboard";
      setActiveTab(fallback);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", fallback);
      window.history.replaceState({}, "", url.toString());
    }
  }, [tabsForRole]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const TabSkeleton = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-md" />)}
      </div>
      <Skeleton className="h-48 rounded-md" />
    </div>
  );

  if (!canAccessIletisimMerkezi(user?.role ?? "")) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6" data-testid="iletisim-merkezi-unauthorized">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-1">Erişim Yetkisi Yok</h2>
          <p className="text-sm text-muted-foreground">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="iletisim-merkezi-page">

      {/* MOBILE LAYOUT — unchanged tab-based */}
      <div className="md:hidden flex flex-col h-full">
        <div className="max-w-5xl mx-auto px-4 py-6 w-full">
          <div className="flex items-start justify-between gap-2 mb-6 flex-wrap">
            <div>
              <h1 className="text-xl font-medium" data-testid="text-page-title">İletişim Merkezi</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Şube Talepleri · HQ Görevler · Duyurular
              </p>
            </div>
            <Button
              onClick={() => setShowNewTicket(true)}
              size="sm"
              data-testid="button-new-ticket"
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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-4 py-2 text-sm"
                  data-testid={`tab-${tab.key}`}
                >
                  {tab.label}
                  {tab.badge != null && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
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
        </div>
      </div>

      {/* DESKTOP 3-COLUMN SPLIT PANEL */}
      <div className="hidden md:flex flex-1 overflow-hidden h-full">
        <CrmNav
          activeKey={crmNavKey}
          onSelect={(key) => {
            setCrmNavKey(key);
            setSelectedTicketId(null);
          }}
          ticketCounts={ticketCounts}
          delegatedDepts={delegatedDepts}
        />

        {TICKET_NAV_KEYS.includes(crmNavKey) && (
          <TicketListPanel
            tickets={filteredTickets}
            selectedId={selectedTicketId}
            onSelect={setSelectedTicketId}
            isLoading={ticketsLoading}
            onNewTicket={() => setShowNewTicket(true)}
          />
        )}

        {TICKET_NAV_KEYS.includes(crmNavKey) ? (
          <TicketChatPanel
            ticket={selectedTicketDetail ?? null}
            isLoading={ticketDetailLoading && !!selectedTicketId}
          />
        ) : crmNavKey === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<TabSkeleton />}>
              <DashboardTab stats={dashStats} />
            </Suspense>
          </div>
        ) : crmNavKey === 'analizler' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center text-muted-foreground py-16">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Analizler</p>
              <p className="text-xs">Yakında aktif olacak</p>
            </div>
          </div>
        ) : crmNavKey === 'sla' ? (
          <SlaRulesPanel isAdmin={['admin', 'ceo'].includes(user?.role ?? '')} />
        ) : (
          <div className="flex-1 overflow-y-auto p-6" />
        )}
      </div>

      <NewTicketDialog open={showNewTicket} onOpenChange={setShowNewTicket} />
    </div>
  );
}

function BarChart3({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  );
}

function Settings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
