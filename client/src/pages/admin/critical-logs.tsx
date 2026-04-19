import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertOctagon,
  CheckCircle2,
  Eye,
  RefreshCw,
  ShieldAlert,
  Inbox,
} from "lucide-react";

/**
 * Sprint E UI — /admin/critical-logs (19 Nis 2026, Replit Agent)
 *
 * Backend Sprint E (Claude, b918fe8): system_critical_logs tablosu +
 * 3 endpoint (list, ack, summary). Bu sayfa pilot karar rolleri için
 * (admin/ceo/cgo/adminhq) [CRITICAL][...] log'larını gösterir ve
 * "Gördüm" akışı sağlar.
 */

const PILOT_ROLES = ["admin", "ceo", "cgo", "adminhq"];
const PAGE_LIMIT = 50;

interface CriticalLog {
  id: number;
  tag: string;
  message: string;
  context: Record<string, any> | null;
  sourceLocation: string | null;
  status: "new" | "acknowledged" | "resolved";
  acknowledgedById: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

interface ListResponse {
  logs: CriticalLog[];
  total: number;
  limit: number;
  offset: number;
  filters: { tag: string | null; status: string | null; days: number };
}

interface SummaryResponse {
  last_24h: { total_24h: number; unread_24h: number; acknowledged_24h: number };
  last_7d_by_tag: Array<{ tag: string; count: number }>;
  recent_unread: Array<{ id: number; tag: string; message: string; createdAt: string }>;
  generated_at: string;
}

function trDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function tagColor(tag: string): string {
  // Sprint D pattern tag'leri için renk hint'i
  if (tag.includes("PDKS")) return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
  if (tag.includes("HQ-KIOSK")) return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
  if (tag.includes("FAB-KIOSK")) return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200";
  if (tag === "TEST") return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
}

export default function CriticalLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tagFilter, setTagFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState<number>(0);

  const isAuthorized = !!user && PILOT_ROLES.includes(user.role);

  // ─── Summary query ───
  const { data: summary, refetch: refetchSummary } = useQuery<SummaryResponse>({
    queryKey: ["/api/admin/critical-logs/summary"],
    enabled: isAuthorized,
    refetchInterval: 30_000,
  });

  // ─── List query ───
  const listQs = new URLSearchParams();
  if (tagFilter !== "__all__") listQs.set("tag", tagFilter);
  if (statusFilter !== "__all__") listQs.set("status", statusFilter);
  listQs.set("days", String(days));
  listQs.set("limit", String(PAGE_LIMIT));
  listQs.set("offset", String(page * PAGE_LIMIT));
  const listKey = `/api/admin/critical-logs?${listQs.toString()}`;

  const {
    data: list,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchList,
  } = useQuery<ListResponse>({
    queryKey: [listKey],
    enabled: isAuthorized,
    refetchInterval: 30_000,
  });

