import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
    { text: "Aktif üretim partileri?" },
    { text: "Bakım bekleyen ekipmanlar?" },
    { text: "Bugünkü üretim hedefi?" },
  ],
  fabrika_operator: [
    { text: "Bugünkü üretim planı ne?" },
    { text: "Açık arızalar var mı?" },
    { text: "Vardiya saatlerim ne zaman?" },
  ],
  muhasebe: [
    { text: "Bekleyen izin talepleri var mı?" },
    { text: "Personel sayısı ve dağılımı?" },
    { text: "İzin kullanan personel sayısı?" },
    { text: "Şube bazlı personel sayısı?" },
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
    { text: "Hangi şube en düşük denetim skoru aldı?" },
    { text: "Eğitim tamamlama oranları?" },
    { text: "Müşteri memnuniyeti en düşük şube?" },
  ],
  kalite_kontrol: [
    { text: "Açık ürün şikayetleri neler?" },
    { text: "Kalite durumu nasıl?" },
    { text: "Açık şikayetler hangi şubelerden?" },
    { text: "Kritik kalite sorunları?" },
    { text: "Son üretim parti durumu?" },
  ],
  destek: [
    { text: "Açık destek talepleri neler?" },
    { text: "Çözüm bekleyen sorunlar?" },
    { text: "En çok hangi konuda talep geliyor?" },
    { text: "Kritik talepler?" },
  ],
  operasyon: [
    { text: "Şube operasyon durumları?" },
    { text: "Kritik arızalar?" },
    { text: "Tamamlanmamış görevler?" },
  ],
  default: [
    { text: "Bugün ne yapmalıyım?" },
    { text: "Bekleyen görevlerim var mı?" },
    { text: "Eğitimlerim güncel mi?" },
  ]
};

const motivationalQuotes: Record<string, string[]> = {
  branch: [
    "Müşteri fark etmese bile, o Espresso olması gerekenden 2 saniye eksik çekildiyse lavaboya dökülmeli. Marka olmak, kimse bakmıyorken bile standardı korumaktır.",
    "Seni değerli kılan üzerindeki DOSPRESSO önlüğü değil, o önlüğe ruhunu katan sensin. Sen o tezgaha geçtiğinde, en basit Filtre Kahve bile bir sanat eserine dönüşür.",
    "Şu an sahnedesin! Dünyanın en karizmatik Baristası o Cortado bardağını nasıl tutardı? İşte tam öyle tut ve servis et.",
    "Süt köpürtürken aklın evdeki sorunlarda olmasın. Odaklanmadan yapılan bir Cappuccino, ruhsuzdur.",
    "Unutma, biz Kahve satmıyoruz. Senin duruşunla ve enerjinle oluşturduğun 'değerli hissetme' duygusunu satıyoruz.",
    "Bir Latte Art yaparken elin titrediyse, müşteriye 'böyle idare et' deme. Bizim sahnemizde sadece en iyiler oynar.",
    "Bugün dükkandan içeri girerken bir çalışan gibi değil, bu şubenin sahibiymiş gibi gir.",
    "Bir Cookie her yerde yenebilir. Ama misafirlerimiz buraya senin yarattığın o sıcak karşılama için geliyorlar.",
    "Enerjini bölünmüş düşüncelere değil, elindeki tabağın sunumuna ver. Başarı, o an yaptığın işe %100'ünü vermektir.",
    "Müşteriye 'Hoş geldiniz' derken gözlerin başka yerde olmasın. O 3 saniyelik samimi bakış, sattığımız en pahalı Kahveden daha değerlidir.",
  ],
  factory: [
    "Her ürettiğin ürün, bir şubede bir müşterinin gülümsemesine dönüşecek. Bu sorumluluğun farkında ol.",
    "Kalite kontrolde 'bu da böyle olsun' dediğin an, sıradanlaştığın andır. DOSPRESSO'da her ürün mükemmel çıkar.",
    "Tabağa koyduğun Cheesecake hafifçe çatlamışsa, onu servis etme. Bizim imzamız kusursuzluktur.",
    "O Donut vitrinde harika görünebilir ama tadı bizim standartlarımızda değilse o tezgaha çıkamaz.",
    "Fabrikada ürettiğin her ürün, DOSPRESSO'nun hikayesinin bir parçası. Bu hikayeyi mükemmel yaz.",
    "Üretimde detaylara dikkat et. Küçük detaylar büyük farklar yaratır.",
    "Her gün aynı ürünü üretsen bile, her seferinde ilk kez üretiyormuş gibi özen göster.",
    "Kalite bir alışkanlık değil, bir karardır. Her gün yeniden karar ver.",
  ],
  hq: [
    "Liderlik, insanlara ne yapmaları gerektiğini söylemek değil, onlara ilham vermektir.",
    "Biz sadece kahve dükkanı değiliz, biz bir yaşam tarzıyız. Senin her kararın bu yaşam tarzını şekillendirir.",
    "Strateji, doğru işleri yapmak; yönetim, işleri doğru yapmaktır. Sen ikisini de yapabilirsin.",
    "Bir zincir, en zayıf halkası kadar güçlüdür. Her şubeyi güçlü tutmak senin elinde.",
    "Bugün aldığın kararlar, yarının DOSPRESSO'sunu şekillendirecek. Büyük düşün.",
    "Ekibine güven, onlara alan aç. En iyi liderler, başkalarını lider yapanlardır.",
    "Veriye dayalı kararlar al, ama sezgilerini de dinle. İkisinin birleşimi mükemmelliği getirir.",
    "Her şube ziyareti bir öğrenme fırsatıdır. Sahada ol, dinle, anla.",
  ],
};

