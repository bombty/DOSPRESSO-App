import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type Message = {
  id: number;
  senderId: string;
  recipientId: string | null;
  recipientRole: string | null;
  subject: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export function InboxDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch messages when dialog opens
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: open,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  const handleMessageClick = (message: Message) => {
    if (!message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const unreadCount = unreadData?.count || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          data-testid="button-inbox"
        >
          <Mail className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gelen Kutusu</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Yükleniyor...
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz mesajınız yok
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border cursor-pointer hover-elevate ${
                    !message.isRead ? 'bg-accent/50' : 'bg-background'
                  }`}
                  onClick={() => handleMessageClick(message)}
                  data-testid={`message-${message.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                          {message.subject}
                        </h4>
                        {!message.isRead && (
                          <Badge variant="default" className="text-xs">
                            Yeni
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {message.body}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(message.createdAt), 'dd MMM HH:mm', { locale: tr })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
