import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Thermometer,
  ClipboardList,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";
import { MobileFilterCollapsible } from "@/components/mobile-filter-collapsible";

interface HaccpRecord {
  id: number;
  checkPoint: string;
  stationId: number | null;
  checkedBy: string;
  checkDate: string;
  result: string;
  temperatureValue: string | null;
  correctiveAction: string | null;
  notes: string | null;
  productionOutputId: number | null;
  createdAt: string;
  checkedByFirstName: string | null;
  checkedByLastName: string | null;
  stationName: string | null;
}

interface HaccpSummary {
  pass: number;
  fail: number;
  warning: number;
  total: number;
  complianceRate: number;
  period: string;
}

interface Station {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export default function GidaGuvenligi() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  const [filterStation, setFilterStation] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [newCheckPoint, setNewCheckPoint] = useState("");
  const [newStationId, setNewStationId] = useState<string>("");
  const [newResult, setNewResult] = useState<string>("");
  const [newTemperature, setNewTemperature] = useState("");
  const [newCorrectiveAction, setNewCorrectiveAction] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filterStation !== "all") params.set("stationId", filterStation);
    if (filterResult !== "all") params.set("result", filterResult);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const { data: records = [], isLoading: recordsLoading, isError, refetch } = useQuery<HaccpRecord[]>({
    queryKey: ['/api/factory/haccp', filterStation, filterResult],
    queryFn: async () => {
      const res = await fetch(`/api/factory/haccp${buildQueryString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<HaccpSummary>({
    queryKey: ['/api/factory/haccp/summary'],
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/factory/stations'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/factory/haccp', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "HACCP kaydı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/haccp'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCreateDialogOpen(false);
    setNewCheckPoint("");
    setNewStationId("");
    setNewResult("");
    setNewTemperature("");
    setNewCorrectiveAction("");
    setNewNotes("");
  };

  const handleCreate = () => {
    if (!newCheckPoint || !newResult) {
      toast({ title: "Hata", description: "Kontrol noktası ve sonuç gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      checkPoint: newCheckPoint,
      stationId: newStationId ? parseInt(newStationId) : null,
      result: newResult,
      temperatureValue: newTemperature ? parseFloat(newTemperature) : null,
      correctiveAction: newCorrectiveAction || null,
      notes: newNotes || null,
    });
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-600" data-testid={`badge-result-${result}`}><CheckCircle2 className="h-3 w-3 mr-1" />Geçti</Badge>;
      case 'fail':
        return <Badge variant="destructive" data-testid={`badge-result-${result}`}><XCircle className="h-3 w-3 mr-1" />Başarısız</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500" data-testid={`badge-result-${result}`}><AlertTriangle className="h-3 w-3 mr-1" />Uyarı</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const passRate = summary ? summary.complianceRate : 0;

  const COMMON_CHECK_POINTS = [
    "Hammadde Giriş Sıcaklık Kontrolü",
    "Soğuk Zincir Kontrolü",
    "Üretim Hattı Sıcaklık",
    "Paketleme Hijyen Kontrolü",
    "Depolama Sıcaklık Kontrolü",
    "Su Kalitesi Kontrolü",
    "Personel Hijyen Kontrolü",
    "Ekipman Temizlik Kontrolü",
    "Allerjen Çapraz Kontaminasyon",
    "Son Ürün Sıcaklık Kontrolü",
  ];

  
  if (recordsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-food-safety-title">Gıda Güvenliği</h1>
            <p className="text-muted-foreground">HACCP kontrol kayıtları</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/factory/haccp'] });
              queryClient.invalidateQueries({ queryKey: ['/api/factory/haccp/summary'] });
            }}
            data-testid="button-refresh-haccp"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-haccp">
            <Plus className="h-4 w-4 mr-2" />
            Yeni HACCP Kaydı
          </Button>
        </div>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Skeleton className="h-14 md:h-24" />
          <Skeleton className="h-14 md:h-24" />
          <Skeleton className="h-14 md:h-24" />
          <Skeleton className="h-14 md:h-24" />
        </div>
      ) : (
        <CompactKPIStrip
          items={[
            { label: "Uyum Oranı", value: `%${passRate}`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, color: "success", testId: "text-compliance-rate" },
            { label: "Geçen", value: summary?.pass || 0, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: "success", testId: "text-pass-count" },
            { label: "Başarısız", value: summary?.fail || 0, icon: <XCircle className="h-4 w-4 text-red-500" />, color: "danger", testId: "text-fail-count" },
            { label: "Uyarı", value: summary?.warning || 0, icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, color: "warning", testId: "text-warning-count" },
          ]}
          desktopColumns={4}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-5 w-5" />
            HACCP Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MobileFilterCollapsible activeFilterCount={(filterStation !== "all" ? 1 : 0) + (filterResult !== "all" ? 1 : 0)}>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="w-full md:w-48">
                <Select value={filterStation} onValueChange={setFilterStation}>
                  <SelectTrigger data-testid="select-filter-haccp-station">
                    <SelectValue placeholder="İstasyon Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm İstasyonlar</SelectItem>
                    {stations.filter(s => s.isActive).map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={filterResult} onValueChange={setFilterResult}>
                  <SelectTrigger data-testid="select-filter-haccp-result">
                    <SelectValue placeholder="Sonuç Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Sonuçlar</SelectItem>
                    <SelectItem value="pass">Geçti</SelectItem>
                    <SelectItem value="fail">Başarısız</SelectItem>
                    <SelectItem value="warning">Uyarı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </MobileFilterCollapsible>

          {recordsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>HACCP kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kontrol Noktası</TableHead>
                    <TableHead>İstasyon</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead>Sıcaklık</TableHead>
                    <TableHead>Kontrol Eden</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Düzeltici Faaliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} data-testid={`row-haccp-${record.id}`}>
                      <TableCell className="font-medium" data-testid={`text-checkpoint-${record.id}`}>
                        {record.checkPoint}
                      </TableCell>
                      <TableCell>
                        {record.stationName ? (
                          <Badge variant="secondary">{record.stationName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getResultBadge(record.result)}</TableCell>
                      <TableCell>
                        {record.temperatureValue ? (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            {record.temperatureValue}°C
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkedByFirstName && record.checkedByLastName
                          ? `${record.checkedByFirstName} ${record.checkedByLastName}`
                          : record.checkedBy}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(record.checkDate)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {record.correctiveAction || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setCreateDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Yeni HACCP Kontrol Kaydı
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kontrol Noktası</Label>
              <Select value={newCheckPoint} onValueChange={setNewCheckPoint}>
                <SelectTrigger data-testid="select-checkpoint">
                  <SelectValue placeholder="Kontrol noktası seçin" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CHECK_POINTS.map(cp => (
                    <SelectItem key={cp} value={cp}>{cp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newCheckPoint}
                onChange={(e) => setNewCheckPoint(e.target.value)}
                placeholder="Veya özel kontrol noktası yazın"
                data-testid="input-checkpoint-custom"
              />
            </div>

            <div className="space-y-2">
              <Label>İstasyon (Opsiyonel)</Label>
              <Select value={newStationId} onValueChange={setNewStationId}>
                <SelectTrigger data-testid="select-haccp-station">
                  <SelectValue placeholder="İstasyon seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçim Yok</SelectItem>
                  {stations.filter(s => s.isActive).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sonuç</Label>
              <Select value={newResult} onValueChange={setNewResult}>
                <SelectTrigger data-testid="select-haccp-result">
                  <SelectValue placeholder="Sonuç seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Geçti (Pass)</SelectItem>
                  <SelectItem value="fail">Başarısız (Fail)</SelectItem>
                  <SelectItem value="warning">Uyarı (Warning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sıcaklık Değeri (°C) - Opsiyonel</Label>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.1"
                  value={newTemperature}
                  onChange={(e) => setNewTemperature(e.target.value)}
                  placeholder="Ör: 4.5"
                  data-testid="input-temperature"
                />
              </div>
            </div>

            {(newResult === 'fail' || newResult === 'warning') && (
              <div className="space-y-2">
                <Label>Düzeltici Faaliyet</Label>
                <Textarea
                  value={newCorrectiveAction}
                  onChange={(e) => setNewCorrectiveAction(e.target.value)}
                  placeholder="Yapılacak düzeltici faaliyet..."
                  rows={3}
                  data-testid="input-corrective-action"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notlar (Opsiyonel)</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Ek notlar..."
                rows={2}
                data-testid="input-haccp-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel-haccp">
              İptal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-haccp"
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
