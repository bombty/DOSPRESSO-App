import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  User,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  CheckSquare,
  ChefHat,
  Clock,
  X,
  Brain,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { UserRole } from "@/lib/role-visibility";

interface SearchResult {
  type: string;
  id: string | number;
  title: string;
  subtitle?: string;
  path: string;
  icon?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  branch: { label: "Şube", icon: Building2, color: "text-blue-500" },
  employee: { label: "Personel", icon: User, color: "text-emerald-500" },
  equipment: { label: "Ekipman", icon: Wrench, color: "text-orange-500" },
  task: { label: "Görev", icon: ClipboardCheck, color: "text-violet-500" },
  fault: { label: "Arıza", icon: AlertTriangle, color: "text-red-500" },
  checklist: { label: "Checklist", icon: CheckSquare, color: "text-cyan-500" },
  recipe: { label: "Tarif", icon: ChefHat, color: "text-amber-500" },
};

const ROLE_SHORTCUTS: Record<string, Array<{ label: string; path: string; icon: any }>> = {
  ceo: [
    { label: "Şube Karşılaştırma", path: "/sube-karsilastirma", icon: TrendingUp },
    { label: "AI Komut Merkezi", path: "/ceo-command-center", icon: Brain },
    { label: "Performans Raporu", path: "/raporlar?tab=performans", icon: TrendingUp },
  ],
  cgo: [
    { label: "Şube Karşılaştırma", path: "/sube-karsilastirma", icon: TrendingUp },
    { label: "AI Komut Merkezi", path: "/ceo-command-center", icon: Brain },
    { label: "Raporlar", path: "/raporlar", icon: TrendingUp },
  ],
  admin: [
    { label: "Kullanıcı Yönetimi", path: "/admin?tab=kullanicilar", icon: User },
    { label: "Sistem Ayarları", path: "/admin?tab=ayarlar", icon: Wrench },
    { label: "Yetkilendirme", path: "/admin?tab=yetkilendirme", icon: CheckSquare },
  ],
  supervisor: [
    { label: "Vardiya Planlama", path: "/vardiya-planlama", icon: Clock },
    { label: "Checklist Takip", path: "/checklistler", icon: CheckSquare },
    { label: "Arıza Bildir", path: "/ariza-yeni", icon: AlertTriangle },
  ],
  barista: [
    { label: "Tarifler", path: "/receteler", icon: ChefHat },
    { label: "Eğitimlerim", path: "/akademi", icon: Sparkles },
    { label: "Vardiyalarım", path: "/vardiyalarim", icon: Clock },
  ],
  stajyer: [
    { label: "Eğitimlerim", path: "/akademi", icon: Sparkles },
    { label: "Tarifler", path: "/receteler", icon: ChefHat },
  ],
  fabrika_mudur: [
    { label: "Üretim Planlama", path: "/fabrika?tab=uretim-planlama", icon: TrendingUp },
    { label: "Vardiya Planlama", path: "/fabrika?tab=vardiya-planlama", icon: Clock },
    { label: "Maliyet Yönetimi", path: "/fabrika?tab=maliyet-yonetimi", icon: TrendingUp },
  ],
};

const DEFAULT_SHORTCUTS = [
  { label: "Tarifler", path: "/receteler", icon: ChefHat },
  { label: "Raporlar", path: "/raporlar", icon: TrendingUp },
  { label: "Arızalar", path: "/ariza", icon: AlertTriangle },
];

const RECENT_SEARCHES_KEY = "dospresso_recent_searches";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 8)));
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userRole = (user?.role || "barista") as UserRole;

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData, isLoading } = useQuery<{ results: SearchResult[] }>({
    queryKey: [`/api/global-search?q=${encodeURIComponent(debouncedQuery)}`],
    enabled: debouncedQuery.length >= 2,
  });

  const results = searchData?.results || [];

  const handleResultClick = useCallback((path: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
    onOpenChange(false);
    navigate(path);
  }, [searchQuery, onOpenChange, navigate]);

  const handleRecentClick = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const shortcuts = ROLE_SHORTCUTS[userRole] || DEFAULT_SHORTCUTS;

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Ara</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Şube, personel, ekipman, görev ara..."
              className="pl-10 pr-10 h-11 text-base"
              data-testid="input-global-search"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 mt-3">
          {debouncedQuery.length >= 2 ? (
            <>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(groupedResults).map(([type, items]) => {
                    const config = TYPE_CONFIG[type];
                    if (!config) return null;
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {config.label}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <button
                              key={`${item.type}-${item.id}`}
                              onClick={() => handleResultClick(item.path)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover-elevate"
                              data-testid={`search-result-${item.type}-${item.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                {item.subtitle && (
                                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                )}
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Search className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sonuç bulunamadı</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Farklı bir arama terimi deneyin
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <button
                  onClick={() => handleResultClick(`/bilgi-bankasi?q=${encodeURIComponent(debouncedQuery)}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover-elevate"
                  data-testid="button-ask-ai"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">AI'a Sor</p>
                    <p className="text-xs text-muted-foreground">"{debouncedQuery}" hakkında bilgi bankasından cevap al</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Son Aramalar
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term) => (
                      <Badge
                        key={term}
                        variant="secondary"
                        className="cursor-pointer text-xs"
                        onClick={() => handleRecentClick(term)}
                        data-testid={`recent-search-${term}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Hızlı Kısayollar
                </h3>
                <div className="space-y-1">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut.path}
                      onClick={() => handleResultClick(shortcut.path)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover-elevate"
                      data-testid={`shortcut-${shortcut.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <div className="p-1.5 rounded-lg bg-muted">
                        <shortcut.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{shortcut.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <button
                  onClick={() => handleResultClick("/bilgi-bankasi")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover-elevate"
                  data-testid="button-knowledge-base"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Bilgi Bankası</p>
                    <p className="text-xs text-muted-foreground">AI destekli bilgi bankasında arayın</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
