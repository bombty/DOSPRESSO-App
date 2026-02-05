import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  MessageCircle,
  RefreshCw,
  Lightbulb
} from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickQuery {
  text: string;
  icon?: React.ReactNode;
}

const roleBasedQueries: Record<string, QuickQuery[]> = {
  ceo: [
    { text: "Bu şirket bugün nereden kan kaybediyor?" },
    { text: "Hangi şube kârımı düşürüyor?" },
    { text: "Kim iyi performans gösteriyor?" },
    { text: "Personel devir hızı neden yüksek?" },
    { text: "Fabrika üretim hedeflerini tutturuyor mu?" },
  ],
  cgo: [
    { text: "Pazarlama kampanyalarının getirisi ne?" },
    { text: "Hangi şube en iyi büyüme gösteriyor?" },
    { text: "Müşteri memnuniyeti trendi nasıl?" },
  ],
  admin: [
    { text: "Sistem performansı nasıl?" },
    { text: "Aktif kullanıcı sayısı nedir?" },
    { text: "Son hata logları neler?" },
    { text: "Bekleyen onaylar var mı?" },
  ],
  supervisor: [
    { text: "Bugün şubemde kimler çalışıyor?" },
    { text: "Tamamlanmamış checklistler var mı?" },
    { text: "Hangi görevler gecikiyor?" },
    { text: "Personel performansları nasıl?" },
  ],
  manager: [
    { text: "Bugünkü şube durumu nasıl?" },
    { text: "Açık arızalar var mı?" },
    { text: "Personel devamsızlığı var mı?" },
    { text: "Stok durumu kritik mi?" },
  ],
  barista: [
    { text: "Bugünkü görevlerim neler?" },
    { text: "Hangi eğitimleri tamamlamalıyım?" },
    { text: "Espresso makinesi nasıl temizlenir?" },
    { text: "Vardiya saatlerim ne zaman?" },
  ],
  stajyer: [
    { text: "İlk günümde ne yapmalıyım?" },
    { text: "Hangi eğitimlerle başlamalıyım?" },
    { text: "Mentörüm kim?" },
    { text: "Kahve tarifleri nerede?" },
  ],
  satinalma: [
    { text: "Kritik stok uyarıları var mı?" },
    { text: "Bekleyen siparişler neler?" },
    { text: "Tedarikçi performansları nasıl?" },
    { text: "Fiyat artışı bildiren tedarikçiler?" },
  ],
  fabrika: [
    { text: "Bugünkü üretim hedefi nedir?" },
    { text: "Kalite kontrol sonuçları nasıl?" },
    { text: "Fire oranı kabul edilebilir mi?" },
    { text: "Ekipman bakımları güncel mi?" },
  ],
  muhasebe: [
    { text: "Günlük ciro ne kadar?" },
    { text: "Bekleyen faturalar var mı?" },
    { text: "Nakit akışı nasıl?" },
    { text: "Bütçe sapmaları neler?" },
  ],
  teknik: [
    { text: "Açık arıza talepleri neler?" },
    { text: "Kritik ekipman durumu nasıl?" },
    { text: "SLA ihlalleri var mı?" },
    { text: "Bakım planı güncel mi?" },
  ],
  trainer: [
    { text: "Eğitim tamamlama oranları nasıl?" },
    { text: "Hangi modüller en çok zorlanıyor?" },
    { text: "Quiz başarı oranları nedir?" },
    { text: "Yeni personel gelişimi nasıl?" },
  ],
  coach: [
    { text: "Takip ettiğim şubeler nasıl?" },
    { text: "Performansı düşen personeller?" },
    { text: "Onboarding süreçleri nasıl gidiyor?" },
    { text: "Mentörlük notlarım neler?" },
  ],
  default: [
    { text: "Bugün ne yapmalıyım?" },
    { text: "Bekleyen görevlerim var mı?" },
    { text: "Eğitimlerim güncel mi?" },
    { text: "Yardıma ihtiyacım var" },
  ]
};

export function GlobalAIAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userRole = user?.role || 'default';
  const userName = user?.firstName || 'Kullanıcı';
  const quickQueries = roleBasedQueries[userRole] || roleBasedQueries.default;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await apiRequest("POST", "/api/ai/chat", { 
        question: q
      });
      const data = await response.json();
      return data.answer || data.response || "Yanıt alınamadı.";
    },
    onSuccess: (answer) => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: answer, 
        timestamp: new Date() 
      }]);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "AI yanıt veremedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    
    const userMessage = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setQuestion("");
    askMutation.mutate(userMessage);
  };

  const handleQuickQuery = (queryText: string) => {
    setQuestion(queryText);
    setMessages(prev => [...prev, { role: 'user', content: queryText, timestamp: new Date() }]);
    askMutation.mutate(queryText);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-32px)] bg-card border rounded-xl shadow-2xl overflow-hidden"
            data-testid="panel-ai-assistant"
          >
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Asistan</h3>
                    <p className="text-xs opacity-80">Merhaba {userName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-primary-foreground/80"
                      onClick={clearChat}
                      data-testid="button-clear-chat"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-primary-foreground/80"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-ai"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[300px] p-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Sparkles className="w-10 h-10 mx-auto text-primary/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Size nasıl yardımcı olabilirim?
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Lightbulb className="w-3 h-3" />
                      <span>Hızlı Sorgular</span>
                    </div>
                    {quickQueries.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left text-xs whitespace-normal"
                        onClick={() => handleQuickQuery(query.text)}
                        disabled={askMutation.isPending}
                        data-testid={`button-quick-query-${index}`}
                      >
                        {query.text}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                        }`}>
                          {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {askMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-muted-foreground">Düşünüyorum...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t bg-background">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Sorunuzu yazın..."
                  className="min-h-[40px] max-h-[80px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={askMutation.isPending}
                  data-testid="input-ai-question"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!question.trim() || askMutation.isPending}
                  data-testid="button-send-ai"
                >
                  {askMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-toggle-ai-assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Brain className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
