import { useState } from "react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, RefreshCw, Clock, CheckCircle2 } from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export function OfflineQueuePanel() {
  const { queueSize, queueItems, removeFromQueue, clearQueue, processQueue, isProcessing } = useOfflineQueue();
  const [items, setItems] = useState(queueItems);

  const refreshItems = () => setItems(queueItems);

  const handleRetryAll = async () => {
    await processQueue();
    refreshItems();
  };

  const handleRemove = (id: string) => {
    removeFromQueue(id);
    refreshItems();
  };

  const currentItems = items();

  if (queueSize === 0 && currentItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Bekleyen Gönderimler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm" data-testid="text-queue-empty">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Bekleyen gönderim yok
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" />
          Bekleyen Gönderimler
          <Badge variant="secondary" data-testid="badge-queue-count">{queueSize}</Badge>
        </CardTitle>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetryAll}
            disabled={isProcessing}
            data-testid="button-retry-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isProcessing ? "animate-spin" : ""}`} />
            {isProcessing ? "Gönderiliyor..." : "Tümünü Gönder"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" data-testid="button-clear-all">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tüm bekleyen gönderimler silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Tüm bekleyen veriler kalıcı olarak silinecek.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={() => { clearQueue(); refreshItems(); }} data-testid="button-confirm-clear">
                  Tümünü Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 p-2.5 rounded-md border"
              data-testid={`queue-item-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{timeAgo(item.timestamp)}</span>
                  {item.retryCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {item.retryCount}x denendi
                    </Badge>
                  )}
                  <Badge
                    variant={item.status === "failed" ? "destructive" : "secondary"}
                    className="text-[10px] px-1 py-0"
                  >
                    {item.status === "pending" ? "Bekliyor" : item.status === "processing" ? "Gönderiliyor" : "Başarısız"}
                  </Badge>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(item.id)}
                data-testid={`button-remove-${item.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