  // ─── Ack mutation ───
  const ackMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/critical-logs/${id}/ack`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "İşaretlendi", description: "Log 'Gördüm' olarak kaydedildi." });
      queryClient.invalidateQueries({ queryKey: [listKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/critical-logs/summary"] });
    },
    onError: (err: any) => {
      toast({
        title: "Hata",
        description: err?.message || "Ack başarısız",
        variant: "destructive",
      });
    },
  });

  if (authLoading) return <div className="p-6">Yükleniyor...</div>;
  if (!user) return <Redirect to="/login" />;
  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            Bu sayfa için yetkiniz bulunmamaktadır.
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = list ? Math.ceil(list.total / PAGE_LIMIT) : 0;
  const tagOptions = summary?.last_7d_by_tag.map((t) => t.tag) ?? [];

  return (
    <div className="p-6 space-y-6" data-testid="page-critical-logs">
      {/* ─── Başlık ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Kritik Loglar
          </h1>
          <p className="text-muted-foreground mt-1">
            [CRITICAL] etiketli sistem olayları — pilot izleme paneli
          </p>
        </div>
        <Button
          onClick={() => {
            refetchSummary();
            refetchList();
          }}
          variant="outline"
          size="icon"
          disabled={listFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${listFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ─── A) Üst Özet Kart ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-24h">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Inbox className="h-4 w-4" />
              24h Toplam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-24h">
              {summary?.last_24h.total_24h ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            (summary?.last_24h.unread_24h ?? 0) > 0
              ? "border-red-300 dark:border-red-800"
              : ""
          }
          data-testid="card-unread-24h"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <AlertOctagon className="h-4 w-4" />
              24h Okunmamış
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                (summary?.last_24h.unread_24h ?? 0) > 0
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }`}
              data-testid="text-unread-24h"
            >
              {summary?.last_24h.unread_24h ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-acknowledged-24h">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              24h Onaylandı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-acknowledged-24h">
              {summary?.last_24h.acknowledged_24h ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-tag-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">7g Tag Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {summary && summary.last_7d_by_tag.length > 0 ? (
              <div className="flex flex-wrap gap-1.5" data-testid="list-tag-breakdown">
                {summary.last_7d_by_tag.slice(0, 6).map((t) => (
                  <Badge
                    key={t.tag}
                    variant="outline"
                    className="text-xs"
                    data-testid={`badge-tag-${t.tag}`}
                  >
                    {t.tag}={t.count}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Veri yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── B) Filtre Barı ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="filter-tag" className="text-xs">Tag</Label>
              <Select
                value={tagFilter}
                onValueChange={(v) => {
                  setTagFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-48" data-testid="select-tag">
                  <SelectValue placeholder="Tüm tag'ler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm tag'ler</SelectItem>
                  {tagOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-status" className="text-xs">Durum</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-48" data-testid="select-status">
                  <SelectValue placeholder="Tüm durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm durumlar</SelectItem>
                  <SelectItem value="new">Yeni (görülmemiş)</SelectItem>
                  <SelectItem value="acknowledged">Onaylandı</SelectItem>
                  <SelectItem value="resolved">Çözüldü</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-days" className="text-xs">Gün</Label>
              <Input
                id="filter-days"
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v) && v >= 1 && v <= 90) {
                    setDays(v);
                    setPage(0);
                  }
                }}
                className="w-24"
                data-testid="input-days"
              />
            </div>

            <div className="ml-auto text-xs text-muted-foreground">
              {list ? `${list.total} kayıt` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── C) Log Tablosu ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loglar</CardTitle>
          <CardDescription>
            Sarı arka plan: henüz "Gördüm" işaretlenmemiş kayıtlar
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {listLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>
          ) : !list || list.logs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground" data-testid="text-empty">
              Bu filtreyle eşleşen log yok.
            </div>
          ) : (
            <Table data-testid="table-logs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Zaman (TR)</TableHead>
                  <TableHead className="w-36">Tag</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead className="w-40">Kaynak</TableHead>
                  <TableHead className="w-32">Durum</TableHead>
                  <TableHead className="w-28 text-right">Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.logs.map((log) => {
                  const isNew = log.status === "new";
                  return (
                    <TableRow
                      key={log.id}
                      className={
                        isNew
                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                          : ""
                      }
                      data-testid={`row-log-${log.id}`}
                    >
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {trDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tagColor(log.tag)}`}
                          data-testid={`badge-row-tag-${log.id}`}
                        >
                          {log.tag}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="line-clamp-2">{log.message}</div>
                        {log.context && Object.keys(log.context).length > 0 && (
                          <div className="text-xs text-muted-foreground font-mono mt-1 line-clamp-1">
                            {JSON.stringify(log.context)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.sourceLocation || "—"}
                      </TableCell>
                      <TableCell>
                        {isNew && (
                          <Badge variant="destructive" data-testid={`status-${log.id}`}>Yeni</Badge>
                        )}
                        {log.status === "acknowledged" && (
                          <Badge variant="secondary" data-testid={`status-${log.id}`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Onaylandı
                          </Badge>
                        )}
                        {log.status === "resolved" && (
                          <Badge data-testid={`status-${log.id}`}>Çözüldü</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isNew ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => ackMutation.mutate(log.id)}
                            disabled={ackMutation.isPending}
                            data-testid={`button-ack-${log.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Gördüm
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Pagination ─── */}
      {list && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Sayfa {page + 1} / {totalPages} · {list.total} kayıt
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              data-testid="button-prev-page"
            >
              Önceki
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              data-testid="button-next-page"
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {summary && (
        <div className="text-xs text-muted-foreground text-right">
          Özet oluşturma: {trDateTime(summary.generated_at)} · 30 sn'de bir yenilenir
        </div>
      )}
    </div>
  );
}
