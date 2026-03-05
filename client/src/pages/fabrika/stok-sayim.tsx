import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Plus, CheckCircle2, Clock, AlertTriangle,
  Package, Eye, ThumbsUp, Loader2, FileText, Search,
  Play, Send, QrCode, User, Filter
} from "lucide-react";

interface StockCount {
  id: number;
  countType: string;
  status: string;
  startedBy: string;
  approvedBy: string | null;
  assignedTo: string | null;
  requestedBy: string | null;
  requestedCategory: string | null;
  scope: string | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface StockCountItem {
  id: number;
  stockCountId: number;
  itemType: string;
  itemId: number;
  itemName: string;
  expectedQuantity: string;
  countedQuantity: string | null;
  unit: string | null;
  difference: string | null;
  notes: string | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Talep Edildi", variant: "outline" },
  in_progress: { label: "Devam Ediyor", variant: "secondary" },
  completed: { label: "Tamamlandı", variant: "default" },
  approved: { label: "Onaylandi", variant: "default" },
};

const typeLabels: Record<string, string> = {
  raw_material: "Hammadde",
  finished_product: "Mamul",
  both: "Tum Stok",
};

const categoryLabels: Record<string, string> = {
  hammadde: "Hammadde",
  ambalaj: "Ambalaj",
  ekipman: "Ekipman",
  sube_ekipman: "Şube Ekipman",
  sube_malzeme: "Şube Malzeme",
  konsantre: "Konsantre",
  donut: "Donut",
  tatli: "Tatli",
  tuzlu: "Tuzlu",
  cay_grubu: "Cay Grubu",
  kahve: "Kahve",
  toz_topping: "Toz/Topping",
  yarimamul: "Yari Mamul",
  mamul: "Mamul",
  sarf_malzeme: "Sarf Malzeme",
  temizlik: "Temizlik",
  diger: "Diger",
  arge: "AR-GE",
};

const scopeLabels: Record<string, string> = {
  full: "Tum Stok",
  category: "Kategori Bazli",
};

export default function StokSayimPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);

  const isManager = user?.role === "admin" || user?.role === "fabrika_mudur";
  const canRequest = user?.role === "ceo" || user?.role === "cgo" || user?.role === "satinalma" || user?.role === "admin";

  const { data: counts = [], isLoading } = useQuery<StockCount[]>({
    queryKey: ["/api/factory/stock-counts"],
  });

  const startMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${countId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayım başlatıldı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Sayım başlatılamadı", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${countId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayım tamamlandı" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${countId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayım onaylandı" });
    },
  });

  const requestedCounts = counts.filter(c => c.status === "requested");
  const inProgressCounts = counts.filter(c => c.status === "in_progress");
  const completedCounts = counts.filter(c => c.status === "completed");
  const approvedCounts = counts.filter(c => c.status === "approved");
  const activeCounts = counts.filter(c => c.status === "in_progress" || c.status === "requested");
  const historyCounts = counts.filter(c => c.status === "completed" || c.status === "approved");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Stok Sayım</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canRequest && (
            <Button size="sm" variant="outline" onClick={() => setShowRequestDialog(true)} data-testid="button-request-count">
              <Send className="h-4 w-4 mr-1" />
              Sayım Talep Et
            </Button>
          )}
          {isManager && (
            <Button size="sm" onClick={() => setShowNewDialog(true)} data-testid="button-new-stock-count">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Sayım
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Send className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Talep Edilen</p>
                <p className="text-lg font-bold" data-testid="text-requested-counts">{requestedCounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devam Eden</p>
                <p className="text-lg font-bold" data-testid="text-in-progress-counts">{inProgressCounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tamamlanan</p>
                <p className="text-lg font-bold" data-testid="text-completed-counts">{completedCounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onaylanan</p>
                <p className="text-lg font-bold" data-testid="text-approved-counts">{approvedCounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-counts">
            Aktif Sayımlar
            {activeCounts.length > 0 && <Badge variant="secondary" className="ml-1">{activeCounts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            Talepler
            {requestedCounts.length > 0 && <Badge variant="secondary" className="ml-1">{requestedCounts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-count-history">
            Gecmis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-2 mt-2">
          {inProgressCounts.length === 0 && requestedCounts.filter(c => c.assignedTo === user?.fullName).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aktif stok sayimi bulunmuyor</p>
                {isManager && <p className="text-xs mt-1">Yeni bir sayım başlatmak için "Yeni Sayım" butonuna tıklayın</p>}
              </CardContent>
            </Card>
          ) : (
            <>
              {inProgressCounts.map(count => (
                <StockCountCard
                  key={count.id}
                  count={count}
                  isManager={isManager}
                  user={user}
                  onComplete={() => completeMutation.mutate(count.id)}
                  onApprove={() => approveMutation.mutate(count.id)}
                  onStart={() => startMutation.mutate(count.id)}
                  onSelect={() => setSelectedCount(count)}
                  isStarting={startMutation.isPending}
                />
              ))}
            </>
          )}

          {completedCounts.length > 0 && isManager && (
            <>
              <h3 className="text-sm font-semibold mt-4 flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" /> Onay Bekleyen
              </h3>
              {completedCounts.map(count => (
                <StockCountCard
                  key={count.id}
                  count={count}
                  isManager={isManager}
                  user={user}
                  onComplete={() => {}}
                  onApprove={() => approveMutation.mutate(count.id)}
                  onStart={() => {}}
                  onSelect={() => setSelectedCount(count)}
                  isStarting={false}
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-2 mt-2">
          {requestedCounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sayım talebi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            requestedCounts.map(count => (
              <StockCountCard
                key={count.id}
                count={count}
                isManager={isManager}
                user={user}
                onComplete={() => {}}
                onApprove={() => {}}
                onStart={() => startMutation.mutate(count.id)}
                onSelect={() => setSelectedCount(count)}
                isStarting={startMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-2">
          {historyCounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Gecmis sayim kaydi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            historyCounts.map(count => (
              <StockCountCard
                key={count.id}
                count={count}
                isManager={isManager}
                user={user}
                onComplete={() => {}}
                onApprove={() => {}}
                onStart={() => {}}
                onSelect={() => setSelectedCount(count)}
                isStarting={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {showNewDialog && (
        <NewCountDialog
          onClose={() => setShowNewDialog(false)}
          onCreated={(count) => {
            setShowNewDialog(false);
            setSelectedCount(count);
          }}
        />
      )}

      {showRequestDialog && (
        <RequestCountDialog
          userName={user?.fullName || ""}
          onClose={() => setShowRequestDialog(false)}
        />
      )}

      {selectedCount && (
        <StockCountDetailDialog
          count={selectedCount}
          isManager={isManager}
          user={user}
          onClose={() => setSelectedCount(null)}
          onComplete={() => {
            completeMutation.mutate(selectedCount.id);
            setSelectedCount(null);
          }}
          onApprove={() => {
            approveMutation.mutate(selectedCount.id);
            setSelectedCount(null);
          }}
          onStart={() => {
            startMutation.mutate(selectedCount.id);
            setSelectedCount(null);
          }}
        />
      )}
    </div>
  );
}

function StockCountCard({
  count,
  isManager,
  user,
  onComplete,
  onApprove,
  onStart,
  onSelect,
  isStarting,
}: {
  count: StockCount;
  isManager: boolean;
  user: any;
  onComplete: () => void;
  onApprove: () => void;
  onStart: () => void;
  onSelect: () => void;
  isStarting: boolean;
}) {
  const statusInfo = statusLabels[count.status] || { label: count.status, variant: "secondary" as const };
  const canStartThis = count.status === "requested" && (isManager || count.assignedTo === user?.fullName);

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onSelect} data-testid={`stock-count-${count.id}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {typeLabels[count.countType] || count.countType} Sayımı
                {count.scope === "category" && count.requestedCategory && (
                  <span className="text-muted-foreground"> - {categoryLabels[count.requestedCategory] || count.requestedCategory}</span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {new Date(count.startedAt || count.createdAt).toLocaleDateString("tr-TR", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
                {count.assignedTo && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <User className="h-3 w-3" /> {count.assignedTo}
                  </span>
                )}
                {count.requestedBy && (
                  <span className="text-xs text-muted-foreground">
                    Talep: {count.requestedBy}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {count.scope && (
              <Badge variant="outline" className="text-xs">{scopeLabels[count.scope] || count.scope}</Badge>
            )}
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelect(); }} data-testid={`button-view-count-${count.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
              {canStartThis && (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onStart(); }} disabled={isStarting} data-testid={`button-start-count-${count.id}`}>
                  {isStarting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  Başla
                </Button>
              )}
              {count.status === "in_progress" && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onComplete(); }} data-testid={`button-complete-count-${count.id}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Tamamla
                </Button>
              )}
              {count.status === "completed" && isManager && (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onApprove(); }} data-testid={`button-approve-count-${count.id}`}>
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                  Onayla
                </Button>
              )}
            </div>
          </div>
        </div>
        {count.notes && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{count.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function NewCountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (count: StockCount) => void }) {
  const { toast } = useToast();
  const [countType, setCountType] = useState("raw_material");
  const [scope, setScope] = useState("full");
  const [requestedCategory, setRequestedCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/factory/stock-counts", {
        countType,
        notes: notes || null,
        assignedTo: assignedTo || null,
        requestedCategory: scope === "category" ? requestedCategory : null,
        scope,
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Stok sayımı başlatıldı" });
      onCreated(data);
    },
    onError: () => {
      toast({ title: "Hata", description: "Stok sayımı başlatılamadı", variant: "destructive" });
    },
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Stok Sayımı Başlat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Kapsam</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger data-testid="select-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Tüm Stok</SelectItem>
                <SelectItem value="category">Kategori Bazlı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "category" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Kategori</label>
              <Select value={requestedCategory} onValueChange={setRequestedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">Sayım Türü</label>
            <Select value={countType} onValueChange={setCountType}>
              <SelectTrigger data-testid="select-count-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Hammadde</SelectItem>
                <SelectItem value="finished_product">Mamul</SelectItem>
                <SelectItem value="both">Tum Stok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Görevli Kişi (Opsiyonel)</label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Adi soyadi"
              data-testid="input-assigned-to"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notlar (Opsiyonel)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sayım ile ilgili notlar..."
              data-testid="input-count-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || (scope === "category" && !requestedCategory)}
            data-testid="button-start-count"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Sayımı Başlat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestCountDialog({ userName, onClose }: { userName: string; onClose: () => void }) {
  const { toast } = useToast();
  const [countType, setCountType] = useState("raw_material");
  const [scope, setScope] = useState("full");
  const [requestedCategory, setRequestedCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const requestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/factory/stock-counts/request", {
        countType,
        notes: notes || null,
        assignedTo: assignedTo || null,
        requestedCategory: scope === "category" ? requestedCategory : null,
        scope,
        requestedBy: userName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayım talebi oluşturuldu" });
      onClose();
    },
    onError: () => {
      toast({ title: "Hata", description: "Sayım talebi oluşturulamadı", variant: "destructive" });
    },
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sayım Talep Et</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Kapsam</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger data-testid="select-request-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Tüm Stok</SelectItem>
                <SelectItem value="category">Kategori Bazlı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "category" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Kategori</label>
              <Select value={requestedCategory} onValueChange={setRequestedCategory}>
                <SelectTrigger data-testid="select-request-category">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">Sayım Türü</label>
            <Select value={countType} onValueChange={setCountType}>
              <SelectTrigger data-testid="select-request-count-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Hammadde</SelectItem>
                <SelectItem value="finished_product">Mamul</SelectItem>
                <SelectItem value="both">Tum Stok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Görevli Kişi</label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Sayımı yapacak kişinin adı"
              data-testid="input-request-assigned-to"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notlar (Opsiyonel)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Talep ile ilgili notlar..."
              data-testid="input-request-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending || !assignedTo.trim() || (scope === "category" && !requestedCategory)}
            data-testid="button-send-request"
          >
            {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Talep Gonder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockCountDetailDialog({
  count,
  isManager,
  user,
  onClose,
  onComplete,
  onApprove,
  onStart,
}: {
  count: StockCount;
  isManager: boolean;
  user: any;
  onClose: () => void;
  onComplete: () => void;
  onApprove: () => void;
  onStart: () => void;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);
  const highlightedRef = useRef<HTMLTableRowElement>(null);

  const { data: items = [], isLoading } = useQuery<StockCountItem[]>({
    queryKey: ["/api/factory/stock-counts", count.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/factory/stock-counts/${count.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: count.status !== "requested",
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, countedQuantity, notes }: { itemId: number; countedQuantity: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${count.id}/items/${itemId}`, {
        countedQuantity,
        expectedQuantity: items.find(i => i.id === itemId)?.expectedQuantity || "0",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts", count.id, "items"] });
    },
  });

  useEffect(() => {
    if (highlightedItemId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => setHighlightedItemId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId]);

  const handleQrScan = () => {
    const code = prompt("QR / Barkod kodunu girin:");
    if (code) {
      const foundItem = items.find(i =>
        i.itemName.toLocaleLowerCase('tr-TR').includes(code.toLocaleLowerCase('tr-TR')) ||
        String(i.itemId) === code
      );
      if (foundItem) {
        setHighlightedItemId(foundItem.id);
        setSearchQuery("");
      } else {
        toast({ title: "Bulunamadı", description: `"${code}" ile eşleşen ürün bulunamadı`, variant: "destructive" });
      }
    }
  };

  const filteredItems = searchQuery
    ? items.filter(i => i.itemName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')))
    : items;

  const statusInfo = statusLabels[count.status] || { label: count.status, variant: "secondary" as const };
  const canStartThis = count.status === "requested" && (isManager || count.assignedTo === user?.fullName);

  const countedCount = items.filter(i => i.countedQuantity !== null && i.countedQuantity !== "").length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-5 w-5" />
            {typeLabels[count.countType] || count.countType} Sayımı
            {count.scope === "category" && count.requestedCategory && (
              <span className="text-muted-foreground font-normal">- {categoryLabels[count.requestedCategory] || count.requestedCategory}</span>
            )}
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span>Baslama: {new Date(count.startedAt || count.createdAt).toLocaleString("tr-TR")}</span>
            {count.completedAt && <span>Tamamlanma: {new Date(count.completedAt).toLocaleString("tr-TR")}</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {count.assignedTo && <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> Gorevli: {count.assignedTo}</span>}
            {count.requestedBy && <span>Talep eden: {count.requestedBy}</span>}
            {count.scope && <span>Kapsam: {scopeLabels[count.scope] || count.scope}</span>}
          </div>
        </div>

        {count.status === "requested" ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Bu sayım henüz başlatılmadı</p>
            <p className="text-xs mt-1">Sayım başlatıldıktan sonra kalemler otomatik olarak yüklenecektir</p>
            {canStartThis && (
              <Button className="mt-3" onClick={onStart} data-testid="button-dialog-start">
                <Play className="h-4 w-4 mr-1" />
                Sayımı Başla
              </Button>
            )}
          </div>
        ) : (
          <>
            {count.status === "in_progress" && totalCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-visible">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="shrink-0">{countedCount}/{totalCount} ({progressPercent}%)</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ürün ara..."
                  className="pl-8"
                  data-testid="input-search-items"
                />
              </div>
              <Button size="icon" variant="outline" onClick={handleQrScan} data-testid="button-qr-scan">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{searchQuery ? "Aramayla eşleşen ürün bulunamadı" : "Sayım kalemi bulunmuyor"}</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 -mx-6 px-6">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Malzeme</TableHead>
                      <TableHead className="text-right w-20">Beklenen</TableHead>
                      <TableHead className="text-right w-24">Sayilan</TableHead>
                      <TableHead className="text-right w-20">Fark</TableHead>
                      <TableHead className="w-16">Birim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => (
                      <TableRow
                        key={item.id}
                        ref={highlightedItemId === item.id ? highlightedRef : undefined}
                        className={highlightedItemId === item.id ? "bg-primary/10 transition-colors" : ""}
                        data-testid={`count-item-${item.id}`}
                      >
                        <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                        <TableCell className="text-right text-sm">{parseFloat(item.expectedQuantity).toLocaleString("tr-TR")}</TableCell>
                        <TableCell className="text-right">
                          {count.status === "in_progress" ? (
                            <Input
                              type="number"
                              className="w-20 text-sm text-right ml-auto"
                              defaultValue={item.countedQuantity || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (item.countedQuantity || "")) {
                                  updateItemMutation.mutate({ itemId: item.id, countedQuantity: e.target.value });
                                }
                              }}
                              data-testid={`input-counted-${item.id}`}
                            />
                          ) : (
                            <span className="text-sm">{item.countedQuantity ? parseFloat(item.countedQuantity).toLocaleString("tr-TR") : "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.difference ? (
                            <span className={`text-sm font-medium ${
                              parseFloat(item.difference) < 0 ? "text-red-600 dark:text-red-400" :
                              parseFloat(item.difference) > 0 ? "text-green-600 dark:text-green-400" :
                              "text-muted-foreground"
                            }`}>
                              {parseFloat(item.difference) > 0 ? "+" : ""}{parseFloat(item.difference).toLocaleString("tr-TR")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.unit || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {count.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Notlar:</span> {count.notes}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-dialog-close">Kapat</Button>
          {count.status === "in_progress" && (
            <Button onClick={onComplete} data-testid="button-dialog-complete">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Sayımı Tamamla
            </Button>
          )}
          {count.status === "completed" && isManager && (
            <Button onClick={onApprove} data-testid="button-dialog-approve">
              <ThumbsUp className="h-4 w-4 mr-1" />
              Onayla
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
