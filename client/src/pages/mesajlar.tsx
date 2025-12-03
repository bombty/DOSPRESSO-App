import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Send, Paperclip, MoreVertical, Search, Plus, FileIcon, Download, CheckCheck, Check } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Message, ThreadParticipant, User } from "@shared/schema";
import { isHQRole, isBranchRole, type UserRoleType } from "@shared/schema";

type ThreadSummary = {
  threadId: string;
  subject: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  unreadCount: number;
  participants: Array<{userId: string; firstName: string; lastName: string}>;
};

type ThreadData = {
  messages: Message[];
  participants: ThreadParticipant[];
};

export default function Mesajlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [folder, setFolder] = useState<'inbox'|'sent'|'unread'>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<Array<{id: string; url: string; type: string; name: string; size: number}>>([]);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch thread list with polling for real-time updates
  const { data: threads = [], isLoading: threadsLoading } = useQuery<ThreadSummary[]>({
    queryKey: ['/api/messages', folder],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch selected thread messages
  const { data: threadData, isLoading: threadLoading } = useQuery<ThreadData>({
    queryKey: ['/api/messages', selectedThreadId],
    enabled: !!selectedThreadId,
    refetchInterval: selectedThreadId ? 3000 : false, // Poll every 3 seconds when thread is open
  });

  // Fetch all users for new message dialog
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isNewMessageOpen,
  });

  // Fetch branches for HQ cascading selection
  const { data: allBranches = [] } = useQuery({
    queryKey: ['/api/branches'],
    enabled: isNewMessageOpen && isHQRole(user?.role as UserRoleType),
  });

  // Mark thread as read mutation
  const markReadMutation = useMutation({
    mutationFn: (threadId: string) => 
      apiRequest('POST', `/api/messages/${threadId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: (data: { threadId: string; body: string; attachments: any[] }) =>
      apiRequest('POST', `/api/messages/${data.threadId}/replies`, {
        body: data.body,
        attachments: data.attachments,
      }),
    onSuccess: () => {
      setMessageText("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  // Create new message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: {
      recipientId: string;
      subject: string;
      body: string;
      type: string;
      attachments: any[];
    }) => {
      const response = await apiRequest('POST', '/api/messages', data);
      return response.json();
    },
    onSuccess: (newMessage: Message) => {
      setIsNewMessageOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      // Select the newly created thread
      setSelectedThreadId(newMessage.threadId);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadData?.messages]);

  // Mark thread as read when opened
  useEffect(() => {
    if (selectedThreadId && threadData) {
      const hasUnread = threads.find(t => t.threadId === selectedThreadId)?.unreadCount || 0;
      if (hasUnread > 0) {
        markReadMutation.mutate(selectedThreadId);
      }
    }
  }, [selectedThreadId, threadData]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedThreadId) return;
    
    sendReplyMutation.mutate({
      threadId: selectedThreadId,
      body: messageText,
      attachments,
    });
  };

  const handleAttachmentUpload = async () => {
    try {
      const response = await fetch('/api/object-storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          fileName: `message-${Date.now()}`,
          directory: '.private/messages',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      
      const { url } = await response.json();
      return { method: 'PUT' as const, url };
    } catch (error) {
      toast({
        title: "Hata",
        description: "Dosya yükleme URL'si alınamadı",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleAttachmentComplete = (result: { successful: Array<{ uploadURL: string }> }) => {
    const url = result.successful[0]?.uploadURL;
    if (url) {
      const fileName = url.split('/').pop() || 'attachment';
      setAttachments(prev => [...prev, {
        id: `att_${Date.now()}`,
        url,
        name: fileName,
        type: 'application/octet-stream',
        size: 0,
      }]);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat önce`;
    
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getParticipantNames = (participants: Array<{userId: string; firstName: string; lastName: string}>) => {
    const others = participants.filter(p => p.userId !== user?.id);
    if (others.length === 0) return 'Sen';
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return `${others[0].firstName} ${others[0].lastName} +${others.length - 1}`;
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Thread List */}
      <div className="w-96 border-r flex flex-col">
        {/* Header */}
        <div className="p-3 border-b grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" data-testid="text-messages-title">Mesajlar</h1>
            <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="default" data-testid="button-new-message">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-new-message">
                <DialogHeader>
                  <DialogTitle>Yeni Mesaj</DialogTitle>
                </DialogHeader>
                <NewMessageForm
                  users={allUsers}
                  branches={allBranches}
                  onSubmit={(data) => createMessageMutation.mutate(data)}
                  isLoading={createMessageMutation.isPending}
                  currentUser={user as User | null}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Folder Tabs */}
          <Tabs value={folder} onValueChange={(v) => setFolder(v as any)} data-testid="tabs-message-folders">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inbox" data-testid="tab-inbox">Gelen</TabsTrigger>
              <TabsTrigger value="sent" data-testid="tab-sent">Gönderilen</TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-unread">Okunmamış</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Thread List */}
        <ScrollArea className="flex-1">
          {threadsLoading ? (
            <div className="p-3 text-center text-muted-foreground" data-testid="text-loading">
              Yükleniyor...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground" data-testid="text-no-threads">
              Mesaj bulunamadı
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => (
                <div
                  key={thread.threadId}
                  onClick={() => setSelectedThreadId(thread.threadId)}
                  className={`p-3 cursor-pointer hover-elevate ${
                    selectedThreadId === thread.threadId ? 'bg-accent' : ''
                  }`}
                  data-testid={`thread-item-${thread.threadId}`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(
                          thread.participants[0]?.firstName || '',
                          thread.participants[0]?.lastName || ''
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate" data-testid={`text-thread-subject-${thread.threadId}`}>
                          {thread.subject}
                        </p>
                        {thread.unreadCount > 0 && (
                          <Badge variant="default" className="ml-auto" data-testid={`badge-unread-${thread.threadId}`}>
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {getParticipantNames(thread.participants)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {thread.lastMessageBody}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(thread.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Thread View */}
      <div className="flex-1 flex flex-col">
        {!selectedThreadId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="text-no-thread-selected">
            Bir konuşma seçin
          </div>
        ) : threadLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="text-thread-loading">
            Yükleniyor...
          </div>
        ) : threadData ? (
          <>
            {/* Thread Header */}
            <div className="p-3 border-b">
              <h2 className="font-semibold text-lg" data-testid="text-thread-title">
                {threadData.messages[0]?.subject}
              </h2>
              <p className="text-sm text-muted-foreground">
                {getParticipantNames(
                  threadData.participants.map(p => ({
                    userId: p.userId,
                    firstName: '',
                    lastName: '',
                  }))
                )}
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
              <div className="w-full space-y-2 sm:space-y-3">
                {threadData.messages.map((message, idx) => {
                  const isSent = message.senderId === user?.id;
                  const isLastInGroup = idx === threadData.messages.length - 1 || 
                    threadData.messages[idx + 1]?.senderId !== message.senderId;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isSent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words" data-testid={`text-message-body-${message.id}`}>
                            {message.body}
                          </p>
                          
                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                              {message.attachments.map((att: any) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded bg-background/20 hover-elevate"
                                  data-testid={`attachment-${att.id}`}
                                >
                                  <FileIcon className="w-4 h-4" />
                                  <span className="text-sm truncate flex-1">{att.name}</span>
                                  <Download className="w-4 h-4" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(message.createdAt)}
                          </span>
                          {isSent && isLastInGroup && (
                            <CheckCheck className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Composer */}
            <div className="p-3 border-t grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <Badge key={att.id} variant="secondary" className="gap-2" data-testid={`attachment-preview-${att.id}`}>
                      <FileIcon className="w-3 h-3" />
                      {att.name}
                      <button
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-attachment-${att.id}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="resize-none min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-message-text"
                />
                <div className="flex gap-2">
                  <ObjectUploader
                    onGetUploadParameters={handleAttachmentUpload}
                    onComplete={handleAttachmentComplete}
                    buttonClassName="h-[60px]"
                  >
                    <Paperclip className="w-4 h-4" />
                  </ObjectUploader>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendReplyMutation.isPending}
                    className="h-[60px]"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function NewMessageForm({
  users,
  branches,
  onSubmit,
  isLoading,
  currentUser,
}: {
  users: User[];
  branches: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
  currentUser: User | null;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("direct");

  const isHQ = currentUser && isHQRole(currentUser.role as UserRoleType);

  // Get personel from selected branch (for HQ cascading selection)
  const branchPersonel = selectedBranchId
    ? users.filter((u) => u.branchId === parseInt(selectedBranchId) && u.id !== currentUser?.id)
    : [];

  // Filter users based on messaging permissions
  const filteredUsers = isHQ && selectedBranchId 
    ? branchPersonel  // If HQ selected a branch, show only that branch's personnel
    : users.filter((u) => {
        if (!currentUser || u.id === currentUser.id) return false;
        
        const senderRole = currentUser.role as UserRoleType;
        const recipientRole = u.role as UserRoleType;
        
        // HQ roles can message anyone
        if (isHQRole(senderRole)) return true;
        
        // Supervisors can message HQ or team members in same branch
        if (senderRole === 'supervisor') {
          if (isHQRole(recipientRole)) return true;
          if (u.branchId === currentUser.branchId) return true;
          return false;
        }
        
        // Branch employees can only message supervisor or HQ
        if (isBranchRole(senderRole)) {
          if (isHQRole(recipientRole)) return true;
          if (recipientRole === 'supervisor' && u.branchId === currentUser.branchId) return true;
          return false;
        }
        
        return false;
      });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !subject || !body) return;
    
    onSubmit({
      recipientId,
      subject,
      body,
      type,
      attachments: [],
    });
  };

  // Role labels for Turkish UI
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    supervisor: 'Supervisor',
    barista: 'Barista',
    stajyer: 'Stajyer',
    destek: 'Destek',
    teknik: 'Teknik',
    muhasebe: 'Muhasebe',
    satinalma: 'Satın Alma',
    coach: 'Coach',
    egitim: 'Eğitim',
    kalite: 'Kalite',
    pazarlama: 'Pazarlama',
    ik: 'İK',
    fabrika: 'Fabrika',
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:gap-3" data-testid="form-new-message">
      {/* HQ cascading selection: Branch → Personnel */}
      {isHQ && (
        <>
          <div className="flex flex-col gap-3 sm:gap-4">
            <Label htmlFor="branch">Şube Seçin</Label>
            <Select value={selectedBranchId} onValueChange={(val) => {
              setSelectedBranchId(val);
              setRecipientId(""); // Reset personnel selection
            }}>
              <SelectTrigger id="branch" data-testid="select-branch">
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {branches.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Şube bulunamadı</div>
                ) : (
                  branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <Label htmlFor="personnel">Personel Seçin</Label>
            <Select value={recipientId} onValueChange={setRecipientId} disabled={!selectedBranchId}>
              <SelectTrigger id="personnel" data-testid="select-personnel">
                <SelectValue placeholder={selectedBranchId ? "Personel seçin" : "Önce şube seçin"} />
              </SelectTrigger>
              <SelectContent>
                {branchPersonel.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {selectedBranchId ? "Bu şubede personel bulunamadı" : "Şube seçin"}
                  </div>
                ) : (
                  branchPersonel.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({roleLabels[user.role || ''] || user.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Standard recipient selection for non-HQ users */}
      {!isHQ && (
        <div className="flex flex-col gap-3 sm:gap-4">
          <Label htmlFor="recipient">Alıcı</Label>
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger id="recipient" data-testid="select-recipient">
              <SelectValue placeholder="Kullanıcı seçin" />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">Mesaj gönderilebilecek kullanıcı yok</div>
              ) : (
                filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({roleLabels[user.role || ''] || user.role})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4">
        <Label htmlFor="subject">Konu</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Mesaj konusu"
          data-testid="input-message-subject"
        />
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <Label htmlFor="body">Mesaj</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesajınızı yazın..."
          rows={5}
          data-testid="input-message-body"
        />
      </div>

      <Button
        type="submit"
        disabled={!recipientId || !subject || !body || isLoading}
        className="w-full"
        data-testid="button-submit-new-message"
      >
        {isLoading ? 'Gönderiliyor...' : 'Gönder'}
      </Button>
    </form>
  );
}
