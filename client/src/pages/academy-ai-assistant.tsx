import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader, Send, Sparkles, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AcademyAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Merhaba! Ben DOSPRESSO Academy asistanıyım. Öğrenme yolculuğun hakkında sorularınız varsa sorabilirsiniz. Kariyer gelişimi, sınav hazırlığı, sertifikasyon hakkında yardımcı olabilirim.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/academy/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          userId: user?.id,
          conversationHistory: messages,
        }),
        credentials: "include",
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyiniz.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Bağlantı hatası. Lütfen daha sonra tekrar deneyiniz.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "Kariyer seviyeleri arasındaki fark nedir?",
    "Sınava nasıl başarıyla hazırlanırım?",
    "Rozet kazanmak için neler yapmam gerekir?",
    "Öğrenme serisini nasıl başlatabilirim?",
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 p-3">
      <div className="flex items-center gap-2 mb-2 col-span-full">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size="icon"
          data-testid="button-back"
          title="Geri Dön"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      <div className="col-span-full">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          Academy AI Asistan
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Yapay zeka destekli öğrenme yardımcısı</p>
      </div>

      {/* Chat Container */}
      <Card className="col-span-full h-[400px] flex flex-col">
        <CardContent className="flex-1 p-2 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="grid grid-cols-1 gap-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-lg rounded-bl-none">
                    <Loader className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-1">
        <div className="flex gap-1">
          <Textarea
            placeholder="Sorunuzu yazın..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-10 resize-none text-xs"
            data-testid="input-assistant-message"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            data-testid="button-send-message"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>

        {/* Suggested Questions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Örnek Sorular:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {suggestedQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs justify-start h-auto py-2 px-3 text-left"
                onClick={() => {
                  setInput(q);
                }}
                data-testid={`button-suggested-${idx}`}
              >
                <BookOpen className="w-3 h-3 mr-2 flex-shrink-0" />
                <span className="line-clamp-2">{q}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            AI Asistan Hakkında
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-1 text-xs">
          <p>✓ Kariyer gelişimi ve sertifikasyon hakkında bilgiler</p>
          <p>✓ Sınav ve öğrenme stratejileri</p>
          <p>✓ Academy özellikleri ve kullanım ipuçları</p>
        </CardContent>
      </Card>
    </div>
  );
}
