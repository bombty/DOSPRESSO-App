import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  UserPlus,
  Hash,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    planned: { label: "Planlandı", variant: "secondary" },
    in_progress: { label: "Devam Ediyor", variant: "default" },
    counting: { label: "Sayım Yapılıyor", variant: "default" },
    review: { label: "İncelemede", variant: "outline" },
    completed: { label: "Tamamlandı", variant: "default" },
    overdue: { label: "Gecikmiş", variant: "destructive" },
    pending: { label: "Bekliyor", variant: "secondary" },
    discrepancy: { label: "Tutarsızlık", variant: "destructive" },
    recounting: { label: "Tekrar Sayım", variant: "outline" },
  };
  const cfg = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant} data-testid={`badge-status-${status}`}>{cfg.label}</Badge>;
}

export default function SayimYonetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isFabrikaMudur = user?.role === "fabrika_mudur" || user?.role === "admin";
  const isCounter = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel", "fabrika_mudur", "fabrika"].includes(user?.role || "");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Form states
  const [newMonth, setNewMonth] = useState((new Date().getMonth() + 1).toString());
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [countQuantity, setCountQuantity] = useState("");
  const [countNotes, setCountNotes] = useState("");

  const { data: counts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory-counts", filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-counts?year=${filterYear}`);
      if (!res.ok) throw new Error("Sayım listesi alınamadı");
      return res.json();
    },
  });

  const { data: countDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/inventory-counts", selectedCount?.id],
    queryFn: async () => {
      if (!selectedCount?.id) return null;
      const res = await fetch(`/api/inventory-counts/${selectedCount.id}`);
      if (!res.ok) throw new Error("Sayım detayı alınamadı");
      return res.json();
    },
    enabled: !!selectedCount?.id,
  });

  const { data: factoryWorkers } = useQuery<any[]>({
    queryKey: ["/api/factory-workers"],
    queryFn: async () => {
      const res = await fetch("/api/factory-workers");
      if (!res.ok) throw new Error("Fabrika çalışanları alınamadı");
      return res.json();
    },
    enabled: showAssignDialog,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory-counts", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sayım oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setShowCreateDialog(false);
      setNewNotes("");
      setNewDate("");
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/inventory-counts/${selectedCount.id}/assign`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sayımcılar atandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setShowAssignDialog(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const countEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const isRecount = selectedAssignment?.status === "discrepancy";
      const url = isRecount ? "/api/inventory-count-entries/recount" : "/api/inventory-count-entries";
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sayım kaydedildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setShowCountDialog(false);
      setCountQuantity("");
      setCountNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      month: parseInt(newMonth),
      year: parseInt(newYear),
      scheduledDate: newDate,
      notes: newNotes,
    });
  };

  const [assignmentMap, setAssignmentMap] = useState<Record<number, { counter1Id: string; counter2Id: string }>>({});

  const handleAssignCounters = () => {
    const assignments = Object.entries(assignmentMap).map(([id, val]) => ({
      assignmentId: parseInt(id),
      counter1Id: val.counter1Id,
      counter2Id: val.counter2Id,
    })).filter(a => a.counter1Id && a.counter2Id);

    if (assignments.length === 0) {
      toast({ title: "En az bir kalemin sayımcılarını atayın", variant: "destructive" });
      return;
    }
    assignMutation.mutate({ assignments });
  };

  const handleCountSubmit = () => {
    if (!countQuantity) return;
    countEntryMutation.mutate({
      assignmentId: selectedAssignment.id,
      countedQuantity: parseFloat(countQuantity),
      notes: countNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 md:p-4" data-testid="sayim-yonetimi-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Stok Sayım Yönetimi</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
            <SelectTrigger className="w-28" data-testid="select-filter-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFabrikaMudur && (
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-count">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Sayım
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-muted-foreground">Toplam Sayım</div>
            <div className="text-2xl font-bold" data-testid="text-total-counts">{counts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-muted-foreground">Tamamlanan</div>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed-counts">
              {counts?.filter((c: any) => c.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-muted-foreground">Devam Eden</div>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-active-counts">
              {counts?.filter((c: any) => ["in_progress", "counting", "review"].includes(c.status)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-sm text-muted-foreground">Gecikmiş</div>
            <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-counts">
              {counts?.filter((c: any) => c.status === "overdue").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Counts table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ay</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İlerleme</TableHead>
                <TableHead>Tutarsızlık</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!counts || counts.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Bu yıl için sayım kaydı bulunmuyor
                  </TableCell>
                </TableRow>
              ) : (
                counts.map((count: any) => (
                  <TableRow key={count.id} data-testid={`row-count-${count.id}`}>
                    <TableCell className="font-medium">
                      {MONTHS[(count.month || 1) - 1]} {count.year}
                    </TableCell>
                    <TableCell>
                      {count.scheduled_date ? new Date(count.scheduled_date).toLocaleDateString("tr-TR") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(count.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{count.completed_items || 0}/{count.total_items || 0}</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${count.total_items ? ((count.completed_items || 0) / count.total_items * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {count.discrepancy_items > 0 && (
                        <Badge variant="destructive">{count.discrepancy_items} tutarsız</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setSelectedCount(count); setShowDetailDialog(true); }}
                          data-testid={`button-view-count-${count.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isFabrikaMudur && count.status === "planned" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setSelectedCount(count); setShowAssignDialog(true); setAssignmentMap({}); }}
                            data-testid={`button-assign-count-${count.id}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Count Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md" aria-describedby="create-count-desc">
          <DialogHeader>
            <DialogTitle>Yeni Stok Sayımı Oluştur</DialogTitle>
          </DialogHeader>
          <p id="create-count-desc" className="text-sm text-muted-foreground">Aylık stok sayımı planla</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ay</Label>
                <Select value={newMonth} onValueChange={setNewMonth}>
                  <SelectTrigger data-testid="select-new-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Yıl</Label>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger data-testid="select-new-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Sayım Tarihi (Ayın son 5 günü)</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                data-testid="input-scheduled-date"
              />
              <p className="text-xs text-muted-foreground mt-1">Seçilen tarih ayın son 5 günü içinde olmalıdır</p>
            </div>
            <div>
              <Label>Notlar</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Sayım ile ilgili notlar..."
                data-testid="textarea-count-notes"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!newDate || createMutation.isPending}
              data-testid="button-submit-create-count"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Sayım Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="detail-desc">
          <DialogHeader>
            <DialogTitle>
              Sayım Detayı - {selectedCount && `${MONTHS[(selectedCount.month || 1) - 1]} ${selectedCount.year}`}
            </DialogTitle>
          </DialogHeader>
          <p id="detail-desc" className="text-sm text-muted-foreground">Sayım kalemleri ve durumları</p>
          {detailLoading ? (
            <Skeleton className="h-40" />
          ) : countDetail ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                {getStatusBadge(countDetail.status)}
                <span className="text-sm text-muted-foreground">
                  Tarih: {countDetail.scheduled_date ? new Date(countDetail.scheduled_date).toLocaleDateString("tr-TR") : "-"}
                </span>
                {countDetail.created_by_name && (
                  <span className="text-sm text-muted-foreground">Oluşturan: {countDetail.created_by_name}</span>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead>Sistem Stok</TableHead>
                    <TableHead>Sayımcı 1</TableHead>
                    <TableHead>Sayımcı 2</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countDetail.assignments?.map((a: any) => {
                    const canCount = isCounter && (a.counter_1_id === user?.id || a.counter_2_id === user?.id) &&
                      (a.status === "pending" || a.status === "counting" || a.status === "discrepancy");
                    return (
                      <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                        <TableCell className="font-mono text-sm">{a.inventory_code}</TableCell>
                        <TableCell>{a.inventory_name}</TableCell>
                        <TableCell>{a.unit}</TableCell>
                        <TableCell>{parseFloat(a.current_stock || "0").toFixed(2)}</TableCell>
                        <TableCell>{a.counter1_name || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{a.counter2_name || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{getStatusBadge(a.status)}</TableCell>
                        <TableCell className="text-right">
                          {canCount && (
                            <Button
                              size="sm"
                              onClick={() => { setSelectedAssignment(a); setShowCountDialog(true); setCountQuantity(""); setCountNotes(""); }}
                              data-testid={`button-count-${a.id}`}
                            >
                              <Hash className="h-3 w-3 mr-1" />
                              {a.status === "discrepancy" ? "Tekrar Say" : "Say"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Assign Counters Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="assign-desc">
          <DialogHeader>
            <DialogTitle>Sayımcı Atama</DialogTitle>
          </DialogHeader>
          <p id="assign-desc" className="text-sm text-muted-foreground">Her kalem için 2 bağımsız sayımcı atayın</p>
          {countDetail ? (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Sayımcı 1</TableHead>
                    <TableHead>Sayımcı 2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countDetail.assignments?.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.inventory_name} ({a.inventory_code})</TableCell>
                      <TableCell>
                        <Select
                          value={assignmentMap[a.id]?.counter1Id || ""}
                          onValueChange={(v) => setAssignmentMap(prev => ({
                            ...prev,
                            [a.id]: { ...prev[a.id], counter1Id: v, counter2Id: prev[a.id]?.counter2Id || "" }
                          }))}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-counter1-${a.id}`}>
                            <SelectValue placeholder="Sayımcı 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {factoryWorkers?.map((w: any) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.first_name} {w.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignmentMap[a.id]?.counter2Id || ""}
                          onValueChange={(v) => setAssignmentMap(prev => ({
                            ...prev,
                            [a.id]: { ...prev[a.id], counter1Id: prev[a.id]?.counter1Id || "", counter2Id: v }
                          }))}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-counter2-${a.id}`}>
                            <SelectValue placeholder="Sayımcı 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {factoryWorkers?.filter((w: any) => w.id !== assignmentMap[a.id]?.counter1Id).map((w: any) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.first_name} {w.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button
                  onClick={handleAssignCounters}
                  disabled={assignMutation.isPending}
                  data-testid="button-submit-assignments"
                >
                  {assignMutation.isPending ? "Atanıyor..." : "Sayımcıları Ata"}
                </Button>
              </div>
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </DialogContent>
      </Dialog>

      {/* Count Entry Dialog */}
      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent className="max-w-md" aria-describedby="count-entry-desc">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.status === "discrepancy" ? "Tekrar Sayım" : "Sayım Girişi"}
            </DialogTitle>
          </DialogHeader>
          <p id="count-entry-desc" className="text-sm text-muted-foreground">
            {selectedAssignment?.inventory_name} ({selectedAssignment?.inventory_code})
          </p>
          {selectedAssignment && (
            <div className="space-y-4">
              {selectedAssignment.status === "discrepancy" && (
                <Card className="border-destructive">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">İki sayımcı arasında tutarsızlık var. Lütfen tekrar sayın.</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div>
                <Label>Sistem Stok Miktarı</Label>
                <div className="text-lg font-semibold">
                  {parseFloat(selectedAssignment.current_stock || "0").toFixed(2)} {selectedAssignment.unit}
                </div>
              </div>
              <div>
                <Label>Sayılan Miktar</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={countQuantity}
                  onChange={(e) => setCountQuantity(e.target.value)}
                  placeholder="Gerçek stok miktarını girin"
                  data-testid="input-counted-quantity"
                />
              </div>
              {countQuantity && (
                <div>
                  <Label>Fark</Label>
                  <div className={`text-lg font-semibold ${
                    parseFloat(countQuantity) - parseFloat(selectedAssignment.current_stock || "0") !== 0
                      ? "text-destructive" : "text-green-600"
                  }`}>
                    {(parseFloat(countQuantity) - parseFloat(selectedAssignment.current_stock || "0")).toFixed(3)} {selectedAssignment.unit}
                  </div>
                </div>
              )}
              <div>
                <Label>Notlar</Label>
                <Textarea
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  placeholder="Sayım notları..."
                  data-testid="textarea-count-notes"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCountSubmit}
                disabled={!countQuantity || countEntryMutation.isPending}
                data-testid="button-submit-count"
              >
                {countEntryMutation.isPending ? "Kaydediliyor..." : "Sayımı Kaydet"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
