import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketDialog } from "./NewTicketDialog";
import { isHQRole, canAccessIletisimMerkezi, canCreateTicket, isBranchOnlyRole, DEPARTMENTS } from "./categoryConfig";
import { CrmNav } from "./crm-nav";
import { TicketListPanel } from "./ticket-list-panel";
import type { TicketListItem } from "./ticket-list-panel";
import { TicketChatPanel } from "./ticket-chat-panel";
import { SlaRulesPanel } from "./sla-rules-panel";

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

const DashboardTab = lazy(() => import("./DashboardTab"));
const TicketsTab = lazy(() => import("./TicketsTab"));
const HqTasksTab = lazy(() => import("./HqTasksTab"));
const BroadcastTab = lazy(() => import("./BroadcastTab"));

const HQ_TICKET_NAV_KEYS = ['talepler', 'teknik', 'lojistik', 'muhasebe', 'marketing', 'trainer', 'hr'];
const BRANCH_TICKET_NAV_KEYS = ['taleplerim', 'teknik', 'lojistik', 'muhasebe', 'marketing', 'hr'];

export default function IletisimMerkezi() {
  const { user } = useAuth();
  const isHQ = isHQRole(user?.role ?? "");
  const [activeTab, setActiveTab] = useState(isHQ ? "dashboard" : "tickets");
  const [showNewTicket, setShowNewTicket] = useState(false);

  const defaultNavKey = isHQ ? 'talepler' : 'taleplerim';
  const [crmNavKey, setCrmNavKey] = useState(defaultNavKey);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [prevIsHQ, setPrevIsHQ] = useState(isHQ);

  if (prevIsHQ !== isHQ) {
    setPrevIsHQ(isHQ);
    setActiveTab(isHQ ? "dashboard" : "tickets");
    setCrmNavKey(isHQ ? 'talepler' : 'taleplerim');
  }

  const TICKET_NAV_KEYS = isHQ ? HQ_TICKET_NAV_KEYS : BRANCH_TICKET_NAV_KEYS;

  const { data: branchInfo } = useQuery<{ id: number; name: string }>({
    queryKey: ['/api/branches', user?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${user?.branchId}`, { credentials: "include" });
      if (!res.ok) return { id: 0, name: "Subem" };
      return res.json();
    },
    enabled: !isHQ && !!user?.branchId,
  });

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
    enabled: canAccessIletisimMerkezi(user?.role ?? "") && isHQ,
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

  interface DelegationItem {
    moduleKey: string;
    delegatedToUserId?: string;
  }

  const { data: activeDelegations = [] } = useQuery<DelegationItem[]>({
    queryKey: ['/api/delegations/active'],
    enabled: isHQ,
  });

  const delegatedDepts = useMemo(() => {
    if (!isHQ) return [];
    const keyToDept: Record<string, string> = {
      crm_teknik: 'teknik',
      crm_lojistik: 'lojistik',
      crm_muhasebe: 'muhasebe',
      crm_marketing: 'marketing',
      crm_ik: 'hr',
    };
    return activeDelegations
      .map((d) => keyToDept[d.moduleKey])
      .filter(Boolean) as string[];
  }, [activeDelegations, isHQ]);

  const safeTickets: TicketListItem[] = Array.isArray(allTickets) ? allTickets : [];

  const filteredTickets = useMemo(() => {
    const allKey = isHQ ? 'talepler' : 'taleplerim';
    if (crmNavKey === allKey) return safeTickets;
    return safeTickets.filter(t => t.department === crmNavKey);
  }, [crmNavKey, safeTickets, isHQ]);

  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const openStatuses = ['acik', 'islemde', 'beklemede'];
    const allKey = isHQ ? 'talepler' : 'taleplerim';
    counts[allKey] = safeTickets.filter(t => openStatuses.includes(t.status)).length;
    for (const dept of DEPARTMENTS) {
      counts[dept.key] = safeTickets.filter(t => t.department === dept.key && openStatuses.includes(t.status)).length;
    }
    return counts;
  }, [safeTickets, isHQ]);

  const { data: selectedTicketDetail, isLoading: ticketDetailLoading } = useQuery<TicketDetailResponse>({
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

  const tabsForRole = useMemo(() => {
    if (isHQ) {
      return [
        { key: "dashboard", label: "Dashboard", badge: null },
        { key: "tickets", label: "Sube Talepleri", badge: openCount > 0 ? openCount : null },
        { key: "hq-tasks", label: "HQ Gorevler", badge: Number(hqPending) > 0 ? Number(hqPending) : null },
        { key: "broadcast", label: "Duyurular", badge: null },
      ];
    }
    return [
      { key: "tickets", label: "Taleplerim", badge: null },
    ];
  }, [isHQ, openCount, hqPending]);

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
          <h2 className="text-lg font-medium mb-1">Erisim Yetkisi Yok</h2>
          <p className="text-sm text-muted-foreground">
            Bu sayfaya erisim yetkiniz bulunmamaktadir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="iletisim-merkezi-page">

      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col h-full">
        <div className="max-w-5xl mx-auto px-4 py-6 w-full">
          <div className="flex items-start justify-between gap-2 mb-6 flex-wrap">
            <div>
              <h1 className="text-xl font-medium" data-testid="text-page-title">
                {isHQ ? 'Iletisim Merkezi' : 'Destek Taleplerim'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isHQ ? 'Sube Talepleri · HQ Gorevler · Duyurular' : branchInfo?.name ?? 'Subem'}
              </p>
            </div>
            {canCreateTicket(user?.role ?? "") && (
              <Button
                onClick={() => setShowNewTicket(true)}
                size="sm"
                data-testid="button-new-ticket"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Yeni Ticket
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {tabsForRole.length > 1 && (
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
                  <DashboardTab stats={dashStats} />
                </TabsContent>
              )}
              <TabsContent value="tickets" className="mt-0">
                <TicketsTab />
              </TabsContent>
              {isHQ && (
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
          isHQ={isHQ}
          branchName={branchInfo?.name}
        />

        {TICKET_NAV_KEYS.includes(crmNavKey) && (
          <TicketListPanel
            tickets={filteredTickets}
            selectedId={selectedTicketId}
            onSelect={setSelectedTicketId}
            isLoading={ticketsLoading}
            onNewTicket={canCreateTicket(user?.role ?? "") ? () => setShowNewTicket(true) : undefined}
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
              <p className="text-xs">Yakinda aktif olacak</p>
            </div>
          </div>
        ) : crmNavKey === 'sla' ? (
          <SlaRulesPanel isAdmin={['admin', 'ceo', 'cgo'].includes(user?.role ?? '')} />
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
