import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot } from "lucide-react";

interface DobodyTaskAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "branch" | "factory" | "coach";
  branchId?: number | null;
  branchIds?: number[];
  onSuccess?: () => void;
}

const DURATION_PRESETS = [
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "Yüksek" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Düşük" },
];

function getEndDate(preset: string): string {
  const d = new Date();
  if (preset === "today") {
    return d.toISOString().split("T")[0];
  } else if (preset === "week") {
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  } else {
    d.setMonth(d.getMonth() + 1, 0);
    return d.toISOString().split("T")[0];
  }
}

export function DobodyTaskAssignDialog({
  open,
  onOpenChange,
  scope,
  branchId,
  branchIds,
  onSuccess,
}: DobodyTaskAssignDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("5");
  const [priority, setPriority] = useState("normal");
  const [duration, setDuration] = useState("today");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const endDate = getEndDate(duration);
      const targetBranches =
        scope === "branch" && branchId
          ? [branchId]
          : scope === "coach" && branchIds?.length
          ? branchIds
          : null;

      await apiRequest("POST", "/api/admin/dobody-tasks", {
        title: title.trim(),
        description: description.trim() || null,
        estimatedMinutes: parseInt(estimatedMinutes) || 5,
        priority,
        startDate: today,
        endDate,
        targetBranches,
        targetRoles: null,
        targetUsers: null,
        navigateTo: null,
      });
    },
    onSuccess: () => {
      toast({ title: "Görev atandı", description: "Ekibinize yeni görev başarıyla gönderildi" });
      setTitle("");
      setDescription("");
      setEstimatedMinutes("5");
      setPriority("normal");
      setDuration("today");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({
        title: "Hata",
        description: err?.message || "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const canSave = title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-task-assign">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Ekibe Görev Ata
          </DialogTitle>
          <DialogDescription>
            {scope === "branch"
              ? "Şube ekibinize yeni bir görev atayın"
              : scope === "coach"
              ? "Sorumlu olduğunuz şubelere görev atayın"
              : "Fabrika ekibine görev atayın"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Görev Başlığı *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Yeni temizlik protokolünü okuyun"
              maxLength={255}
              data-testid="input-assign-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsiyonel detaylar..."
              rows={2}
              data-testid="input-assign-description"
            />
          </div>

          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>Süre</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="select-assign-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-assign-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tahmini Süre (dk)</Label>
            <Input
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              data-testid="input-assign-minutes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="btn-cancel-assign">
            İptal
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            data-testid="btn-submit-assign"
          >
            {saveMutation.isPending ? "Gönderiliyor..." : "Görevi Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
