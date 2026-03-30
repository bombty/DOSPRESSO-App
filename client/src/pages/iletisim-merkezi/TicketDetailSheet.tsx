import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getDeptConfig, isHQRole, STATUSES } from "./categoryConfig";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

interface TicketDetailSheetProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TicketComment {
  id: number;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetail {
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
  sla_deadline: string | null;
  sla_breached: boolean;
  created_at: string;
  comments: TicketComment[];
}

export function TicketDetailSheet({ ticketId, open, onOpenChange }: TicketDetailSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/iletisim/tickets", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${ticketId}`, { credentials: "include" });
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

  const getSlaStatus = () => {
    if (!ticket?.sla_deadline) return null;
    if (ticket.sla_breached) return { label: "SLA Aşıldı", color: "text-red-500 dark:text-red-400" };
    const hoursLeft = (new Date(ticket.sla_deadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) return { label: "SLA Aşıldı", color: "text-red-500" };
    if (hoursLeft < 1) return { label: `${Math.floor(hoursLeft * 60)} dk kaldı`, color: "text-red-500" };
    if (hoursLeft < 4) return { label: `${Number(hoursLeft ?? 0).toFixed(1)} saat kaldı`, color: "text-amber-500" };
    return { label: `${Number(hoursLeft ?? 0).toFixed(0)} saat kaldı`, color: "text-green-600 dark:text-green-400" };
  };

  const slaStatus = getSlaStatus();
  const dept = getDeptConfig(ticket?.department ?? "");
  const DeptIcon = dept?.icon;

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
                <span className="text-xs text-muted-foreground" data-testid="text-ticket-number">{ticket.ticket_number}</span>
                <Badge variant="outline" className="text-xs">
                  {DeptIcon && <DeptIcon className="h-3 w-3 mr-1" />}
                  {dept?.label}
                </Badge>
                <Badge
                  variant={ticket.sla_breached ? "destructive" : "outline"}
                  className="text-xs"
                  data-testid="badge-priority"
                >
                  {ticket.priority?.toUpperCase()}
                </Badge>
              </div>
              <SheetTitle className="text-base leading-snug" data-testid="text-ticket-title">{ticket.title}</SheetTitle>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Şube</p>
                <p className="text-sm font-medium" data-testid="text-ticket-branch">{ticket.branch_name ?? "—"}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Atanan</p>
                <p className="text-sm font-medium" data-testid="text-ticket-assignee">{ticket.assigned_to_name ?? "Atanmadı"}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Durum</p>
                <p className="text-sm font-medium" data-testid="text-ticket-status">{STATUSES.find(s => s.key === ticket.status)?.label ?? ticket.status}</p>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">SLA Durumu</p>
                <p className={cn("text-sm font-medium", slaStatus?.color ?? "text-foreground")} data-testid="text-sla-status">
                  {slaStatus?.label ?? "—"}
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Açıklama</p>
              <p className="text-sm leading-relaxed" data-testid="text-ticket-description">{ticket.description}</p>
            </div>

            {isHQRole(user?.role ?? "") && ticket.status !== "cozuldu" && ticket.status !== "kapatildi" && (
              <div className="flex gap-2 flex-wrap" data-testid="hq-actions">
                <Select onValueChange={(v) => statusMutation.mutate(v)}>
                  <SelectTrigger className="text-sm w-40" data-testid="select-status-change">
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

            <div>
              <p className="text-sm font-medium mb-3">Aktivite Geçmişi</p>
              <div className="space-y-3" data-testid="activity-timeline">
                <div className="flex gap-2.5 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">
                      {ticket.created_by_name ?? "Sistem"} tarafından açıldı · {
                        formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })
                      }
                    </span>
                  </div>
                </div>
                {(ticket.comments ?? []).map((c) => (
                  <div key={c.id} className={cn("flex gap-2.5 text-sm", c.is_internal && "opacity-70")} data-testid={`comment-${c.id}`}>
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", c.is_internal ? "bg-purple-500" : "bg-green-500")} />
                    <div>
                      <p className="font-medium">
                        {c.author_name}
                        {c.is_internal && <span className="text-purple-500 dark:text-purple-400 font-normal ml-1">(dahili)</span>}
                      </p>
                      <p className="text-muted-foreground mt-0.5">{c.content}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                      data-testid="switch-internal"
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
