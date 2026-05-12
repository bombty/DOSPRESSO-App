// ═══════════════════════════════════════════════════════════════════
// Sprint 47.2 (Aslan 13 May 2026) — Mr. Dobody Onboarding Chat
// ═══════════════════════════════════════════════════════════════════
// Conversational onboarding modal — WhatsApp tarzı chat UI
// Tüm yeni kullanıcılar için ilk giriş sonrası otomatik açılır
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, SkipForward, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingMessage {
  id: number;
  conversationId: number;
  sender: "user" | "ai" | "system";
  step: string;
  content: string;
  quickReplies?: string[];
  selectedReply?: string;
  createdAt: string;
}

interface OnboardingStatus {
  hasActive: boolean;
  completed: boolean;
  conversation?: {
    id: number;
    role: string;
    status: string;
    currentStep: string;
    totalSteps: number;
  };
  messages?: OnboardingMessage[];
  userRole: string;
}

export function MrDobodyOnboarding({ forceOpen = false }: { forceOpen?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Onboarding durumunu al
  const { data: status, refetch: refetchStatus } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
    refetchOnWindowFocus: false,
  });

  // Otomatik aç: onboarding tamamlanmamış kullanıcı için
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    if (status && !status.hasActive && !status.completed) {
      setIsOpen(true);
    }
  }, [status, forceOpen]);

  // Start mutation — yeni conversation başlat
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/start", {});
      return res.json();
    },
    onSuccess: () => {
      refetchStatus();
    },
    onError: (err: any) => {
      toast({ title: "Onboarding başlatılamadı", description: err.message, variant: "destructive" });
    },
  });

  // Otomatik start: aktif yok ama tamamlanmamış
  useEffect(() => {
    if (status && !status.hasActive && !status.completed && isOpen) {
      startMutation.mutate();
    }
  }, [status, isOpen]);

  // Mesaj gönder
  const sendMutation = useMutation({
    mutationFn: async ({ content, selectedReply }: { content: string; selectedReply?: string }) => {
      if (!status?.conversation?.id) throw new Error("Conversation yok");
      setIsAITyping(true);
      const res = await apiRequest("POST", "/api/onboarding/message", {
        conversationId: status.conversation.id,
        content,
        selectedReply,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setIsAITyping(false);
      setInputValue("");
      refetchStatus();

      if (data.completed) {
        toast({
          title: "🎉 Onboarding tamamlandı!",
          description: "Yarın 09:00 günlük brief'in hazır olacak.",
        });
        // 3 saniye sonra kapat
        setTimeout(() => setIsOpen(false), 3000);
      }
    },
    onError: (err: any) => {
      setIsAITyping(false);
      toast({ title: "Mesaj gönderilemedi", description: err.message, variant: "destructive" });
    },
  });

  // Skip
  const skipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/skip", {
        conversationId: status?.conversation?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Onboarding atlandı", description: "Daha sonra tekrar başlatabilirsin." });
      setIsOpen(false);
      refetchStatus();
    },
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status?.messages, isAITyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMutation.mutate({ content: inputValue });
  };

  const handleQuickReply = (reply: string) => {
    sendMutation.mutate({ content: reply, selectedReply: reply });
  };

  const messages = status?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const showQuickReplies = lastMessage?.sender === "ai" && lastMessage?.quickReplies && (lastMessage.quickReplies as any).length > 0;

  // Eğer onboarding zaten tamamlandıysa veya başlatılmadıysa render etme
  if (!status) return null;
  if (!forceOpen && status.completed) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Mr. Dobody</h3>
              <p className="text-xs opacity-90 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Asistan · Onboarding
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8"
              onClick={() => skipMutation.mutate()}
              data-testid="btn-skip-onboarding"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Atla
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 p-2"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        {status.conversation && (
          <div className="px-4 pt-2 pb-1 bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{status.conversation.currentStep}</span>
              <span>{messages.filter(m => m.sender === "ai").length} / {status.conversation.totalSteps}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${(messages.filter(m => m.sender === "ai").length / status.conversation.totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Mr. Dobody seni karşılamaya hazırlanıyor...</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                  data-testid={`msg-${msg.sender}-${msg.id}`}
                >
                  {msg.sender === "ai" && (
                    <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                      <Bot className="w-3 h-3" />
                      <span>Mr. Dobody</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isAITyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Replies */}
        {showQuickReplies && !isAITyping && (
          <div className="px-4 py-2 border-t bg-muted/20 flex flex-wrap gap-2">
            {(lastMessage.quickReplies as any[]).map((reply, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => handleQuickReply(typeof reply === "string" ? reply : reply.label || reply.value)}
                disabled={sendMutation.isPending}
                data-testid={`quick-reply-${idx}`}
              >
                {typeof reply === "string" ? reply : reply.label || reply.value}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t flex gap-2">
          <Input
            placeholder={isAITyping ? "Mr. Dobody yazıyor..." : "Mesajını yaz..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isAITyping || sendMutation.isPending}
            className="flex-1"
            data-testid="input-onboarding-message"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isAITyping || sendMutation.isPending}
            data-testid="btn-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
