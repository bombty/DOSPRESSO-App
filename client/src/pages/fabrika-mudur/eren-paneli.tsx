// ═══════════════════════════════════════════════════════════════════
// Sprint 54 (Aslan 13 May 2026) — Eren (fabrika_mudur) Paneli
// ═══════════════════════════════════════════════════════════════════
// 3 tab:
//   1. Üretim Paneli (production_batches today + status mgmt)
//   2. Vardiya & Personel (factory_shifts today + workers)
//   3. KPI & Maliyet (özet KPI son 7 gün)
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Factory,
  Package,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  CircleDot,
  Wrench,
  Edit3,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "Planlandı", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700" },
  quality_check: { label: "Kalite Kontrol", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Onaylı", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Reddedildi", color: "bg-red-100 text-red-700" },
};

export default function ErenPaneli() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="w-6 h-6 text-blue-600" />
          Fabrika Müdürü Paneli
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Üretim + vardiya + KPI yönetimi (Eren)
        </p>
      </div>

      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="production" data-testid="tab-production">
            <Package className="w-4 h-4 mr-2" />
            Üretim
          </TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">
            <Users className="w-4 h-4 mr-2" />
            Vardiya
          </TabsTrigger>
          <TabsTrigger value="kpi" data-testid="tab-kpi">
            <TrendingUp className="w-4 h-4 mr-2" />
            KPI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="mt-4">
          <ProductionTab />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftsTab />
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <KpiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — ÜRETİM
// ═══════════════════════════════════════════════════════════════════

function ProductionTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/eren/production-today"],
  });

  const batches = data?.batches || [];
  const summary = data?.summary || {};

  const filtered = statusFilter === "all" ? batches : batches.filter((b: any) => b.status === statusFilter);

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className={`cursor-pointer ${statusFilter === "all" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setStatusFilter("all")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{summary.total || 0}</div>
            <div className="text-xs text-muted-foreground">Bugün Toplam</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "in_progress" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setStatusFilter("in_progress")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{summary.inProgress || 0}</div>
            <div className="text-xs text-muted-foreground">Devam Eden</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "quality_check" ? "ring-2 ring-yellow-500" : ""}`} onClick={() => setStatusFilter("quality_check")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-yellow-600">{summary.qualityCheck || 0}</div>
            <div className="text-xs text-muted-foreground">QC Bekliyor</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "completed" ? "ring-2 ring-green-500" : ""}`} onClick={() => setStatusFilter("completed")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{summary.completed || 0}</div>
            <div className="text-xs text-muted-foreground">Tamamlandı</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{filtered.length} batch ({statusFilter === "all" ? "Tümü" : STATUS_LABELS[statusFilter]?.label})</span>
            {summary.avgQuality && (
              <Badge variant="outline" className="text-xs">
                Ort. Kalite: {summary.avgQuality}/100
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Bugün için kayıt yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Kalite</TableHead>
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b: any) => (
                    <TableRow key={b.id} data-testid={`row-batch-${b.id}`}>
                      <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{b.product?.name || "—"}</div>
                        {b.product?.sku && <div className="text-xs text-muted-foreground">{b.product.sku}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {b.quantity} {b.unit}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_LABELS[b.status]?.color || "bg-gray-100"}>
                          {STATUS_LABELS[b.status]?.label || b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.qualityScore ? (
                          <span className={`font-mono ${b.qualityScore >= 80 ? "text-green-600" : b.qualityScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                            {b.qualityScore}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <BatchStatusDialog batch={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function BatchStatusDialog({ batch, onClose }: { batch: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(batch.status);
  const [qualityScore, setQualityScore] = useState(batch.qualityScore?.toString() || "");
  const [qualityNotes, setQualityNotes] = useState(batch.qualityNotes || "");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/eren/batches/${batch.id}/status`, {
        status,
        qualityScore: qualityScore ? parseInt(qualityScore) : undefined,
        qualityNotes: qualityNotes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Batch güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/eren/production-today"] });
      onClose();
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{batch.batchNumber}</DialogTitle>
          <DialogDescription>
            {batch.product?.name} • {batch.quantity} {batch.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Durum</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(STATUS_LABELS).map(([key, val]) => (
                <Button
                  key={key}
                  variant={status === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(key)}
                  className="text-xs"
                >
                  {val.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Kalite Skoru (0-100)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={qualityScore}
              onChange={(e) => setQualityScore(e.target.value)}
              placeholder="Opsiyonel"
            />
          </div>

          <div>
            <Label>Kalite Notları</Label>
            <Textarea
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
              rows={3}
              placeholder="Opsiyonel — kalite gözlemleri"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — VARDİYA
// ═══════════════════════════════════════════════════════════════════

function ShiftsTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/eren/shifts-today"],
  });

  const shifts = data?.shifts || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{summary.totalShifts || 0}</div>
            <div className="text-xs text-muted-foreground">Bugün Vardiya</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{summary.activeShifts || 0}</div>
            <div className="text-xs text-muted-foreground">Aktif</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{summary.totalWorkers || 0}</div>
            <div className="text-xs text-muted-foreground">Personel</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Bugün için vardiya planı yok</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift: any) => (
            <Card key={shift.id} className={shift.status === "active" ? "border-2 border-blue-300" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base capitalize">{shift.shiftType}</h3>
                      <Badge variant="outline" className="text-xs">
                        {shift.startTime} - {shift.endTime}
                      </Badge>
                      {shift.status === "active" && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <CircleDot className="w-3 h-3 mr-1" />
                          Aktif
                        </Badge>
                      )}
                      {shift.status === "completed" && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Bitti
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {shift.workerCount} personel atanmış
                    </p>
                  </div>
                </div>
                {shift.workers && shift.workers.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
                    {shift.workers.map((w: any) => (
                      <div key={w.id} className="text-xs p-1.5 bg-muted/40 rounded flex items-center gap-1.5">
                        <Wrench className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate">{w.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1">{w.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — KPI
// ═══════════════════════════════════════════════════════════════════

function KpiTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/eren/kpi"],
  });

  const kpi = data?.kpi || {};
  const week = kpi.week || {};
  const machines = kpi.machines || {};
  const personnel = kpi.personnel || {};

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {/* Üretim KPI */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Son 7 Gün Üretim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-2xl font-bold">{week.totalProduction || 0}</div>
              <div className="text-xs text-muted-foreground">Toplam Üretim</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{week.batchCount || 0}</div>
              <div className="text-xs text-muted-foreground">Batch Sayısı</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{week.avgDaily || 0}</div>
              <div className="text-xs text-muted-foreground">Günlük Ort.</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${week.avgQuality >= 80 ? "text-green-600" : week.avgQuality >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {week.avgQuality || 0}
              </div>
              <div className="text-xs text-muted-foreground">Ort. Kalite</div>
            </div>
          </div>
          {week.rejectionRate > 0 && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Red oranı: <strong>%{week.rejectionRate}</strong> (son 7 gün)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ekipman & Personel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Ekipman
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold">{machines.active || 0}</div>
              <div className="text-sm text-muted-foreground pb-1">/ {machines.total || 0} aktif</div>
            </div>
            <div className="mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${machines.utilizationPct || 0}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Kullanım: %{machines.utilizationPct || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Personel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{personnel.todayWorkers || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Bugün vardiyada
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
