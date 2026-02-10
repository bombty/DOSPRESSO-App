import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Package, Save, Eye, ThumbsUp, Loader2, FileText
} from "lucide-react";

interface StockCount {
  id: number;
  countType: string;
  status: string;
  startedBy: string;
  approvedBy: string | null;
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

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  in_progress: { label: "Devam Ediyor", variant: "secondary" },
  completed: { label: "Tamamlandi", variant: "default" },
  approved: { label: "Onaylandi", variant: "default" },
};

const typeLabels: Record<string, string> = {
  raw_material: "Hammadde",
  finished_product: "Bitmiş Ürün",
  both: "Tüm Stok",
};

export default function StokSayimPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [newCountType, setNewCountType] = useState("raw_material");
  const [newNotes, setNewNotes] = useState("");

  const isManager = user?.role === "admin" || user?.role === "fabrika_mudur";

  const { data: counts = [], isLoading } = useQuery<StockCount[]>({
    queryKey: ["/api/factory/stock-counts"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/factory/stock-counts", {
        countType: newCountType,
        notes: newNotes || null,
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      setShowNewDialog(false);
      setNewNotes("");
      setSelectedCount(data);
      toast({ title: "Stok sayimi baslatildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Stok sayimi baslatilamadi", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${countId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayim tamamlandi" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (countId: number) => {
      return apiRequest("PATCH", `/api/factory/stock-counts/${countId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory/stock-counts"] });
      toast({ title: "Sayim onaylandi" });
    },
  });

  const inProgressCounts = counts.filter(c => c.status === "in_progress");
  const completedCounts = counts.filter(c => c.status === "completed");
  const approvedCounts = counts.filter(c => c.status === "approved");

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Stok Sayim</h2>
        </div>
        {isManager && (
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-stock-count">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Sayim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Stok Sayimi Baslat</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Sayim Turu</label>
                  <Select value={newCountType} onValueChange={setNewCountType}>
                    <SelectTrigger data-testid="select-count-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">Hammadde</SelectItem>
                      <SelectItem value="finished_product">Bitmiş Ürün</SelectItem>
                      <SelectItem value="both">Tüm Stok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notlar (Opsiyonel)</label>
                  <Textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Sayim ile ilgili notlar..."
                    data-testid="input-count-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-start-count">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Sayimi Baslat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            Aktif Sayimlar
            {inProgressCounts.length > 0 && <Badge variant="secondary" className="ml-1">{inProgressCounts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-count-history">
            Gecmis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-2 mt-2">
          {inProgressCounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aktif stok sayimi bulunmuyor</p>
                {isManager && <p className="text-xs mt-1">Yeni bir sayim baslatmak icin "Yeni Sayim" butonuna tiklayin</p>}
              </CardContent>
            </Card>
          ) : (
            inProgressCounts.map(count => (
              <StockCountCard
                key={count.id}
                count={count}
                isManager={isManager}
                onComplete={() => completeMutation.mutate(count.id)}
                onApprove={() => approveMutation.mutate(count.id)}
                onSelect={() => setSelectedCount(count)}
              />
            ))
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
                  onComplete={() => {}}
                  onApprove={() => approveMutation.mutate(count.id)}
                  onSelect={() => setSelectedCount(count)}
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-2">
          {approvedCounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Gecmis sayim kaydi bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            approvedCounts.map(count => (
              <StockCountCard
                key={count.id}
                count={count}
                isManager={isManager}
                onComplete={() => {}}
                onApprove={() => {}}
                onSelect={() => setSelectedCount(count)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedCount && (
        <StockCountDetailDialog
          count={selectedCount}
          isManager={isManager}
          onClose={() => setSelectedCount(null)}
          onComplete={() => {
            completeMutation.mutate(selectedCount.id);
            setSelectedCount(null);
          }}
          onApprove={() => {
            approveMutation.mutate(selectedCount.id);
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
  onComplete,
  onApprove,
  onSelect,
}: {
  count: StockCount;
  isManager: boolean;
  onComplete: () => void;
  onApprove: () => void;
  onSelect: () => void;
}) {
  const statusInfo = statusLabels[count.status] || { label: count.status, variant: "secondary" as const };

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onSelect} data-testid={`stock-count-${count.id}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {typeLabels[count.countType] || count.countType} Sayimi
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(count.startedAt || count.createdAt).toLocaleDateString("tr-TR", {
                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelect(); }} data-testid={`button-view-count-${count.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
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

function StockCountDetailDialog({
  count,
  isManager,
  onClose,
  onComplete,
  onApprove,
}: {
  count: StockCount;
  isManager: boolean;
  onClose: () => void;
  onComplete: () => void;
  onApprove: () => void;
}) {
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<StockCountItem[]>({
    queryKey: [`/api/factory/stock-counts/${count.id}/items`],
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

  const statusInfo = statusLabels[count.status] || { label: count.status, variant: "secondary" as const };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {typeLabels[count.countType] || count.countType} Sayimi
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-2">
          Baslanma: {new Date(count.startedAt || count.createdAt).toLocaleString("tr-TR")}
          {count.completedAt && ` | Tamamlanma: ${new Date(count.completedAt).toLocaleString("tr-TR")}`}
        </div>

        {items.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Henuz sayim kalemi eklenmemis</p>
            <p className="text-xs mt-1">Stok verileri otomatik olarak yuklenecektir</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Malzeme</TableHead>
                <TableHead className="text-right">Beklenen</TableHead>
                <TableHead className="text-right">Sayilan</TableHead>
                <TableHead className="text-right">Fark</TableHead>
                <TableHead>Birim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} data-testid={`count-item-${item.id}`}>
                  <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                  <TableCell className="text-right text-sm">{item.expectedQuantity}</TableCell>
                  <TableCell className="text-right">
                    {count.status === "in_progress" ? (
                      <Input
                        type="number"
                        className="w-20 h-7 text-sm text-right"
                        defaultValue={item.countedQuantity || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (item.countedQuantity || "")) {
                            updateItemMutation.mutate({ itemId: item.id, countedQuantity: e.target.value });
                          }
                        }}
                        data-testid={`input-counted-${item.id}`}
                      />
                    ) : (
                      <span className="text-sm">{item.countedQuantity || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.difference ? (
                      <span className={`text-sm font-medium ${
                        parseFloat(item.difference) < 0 ? "text-red-600 dark:text-red-400" :
                        parseFloat(item.difference) > 0 ? "text-green-600 dark:text-green-400" :
                        "text-muted-foreground"
                      }`}>
                        {parseFloat(item.difference) > 0 ? "+" : ""}{item.difference}
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
        )}

        {count.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
            <span className="font-medium">Notlar:</span> {count.notes}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Kapat</Button>
          {count.status === "in_progress" && (
            <Button onClick={onComplete} data-testid="button-dialog-complete">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Sayimi Tamamla
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
