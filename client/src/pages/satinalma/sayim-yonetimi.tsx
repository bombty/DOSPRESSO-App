import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompactStatusBadge } from "@/components/compact-status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  ClipboardList, Plus, Calendar, Users, CheckCircle, AlertTriangle,
  RefreshCw, Eye, UserPlus, ArrowRight, Search, QrCode, Camera,
  Package, Filter, BarChart3, TrendingDown, TrendingUp, Loader2,
  X, ChevronDown, ChevronRight, FileText, Send, AlertCircle,
  ScanLine, Hash, Boxes, Coffee, Croissant, Leaf, Droplets,
  Candy, Cookie, Salad, Wrench, Store, Truck,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  all: { label: "Tümünü", icon: Boxes, color: "text-foreground" },
  hammadde: { label: "Hammaddeler", icon: Package, color: "text-amber-600 dark:text-amber-400" },
  bitimis_urun: { label: "Bitmiş Ürünler", icon: Package, color: "text-emerald-600 dark:text-emerald-400" },
  ambalaj: { label: "Ambalajlar", icon: Boxes, color: "text-blue-600 dark:text-blue-400" },
  ekipman: { label: "Ekipman", icon: Wrench, color: "text-slate-600 dark:text-slate-400" },
  sube_ekipman: { label: "Şube Ekipman", icon: Store, color: "text-purple-600 dark:text-purple-400" },
  sube_malzeme: { label: "Şube Malzeme", icon: Store, color: "text-indigo-600 dark:text-indigo-400" },
  konsantre: { label: "Konsantreler", icon: Droplets, color: "text-orange-600 dark:text-orange-400" },
  donut: { label: "Donutlar", icon: Cookie, color: "text-pink-600 dark:text-pink-400" },
  tatli: { label: "Tatlılar", icon: Candy, color: "text-rose-600 dark:text-rose-400" },
  tuzlu: { label: "Tuzlular", icon: Salad, color: "text-green-600 dark:text-green-400" },
  cay_grubu: { label: "Çay Grupları", icon: Leaf, color: "text-emerald-600 dark:text-emerald-400" },
  kahve: { label: "Kahveler", icon: Coffee, color: "text-amber-800 dark:text-amber-300" },
  toz_topping: { label: "Toz & Topping", icon: Droplets, color: "text-violet-600 dark:text-violet-400" },
};

