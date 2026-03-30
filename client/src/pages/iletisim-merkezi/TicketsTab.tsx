import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, getDeptConfig, getPriorityConfig, getStatusConfig } from "./categoryConfig";
import { TicketDetailSheet } from "./TicketDetailSheet";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface TicketRow {
  id: number;
  ticket_number: string;
  title: string;
  department: string;
  priority: string;
  status: string;
  sla_breached: boolean;
  created_at: string;
  branch_name: string | null;
  assigned_to_name: string | null;
}

interface BranchOption {
  id: number;
  name: string;
}

export default function TicketsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: branchOptions = [] } = useQuery<BranchOption[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (Array.isArray(data) ? data : []).map((b: any) => ({ id: b.id, name: b.name })) : [];
    },
    staleTime: 60000,
  });

  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["/api/iletisim/tickets", statusFilter, deptFilter, typeFilter, branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all" && statusFilter !== "sla") params.set("status", statusFilter);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (typeFilter !== "all") params.set("ticketType", typeFilter);
      if (branchFilter !== "all") params.set("branchId", branchFilter);
      const res = await fetch(`/api/iletisim/tickets?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  const filteredTickets = statusFilter === "sla"
    ? safeTickets.filter(t => t.sla_breached)
    : safeTickets;

  const deptCounts = DEPARTMENTS.map(d => ({
    ...d,
    count: safeTickets.filter(t => t.department === d.key && !["cozuldu", "kapatildi"].includes(t.status)).length,
    breached: safeTickets.filter(t => t.department === d.key && t.sla_breached).length,
  }));

  const dotColors: Record<string, string> = {
    kritik: "bg-red-500",
    yuksek: "bg-amber-500",
    normal: "bg-blue-500",
    dusuk: "bg-muted-foreground",
  };

  const priorityColors: Record<string, string> = {
    kritik: "text-red-500",
    yuksek: "text-amber-500",
    normal: "text-blue-500",
    dusuk: "text-muted-foreground",
  };

  return (
    <div className="space-y-4" data-testid="tickets-tab">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {deptCounts.map(dept => {
          const DIcon = dept.icon;
          return (
            <button
              key={dept.key}
              onClick={() => setDeptFilter(deptFilter === dept.key ? "all" : dept.key)}
              className={cn(
                "text-left p-3 rounded-md border transition-all",
                deptFilter === dept.key
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-border bg-muted/30 hover-elevate"
              )}
              data-testid={`dept-tile-${dept.key}`}
            >
              <DIcon className="h-4 w-4 mb-1 text-muted-foreground" />
              <div className="text-xs font-medium leading-tight">{dept.label}</div>
              <div className={cn("text-xs mt-1", dept.breached > 0 ? "text-red-500" : "text-muted-foreground")}>
                {dept.count} açık{dept.breached > 0 ? ` · ${dept.breached} SLA` : ""}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {[
          { key: "all", label: "Tümü" },
          { key: "sla", label: "SLA İhlali" },
          { key: "islemde", label: "İşlemde" },
          { key: "cozuldu", label: "Çözüldü" },
        ].map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={statusFilter === f.key ? "default" : "outline"}
            onClick={() => setStatusFilter(f.key)}
            className="toggle-elevate"
            data-testid={`filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        {[
          { key: "all", label: "Tüm Tipler" },
          { key: "compliance", label: "Uygunsuzluk" },
          { key: "franchise_talep", label: "Franchise Talep" },
        ].map(f => (
          <Button
            key={`type-${f.key}`}
            size="sm"
            variant={typeFilter === f.key ? "default" : "outline"}
            onClick={() => setTypeFilter(f.key)}
            className="toggle-elevate"
            data-testid={`filter-type-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
        {branchOptions.length > 0 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-branch-filter">
              <SelectValue placeholder="Şube Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="branch-filter-all">Tüm Şubeler</SelectItem>
              {branchOptions.map(b => (
                <SelectItem key={b.id} value={String(b.id)} data-testid={`branch-filter-${b.id}`}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <div className="hidden md:grid grid-cols-[12px_1fr_90px_80px_80px_85px] gap-3 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
          <div />
          <div>Talep</div>
          <div>Şube</div>
          <div>Dept.</div>
          <div>Öncelik</div>
          <div>Durum</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Yükleniyor...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Talep bulunamadı</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTickets.map((ticket) => {
              const deptCfg = getDeptConfig(ticket.department);
              const DeptIcon = deptCfg?.icon;
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="w-full grid grid-cols-1 md:grid-cols-[12px_1fr_90px_80px_80px_85px] gap-3 px-4 py-3 text-left hover-elevate transition-colors"
                  data-testid={`ticket-row-${ticket.id}`}
                >
                  <div className="hidden md:flex items-start pt-1.5">
                    <div className={cn("w-2.5 h-2.5 rounded-full", ticket.sla_breached ? "bg-red-500" : dotColors[ticket.priority] ?? "bg-muted")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ticket.ticket_number} · {ticket.assigned_to_name ? `Atandı: ${ticket.assigned_to_name}` : "Atanmadı"} · {
                        formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                      }
                    </p>
                  </div>
                  <div className="hidden md:block text-xs text-muted-foreground self-center">{ticket.branch_name ?? "—"}</div>
                  <div className="hidden md:block self-center">
                    <Badge variant="outline" className="text-xs">
                      {DeptIcon && <DeptIcon className="h-3 w-3 mr-0.5" />}
                      {deptCfg?.label?.split(" ")[0]}
                    </Badge>
                  </div>
                  <div className={cn("hidden md:block text-xs font-medium self-center", priorityColors[ticket.priority])}>
                    {getPriorityConfig(ticket.priority)?.label}
                  </div>
                  <div className="hidden md:block self-center">
                    {ticket.sla_breached ? (
                      <Badge variant="destructive" className="text-xs">SLA İhlal</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {getStatusConfig(ticket.status)?.label}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedTicketId && (
        <TicketDetailSheet
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={(isOpen) => { if (!isOpen) setSelectedTicketId(null); }}
        />
      )}
    </div>
  );
}