function getDailyQuote(role: string): string {
  const branchRoles = ['barista', 'bar_buddy', 'stajyer', 'supervisor', 'supervisor_buddy', 'mudur'];
  const factoryRoles = ['fabrika', 'fabrika_mudur', 'fabrika_sorumlu', 'fabrika_operator', 'fabrika_personel', 'kalite_kontrol'];
  
  let category = 'hq';
  if (branchRoles.includes(role)) category = 'branch';
  else if (factoryRoles.includes(role)) category = 'factory';
  
  const quotes = motivationalQuotes[category];
  const today = new Date();
  const roleHash = role.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate() + roleHash) % quotes.length;
  return quotes[dayIndex];
}

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

const DOG_POSES = [
  '/images/dobody/pose_wave.png',
  '/images/dobody/pose_happy.png',
  '/images/dobody/pose_think.png',
  '/images/dobody/pose_stand.png',
  '/images/dobody/pose_confident.png',
  '/images/dobody/pose_curious.png',
];

function DobodyIcon({ className, size = 24 }: { className?: string; size?: number }) {
  const [poseUrl] = useState(() => DOG_POSES[Math.floor(Math.random() * DOG_POSES.length)]);
  return (
    <img
      src={poseUrl}
      alt="Mr. Dobody"
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
      }}
    />
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
  const constraintsRef = useRef<HTMLDivElement>(null);

  const userRole = user?.role || 'default';
  const userName = user?.firstName || 'Kullanıcı';
  const quickQueries = roleBasedQueries[userRole] || roleBasedQueries.default;

  const agentSummaryQuery = useQuery<{ pending: number; critical: number }>({
    queryKey: ["/api/agent/actions/summary"],
    refetchInterval: 60000,
    enabled: !!user,
  });

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handler);
    return () => window.removeEventListener('open-ai-assistant', handler);
  }, []);

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
      <div ref={constraintsRef} className="fixed inset-0 z-[69] pointer-events-none" />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 sm:bottom-20 right-4 z-[70] w-[380px] max-w-[calc(100vw-32px)] bg-card border rounded-xl shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
            data-testid="panel-ai-assistant"
          >
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 rounded-t-xl shrink-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <DobodyIcon size={40} />
                  <div>
                    <h3 className="font-semibold text-base">Mr. Dobody</h3>
                    <p className="text-[11px] opacity-80">Nasıl yardımcı olabilirim?</p>
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

            <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '400px' }}>
              <div className="p-3">
                {messages.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-center py-3">
                      <DobodyIcon size={80} className="mx-auto mb-3" />
                      <p className="text-sm font-medium">
                        Merhaba {userName}, ben Mr. Dobody.
                      </p>
                      {(agentSummaryQuery.data?.pending ?? 0) > 0 && (
                        <button
                          onClick={() => { setIsOpen(false); navigate("/agent-merkezi"); }}
                          className="mt-2 text-xs bg-primary/20 text-primary-foreground rounded-md px-3 py-1.5 hover:bg-primary/30 transition-colors"
                          data-testid="link-agent-center-from-chat"
                        >
                          {agentSummaryQuery.data!.pending} bekleyen öneriniz var
                        </button>
                      )}
                      <div className="mt-3 mx-2 p-2.5 bg-muted/50 rounded-lg border border-border/50">
                        <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                          "{getDailyQuote(userRole)}"
                        </p>
                      </div>
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
            </div>

            <div className="p-2 border-t bg-background rounded-b-xl shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Mr. Dobody'ye sorun..."
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
        className="fixed bottom-20 sm:bottom-4 right-4 z-[70] flex items-center justify-center touch-none"
        style={{ width: 68, height: 68, background: 'transparent', border: 'none', padding: 0, cursor: 'grab' }}
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9, cursor: 'grabbing' }}
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
              className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center shadow-lg"
            >
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative"
            >
              <DobodyIcon size={64} />
              {(agentSummaryQuery.data?.pending ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm" data-testid="badge-agent-fab">
                  {agentSummaryQuery.data!.pending}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
