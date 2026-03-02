import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Send, Paperclip, Search, Plus, FileIcon, Download,
  CheckCheck, ArrowLeft, Mail, MailOpen, Filter,
  MessageSquare, Loader2
} from "lucide-react";
import type { Message, User } from "@shared/schema";
import { isHQRole, isBranchRole, type UserRoleType } from "@shared/schema";
import { useLocation } from "wouter";

type ThreadSummary = {
  threadId: string;
  subject: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  unreadCount: number;
  sentByMe: boolean;
  participants: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string | null }>;
};

type ThreadData = {
  messages: Message[];
  participants: Array<{ id: string; firstName: string; lastName: string; profileImageUrl?: string | null; role?: string }>;
};

type FilterType = "all" | "unread" | "sent";

export default function Mesajlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const initialThreadId = urlParams.get("threadId");

  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; type: string; name: string; size: number }>>([]);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedThreadId) {
      const url = new URL(window.location.href);
      url.searchParams.set("threadId", selectedThreadId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedThreadId]);

  const { data: allThreads = [], isLoading: threadsLoading, isFetching: threadsFetching } = useQuery<ThreadSummary[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });

  const filteredThreads = useMemo(() => {
    let threads = allThreads;

    if (filter === "unread") {
      threads = threads.filter((t) => t.unreadCount > 0);
    } else if (filter === "sent") {
      threads = threads.filter((t) => t.sentByMe);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.lastMessageBody.toLowerCase().includes(q) ||
          t.participants.some(
            (p) =>
              `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
          )
      );
    }

    return threads;
  }, [allThreads, filter, debouncedSearch, user?.id]);

  const { data: threadData, isLoading: threadLoading } = useQuery<ThreadData>({
    queryKey: ["/api/messages", selectedThreadId],
    enabled: !!selectedThreadId,
    refetchInterval: selectedThreadId ? 5000 : false,
    refetchOnWindowFocus: true,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/messages/recipients"],
    enabled: isNewMessageOpen,
  });

  const { data: allBranches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: isNewMessageOpen && isHQRole(user?.role as UserRoleType),
  });

  const markReadMutation = useMutation({
    mutationFn: (threadId: string) =>
      apiRequest("POST", `/api/messages/${threadId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: (data: { threadId: string; body: string; attachments: any[] }) =>
      apiRequest("POST", `/api/messages/${data.threadId}/replies`, {
        body: data.body,
        attachments: data.attachments,
      }),
    onSuccess: () => {
      setMessageText("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: {
      recipientId: string;
      subject: string;
      body: string;
      type: string;
      attachments: any[];
    }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: (newMessage: Message) => {
      setIsNewMessageOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedThreadId(newMessage.threadId);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadData?.messages]);

  useEffect(() => {
    if (selectedThreadId && threadData) {
      const thread = allThreads.find((t) => t.threadId === selectedThreadId);
      if (thread && thread.unreadCount > 0) {
        markReadMutation.mutate(selectedThreadId);
      }
    }
  }, [selectedThreadId, threadData]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !selectedThreadId) return;
    sendReplyMutation.mutate({
      threadId: selectedThreadId,
      body: messageText,
      attachments,
    });
  }, [messageText, selectedThreadId, attachments]);

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<{ dataUrl: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas context error")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ dataUrl, size: Math.round(dataUrl.length * 0.75) });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const { dataUrl, size } = await compressImage(file);
        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            url: dataUrl,
            type: "image/jpeg",
            name: file.name,
            size,
          },
        ]);
      } catch (err) {
        console.error("Image compression error:", err);
      }
    }
    e.target.value = "";
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Simdi";
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat`;
    if (diffMins < 2880) return "Dun";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const formatFullDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  };

  const getDateSeparator = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / 86400000);
    if (diffDays === 0) return "Bugun";
    if (diffDays === 1) return "Dun";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getOtherParticipants = (participants: Array<{ id?: string; userId?: string; firstName: string; lastName: string }>) => {
    return participants.filter((p) => (p.id || p.userId) !== user?.id);
  };

  const getParticipantNames = (participants: Array<{ id?: string; userId?: string; firstName: string; lastName: string }>) => {
    const others = getOtherParticipants(participants);
    if (others.length === 0) return "Sen";
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return `${others[0].firstName} ${others[0].lastName} +${others.length - 1}`;
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const showThreadList = !isMobile || !selectedThreadId;
  const showConversation = !isMobile || !!selectedThreadId;

  const unreadTotal = useMemo(() => allThreads.reduce((sum, t) => sum + t.unreadCount, 0), [allThreads]);

  const filterButtons: { key: FilterType; label: string; icon: typeof Mail; count?: number }[] = [
    { key: "all", label: "Tumunu", icon: MessageSquare },
    { key: "unread", label: "Okunmamis", icon: Mail, count: unreadTotal },
    { key: "sent", label: "Gonderdiklerim", icon: MailOpen },
  ];

  return (
    <div className="flex h-full overflow-hidden" data-testid="messaging-container">
      {showThreadList && (
        <div className={`${isMobile ? "w-full" : "w-[380px] min-w-[320px]"} border-r flex flex-col bg-background`}>
          <div className="p-3 border-b space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold" data-testid="text-messages-title">Mesajlar</h1>
              <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
                <DialogTrigger asChild>
                  <Button size="default" data-testid="button-new-message">
                    <Plus className="w-4 h-4 mr-1" />
                    Yeni
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" data-testid="dialog-new-message">
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu, kisi veya mesaj ara..."
                className="pl-9"
                data-testid="input-search-threads"
              />
            </div>

            <div className="flex gap-1">
              {filterButtons.map((fb) => (
                <Button
                  key={fb.key}
                  variant={filter === fb.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(fb.key)}
                  className="flex-1 gap-1"
                  data-testid={`button-filter-${fb.key}`}
                >
                  <fb.icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{fb.label}</span>
                  {fb.count !== undefined && fb.count > 0 && (
                    <Badge variant="destructive" className="ml-0.5 text-[10px] leading-none px-1.5 py-0.5">
                      {fb.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {threadsLoading || (threadsFetching && allThreads.length === 0) ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center" data-testid="text-no-threads">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">
                  {debouncedSearch
                    ? "Aramayla eslesen mesaj bulunamadi"
                    : filter === "unread"
                      ? "Okunmamis mesaj yok"
                      : "Henuz mesaj yok"}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {!debouncedSearch && filter === "all" && "Yeni bir mesaj gondererek baslayabilirsiniz"}
                </p>
              </div>
            ) : (
              <div>
                {filteredThreads.map((thread) => {
                  const others = getOtherParticipants(thread.participants);
                  const isSelected = selectedThreadId === thread.threadId;
                  const hasUnread = thread.unreadCount > 0;

                  return (
                    <div
                      key={thread.threadId}
                      onClick={() => setSelectedThreadId(thread.threadId)}
                      className={`flex items-start gap-3 p-3 cursor-pointer border-b transition-colors ${
                        isSelected
                          ? "bg-accent"
                          : "hover-elevate"
                      } ${hasUnread ? "font-medium" : ""}`}
                      data-testid={`thread-item-${thread.threadId}`}
                    >
                      <Avatar className="shrink-0">
                        <AvatarFallback className={hasUnread ? "bg-primary text-primary-foreground" : ""}>
                          {others[0]
                            ? getInitials(others[0].firstName, others[0].lastName)
                            : "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`} data-testid={`text-thread-participant-${thread.threadId}`}>
                            {getParticipantNames(thread.participants)}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {formatDate(thread.lastMessageAt)}
                          </span>
                        </div>

                        <p className={`text-sm truncate mt-0.5 ${hasUnread ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-thread-subject-${thread.threadId}`}>
                          {thread.subject}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.lastMessageBody}
                          </p>
                          {hasUnread && (
                            <Badge variant="default" className="shrink-0 text-[10px] leading-none px-1.5 py-0.5" data-testid={`badge-unread-${thread.threadId}`}>
                              {thread.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {showConversation && (
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {!selectedThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3" data-testid="text-no-thread-selected">
              <MessageSquare className="w-16 h-16 text-muted-foreground/20" />
              <p className="text-lg font-medium">Bir konusma secin</p>
              <p className="text-sm text-muted-foreground/70">Sol taraftan bir mesaj secin veya yeni mesaj gonderin</p>
            </div>
          ) : threadLoading ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex-1 p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <Skeleton className="h-16 w-48 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : threadData ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                {isMobile && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedThreadId(null)}
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate" data-testid="text-thread-title">
                    {threadData.messages[0]?.subject || "Mesaj"}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate" data-testid="text-thread-participants">
                    {getParticipantNames(
                      threadData.participants.map((p: any) => ({
                        id: p.id || p.userId,
                        firstName: p.firstName || "",
                        lastName: p.lastName || "",
                      }))
                    )}
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1" ref={scrollRef as any}>
                <div className="p-4 space-y-1">
                  {threadData.messages.map((message, idx) => {
                    const isSent = message.senderId === user?.id;
                    const prevMessage = idx > 0 ? threadData.messages[idx - 1] : null;
                    const showDateSep = !prevMessage ||
                      getDateSeparator(message.createdAt) !== getDateSeparator(prevMessage.createdAt);

                    const sender = threadData.participants.find(
                      (p: any) => (p.id || p.userId) === message.senderId
                    );

                    const showAvatar = !isSent && (
                      idx === 0 || threadData.messages[idx - 1]?.senderId !== message.senderId
                    );

                    return (
                      <div key={message.id}>
                        {showDateSep && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                              {getDateSeparator(message.createdAt)}
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1`}
                          data-testid={`message-${message.id}`}
                        >
                          {!isSent && (
                            <div className="w-8 shrink-0 mr-2">
                              {showAvatar && sender && (
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(sender.firstName, sender.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          <div className={`max-w-[75%] flex flex-col ${isSent ? "items-end" : "items-start"}`}>
                            {showAvatar && sender && !isSent && (
                              <span className="text-xs text-muted-foreground mb-1 ml-1">
                                {sender.firstName} {sender.lastName}
                              </span>
                            )}

                            <div
                              className={`rounded-2xl px-3 py-2 ${
                                isSent
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm" data-testid={`text-message-body-${message.id}`}>
                                {message.body}
                              </p>

                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map((att: any) =>
                                    att.type?.startsWith("image/") ? (
                                      <img
                                        key={att.id}
                                        src={att.url}
                                        alt={att.name || "Fotograf"}
                                        className="max-w-full rounded-md cursor-pointer"
                                        style={{ maxHeight: "250px" }}
                                        onClick={() => window.open(att.url, "_blank")}
                                        data-testid={`image-attachment-${att.id}`}
                                      />
                                    ) : (
                                      <a
                                        key={att.id}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-md bg-background/20 hover-elevate"
                                        data-testid={`attachment-${att.id}`}
                                      >
                                        <FileIcon className="w-4 h-4" />
                                        <span className="text-xs truncate flex-1">{att.name}</span>
                                        <Download className="w-3 h-3" />
                                      </a>
                                    )
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 px-1 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">
                                {formatFullDate(message.createdAt)}
                              </span>
                              {isSent && (
                                <CheckCheck className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-3 border-t">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="relative" data-testid={`attachment-preview-${att.id}`}>
                        {att.type.startsWith("image/") ? (
                          <div className="relative">
                            <img src={att.url} alt={att.name} className="h-14 w-14 object-cover rounded-md border" />
                            <button
                              onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
                              data-testid={`button-remove-attachment-${att.id}`}
                            >
                              x
                            </button>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="gap-1.5 pr-1">
                            <FileIcon className="w-3 h-3" />
                            <span className="text-xs max-w-[100px] truncate">{att.name}</span>
                            <button
                              onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                              className="ml-0.5 text-muted-foreground"
                              data-testid={`button-remove-attachment-${att.id}`}
                            >
                              x
                            </button>
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Mesajinizi yazin..."
                      className="resize-none min-h-[44px] max-h-[120px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-message-text"
                    />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                    data-testid="input-photo-file"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-attach-photo"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendReplyMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendReplyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
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
  onSubmit: (data: { recipientId: string; subject: string; body: string; type: string; attachments: any[] }) => void;
  isLoading: boolean;
  currentUser: User | null;
}) {
  const [recipientCategory, setRecipientCategory] = useState<"hq" | "branch">("hq");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const isHQ = currentUser && isHQRole(currentUser.role as UserRoleType);

  const roleLabels: Record<string, string> = {
    admin: "Admin", ceo: "CEO", cgo: "CGO", muhasebe_ik: "Muhasebe & IK",
    satinalma: "Satın Alma", coach: "Coach", marketing: "Marketing",
    trainer: "Trainer", kalite_kontrol: "Kalite Kontrol",
    fabrika_mudur: "Fabrika Muduru", muhasebe: "Muhasebe", teknik: "Teknik",
    destek: "Destek", fabrika: "Fabrika", yatirimci_hq: "Yatirimci HQ",
    stajyer: "Stajyer", bar_buddy: "Bar Buddy", barista: "Barista",
    supervisor_buddy: "Supervisor Buddy", supervisor: "Supervisor",
    mudur: "Mudur", yatirimci_branch: "Yatirimci",
    fabrika_operator: "Fabrika Operator", fabrika_sorumlu: "Fabrika Sorumlu",
    fabrika_personel: "Fabrika Personel",
  };

  const hqUsers = users.filter((u) => u.id !== currentUser?.id && isHQRole(u.role as UserRoleType));
  const branchPersonel = selectedBranchId
    ? users.filter((u) => u.branchId === parseInt(selectedBranchId) && u.id !== currentUser?.id)
    : [];

  const nonHqFilteredUsers = users.filter((u) => {
    if (!currentUser || u.id === currentUser.id) return false;
    const senderRole = currentUser.role as UserRoleType;
    const recipientRole = u.role as UserRoleType;
    if (senderRole === "supervisor" || senderRole === "mudur" || senderRole === "yatirimci_branch") {
      if (isHQRole(recipientRole)) return true;
      if (u.branchId === currentUser.branchId) return true;
      return false;
    }
    if (isBranchRole(senderRole)) {
      if (isHQRole(recipientRole)) return true;
      if ((recipientRole === "supervisor" || recipientRole === "mudur") && u.branchId === currentUser.branchId) return true;
      return false;
    }
    if (isHQRole(senderRole)) return true;
    if (isHQRole(recipientRole)) return true;
    if (u.branchId === currentUser.branchId) return true;
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !body) return;
    const finalSubject = subject.trim() || "Konu yok";
    onSubmit({ recipientId, subject: finalSubject, body, type: "direct", attachments: [] });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3" data-testid="form-new-message">
      {isHQ && (
        <>
          <div className="flex flex-col gap-2">
            <Label>Alici Tipi</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={recipientCategory === "hq" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setRecipientCategory("hq"); setSelectedBranchId(""); setRecipientId(""); }}
                data-testid="button-category-hq"
              >
                Merkez Yonetim
              </Button>
              <Button
                type="button"
                variant={recipientCategory === "branch" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setRecipientCategory("branch"); setSelectedBranchId(""); setRecipientId(""); }}
                data-testid="button-category-branch"
              >
                Sube Personeli
              </Button>
            </div>
          </div>

          {recipientCategory === "hq" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="hq-recipient">Merkez Personel</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger id="hq-recipient" data-testid="select-hq-recipient">
                  <SelectValue placeholder="Personel secin" />
                </SelectTrigger>
                <SelectContent>
                  {hqUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Merkez personeli bulunamadi</div>
                  ) : (
                    hqUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({roleLabels[u.role || ""] || u.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {recipientCategory === "branch" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="branch">Sube Secin</Label>
                <Select value={selectedBranchId} onValueChange={(val) => { setSelectedBranchId(val); setRecipientId(""); }}>
                  <SelectTrigger id="branch" data-testid="select-branch">
                    <SelectValue placeholder="Sube secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter((b: any) => b.type !== "hq" && b.type !== "factory").length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Sube bulunamadi</div>
                    ) : (
                      branches
                        .filter((b: any) => b.type !== "hq" && b.type !== "factory")
                        .map((branch: any) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="personnel">Personel Secin</Label>
                <Select value={recipientId} onValueChange={setRecipientId} disabled={!selectedBranchId}>
                  <SelectTrigger id="personnel" data-testid="select-personnel">
                    <SelectValue placeholder={selectedBranchId ? "Personel secin" : "Once sube secin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchPersonel.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {selectedBranchId ? "Bu subede personel bulunamadi" : "Sube secin"}
                      </div>
                    ) : (
                      branchPersonel.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({roleLabels[u.role || ""] || u.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}

      {!isHQ && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipient">Alici</Label>
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger id="recipient" data-testid="select-recipient">
              <SelectValue placeholder="Kullanici secin" />
            </SelectTrigger>
            <SelectContent>
              {nonHqFilteredUsers.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">Mesaj gonderilebilecek kullanici yok</div>
              ) : (
                nonHqFilteredUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({roleLabels[u.role || ""] || u.role})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject">Konu</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Mesaj konusu (bos birakilabilir)"
          data-testid="input-message-subject"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body">Mesaj</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesajinizi yazin..."
          rows={4}
          data-testid="input-message-body"
        />
      </div>

      <Button
        type="submit"
        disabled={!recipientId || !body || isLoading}
        className="w-full"
        data-testid="button-submit-new-message"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Gonderiliyor...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Gonder
          </>
        )}
      </Button>
    </form>
  );
}
