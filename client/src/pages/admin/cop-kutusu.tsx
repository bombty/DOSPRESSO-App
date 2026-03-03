import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Package,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrashTableInfo {
  key: string;
  label: string;
  count: number;
}

export default function AdminCopKutusu() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "restore" | "delete";
    tableName: string;
    id: string;
    displayName: string;
  } | null>(null);

  if (user?.role !== "admin" && user?.role !== "genel_mudur") {
    return <Redirect to="/" />;
  }

  const { data: tables, isLoading: tablesLoading } = useQuery<TrashTableInfo[]>({
    queryKey: ["/api/trash/tables"],
  });

  const { data: trashItems, isLoading: itemsLoading, refetch: refetchItems } = useQuery<any[]>({
    queryKey: ["/api/trash", selectedTable],
    enabled: !!selectedTable,
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ tableName, id }: { tableName: string; id: string }) => {
      await apiRequest("PATCH", `/api/trash/${tableName}/${id}/restore`);
    },
    onSuccess: () => {
      toast({ title: "Kayit geri yuklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      refetchItems();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async ({ tableName, id }: { tableName: string; id: string }) => {
      await apiRequest("DELETE", `/api/trash/${tableName}/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Kayit kalici olarak silindi" });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      refetchItems();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const totalTrash = tables?.reduce((sum, t) => sum + t.count, 0) || 0;

  function getDisplayName(item: any, tableName: string): string {
    if (tableName === "users") return `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email || item.id;
    if (tableName === "branches") return item.name || item.id;
    if (tableName === "tasks") return item.title || `Gorev #${item.id}`;
    if (tableName === "equipment") return item.name || `Ekipman #${item.id}`;
    if (tableName === "checklists") return item.title || `Checklist #${item.id}`;
    if (tableName === "recipes") return item.name || `Tarif #${item.id}`;
    if (tableName === "training_modules") return item.title || `Modul #${item.id}`;
    if (tableName === "shifts") return `Vardiya #${item.id} - ${item.shiftType || ""}`;
    return String(item.id);
  }

  function handleConfirmAction() {
    if (!confirmAction) return;
    if (confirmAction.type === "restore") {
      restoreMutation.mutate({ tableName: confirmAction.tableName, id: confirmAction.id });
    } else {
      permanentDeleteMutation.mutate({ tableName: confirmAction.tableName, id: confirmAction.id });
    }
    setConfirmAction(null);
  }

  return (
    <div className="space-y-6" data-testid="trash-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Trash2 className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-trash-title">Cop Kutusu</h2>
          <p className="text-sm text-muted-foreground">
            Silinen kayitlari goruntuleyin, geri yukleyin veya kalici olarak silin
          </p>
        </div>
        {totalTrash > 0 && (
          <Badge variant="secondary" data-testid="badge-total-trash">{totalTrash} kayit</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tablesLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))
        ) : (
          tables?.map((t) => (
            <Card
              key={t.key}
              className={`cursor-pointer transition-colors ${selectedTable === t.key ? "ring-2 ring-primary" : ""} hover-elevate`}
              onClick={() => setSelectedTable(t.key)}
              data-testid={`card-table-${t.key}`}
            >
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-center">{t.label}</span>
                <Badge variant={t.count > 0 ? "destructive" : "secondary"} data-testid={`badge-count-${t.key}`}>
                  {t.count}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedTable && (
        <Card data-testid="trash-items-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              {tables?.find((t) => t.key === selectedTable)?.label || selectedTable}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTable(null)}
              data-testid="button-close-table"
            >
              Kapat
            </Button>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : !trashItems?.length ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-trash">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Bu tabloda silinmiş kayıt bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trashItems.map((item: any) => {
                  const displayName = getDisplayName(item, selectedTable);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border"
                      data-testid={`trash-item-${item.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {item.id}
                          {item.deletedAt && (
                            <> | Silinme: {format(new Date(item.deletedAt), "dd MMM yyyy HH:mm", { locale: tr })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              type: "restore",
                              tableName: selectedTable,
                              id: String(item.id),
                              displayName,
                            })
                          }
                          disabled={restoreMutation.isPending}
                          data-testid={`button-restore-${item.id}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Geri Yukle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              type: "delete",
                              tableName: selectedTable,
                              id: String(item.id),
                              displayName,
                            })
                          }
                          disabled={permanentDeleteMutation.isPending}
                          data-testid={`button-permanent-delete-${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Kalici Sil
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "restore" ? "Kaydi Geri Yukle" : "Kalici Silme"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "restore" ? (
                <>
                  <strong>{confirmAction.displayName}</strong> kaydini geri yuklemek istiyor musunuz?
                  Bu islem kaydi tekrar aktif hale getirecektir.
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 inline mr-1 text-destructive" />
                  <strong>{confirmAction?.displayName}</strong> kaydini kalici olarak silmek istiyor musunuz?
                  Bu islem geri alinamaz!
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground" : ""}
              data-testid="button-confirm-action"
            >
              {confirmAction?.type === "restore" ? "Geri Yukle" : "Kalici Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
