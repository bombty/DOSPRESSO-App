import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  HQ_SUPPORT_CATEGORY, 
  TICKET_PRIORITY,
  type HQSupportCategoryType,
  type TicketPriorityType 
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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
};

const PRIORITY_LABELS: Record<TicketPriorityType, string> = {
  dusuk: "Düşük",
  normal: "Normal",
  yuksek: "Yüksek",
  acil: "Acil",
};

const PRIORITY_COLORS: Record<TicketPriorityType, string> = {
  dusuk: "bg-muted",
  normal: "bg-primary/20",
  yuksek: "bg-warning/20",
  acil: "bg-destructive/20",
};

const createTicketSchema = z.object({
  title: z.string().min(1, "Başlık zorunludur"),
  description: z.string().min(1, "Açıklama zorunludur"),
  category: z.string().min(1, "Kategori seçiniz"),
  priority: z.string().default("normal"),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

const messageSchema = z.object({
  message: z.string().min(1, "Mesaj boş olamaz"),
});

export default function Destek() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/hq-support/tickets"],
  });

  const { data: ticketDetail } = useQuery<any>({
    queryKey: ["/api/hq-support/tickets", selectedTicketId],
    enabled: !!selectedTicketId,
  });

  const createForm = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "normal",
    },
  });

  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTicketFormData) =>
      apiRequest("POST", "/api/hq-support/tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Talep oluşturuldu" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { message: string }) =>
      apiRequest("POST", `/api/hq-support/tickets/${selectedTicketId}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hq-support/tickets", selectedTicketId] });
      messageForm.reset();
      toast({ title: "Mesaj gönderildi" });
    },
  });

  const activeTickets = tickets.filter((t: any) => t.status === "aktif");
  const closedTickets = tickets.filter((t: any) => t.status === "kapatildi");

  const handleTicketClick = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setDetailDialogOpen(true);
  };

  const TicketCard = ({ ticket }: { ticket: any }) => (
    <Card
      className="cursor-pointer hover-elevate"
      onClick={() => handleTicketClick(ticket.id)}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm line-clamp-1">{ticket.title}</h3>
          <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority as TicketPriorityType]}>
            {PRIORITY_LABELS[ticket.priority as TicketPriorityType] || ticket.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[ticket.category as HQSupportCategoryType] || ticket.category}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(ticket.createdAt), "dd MMM", { locale: tr })}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {ticket.messageCount || 0}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Merkez Destek</h1>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-ticket">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Talep
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Aktif Talepler ({activeTickets.length})
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : activeTickets.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aktif talebiniz bulunmuyor
            </Card>
          ) : (
            <div className="space-y-2">
              {activeTickets.map((ticket: any) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>

        {closedTickets.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Kapatılmış Talepler ({closedTickets.length})
            </h2>
            <div className="space-y-2">
              {closedTickets.slice(0, 5).map((ticket: any) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Destek Talebi</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Talep başlığı" data-testid="input-ticket-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
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
                control={createForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-priority">
                          <SelectValue placeholder="Öncelik seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
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
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Talebinizi detaylı açıklayın" rows={4} data-testid="input-ticket-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-ticket">
                  {createMutation.isPending ? "Gönderiliyor..." : "Gönder"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{ticketDetail?.ticket?.title || "Talep Detayı"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4">
              {ticketDetail?.ticket && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {CATEGORY_LABELS[ticketDetail.ticket.category as HQSupportCategoryType]}
                    </Badge>
                    <Badge className={PRIORITY_COLORS[ticketDetail.ticket.priority as TicketPriorityType]}>
                      {PRIORITY_LABELS[ticketDetail.ticket.priority as TicketPriorityType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticketDetail.ticket.description}</p>
                  <Separator />
                </div>
              )}
              <div className="space-y-3">
                {ticketDetail?.messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.senderId === user?.id
                        ? "bg-primary/10 ml-4"
                        : "bg-muted mr-4"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.createdAt), "dd MMM HH:mm", { locale: tr })}
                      </span>
                    </div>
                    <p>{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          {ticketDetail?.ticket?.status === "aktif" && (
            <Form {...messageForm}>
              <form
                onSubmit={messageForm.handleSubmit((data) => sendMessageMutation.mutate(data))}
                className="flex gap-2"
              >
                <FormField
                  control={messageForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input {...field} placeholder="Mesaj yazın..." data-testid="input-ticket-message" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="icon" disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
