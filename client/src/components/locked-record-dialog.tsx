import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lock, FileEdit } from "lucide-react";

interface LockedRecordDialogProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  tableName?: string;
  recordId?: number | string;
}

export function LockedRecordDialog({ open, onClose, reason, tableName, recordId }: LockedRecordDialogProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const createRequestMutation = useMutation({
    mutationFn: (data: {
      tableName: string;
      recordId: number;
      fieldName: string;
      currentValue: string;
      requestedValue: string;
      reason: string;
    }) => apiRequest("POST", "/api/change-requests", data),
    onSuccess: () => {
      toast({ title: "Talep oluşturuldu", description: "Değişiklik talebiniz iletildi." });
      resetForm();
      onClose();
    },
    onError: () => {
      toast({ title: "Hata", description: "Talep oluşturulamadı", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setFieldName("");
    setCurrentValue("");
    setRequestedValue("");
    setChangeReason("");
  };

  const handleSubmit = () => {
    if (!changeReason.trim()) {
      toast({ title: "Sebep zorunludur", variant: "destructive" });
      return;
    }
    if (!tableName || !recordId) return;
    createRequestMutation.mutate({
      tableName,
      recordId: typeof recordId === "string" ? parseInt(recordId, 10) : recordId,
      fieldName,
      currentValue,
      requestedValue,
      reason: changeReason,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Kayıt Kilitli
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" data-testid="text-lock-reason">
              {reason || "Bu kayıt düzenleme için kilitlenmiştir."}
            </p>
            {tableName && (
              <p className="text-xs text-muted-foreground">
                Tablo: <span className="font-medium">{tableName}</span>
                {recordId && <>, Kayıt: <span className="font-medium">#{recordId}</span></>}
              </p>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleClose} data-testid="button-close-lock-dialog">
                Kapat
              </Button>
              <Button onClick={() => setShowForm(true)} data-testid="button-open-change-request">
                <FileEdit className="h-4 w-4 mr-2" />
                Düzeltme Talebi Oluştur
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cr-fieldName">Alan Adı</Label>
              <Input
                id="cr-fieldName"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="Değiştirilecek alan"
                data-testid="input-cr-field-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-currentValue">Mevcut Değer</Label>
              <Input
                id="cr-currentValue"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="Şu anki değer"
                data-testid="input-cr-current-value"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-requestedValue">Talep Edilen Değer</Label>
              <Input
                id="cr-requestedValue"
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="İstenen yeni değer"
                data-testid="input-cr-requested-value"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-reason">Sebep *</Label>
              <Textarea
                id="cr-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Değişiklik sebebini açıklayın..."
                rows={3}
                required
                data-testid="textarea-cr-reason"
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-back-lock-dialog">
                Geri
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createRequestMutation.isPending || !changeReason.trim()}
                data-testid="button-submit-change-request"
              >
                {createRequestMutation.isPending ? "Gönderiliyor..." : "Talebi Gönder"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
