import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
import { 
  HQSupportTicket, 
  HQSupportMessage, 
  HQ_SUPPORT_CATEGORY, 
  HQ_SUPPORT_STATUS,
  HQSupportCategoryType,
  TICKET_PRIORITY,
  TicketPriorityType,
  isHQRole,
  type Branch,
  type User
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, MessageSquare, X, Send, Paperclip, Download, AlertCircle, CheckCircle, Clock, User as UserIcon, Star, ImagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Category translations
const CATEGORY_LABELS: Record<HQSupportCategoryType, string> = {
  ariza: "Arıza",
  teknik: "Teknik",
  muhasebe: "Muhasebe",
  lojistik: "Lojistik",
  fabrika: "Fabrika",
  urun_uretim: "Ürün/Üretim",
  satinalma: "Satın Alma",
  coach: "Coach",
  destek: "Destek",
  genel: "Genel",
  it_destek: "IT Destek",
};

// Priority translations and colors
const PRIORITY_LABELS: Record<TicketPriorityType, string> = {
  dusuk: "Düşük",
  normal: "Normal",
  yuksek: "Yüksek",
  acil: "Acil",
};

const PRIORITY_COLORS: Record<TicketPriorityType, string> = {
  dusuk: "bg-background0",
  normal: "bg-primary/100",
  yuksek: "bg-warning/100",
  acil: "bg-destructive/100",
};

// Extended ticket type with relations
type TicketWithRelations = HQSupportTicket & {
  branch: Branch;
  createdBy: User;
  messageCount: number;
  lastMessageAt?: string;
};

// Create ticket form schema
const createTicketSchema = z.object({
  title: z.string().min(1, "Başlık zorunludur"),
  description: z.string().min(1, "Açıklama zorunludur"),
  category: z.string().min(1, "Kategori seçiniz"),
  priority: z.string().default("normal"),
  branchId: z.string().optional(),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// Message form schema
const messageSchema = z.object({
  message: z.string().min(1, "Mesaj boş olamaz"),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function HQSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<"aktif" | "kapatildi">("aktif");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const isHQ = user?.role ? isHQRole(user.role as any) : false;

  // Adaptive polling: 5s active, 60s inactive (70% cost reduction)
  const pollingInterval = useAdaptivePolling(5000, 60000);

  // Fetch tickets with adaptive polling for real-time updates
  const { data: tickets = [], isLoading } = useQuery<TicketWithRelations[]>({
    queryKey: ["/api/hq-support/tickets"],
    refetchInterval: pollingInterval,
  });

  // Filter tickets by status
  const activeTickets = tickets.filter(t => t.status === HQ_SUPPORT_STATUS.AKTIF);
  const closedTickets = tickets.filter(t => t.status === HQ_SUPPORT_STATUS.KAPATILDI);

  const handleTicketClick = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setDetailDialogOpen(true);
  };

  // Group tickets by category for HQ users
  const groupedTickets = (ticketList: TicketWithRelations[]) => {
    if (!isHQ) return { ungrouped: ticketList };
    
    const grouped: Record<string, TicketWithRelations[]> = {};
    ticketList.forEach(ticket => {
      if (!grouped[ticket.category]) {
        grouped[ticket.category] = [];
      }
      grouped[ticket.category].push(ticket);
    });
    return grouped;
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">HQ Destek</h1>
          <p className="text-muted-foreground">Merkez ile iletişim taleplerinizi yönetin</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-ticket">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Talep Oluştur
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList>
          <TabsTrigger value="aktif" data-testid="tab-aktif">
            Aktif Talepler ({activeTickets.length})
          </TabsTrigger>
          <TabsTrigger value="kapatildi" data-testid="tab-kapatildi">
            Kapatılan Talepler ({closedTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aktif" className="w-full space-y-2 sm:space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Yükleniyor...</p>
              </CardContent>
            </Card>
          ) : activeTickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 gap-3">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
                <h3 className="font-medium text-lg">Aktif talep bulunmuyor</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">Merkez ile iletişim taleplerini buradan yönetin</p>
                <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-empty-create-ticket">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Destek Talebi
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TicketList tickets={activeTickets} onTicketClick={handleTicketClick} isHQ={isHQ} />
          )}
        </TabsContent>

        <TabsContent value="kapatildi" className="w-full space-y-2 sm:space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Yükleniyor...</p>
              </CardContent>
            </Card>
          ) : closedTickets.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Kapatılmış talep bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <TicketList tickets={closedTickets} onTicketClick={handleTicketClick} isHQ={isHQ} />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        branchId={user?.branchId || 0}
        isHQ={isHQ}
      />

      {/* Ticket Detail Dialog */}
      {selectedTicketId && (
        <TicketDetailDialog
          ticketId={selectedTicketId}
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedTicketId(null);
          }}
          isHQ={isHQ}
        />
      )}
    </div>
  );
}