const COUNT_TYPE_LABELS: Record<string, string> = {
  tam_sayim: "Tam Sayım",
  bitimis_urun: "Bitmiş Ürün Sayımı",
  hammadde: "Hammadde Sayımı",
  ambalaj: "Ambalaj Sayımı",
  ekipman: "Ekipman Sayımı",
};

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
  const isFabrikaMudur = user?.role === "fabrika_mudur" || user?.role === "admin" || user?.role === "ceo" || user?.role === "cgo";
  const isCounter = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel", "fabrika_mudur", "fabrika", "admin"].includes(user?.role || "");

  const [mainTab, setMainTab] = useState("sayimlar");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [newMonth, setNewMonth] = useState((new Date().getMonth() + 1).toString());
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCountType, setNewCountType] = useState("tam_sayim");
  const [countQuantity, setCountQuantity] = useState("");
  const [countNotes, setCountNotes] = useState("");

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: counts, isLoading, isError, refetch } = useQuery<any[]>({
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
      const res = await fetch(`/api/inventory-counts/${selectedCount.id}`);
      if (!res.ok) throw new Error("Detay alinamadi");
      return res.json();
    },
    enabled: !!selectedCount?.id && showDetailDialog,
  });

  const { data: factoryUsers } = useQuery<any[]>({
    queryKey: ["/api/factory-workers"],
    queryFn: async () => {
      const res = await fetch("/api/factory-workers");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/inventory-counts", {
        month: parseInt(newMonth),
        year: parseInt(newYear),
        scheduledDate: newDate || new Date().toISOString(),
        notes: newNotes || null,
        countType: newCountType,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setShowCreateDialog(false);
      setNewNotes("");
      setNewDate("");
      setNewCountType("tam_sayim");
      toast({ title: "Sayım oturumu oluşturuldu", description: "Ürünler otomatik yüklendi" });
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e.message || "Oluşturulamadı", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/inventory-counts/${selectedCount.id}/assign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setShowAssignDialog(false);
      toast({ title: "Atamalar kaydedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Atama yapılamadı", variant: "destructive" });
    },
  });

  const countEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory-count-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      if (selectedCount?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts", selectedCount.id] });
      }
      setShowCountDialog(false);
      setCountQuantity("");
      setCountNotes("");
      toast({ title: "Sayım kaydedildi" });
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e.message || "Kaydedilemedi", variant: "destructive" });
    },
  });

  const recountMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory-count-entries/recount", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      if (selectedCount?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts", selectedCount.id] });
      }
      setShowCountDialog(false);
      setCountQuantity("");
      setCountNotes("");
      toast({ title: "Tekrar sayim kaydedildi" });
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e.message || "Kaydedilemedi", variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("POST", `/api/inventory-counts/${countId}/finalize`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-count-reports"] });
      toast({ title: "Sayım sonlandırıldı", description: data?.message || "Raporlar oluşturuldu" });
    },
    onError: (e: any) => {
      toast({ title: "Hata", description: e.message || "Sonlandirilamadi", variant: "destructive" });
    },
  });

  const activeCounts = counts?.filter(c => ["planned", "in_progress", "counting"].includes(c.status)) || [];
  const completedCounts = counts?.filter(c => ["completed", "review"].includes(c.status)) || [];
  const overdueCounts = counts?.filter(c => c.status === "overdue") || [];

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold" data-testid="text-page-title">Sayım Yönetimi</h2>
        </div>
        <div className="flex items-center gap-2">
          {isFabrikaMudur && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-new-count">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Sayım
            </Button>
          )}
        </div>
      </div>

      <CompactKPIStrip
        items={[
          { label: "Aktif", value: activeCounts.length, icon: <ClipboardList className="h-4 w-4 text-amber-500" />, color: "warning", testId: "text-active-count" },
          { label: "Tamamlanan", value: completedCounts.length, icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: "success", testId: "text-completed-count" },
          { label: "Gecikmiş", value: overdueCounts.length, icon: <AlertTriangle className="h-4 w-4 text-red-500" />, color: "danger", testId: "text-overdue-count" },
          { label: "Toplam", value: counts?.length || 0, icon: <BarChart3 className="h-4 w-4 text-blue-500" />, color: "info", testId: "text-total-count" },
        ]}
        desktopColumns={4}
      />

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="sayimlar" data-testid="tab-sayimlar">
            <ClipboardList className="h-4 w-4 mr-1" />
            Sayımlar
          </TabsTrigger>
          <TabsTrigger value="raporlar" data-testid="tab-raporlar">
            <BarChart3 className="h-4 w-4 mr-1" />
            Raporlar
          </TabsTrigger>
          <TabsTrigger value="tedarikci" data-testid="tab-tedarikci">
            <Truck className="h-4 w-4 mr-1" />
            Tedarikci
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sayimlar" className="space-y-3 mt-2">
          <SayimListesi
            counts={counts || []}
            isLoading={isLoading}
            isFabrikaMudur={isFabrikaMudur}
            isCounter={isCounter}
            onDetail={(c: any) => { setSelectedCount(c); setShowDetailDialog(true); }}
            onAssign={(c: any) => { setSelectedCount(c); setShowAssignDialog(true); }}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
          />
        </TabsContent>

        <TabsContent value="raporlar" className="space-y-3 mt-2">
          <SayimRaporlari filterYear={filterYear} />
        </TabsContent>

        <TabsContent value="tedarikci" className="space-y-3 mt-2">
          <TedarikciPuanlama />
        </TabsContent>
      </Tabs>

      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Yeni Sayım Oturumu
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Sayım Türü</Label>
                <Select value={newCountType} onValueChange={setNewCountType}>
                  <SelectTrigger data-testid="select-count-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tam_sayim">Tam Sayım (Tüm Ürünler)</SelectItem>
                    <SelectItem value="bitimis_urun">Bitmiş Ürün Sayımı</SelectItem>
                    <SelectItem value="hammadde">Hammadde Sayımı</SelectItem>
                    <SelectItem value="ambalaj">Ambalaj Sayımı</SelectItem>
                    <SelectItem value="ekipman">Ekipman Sayımı</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newCountType === "tam_sayim" && "Tüm envanter kalemleri otomatik yüklenecek"}
                  {newCountType === "bitimis_urun" && "Donut, tatlı, tuzlu gibi bitmiş ürünler yüklenecek"}
                  {newCountType === "hammadde" && "Kahve, süt, un gibi hammaddeler yüklenecek"}
                  {newCountType === "ambalaj" && "Bardak, kapak, peçete gibi ambalajlar yüklenecek"}
                  {newCountType === "ekipman" && "Makine, yedek parça gibi ekipmanlar yüklenecek"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Ay</Label>
                  <Select value={newMonth} onValueChange={setNewMonth}>
                    <SelectTrigger data-testid="select-month"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Yil</Label>
                  <Select value={newYear} onValueChange={setNewYear}>
                    <SelectTrigger data-testid="select-year"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Planlanan Tarih (opsiyonel)</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} data-testid="input-scheduled-date" />
              </div>
              <div>
                <Label>Notlar</Label>
                <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Sayım ile ilgili notlar..." data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>İptal</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-create-count">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showDetailDialog && selectedCount && (
        <SayimDetailDialog
          count={selectedCount}
          detail={countDetail}
          detailLoading={detailLoading}
          isFabrikaMudur={isFabrikaMudur}
          isCounter={isCounter}
          userId={user?.id}
          onClose={() => { setShowDetailDialog(false); setSelectedCount(null); }}
          onAssign={(a: any) => { setSelectedAssignment(a); setShowAssignDialog(true); }}
          onCount={(a: any) => { setSelectedAssignment(a); setShowCountDialog(true); }}
          onQrScan={() => setShowQrScanner(true)}
          onFinalize={(id: number) => finalizeMutation.mutate(id)}
          isFinalizePending={finalizeMutation.isPending}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {showCountDialog && selectedAssignment && (
        <CountEntryDialog
          assignment={selectedAssignment}
          countQuantity={countQuantity}
          setCountQuantity={setCountQuantity}
          countNotes={countNotes}
          setCountNotes={setCountNotes}
          isPending={countEntryMutation.isPending || recountMutation.isPending}
          onSubmit={(isRecount: boolean) => {
            const data = {
              assignmentId: selectedAssignment.id,
              countedQuantity: countQuantity,
              notes: countNotes || null,
            };
            if (isRecount) {
              recountMutation.mutate(data);
            } else {
              countEntryMutation.mutate(data);
            }
          }}
          onClose={() => { setShowCountDialog(false); setSelectedAssignment(null); setCountQuantity(""); setCountNotes(""); }}
        />
      )}

      {showQrScanner && (
        <QrScannerDialog
          onScan={(qrCode: string) => {
            setShowQrScanner(false);
            if (countDetail?.assignments) {
              const found = countDetail.assignments.find((a: any) => a.qr_code === qrCode || a.inventory_code === qrCode.replace("INV-", ""));
              if (found) {
                setSelectedAssignment(found);
                setShowCountDialog(true);
                toast({ title: "Ürün bulundu", description: found.inventory_name });
              } else {
                toast({ title: "Ürün bulunamadı", description: `QR: ${qrCode}`, variant: "destructive" });
              }
            }
          }}
          onClose={() => setShowQrScanner(false)}
        />
      )}
    </div>
  );
}

