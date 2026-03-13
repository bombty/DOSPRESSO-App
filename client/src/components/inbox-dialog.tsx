import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Upload } from "lucide-react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { OfflineQueuePanel } from "@/components/offline-queue-panel";
import { Button } from "@/components/ui/button";
import { useAdaptivePolling } from "@/hooks/useAdaptivePolling";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { queueSize } = useOfflineQueue();

  const pollingInterval = useAdaptivePolling(5000, 60000);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: pollingInterval,
  });

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    enabled: open,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest('PATCH', `/api/messages/${messageId}/read`);
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
  const totalBadge = unreadCount + queueSize;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-8 w-8"
          data-testid="button-inbox"
        >
          <Mail className="h-4 w-4 text-white" />
          {totalBadge > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {totalBadge}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gelen Kutusu</DialogTitle>
        </DialogHeader>
        {queueSize > 0 ? (
          <Tabs defaultValue="messages">
            <TabsList className="w-full">
              <TabsTrigger value="messages" className="flex-1" data-testid="tab-messages">
                Mesajlar {unreadCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex-1" data-testid="tab-queue">
                <Upload className="h-3.5 w-3.5 mr-1" />
                Bekleyen ({queueSize})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="messages">
              <MessageList messages={messages} isLoading={isLoading} onMessageClick={handleMessageClick} />
            </TabsContent>
            <TabsContent value="queue">
              <OfflineQueuePanel />
            </TabsContent>
          </Tabs>
        ) : (
          <MessageList messages={messages} isLoading={isLoading} onMessageClick={handleMessageClick} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessageList({ messages, isLoading, onMessageClick }: { 
  messages: Message[] | undefined; 
  isLoading: boolean; 
  onMessageClick: (m: Message) => void;
}) {
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
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
              onClick={() => onMessageClick(message)}
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
  );
}
