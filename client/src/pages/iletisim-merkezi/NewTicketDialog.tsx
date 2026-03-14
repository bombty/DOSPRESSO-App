import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENTS, PRIORITIES } from "./categoryConfig";
import { apiRequest } from "@/lib/queryClient";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const qc = useQueryClient();
  const [dept, setDept] = useState("");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedDept = DEPARTMENTS.find(d => d.key === dept);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/iletisim/tickets", {
        department: dept,
        title: title.trim(),
        description: description.trim(),
        priority,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/iletisim/dashboard"] });
      onOpenChange(false);
      setDept("");
      setPriority("normal");
      setTitle("");
      setDescription("");
    },
  });

  const canSubmit = dept && title.trim().length >= 5 && description.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="new-ticket-dialog">
        <DialogHeader>
          <DialogTitle>Yeni Destek Talebi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Departman Seçin</p>
            <div className="grid grid-cols-3 gap-2">
              {DEPARTMENTS.map(d => {
                const DIcon = d.icon;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDept(d.key)}
                    className={cn(
                      "p-3 rounded-md border text-left transition-all",
                      dept === d.key
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                        : "border-border bg-muted/30 hover-elevate"
                    )}
                    data-testid={`dept-btn-${d.key}`}
                  >
                    <DIcon className="h-4 w-4 mb-1 text-muted-foreground" />
                    <div className="text-[11px] font-medium leading-tight">{d.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDept && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" data-testid="auto-assign-info">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="text-xs text-green-700 dark:text-green-300">
                <span className="font-medium">Otomatik yönlendirilecek</span> · SLA: {selectedDept.slaLabel}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Konu Başlığı</p>
            <Input
              placeholder="Kısaca açıklayın..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-sm"
              data-testid="ticket-title-input"
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Detay</p>
            <Textarea
              placeholder="Sorunu detaylı açıklayın..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="text-sm resize-none"
              rows={4}
              data-testid="ticket-desc-input"
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Öncelik</p>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={priority === p.key ? "default" : "outline"}
                  onClick={() => setPriority(p.key)}
                  className="flex-1 toggle-elevate"
                  data-testid={`priority-btn-${p.key}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="w-full"
            data-testid="submit-ticket-btn"
          >
            {mutation.isPending ? "Gönderiliyor..." : "Ticket Aç"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