function SayimListesi({ counts, isLoading, isFabrikaMudur, isCounter, onDetail, onAssign, filterYear, setFilterYear }: any) {
  const activeCounts = counts.filter((c: any) => ["planned", "in_progress", "counting"].includes(c.status));
  const doneCounts = counts.filter((c: any) => ["completed", "review", "overdue"].includes(c.status));

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterYear.toString()} onValueChange={v => setFilterYear(parseInt(v))}>
          <SelectTrigger className="w-24" data-testid="select-filter-year"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeCounts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Aktif Sayımlar ({activeCounts.length})
          </h3>
          {activeCounts.map((c: any) => (
            <SayimCard key={c.id} count={c} isFabrikaMudur={isFabrikaMudur} onDetail={onDetail} onAssign={onAssign} />
          ))}
        </div>
      )}

      {doneCounts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Tamamlanan / Gecmis ({doneCounts.length})
          </h3>
          {doneCounts.map((c: any) => (
            <SayimCard key={c.id} count={c} isFabrikaMudur={isFabrikaMudur} onDetail={onDetail} onAssign={onAssign} />
          ))}
        </div>
      )}

      {counts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Bu yil icin sayim kaydi bulunmuyor</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SayimCard({ count, isFabrikaMudur, onDetail, onAssign }: any) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => onDetail(count)} data-testid={`sayim-card-${count.id}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {COUNT_TYPE_LABELS[count.count_type] || count.count_type || "Tam Sayım"}
              </span>
              <span className="text-xs text-muted-foreground">
                {MONTHS[(count.month || 1) - 1]} {count.year} {count.scheduled_date ? ` - ${new Date(count.scheduled_date).toLocaleDateString("tr-TR")}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {count.total_items > 0 && (
              <span className="text-xs text-muted-foreground">
                {count.completed_items}/{count.total_items}
              </span>
            )}
            {count.discrepancy_items > 0 && (
              <Badge variant="destructive">{count.discrepancy_items} tutarsiz</Badge>
            )}
            {getStatusBadge(count.status)}
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDetail(count); }} data-testid={`button-detail-${count.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
              {isFabrikaMudur && ["planned", "in_progress"].includes(count.status) && (
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onAssign(count); }} data-testid={`button-assign-${count.id}`}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {count.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{count.notes}</p>}
      </CardContent>
    </Card>
  );
}

function SayimDetailDialog({
  count, detail, detailLoading, isFabrikaMudur, isCounter, userId,
  onClose, onAssign, onCount, onQrScan, onFinalize, isFinalizePending,
  activeCategory, setActiveCategory, searchQuery, setSearchQuery
}: any) {
  const assignments = detail?.assignments || [];

  const availableCategories = Array.from(new Set(assignments.map((a: any) => a.inventory_category) as string[])).filter(Boolean);

  const filteredAssignments = assignments.filter((a: any) => {
    const matchCategory = activeCategory === "all" || a.inventory_category === activeCategory;
    const matchSearch = !searchQuery ||
      a.inventory_name?.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      a.inventory_code?.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    return matchCategory && matchSearch;
  });

  const groupedByCategory: Record<string, any[]> = {};
  filteredAssignments.forEach((a: any) => {
    const cat = a.inventory_category || "diger";
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(a);
  });

  const totalItems = assignments.length;
  const completedItems = assignments.filter((a: any) => a.status === "completed").length;
  const discrepancyItems = assignments.filter((a: any) => a.status === "discrepancy").length;
  const pendingItems = assignments.filter((a: any) => a.status === "pending").length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-5 w-5" />
            {COUNT_TYPE_LABELS[count.count_type] || "Sayım"} - {MONTHS[(count.month || 1) - 1]} {count.year}
            {getStatusBadge(count.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-2">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Toplam</p>
          </div>
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{completedItems}</p>
            <p className="text-xs text-muted-foreground">Tamamlanan</p>
          </div>
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{discrepancyItems}</p>
            <p className="text-xs text-muted-foreground">Tutarsiz</p>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingItems}</p>
            <p className="text-xs text-muted-foreground">Bekleyen</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün ara (isim veya kod)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-product"
            />
          </div>
          {isCounter && ["in_progress", "counting", "planned"].includes(count.status) && (
            <Button size="sm" variant="outline" onClick={onQrScan} data-testid="button-qr-scan">
              <Camera className="h-4 w-4 mr-1" />
              QR Tara
            </Button>
          )}
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-2">
            <Button
              size="sm"
              variant={activeCategory === "all" ? "default" : "outline"}
              onClick={() => setActiveCategory("all")}
              className="whitespace-nowrap"
              data-testid="category-all"
            >
              <Boxes className="h-3.5 w-3.5 mr-1" />
              Tumu ({assignments.length})
            </Button>
            {availableCategories.map((cat: string) => {
              const cfg = CATEGORY_CONFIG[cat] || { label: cat, icon: Package, color: "" };
              const Icon = cfg.icon;
              const catCount = assignments.filter((a: any) => a.inventory_category === cat).length;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeCategory === cat ? "default" : "outline"}
                  onClick={() => setActiveCategory(cat)}
                  className="whitespace-nowrap"
                  data-testid={`category-${cat}`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {cfg.label} ({catCount})
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        <ScrollArea className="flex-1 min-h-0">
          {detailLoading ? (
            <div className="space-y-2 p-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : Object.keys(groupedByCategory).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{searchQuery ? "Arama sonucu bulunamadı" : "Henüz sayım kalemi bulunamadı"}</p>
              {!searchQuery && <p className="text-xs mt-1">Sayım oturumunu kapatıp yeniden açmayı deneyin</p>}
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {Object.entries(groupedByCategory).map(([cat, items]) => {
                const cfg = CATEGORY_CONFIG[cat] || { label: cat, icon: Package, color: "" };
                const Icon = cfg.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background z-10 py-1">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <span className="text-sm font-semibold">{cfg.label}</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="space-y-1">
                      {items.map((a: any) => (
                        <AssignmentRow
                          key={a.id}
                          assignment={a}
                          isCounter={isCounter}
                          userId={userId}
                          countStatus={count.status}
                          onCount={() => onCount(a)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-2 flex items-center justify-between gap-2">
          {isFabrikaMudur && ["in_progress", "counting"].includes(count.status) && (
            <Button
              variant="default"
              onClick={() => onFinalize(count.id)}
              disabled={isFinalizePending}
              data-testid="button-finalize-count"
            >
              {isFinalizePending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <CheckCircle className="h-4 w-4 mr-1" />
              Sayımı Sonlandır
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentRow({ assignment: a, isCounter, userId, countStatus, onCount }: any) {
  const canCount = isCounter && ["in_progress", "counting", "planned"].includes(countStatus) &&
    (a.counter_1_id === userId || a.counter_2_id === userId) &&
    a.status !== "completed";

  const isDiscrepancy = a.status === "discrepancy";
  const isCompleted = a.status === "completed";

  return (
    <Card className={`${isDiscrepancy ? "border-red-500/50" : isCompleted ? "border-green-500/30" : ""}`} data-testid={`assignment-row-${a.id}`}>
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{a.inventory_name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{a.inventory_code}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Sistem: {parseFloat(a.system_quantity || 0).toFixed(1)} {a.inventory_unit}</span>
                {a.counted_avg && <span>Sayım: {parseFloat(a.counted_avg).toFixed(1)}</span>}
                {a.difference_display && (
                  <span className={parseFloat(a.difference_display) < 0 ? "text-red-600 dark:text-red-400 font-medium" : parseFloat(a.difference_display) > 0 ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                    Fark: {parseFloat(a.difference_display) > 0 ? "+" : ""}{parseFloat(a.difference_display).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {a.entry_count > 0 && (
              <Badge variant="secondary" className="text-xs">{a.entry_count}/2</Badge>
            )}
            {getStatusBadge(a.status)}
            {canCount && (
              <Button size="sm" onClick={onCount} data-testid={`button-count-${a.id}`}>
                <Hash className="h-3.5 w-3.5 mr-1" />
                Say
              </Button>
            )}
            {isDiscrepancy && canCount && (
              <Button size="sm" variant="destructive" onClick={onCount} data-testid={`button-recount-${a.id}`}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Tekrar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountEntryDialog({ assignment, countQuantity, setCountQuantity, countNotes, setCountNotes, isPending, onSubmit, onClose }: any) {
  const isRecount = assignment.status === "discrepancy" || assignment.status === "recounting";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            {isRecount ? "Tekrar Sayım" : "Sayım Girişi"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="font-medium">{assignment.inventory_name}</p>
              <p className="text-xs text-muted-foreground">Kod: {assignment.inventory_code}</p>
              <p className="text-xs text-muted-foreground">Birim: {assignment.inventory_unit}</p>
              <p className="text-xs text-muted-foreground">Sistem Miktari: {parseFloat(assignment.system_quantity || 0).toFixed(1)}</p>
            </CardContent>
          </Card>

          <div>
            <Label>Sayilan Miktar</Label>
            <Input
              type="number"
              step="0.001"
              value={countQuantity}
              onChange={e => setCountQuantity(e.target.value)}
              placeholder="Ornegin: 45.5"
              autoFocus
              data-testid="input-count-quantity"
            />
          </div>

          <div>
            <Label>Notlar (Opsiyonel)</Label>
            <Textarea
              value={countNotes}
              onChange={e => setCountNotes(e.target.value)}
              placeholder="Sayım notu..."
              data-testid="input-count-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => onSubmit(isRecount)}
            disabled={isPending || !countQuantity}
            data-testid="button-submit-count"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isRecount ? "Tekrar Sayimi Kaydet" : "Sayimi Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QrScannerDialog({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!videoRef.current) return;

        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            html5QrCode.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setError("Kamera erisimi saglanamadi. Manuel kod giriniz.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR Kod Tara
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!error && (
            <div id="qr-reader" ref={videoRef} className="w-full rounded-lg overflow-hidden" />
          )}

          {error && (
            <div className="text-center py-4 text-muted-foreground">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="border-t pt-3">
            <Label>Manuel Kod Girisi</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="INV-HM-001"
                data-testid="input-manual-qr"
              />
              <Button
                onClick={() => {
                  if (manualCode.trim()) {
                    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
                    onScan(manualCode.trim());
                  }
                }}
                disabled={!manualCode.trim()}
                data-testid="button-manual-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SayimRaporlari({ filterYear }: { filterYear: number }) {
  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory-count-reports", filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-count-reports?year=${filterYear}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  const highSeverity = reports?.filter(r => r.severity === "high" || r.severity === "critical") || [];
  const mediumSeverity = reports?.filter(r => r.severity === "medium") || [];
  const lowSeverity = reports?.filter(r => r.severity === "low") || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{highSeverity.length}</p>
            <p className="text-xs text-muted-foreground">Kritik Fark</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{mediumSeverity.length}</p>
            <p className="text-xs text-muted-foreground">Orta Fark</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{lowSeverity.length}</p>
            <p className="text-xs text-muted-foreground">Düşük Fark</p>
          </CardContent>
        </Card>
      </div>

      {(!reports || reports.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Henüz tutarsızlık raporu bulunmuyor</p>
            <p className="text-xs mt-1">Sayımlar tamamlandığında tutarsızlık raporları burada görünecektir</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <Card key={r.id} className={r.severity === "critical" || r.severity === "high" ? "border-red-500/50" : ""} data-testid={`report-${r.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{r.inventory_name || `Ürün #${r.inventory_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      Sistem: {parseFloat(r.system_quantity).toFixed(1)} | Sayim: {parseFloat(r.counted_quantity).toFixed(1)} | Fark: {parseFloat(r.difference).toFixed(1)} ({parseFloat(r.difference_percent).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CompactStatusBadge
                      label={r.severity === "critical" ? "Kritik" : r.severity === "high" ? "Yüksek" : r.severity === "medium" ? "Orta" : "Düşük"}
                      variant={r.severity === "critical" || r.severity === "high" ? "destructive" : r.severity === "medium" ? "outline" : "secondary"}
                    />
                    {r.resolved_at && <CompactStatusBadge label="Çözüldü" variant="default" />}
                  </div>
                </div>
                {r.action_taken && <p className="text-xs text-muted-foreground mt-1">{r.action_taken}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TedarikciPuanlama() {
  const { data: scores, isLoading } = useQuery<any[]>({
    queryKey: ["/api/supplier-performance-scores"],
    queryFn: async () => {
      const res = await fetch("/api/supplier-performance-scores");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) return [];
      const data = await res.json();
      return data.suppliers || data || [];
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Truck className="h-4 w-4" />
        Tedarikci Performans Puanlari
      </h3>

      {(!suppliers || suppliers.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tedarikçi kaydı bulunmuyor</p>
            <p className="text-xs mt-1">Tedarikçi Yönetimi bölümünden tedarikçi ekleyebilirsiniz</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s: any) => {
            const supplierScores = scores?.filter(sc => sc.supplier_id === s.id) || [];
            const latestScore = supplierScores[0];
            const overallScore = latestScore ? parseFloat(latestScore.overall_score || 0) : parseFloat(s.performance_score || 0);

            return (
              <Card key={s.id} data-testid={`supplier-score-${s.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.code} | {s.city || "Sehir belirtilmemis"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${overallScore >= 80 ? "text-green-600 dark:text-green-400" : overallScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                          {(overallScore ?? 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">Genel Puan</p>
                      </div>
                    </div>
                  </div>
                  {latestScore && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-1.5 bg-muted/50 rounded">
                        <p className="text-sm font-semibold">{parseFloat(latestScore.delivery_score || 0).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Sevkiyat</p>
                      </div>
                      <div className="text-center p-1.5 bg-muted/50 rounded">
                        <p className="text-sm font-semibold">{parseFloat(latestScore.price_performance_score || 0).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Fiyat</p>
                      </div>
                      <div className="text-center p-1.5 bg-muted/50 rounded">
                        <p className="text-sm font-semibold">{parseFloat(latestScore.quality_score || 0).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Kalite</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Toplam Sipariş: {s.total_orders || 0}</span>
                    <span>Zamanında: %{parseFloat(s.on_time_delivery_rate || 0).toFixed(0)}</span>
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
