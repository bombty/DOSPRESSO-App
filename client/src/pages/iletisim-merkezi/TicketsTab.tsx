import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function TicketsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["/api/iletisim/tickets", statusFilter, deptFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all" && statusFilter !== "sla") params.set("status", statusFilter);
      if (deptFilter !== "all") params.set("department", deptFilter);
      const res = await fetch(`/api/iletisim/tickets?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filteredTickets = statusFilter === "sla"
    ? tickets.filter(t => t.sla_breached)
    : tickets;

  const deptCounts = DEPARTMENTS.map(d => ({
    ...d,
    count: tickets.filter(t => t.department === d.key && !["cozuldu", "kapatildi"].includes(t.status)).length,
    breached: tickets.filter(t => t.department === d.key && t.sla_breached).length,
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
              <div className="text-[11px] font-medium leading-tight">{dept.label}</div>
              <div className={cn("text-[10px] mt-1", dept.breached > 0 ? "text-red-500" : "text-muted-foreground")}>
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
      </div>

      <Card>
        <div className="hidden md:grid grid-cols-[12px_1fr_80px_70px_70px_75px] gap-2 px-4 py-2 border-b border-border text-[10px] text-muted-foreground font-medium">
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
                  className="w-full grid grid-cols-1 md:grid-cols-[12px_1fr_80px_70px_70px_75px] gap-2 px-4 py-3 text-left hover-elevate transition-colors"
                  data-testid={`ticket-row-${ticket.id}`}
                >
                  <div className="hidden md:flex items-start pt-1.5">
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
                  <div className="hidden md:block text-[11px] text-muted-foreground self-center">{ticket.branch_name ?? "—"}</div>
                  <div className="hidden md:block self-center">
                    <Badge variant="outline" className="text-[9px]">
                      {DeptIcon && <DeptIcon className="h-2.5 w-2.5 mr-0.5" />}
                      {deptCfg?.label?.split(" ")[0]}
                    </Badge>
                  </div>
                  <div className={cn("hidden md:block text-[11px] font-medium self-center", priorityColors[ticket.priority])}>
                    {getPriorityConfig(ticket.priority)?.label}
                  </div>
                  <div className="hidden md:block self-center">
                    {ticket.sla_breached ? (
                      <Badge variant="destructive" className="text-[9px]">SLA İhlal</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
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
