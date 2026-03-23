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

interface Note {
  id: number;
  title: string | null;
  content: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  relatedEntityName: string | null;
  tags: string[] | null;
  isPinned: boolean;
  color: string | null;
}

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editNote?: Note | null;
}

export default function NewNoteDialog({ open, onOpenChange, editNote }: NewNoteDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editNote;

  const [title, setTitle] = useState(editNote?.title || "");
  const [content, setContent] = useState(editNote?.content || "");
  const [tagsInput, setTagsInput] = useState(editNote?.tags?.join(", ") || "");
  const [color, setColor] = useState(editNote?.color || "");
  const [relatedEntityName, setRelatedEntityName] = useState(editNote?.relatedEntityName || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : undefined;
      const body = {
        title: title || undefined,
        content,
        tags,
        color: color || undefined,
        relatedEntityName: relatedEntityName || undefined,
      };

      const url = isEdit ? `/api/ajanda/notes/${editNote!.id}` : "/api/ajanda/notes";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/notes"] });
      toast({ title: isEdit ? "Not güncellendi" : "Not oluşturuldu" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Not kaydedilemedi", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Notu Düzenle" : "Yeni Not"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="note-title">Başlık</Label>
            <Input
              id="note-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Not başlığı (opsiyonel)"
              data-testid="input-note-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-content">İçerik</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Notunuzu yazın..."
              rows={6}
              required
              data-testid="input-note-content"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-entity">Bağlantı</Label>
            <Input
              id="note-entity"
              value={relatedEntityName}
              onChange={e => setRelatedEntityName(e.target.value)}
              placeholder="örn: Ahmet Tedarikçi, Işıklar Şubesi"
              data-testid="input-note-entity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-tags">Etiketler</Label>
            <Input
              id="note-tags"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="virgülle ayırın"
              data-testid="input-note-tags"
            />
          </div>

          <div className="space-y-2">
            <Label>Renk</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger data-testid="select-note-color">
                <SelectValue placeholder="Renk seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok</SelectItem>
                <SelectItem value="yellow">Sarı</SelectItem>
                <SelectItem value="blue">Mavi</SelectItem>
                <SelectItem value="green">Yeşil</SelectItem>
                <SelectItem value="red">Kırmızı</SelectItem>
                <SelectItem value="purple">Mor</SelectItem>
                <SelectItem value="orange">Turuncu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-note">
              İptal
            </Button>
            <Button type="submit" disabled={!content.trim() || saveMutation.isPending} data-testid="button-save-note">
              {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
