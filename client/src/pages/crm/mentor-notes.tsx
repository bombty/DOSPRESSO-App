import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Plus, MessageSquare, User, Calendar, Star, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface MentorNote {
  id: number;
  employeeId: string;
  employeeName: string;
  branchName?: string;
  noteType: string;
  content: string;
  rating?: number;
  createdAt: string;
  createdBy: string;
}

const NOTE_TYPES = [
  { value: "development", label: "Gelişim Notu", color: "bg-blue-500/10 text-blue-500" },
  { value: "feedback", label: "Geri Bildirim", color: "bg-green-500/10 text-green-500" },
  { value: "warning", label: "Uyarı", color: "bg-yellow-500/10 text-yellow-500" },
  { value: "achievement", label: "Başarı", color: "bg-purple-500/10 text-purple-500" },
  { value: "meeting", label: "Görüşme Notu", color: "bg-gray-500/10 text-gray-500" }
];

export default function MentorNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    employeeId: "",
    noteType: "development",
    content: "",
    rating: 0
  });

  const { data: notes, isLoading } = useQuery<MentorNote[]>({
    queryKey: ['/api/mentor-notes'],
  });

  const { data: employees } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: typeof newNote) => {
      return apiRequest('POST', '/api/mentor-notes', {
        ...data,
        createdBy: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mentor-notes'] });
      setIsAddDialogOpen(false);
      setNewNote({ employeeId: "", noteType: "development", content: "", rating: 0 });
      toast({ title: "Başarılı", description: "Mentor notu eklendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Not eklenemedi", variant: "destructive" });
    }
  });

  const filteredNotes = (notes || []).filter(note =>
    note.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-mentor-notes-title">Mentor Notları</h2>
          <p className="text-sm text-muted-foreground">Personel gelişim takibi ve geri bildirimler</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-note">
              <Plus className="h-4 w-4 mr-1" />
              Yeni Not
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Mentor Notu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Personel</Label>
                <Select 
                  value={newNote.employeeId} 
                  onValueChange={(v) => setNewNote({...newNote, employeeId: v})}
                >
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Personel seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Not Türü</Label>
                <Select 
                  value={newNote.noteType} 
                  onValueChange={(v) => setNewNote({...newNote, noteType: v})}
                >
                  <SelectTrigger data-testid="select-note-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Değerlendirme (1-5)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      size="sm"
                      variant={newNote.rating >= star ? "default" : "outline"}
                      onClick={() => setNewNote({...newNote, rating: star})}
                      data-testid={`button-rating-${star}`}
                    >
                      <Star className={`h-4 w-4 ${newNote.rating >= star ? "fill-current" : ""}`} />
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Not İçeriği</Label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  placeholder="Gelişim notu, gözlemler..."
                  rows={4}
                  data-testid="textarea-note-content"
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => addNoteMutation.mutate(newNote)}
                disabled={!newNote.employeeId || !newNote.content || addNoteMutation.isPending}
                data-testid="button-save-note"
              >
                {addNoteMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Not veya personel ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-notes"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {NOTE_TYPES.slice(0, 4).map((type) => {
          const count = filteredNotes.filter(n => n.noteType === type.value).length;
          return (
            <Card key={type.value} data-testid={`stat-${type.value}`}>
              <CardContent className="p-4">
                <Badge className={type.color}>{type.label}</Badge>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Son Notlar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Henüz mentor notu yok</p>
              <p className="text-xs mt-1">Yeni bir not ekleyerek başlayın</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotes.slice(0, 10).map((note) => {
                const noteType = NOTE_TYPES.find(t => t.value === note.noteType);
                
                return (
                  <div 
                    key={note.id} 
                    className="p-4 hover-elevate"
                    data-testid={`note-row-${note.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{note.employeeName}</span>
                            {noteType && (
                              <Badge className={noteType.color} variant="secondary">
                                {noteType.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {note.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(note.createdAt), "d MMM yyyy", { locale: tr })}
                            </span>
                            {note.rating && note.rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                {note.rating}/5
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
