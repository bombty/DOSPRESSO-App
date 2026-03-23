import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pin, PinOff, Search, ExternalLink, Tag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
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
  createdAt: string;
  updatedAt: string;
}

const NOTE_COLORS: Record<string, string> = {
  yellow: "border-l-yellow-400",
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  red: "border-l-red-400",
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
};

interface NotesGridProps {
  onNewNote?: () => void;
  onEditNote?: (note: Note) => void;
}

export default function NotesGrid({ onNewNote, onEditNote }: NotesGridProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/ajanda/notes", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/ajanda/notes?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ajanda/notes/${id}/pin`, { method: "POST" });
      if (!res.ok) throw new Error("Pin failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ajanda/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ajanda/notes"] });
      toast({ title: "Not silindi" });
    },
  });

  return (
    <div className="space-y-4" data-testid="notes-grid">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Notlarda ara..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search-notes"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">{searchTerm ? "Sonuç bulunamadı" : "Henüz not yok"}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map(note => (
            <Card
              key={note.id}
              className={`p-4 cursor-pointer hover-elevate border-l-4 ${note.color ? NOTE_COLORS[note.color] || "border-l-transparent" : "border-l-transparent"}`}
              onClick={() => onEditNote?.(note)}
              data-testid={`note-card-${note.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm truncate flex-1">
                  {note.title || "Başlıksız Not"}
                </h4>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={e => { e.stopPropagation(); pinMutation.mutate(note.id); }}
                    data-testid={`button-pin-${note.id}`}
                  >
                    {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(note.id); }}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{note.content}</p>

              <div className="flex items-center gap-2 flex-wrap">
                {note.relatedEntityName && (
                  <Badge variant="secondary" className="text-[10px]">
                    {note.relatedEntityName}
                  </Badge>
                )}
                {note.tags && note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
                {note.isPinned && (
                  <Pin className="h-3 w-3 text-primary" />
                )}
              </div>

              <p className="text-[10px] text-muted-foreground mt-2">
                {format(new Date(note.updatedAt), "d MMM HH:mm", { locale: tr })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
