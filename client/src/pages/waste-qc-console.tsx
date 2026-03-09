import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Boxes, AlertTriangle, Plus, Search, Factory } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function WasteQCConsole() {
  const { t } = useTranslation("common");
  const { toast } = useToast();

  const [showCreateLot, setShowCreateLot] = useState(false);
  const [newLotId, setNewLotId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newQcNotes, setNewQcNotes] = useState("");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: lots = [], isLoading: lotsLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/waste/lots"],
  });

  const { data: insights } = useQuery<any>({
    queryKey: ["/api/waste/insights/weekly", "qc"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/insights/weekly?from=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/waste/events", "qc-lot"],
    queryFn: async () => {
      const res = await fetch(`/api/waste/events?from=${sevenDaysAgo}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const lotClusters = insights?.lotClusters || [];

  async function handleCreateLot() {
    if (!newLotId.trim()) return;
    try {
      await apiRequest("POST", "/api/waste/lots", {
        lotId: newLotId,
        productName: newProductName || null,
        qcNotes: newQcNotes || null,
        qcStatus: "pending",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/waste/lots"] });
      toast({ title: t("waste.lotCreated", { defaultValue: "Lot kaydı oluşturuldu" }) });
      setNewLotId("");
      setNewProductName("");
      setNewQcNotes("");
      setShowCreateLot(false);
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  }

  async function handleUpdateLotStatus(lotDbId: number, status: string) {
    try {
      await apiRequest("PATCH", `/api/waste/lots/${lotDbId}`, { qcStatus: status });
      queryClient.invalidateQueries({ queryKey: ["/api/waste/lots"] });
      toast({ title: t("waste.lotUpdated", { defaultValue: "Lot durumu güncellendi" }) });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  }

  
  if (lotsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="text-lot-count">{lots.length}</div>
            <p className="text-sm text-muted-foreground">
              {t("waste.totalLots", { defaultValue: "Kayıtlı Lotlar" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-lot-clusters">
              {lotClusters.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.lotClusters", { defaultValue: "Lot Kümeleri" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive" data-testid="text-pending-lots">
              {lots.filter((l: any) => l.qcStatus === "pending" || l.qcStatus === "under_review").length}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("waste.pendingReview", { defaultValue: "İnceleme Bekliyor" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {lotClusters.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Boxes className="h-5 w-5" />
            <CardTitle className="text-base">
              {t("waste.lotClusterAnalysis", { defaultValue: "Lot Küme Analizi" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lotClusters.map((cluster: any, i: number) => (
                <div key={i} className="rounded-md border p-3" data-testid={`card-lot-cluster-${i}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={Number(cluster.affectedBranches) >= 2 ? "destructive" : "secondary"}>
                        Lot: {cluster.lotId}
                      </Badge>
                      <span className="text-sm">{cluster.cnt} {t("waste.events", { defaultValue: "olay" })}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {cluster.affectedBranches} {t("waste.branches", { defaultValue: "şube" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            <CardTitle className="text-base">{t("waste.lotManagement", { defaultValue: "Lot Yönetimi" })}</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCreateLot(!showCreateLot)} data-testid="button-toggle-create-lot">
            <Plus className="h-4 w-4 mr-1" />
            {t("waste.newLot", { defaultValue: "Yeni Lot" })}
          </Button>
        </CardHeader>
        <CardContent>
          {showCreateLot && (
            <div className="rounded-md border p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("waste.lotId", { defaultValue: "Lot Numarası" })}</Label>
                  <Input value={newLotId} onChange={e => setNewLotId(e.target.value)} data-testid="input-new-lot-id" />
                </div>
                <div className="space-y-1">
                  <Label>{t("waste.productName", { defaultValue: "Ürün Adı" })}</Label>
                  <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} data-testid="input-new-product-name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("waste.qcNotes", { defaultValue: "QC Notları" })}</Label>
                <Textarea value={newQcNotes} onChange={e => setNewQcNotes(e.target.value)} data-testid="textarea-qc-notes" />
              </div>
              <Button size="sm" onClick={handleCreateLot} disabled={!newLotId.trim()} data-testid="button-create-lot">
                {t("waste.createLot", { defaultValue: "Lot Oluştur" })}
              </Button>
            </div>
          )}

          {lotsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : lots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("waste.noLots", { defaultValue: "Lot kaydı bulunamadı" })}
            </p>
          ) : (
            <div className="space-y-2">
              {lots.map((lot: any) => (
                <div key={lot.id} className="rounded-md border p-3" data-testid={`card-lot-${lot.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={
                        lot.qcStatus === "failed" ? "destructive" :
                        lot.qcStatus === "passed" ? "default" : "secondary"
                      }>
                        {lot.qcStatus}
                      </Badge>
                      <span className="text-sm font-medium">Lot: {lot.lotId}</span>
                      {lot.productName && <span className="text-xs text-muted-foreground">{lot.productName}</span>}
                    </div>
                    <div className="flex gap-1">
                      {lot.qcStatus !== "passed" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateLotStatus(lot.id, "passed")} data-testid={`button-pass-${lot.id}`}>
                          {t("waste.pass", { defaultValue: "Geçti" })}
                        </Button>
                      )}
                      {lot.qcStatus !== "failed" && (
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateLotStatus(lot.id, "failed")} data-testid={`button-fail-${lot.id}`}>
                          {t("waste.fail", { defaultValue: "Başarısız" })}
                        </Button>
                      )}
                    </div>
                  </div>
                  {lot.qcNotes && <p className="text-xs text-muted-foreground mt-1">{lot.qcNotes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
