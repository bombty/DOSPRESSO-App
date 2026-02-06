import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Ticket,
  Search,
  Filter,
  Clock,
  User,
  MapPin,
  AlertCircle,
  CheckCircle,
  Timer,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface CRMTicket {
  id: number;
  type: "fault" | "service_request";
  title: string;
  description: string;
  priority: string;
  status: string;
  branchName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  slaDeadline: string | null;
  isSlaBreach: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  "kritik": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  "yüksek": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "orta": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "düşük": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
};

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  "open": { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Açık" },
  "pending": { bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", label: "Beklemede" },
  "in_progress": { bg: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", label: "İşlemde" },
  "resolved": { bg: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", label: "Çözüldü" },
  "closed": { bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", label: "Kapalı" }
};

export default function CRMTickets() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState<boolean>(false);

  // Handle filter from URL params (from dashboard clicks)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const filter = params.get('filter');
    // Reset filters first
    setStatusFilter('all');
    setPriorityFilter('all');
    setShowUnassignedOnly(false);
    
    if (filter) {
      if (filter === 'open') {
        setStatusFilter('open');
      } else if (filter === 'closed') {
        setStatusFilter('resolved');
      } else if (filter === 'unassigned') {
        setShowUnassignedOnly(true);
      } else if (['kritik', 'yüksek', 'orta', 'düşük'].includes(filter)) {
        setPriorityFilter(filter);
      }
    }
  }, [searchParams]);

  const { data: tickets, isLoading } = useQuery<CRMTicket[]>({
    queryKey: ["/api/crm/tickets", statusFilter, priorityFilter],
  });

  const handleTicketClick = (ticket: CRMTicket) => {
    // Navigate to fault detail page
    if (ticket.type === 'fault') {
      setLocation(`/ekipman/ariza`);
    }
  };

  const filteredTickets = tickets?.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.branchName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesUnassigned = !showUnassignedOnly || (!ticket.assignedTo && ticket.status !== 'resolved' && ticket.status !== 'closed');
    return matchesSearch && matchesStatus && matchesPriority && matchesUnassigned;
  }) || [];

  const openCount = tickets?.filter(t => t.status !== "resolved" && t.status !== "closed").length || 0;
  const slaBreachCount = tickets?.filter(t => t.isSlaBreach).length || 0;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1" data-testid="badge-open-count">
              <Ticket className="h-3 w-3" />
              {openCount} Açık
            </Badge>
            {slaBreachCount > 0 && (
              <Badge variant="destructive" className="gap-1" data-testid="badge-sla-breach">
                <AlertCircle className="h-3 w-3" />
                {slaBreachCount} SLA Aşımı
              </Badge>
            )}
            {showUnassignedOnly && (
              <Badge variant="secondary" className="gap-1" data-testid="badge-unassigned-filter">
                <User className="h-3 w-3" />
                Sadece Atanmamış
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Talep veya şube ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="open">Açık</SelectItem>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="in_progress">İşlemde</SelectItem>
              <SelectItem value="resolved">Çözüldü</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-priority">
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelikler</SelectItem>
              <SelectItem value="kritik">Kritik</SelectItem>
              <SelectItem value="yüksek">Yüksek</SelectItem>
              <SelectItem value="orta">Orta</SelectItem>
              <SelectItem value="düşük">Düşük</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Talep bulunamadı</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <Card 
                key={`${ticket.type}-${ticket.id}`} 
                className={`hover-elevate cursor-pointer ${ticket.isSlaBreach ? 'border-red-300 dark:border-red-800' : ''}`}
                data-testid={`ticket-card-${ticket.id}`}
                onClick={() => handleTicketClick(ticket)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={PRIORITY_STYLES[ticket.priority] || "bg-muted"} variant="secondary">
                          {ticket.priority}
                        </Badge>
                        <Badge className={STATUS_STYLES[ticket.status]?.bg || "bg-muted"} variant="secondary">
                          {STATUS_STYLES[ticket.status]?.label || ticket.status}
                        </Badge>
                        {ticket.isSlaBreach && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            SLA
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate">{ticket.title}</h4>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ticket.branchName}
                        </span>
                        {ticket.assignedToName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.assignedToName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: tr })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
