import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface NewTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewTodoDialog({ open, onOpenChange }: NewTodoDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tagsInput, setTagsInput] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : undefined;
      const res = await fetch("/api/ajanda/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          priority,
          tags,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/todos"] });
      toast({ title: "Todo oluşturuldu" });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Todo oluşturulamadı", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setPriority("medium");
    setTagsInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Yapılacak</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="todo-title">Başlık</Label>
            <Input
              id="todo-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ne yapılacak?"
              required
              data-testid="input-todo-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo-desc">Açıklama</Label>
            <Textarea
              id="todo-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detaylar..."
              rows={3}
              data-testid="input-todo-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="todo-date">Tarih</Label>
              <Input
                id="todo-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                data-testid="input-todo-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-time">Saat</Label>
              <Input
                id="todo-time"
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                data-testid="input-todo-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Öncelik</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-todo-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Düşük</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="high">Yüksek</SelectItem>
                <SelectItem value="urgent">Acil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo-tags">Etiketler</Label>
            <Input
              id="todo-tags"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="virgülle ayırın: tedarikçi, ahmet"
              data-testid="input-todo-tags"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-todo">
              İptal
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} data-testid="button-save-todo">
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
