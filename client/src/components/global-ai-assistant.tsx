import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Lightbulb,
  ExternalLink
} from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickQuery {
  text: string;
}

const roleBasedQueries: Record<string, QuickQuery[]> = {
  ceo: [
    { text: "Hangi şube en çok arıza veriyor?" },
    { text: "En düşük performanslı personeller kimler?" },
    { text: "Şubelerin genel durumu nasıl?" },
    { text: "Kritik arızalar var mı?" },
    { text: "Personel dağılımı nasıl?" },
  ],
  cgo: [
    { text: "Hangi şube en iyi büyüme gösteriyor?" },
    { text: "Müşteri memnuniyeti trendi nasıl?" },
    { text: "Şube karşılaştırması göster" },
  ],
  admin: [
    { text: "Aktif kullanıcı sayısı ve rol dağılımı?" },
    { text: "Açık arızaların durumu ne?" },
    { text: "Sistem genel durumu nasıl?" },
    { text: "Bekleyen onaylar var mı?" },
  ],
  supervisor: [
    { text: "Bugün şubemde kimler çalışıyor?" },
    { text: "Personel performansları nasıl?" },
    { text: "Açık arızalarımız var mı?" },
    { text: "Tamamlanmamış görevler neler?" },
  ],
  mudur: [
    { text: "Şube durumu nasıl?" },
    { text: "Açık arızalar var mı?" },
    { text: "Personel performansları nasıl?" },
    { text: "Bekleyen izin talepleri?" },
    { text: "Bugün şubemde kimler çalışıyor?" },
  ],
  barista: [
    { text: "Bugünkü görevlerim neler?" },
    { text: "Hangi eğitimleri tamamlamalıyım?" },
    { text: "Vardiya saatlerim ne zaman?" },
  ],
  stajyer: [
    { text: "Hangi eğitimlerle başlamalıyım?" },
    { text: "Bugünkü görevlerim neler?" },
  ],
  satinalma: [
    { text: "Bekleyen siparişler neler?" },
    { text: "Stok durumu nasıl?" },
    { text: "Tedarikçi performansları?" },
  ],
  fabrika: [
    { text: "Üretim durumu nasıl?" },
    { text: "Açık arızalar var mı?" },
    { text: "Ekipman bakımları güncel mi?" },
  ],
  fabrika_operator: [
    { text: "Bugünkü üretim planı ne?" },
    { text: "Açık arızalar var mı?" },
    { text: "Vardiya saatlerim ne zaman?" },
  ],
  muhasebe: [
    { text: "Bekleyen izin talepleri var mı?" },
    { text: "Personel sayısı ve dağılımı?" },
  ],
  teknik: [
    { text: "Açık arıza talepleri neler?" },
    { text: "Hangi şubede en çok arıza var?" },
    { text: "SLA ihlalleri var mı?" },
    { text: "Kritik ekipman durumu?" },
  ],
  trainer: [
    { text: "Eğitim tamamlama oranları nasıl?" },
    { text: "Hangi şube en az eğitim almış?" },
    { text: "Quiz başarı oranları?" },
  ],
  coach: [
    { text: "Şube performans karşılaştırması?" },
    { text: "Performansı düşen personeller?" },
    { text: "Hangi şubede en çok arıza var?" },
    { text: "Denetim sonuçları nasıl?" },
  ],
  kalite_kontrol: [
    { text: "Açık ürün şikayetleri neler?" },
    { text: "Kalite durumu nasıl?" },
  ],
  destek: [
    { text: "Açık destek talepleri neler?" },
    { text: "Çözüm bekleyen sorunlar?" },
  ],
  default: [
    { text: "Bugün ne yapmalıyım?" },
    { text: "Bekleyen görevlerim var mı?" },
    { text: "Eğitimlerim güncel mi?" },
  ]
};

