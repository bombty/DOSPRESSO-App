import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Upload, User } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useLocation } from "wouter";

type ThreadParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
};

type Thread = {
  threadId: string;
  subject: string;
  participants: ThreadParticipant[];
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
  sentByMe: boolean;
};

export function InboxDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { queueSize } = useOfflineQueue();
  const [, setLocation] = useLocation();

  const pollingInterval = useAdaptivePolling(5000, 60000);

  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: pollingInterval,
  });

  const { data: threads, isLoading } = useQuery<Thread[]>({
    queryKey: ['/api/messages'],
    enabled: open,
  });

  const unreadCount = unreadData?.unreadCount || 0;
  const totalBadge = unreadCount + queueSize;

  const handleThreadClick = (thread: Thread) => {
    setOpen(false);
    setLocation("/iletisim-merkezi");
  };

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
              <ThreadList threads={threads} isLoading={isLoading} userId={user?.id} onThreadClick={handleThreadClick} />
            </TabsContent>
            <TabsContent value="queue">
              <OfflineQueuePanel />
            </TabsContent>
          </Tabs>
        ) : (
          <ThreadList threads={threads} isLoading={isLoading} userId={user?.id} onThreadClick={handleThreadClick} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ThreadList({ threads, isLoading, userId, onThreadClick }: { 
  threads: Thread[] | undefined; 
  isLoading: boolean; 
  userId?: string;
  onThreadClick: (t: Thread) => void;
}) {
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
          Yükleniyor...
        </div>
      ) : !threads || threads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-inbox">
          Henüz mesajınız yok
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const otherParticipants = thread.participants.filter(p => p.id !== userId);
            const displayName = otherParticipants.length > 0
              ? otherParticipants.map(p => `${p.firstName} ${p.lastName}`).join(", ")
              : "Bilinmeyen";
            const hasUnread = thread.unreadCount > 0;

            let formattedDate = "";
            try {
              formattedDate = format(new Date(thread.lastMessageAt), 'dd MMM HH:mm', { locale: tr });
            } catch {
              formattedDate = "";
            }

            return (
              <div
                key={thread.threadId}
                className={`p-3 rounded-lg border cursor-pointer hover-elevate ${
                  hasUnread ? 'bg-accent/50' : 'bg-background'
                }`}
                onClick={() => onThreadClick(thread)}
                data-testid={`thread-${thread.threadId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
                          {displayName}
                        </span>
                        {hasUnread && (
                          <Badge variant="default" className="text-xs">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm truncate ${hasUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                        {thread.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {thread.sentByMe ? "Sen: " : ""}{thread.lastMessageBody}
                      </p>
                    </div>
                  </div>
                  {formattedDate && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}