// Ticket List Component
function TicketList({ 
  tickets, 
  onTicketClick, 
  isHQ 
}: { 
  tickets: TicketWithRelations[]; 
  onTicketClick: (id: number) => void;
  isHQ: boolean;
}) {
  if (isHQ) {
    // Group by category for HQ users
    const grouped: Record<string, TicketWithRelations[]> = {};
    tickets.forEach(ticket => {
      if (!grouped[ticket.category]) {
        grouped[ticket.category] = [];
      }
      grouped[ticket.category].push(ticket);
    });

    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        {Object.entries(grouped).map(([category, categoryTickets]) => (
          <div key={category}>
            <h3 className="text-lg font-medium mb-3">{CATEGORY_LABELS[category as HQSupportCategoryType]}</h3>
            <div className="flex flex-col gap-3 sm:gap-4">
              {categoryTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} onClick={onTicketClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple list for branch users
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {tickets.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} onClick={onTicketClick} />
      ))}
    </div>
  );
}

// Ticket Card Component
function TicketCard({ 
  ticket, 
  onClick 
}: { 
  ticket: TicketWithRelations; 
  onClick: (id: number) => void;
}) {
  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={() => onClick(ticket.id)}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-medium truncate" data-testid={`text-ticket-title-${ticket.id}`}>
                {ticket.title}
              </h4>
              <Badge variant="secondary" data-testid={`badge-category-${ticket.id}`}>
                {CATEGORY_LABELS[ticket.category as HQSupportCategoryType]}
              </Badge>
              {ticket.priority && (
                <Badge 
                  className={`${PRIORITY_COLORS[ticket.priority as TicketPriorityType]} text-white`}
                  data-testid={`badge-priority-${ticket.id}`}
                >
                  {PRIORITY_LABELS[ticket.priority as TicketPriorityType]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
              <span data-testid={`text-branch-${ticket.id}`}>{ticket.branch?.name}</span>
              <span data-testid={`text-created-${ticket.id}`}>
                {ticket.createdAt && format(new Date(ticket.createdAt), "d MMM yyyy", { locale: tr })}
              </span>
              <span className="flex items-center gap-1" data-testid={`text-message-count-${ticket.id}`}>
                <MessageSquare className="w-3 h-3" />
                {ticket.messageCount}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant={ticket.status === HQ_SUPPORT_STATUS.AKTIF ? "default" : "secondary"}
              className={ticket.status === HQ_SUPPORT_STATUS.AKTIF ? "bg-warning/100" : ""}
              data-testid={`badge-status-${ticket.id}`}
            >
              {ticket.status === HQ_SUPPORT_STATUS.AKTIF ? "Aktif" : "Kapatıldı"}
            </Badge>
            {ticket.rating && ticket.rating > 0 && (
              <div className="flex items-center gap-0.5" data-testid={`rating-display-${ticket.id}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${star <= ticket.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Ticket Dialog Component
function CreateTicketDialog({ 
  open, 
  onClose, 
  branchId,
  isHQ
}: { 
  open: boolean; 
  onClose: () => void;
  branchId: number;
  isHQ: boolean;
}) {
  const { toast } = useToast();
  
  // Fetch branches for HQ users
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    enabled: open && isHQ,
  });
  
  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "normal",
      branchId: isHQ ? "" : branchId.toString(),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTicketFormData) => {
      const finalBranchId = isHQ ? parseInt(data.branchId || "0") : branchId;
      const response = await apiRequest("POST", "/api/hq-support/tickets", {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        branchId: finalBranchId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets"] });
      toast({
        title: "Başarılı",
        description: "Talep başarıyla oluşturuldu",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTicketFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-create-ticket">
        <DialogHeader>
          <DialogTitle>Yeni Talep Oluştur</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            {/* HQ Branch Selection */}
            {isHQ && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube Seçin *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-branch-ticket">
                          <SelectValue placeholder="Şube seçiniz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlık *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Talep başlığı" data-testid="input-ticket-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Kategori seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} data-testid={`option-category-${value}`}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Öncelik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Öncelik seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} data-testid={`option-priority-${value}`}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Talebinizi detaylı açıklayınız" 
                      rows={4}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-create"
              >
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Talep Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function compressImage(file: File, maxSize: number = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TicketDetailDialog({ 
  ticketId, 
  open, 
  onClose, 
  isHQ 
}: { 
  ticketId: number; 
  open: boolean; 
  onClose: () => void;
  isHQ: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const { data: ticket } = useQuery<TicketWithRelations>({
    queryKey: ["/api/hq-support/tickets", ticketId],
    enabled: open,
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery<(HQSupportMessage & { sender: any })[]>({
    queryKey: ["/api/hq-support/tickets", ticketId, "messages"],
    enabled: open,
    refetchInterval: 10000,
  });

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; attachments?: any[] }) => {
      const response = await apiRequest("POST", `/api/hq-support/tickets/${ticketId}/messages`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets", ticketId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets"] });
      form.reset();
      setPendingAttachment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (rating: number) => {
      const response = await apiRequest("PATCH", `/api/hq-support/tickets/${ticketId}`, {
        status: "kapatildi",
        rating,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets", ticketId] });
      toast({
        title: "Başarılı",
        description: "Talep kapatıldı",
      });
      setShowRatingDialog(false);
      setSelectedRating(0);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageFormData) => {
    const payload: any = { message: data.message };
    if (pendingAttachment) {
      payload.attachments = [{ id: crypto.randomUUID(), url: pendingAttachment, type: "image", name: "photo.jpg", size: 0 }];
    }
    sendMessageMutation.mutate(payload);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hata", description: "Sadece resim dosyalari yuklenebilir", variant: "destructive" });
      return;
    }
    try {
      const compressed = await compressImage(file, 800);
      setPendingAttachment(compressed);
    } catch {
      toast({ title: "Hata", description: "Resim isleme hatasi", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCloseTicket = () => {
    setShowRatingDialog(true);
  };

  const handleConfirmClose = () => {
    if (selectedRating < 1) {
      toast({ title: "Uyarı", description: "Lütfen bir puan seçiniz", variant: "destructive" });
      return;
    }
    closeTicketMutation.mutate(selectedRating);
  };

  if (!ticket) {
    return null;
  }

  const isTicketActive = ticket.status === HQ_SUPPORT_STATUS.AKTIF;
  const isCreator = user?.id === ticket.createdById;

  if (showRatingDialog) {
    return (
      <Dialog open={open} onOpenChange={() => { setShowRatingDialog(false); }}>
        <DialogContent data-testid="dialog-rating">
          <DialogHeader>
            <DialogTitle>Talep Degerlendirmesi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">Destek deneyiminizi puanlayin</p>
            <div className="flex items-center gap-1" data-testid="rating-stars-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="p-1"
                  data-testid={`button-star-${star}`}
                >
                  <Star
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= selectedRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium" data-testid="text-rating-value">
              {selectedRating > 0 ? `${selectedRating} / 5` : "Puan seciniz"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRatingDialog(false)}
              data-testid="button-cancel-rating"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
              disabled={closeTicketMutation.isPending || selectedRating < 1}
              data-testid="button-confirm-close"
            >
              {closeTicketMutation.isPending ? "Kapatiliyor..." : "Kapat ve Degerlendir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="dialog-ticket-detail">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1">
              <DialogTitle data-testid="text-detail-title">{ticket.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" data-testid="badge-detail-category">
                  {CATEGORY_LABELS[ticket.category as HQSupportCategoryType]}
                </Badge>
                {ticket.priority && (
                  <Badge 
                    className={`${PRIORITY_COLORS[ticket.priority as TicketPriorityType]} text-white`}
                    data-testid="badge-detail-priority"
                  >
                    {PRIORITY_LABELS[ticket.priority as TicketPriorityType]}
                  </Badge>
                )}
                <Badge 
                  variant={isTicketActive ? "default" : "secondary"}
                  className={isTicketActive ? "bg-warning/100" : ""}
                  data-testid="badge-detail-status"
                >
                  {isTicketActive ? "Aktif" : "Kapatildi"}
                </Badge>
                {ticket.assignedToId && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    Atandi
                  </Badge>
                )}
              </div>
              {ticket.rating && ticket.rating > 0 && (
                <div className="flex items-center gap-1 mt-2" data-testid="detail-rating-display">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= ticket.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:gap-3 flex-1 overflow-hidden">
          <div className="flex flex-col gap-3 sm:gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-detail-description">
              {ticket.description}
            </p>
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground flex-wrap">
              <span data-testid="text-detail-branch">
                <strong>Şube:</strong> {ticket.branch?.name}
              </span>
              <span data-testid="text-detail-created">
                <strong>Oluşturulma:</strong> {ticket.createdAt && format(new Date(ticket.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
              </span>
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 pr-4">
            <div className="flex flex-col gap-2 sm:gap-3 pb-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz mesaj yok</p>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 sm:gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={msg.sender?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {msg.sender?.firstName?.[0]}{msg.sender?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 space-y-1 ${isCurrentUser ? "text-right" : ""}`}>
                        <div className={`flex items-center gap-2 ${isCurrentUser ? "justify-end" : ""}`}>
                          <p className="text-sm font-medium">
                            {msg.sender?.firstName} {msg.sender?.lastName}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt && format(new Date(msg.createdAt), "HH:mm", { locale: tr })}
                          </span>
                        </div>
                        <div 
                          className={`inline-block p-3 rounded-lg ${
                            isCurrentUser 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {(msg.attachments as any[]).map((att: any, idx: number) => (
                                att.type === "image" && att.url ? (
                                  <img
                                    key={idx}
                                    src={att.url}
                                    alt={att.name || "Ek"}
                                    className="max-w-[200px] rounded-md"
                                    data-testid={`attachment-image-${msg.id}-${idx}`}
                                    loading="lazy"
                                  />
                                ) : null
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {isTicketActive && (
            <>
              <Separator />
              {pendingAttachment && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <img src={pendingAttachment} alt="Ek" className="w-12 h-12 object-cover rounded-md" loading="lazy" />
                  <span className="text-sm text-muted-foreground flex-1">Resim eklendi</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingAttachment(null)}
                    data-testid="button-remove-attachment"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-attach-photo"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Mesajinizi yazin..." 
                            data-testid="input-message"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>

        {isCreator && isTicketActive && (
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleCloseTicket}
              disabled={closeTicketMutation.isPending}
              data-testid="button-close-ticket"
            >
              {closeTicketMutation.isPending ? "Kapatiliyor..." : "Talebi Kapat"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