function renderMarkdownContent(content: string, navigate: (path: string) => void) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inTable = false;

  const processInlineMarkdown = (text: string, keyPrefix: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        const boldParts = processBold(beforeText, `${keyPrefix}-pre-${match.index}`);
        parts.push(...boldParts);
      }

      const linkText = match[1];
      const linkPath = match[2];
      const isInternal = linkPath.startsWith('/');

      parts.push(
        <button
          key={`${keyPrefix}-link-${match.index}`}
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 font-medium cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            if (isInternal) {
              navigate(linkPath);
            } else {
              window.open(linkPath, '_blank');
            }
          }}
          data-testid={`link-ai-nav-${match.index}`}
        >
          {linkText}
          {isInternal && <ExternalLink className="w-3 h-3 inline" />}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      const boldParts = processBold(remaining, `${keyPrefix}-post-${lastIndex}`);
      parts.push(...boldParts);
    }

    if (parts.length === 0) {
      const boldParts = processBold(text, keyPrefix);
      parts.push(...boldParts);
    }

    return parts;
  };

  const processBold = (text: string, keyPrefix: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0;
    let bMatch;

    while ((bMatch = boldRegex.exec(text)) !== null) {
      if (bMatch.index > lastIdx) {
        parts.push(text.substring(lastIdx, bMatch.index));
      }
      parts.push(<strong key={`${keyPrefix}-b-${bMatch.index}`}>{bMatch[1]}</strong>);
      lastIdx = bMatch.index + bMatch[0].length;
    }
    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }
    if (parts.length === 0) parts.push(text);
    return parts;
  };

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-2 rounded-md border">
          <table className="w-full text-xs" data-testid="table-ai-data">
            {tableHeaders.length > 0 && (
              <thead>
                <tr className="bg-muted/50">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-2 py-1 text-left font-semibold border-b">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/30'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border-b border-border/50">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.every(c => /^[\s-:]+$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      elements.push(<div key={`br-${i}`} className="h-1" />);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <p key={`h3-${i}`} className="font-semibold text-xs mt-2 mb-1">
          {processInlineMarkdown(trimmed.substring(4), `h3-${i}`)}
        </p>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <p key={`h2-${i}`} className="font-bold text-sm mt-2 mb-1">
          {processInlineMarkdown(trimmed.substring(3), `h2-${i}`)}
        </p>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <p key={`h1-${i}`} className="font-bold text-sm mt-2 mb-1">
          {processInlineMarkdown(trimmed.substring(2), `h1-${i}`)}
        </p>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        elements.push(
          <div key={`ol-${i}`} className="flex gap-2 ml-1">
            <span className="text-muted-foreground font-medium shrink-0">{numMatch[1]}.</span>
            <span>{processInlineMarkdown(numMatch[2], `ol-${i}`)}</span>
          </div>
        );
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 ml-1">
          <span className="text-muted-foreground shrink-0">-</span>
          <span>{processInlineMarkdown(trimmed.substring(2), `li-${i}`)}</span>
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${i}`}>
          {processInlineMarkdown(trimmed, `p-${i}`)}
        </p>
      );
    }
  }

  if (inTable) flushTable();

  return elements;
}

function PeabuddyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Head circle */}
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Glasses - left lens */}
      <circle cx="8.5" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Glasses - right lens */}
      <circle cx="15.5" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Glasses bridge */}
      <path d="M11.5 10.5 L12.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left eye dot */}
      <circle cx="8.5" cy="10.5" r="1" fill="currentColor" />
      {/* Right eye dot */}
      <circle cx="15.5" cy="10.5" r="1" fill="currentColor" />
      {/* Smile */}
      <path d="M9 15.5 Q12 18 15 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Left ear/temple */}
      <path d="M5.5 10.5 L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Right ear/temple */}
      <path d="M18.5 10.5 L21 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function GlobalAIAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [, navigate] = useLocation();

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
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Yanıt alınamadı. Lütfen tekrar deneyin.", 
        timestamp: new Date() 
      }]);
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
    setMessages(prev => [...prev, { role: 'user', content: queryText, timestamp: new Date() }]);
    setQuestion("");
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
            className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-32px)] bg-card border rounded-xl shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
            data-testid="panel-ai-assistant"
          >
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 rounded-t-xl shrink-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <PeabuddyIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">DOSPRESSO AI</h3>
                    <p className="text-[10px] opacity-80">Merhaba {userName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-primary-foreground/80 no-default-hover-elevate"
                      onClick={clearChat}
                      data-testid="button-clear-chat"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-primary-foreground/80 no-default-hover-elevate"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-ai"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '400px' }}>
              <div className="p-3">
                {messages.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-center py-3">
                      <Sparkles className="w-8 h-8 mx-auto text-primary/50 mb-1" />
                      <p className="text-sm text-muted-foreground">
                        Size nasıl yardımcı olabilirim?
                      </p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Lightbulb className="w-3 h-3" />
                        <span>Hızlı Sorgular</span>
                      </div>
                      {quickQueries.map((query, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left text-xs whitespace-normal h-auto py-1.5"
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
                          className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                          data-testid={`message-${msg.role}-${index}`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="space-y-1">
                              {renderMarkdownContent(msg.content, navigate)}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
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
                        <div className="bg-muted rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-muted-foreground">Analiz ediyorum...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-2 border-t bg-background rounded-b-xl shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Sorunuzu yazın..."
                  className="min-h-[36px] max-h-[72px] resize-none text-xs"
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
              <PeabuddyIcon className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
