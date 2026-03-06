import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  FileText,
  LayoutDashboard,
  Settings,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Factory,
  Shield,
  Bookmark,
  Command,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { UserRole } from "@/lib/role-visibility";

interface SearchResult {
  type: string;
  id: string | number;
  title: string;
  subtitle?: string;
  path: string;
  icon?: string;
}

interface PageItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  section: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  page: { label: "Sayfalar", icon: LayoutDashboard, color: "text-primary" },
  branch: { label: "Şube", icon: Building2, color: "text-blue-500" },
  employee: { label: "Personel", icon: User, color: "text-emerald-500" },
  equipment: { label: "Ekipman", icon: Wrench, color: "text-orange-500" },
  task: { label: "Görev", icon: ClipboardCheck, color: "text-violet-500" },
  fault: { label: "Arıza", icon: AlertTriangle, color: "text-red-500" },
  checklist: { label: "Checklist", icon: CheckSquare, color: "text-cyan-500" },
  recipe: { label: "Tarif", icon: ChefHat, color: "text-amber-500" },
};

function normalizeTurkish(str: string): string {
  return str
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/İ/g, "i");
}

function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(query);
  if (normalizedText.includes(normalizedQuery)) return true;
  const words = normalizedQuery.split(/\s+/);
  return words.every(w => normalizedText.includes(w));
}

function getIconComponent(iconName: string): any {
  const icons = LucideIcons as Record<string, any>;
  return icons[iconName] || FileText;
}

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

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userRole = (user?.role || "barista") as UserRole;

  const { data: menuData } = useQuery<{ sections: Array<{ titleTr: string; items: Array<{ id: string; titleTr: string; path: string; icon: string }> }> }>({
    queryKey: ["sidebar-menu", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me/menu", { credentials: "include" });
      if (!res.ok) throw new Error("Menu fetch failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const pageItems = useMemo<PageItem[]>(() => {
    if (!menuData?.sections) return [];
    const items: PageItem[] = [];
    for (const section of menuData.sections) {
      for (const item of section.items) {
        items.push({
          id: item.id,
          title: item.titleTr,
          path: item.path,
          icon: item.icon,
          section: section.titleTr,
        });
      }
    }
    return items;
  }, [menuData]);

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setSelectedIndex(0);
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

  const dbResults = searchData?.results || [];

  const pageResults = useMemo<SearchResult[]>(() => {
    if (debouncedQuery.length < 1) return [];
    return pageItems
      .filter(p => fuzzyMatch(p.title, debouncedQuery) || fuzzyMatch(p.section, debouncedQuery))
      .slice(0, 8)
      .map(p => ({
        type: "page",
        id: p.id,
        title: p.title,
        subtitle: p.section ? `${p.section}` : undefined,
        path: p.path,
        icon: p.icon,
      }));
  }, [debouncedQuery, pageItems]);

  const allResults = useMemo(() => {
    const combined = [...pageResults, ...dbResults];
    return combined;
  }, [pageResults, dbResults]);

  const flatResults = useMemo(() => {
    const items: Array<{ result: SearchResult; groupType: string }> = [];
    const grouped = allResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    }, {});
    const typeOrder = ["page", "branch", "employee", "equipment", "task", "fault", "checklist", "recipe"];
    for (const type of typeOrder) {
      if (grouped[type]) {
        for (const result of grouped[type]) {
          items.push({ result, groupType: type });
        }
      }
    }
    return items;
  }, [allResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatResults.length > 0) {
      e.preventDefault();
      const selected = flatResults[selectedIndex];
      if (selected) {
        handleResultClick(selected.result.path);
      }
    }
  }, [flatResults, selectedIndex, handleResultClick]);

  useEffect(() => {
    if (resultsRef.current) {
      const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const shortcuts = ROLE_SHORTCUTS[userRole] || DEFAULT_SHORTCUTS;

  const hasResults = debouncedQuery.length >= 1 && (pageResults.length > 0 || (debouncedQuery.length >= 2 && dbResults.length > 0));
  const showEmpty = debouncedQuery.length >= 2 && !isLoading && pageResults.length === 0 && dbResults.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[100dvh] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 w-full h-[100dvh] sm:h-auto sm:w-auto rounded-none sm:rounded-lg top-0 bottom-0 sm:top-[50%] sm:bottom-auto">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Komut Paleti</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sayfa, şube, personel, ekipman ara..."
              className="pl-10 pr-16 h-11 text-base"
              data-testid="input-global-search"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded text-muted-foreground">
                <Command className="h-2.5 w-2.5 mr-0.5" />K
              </kbd>
            </div>
          </div>
        </DialogHeader>

        <div ref={resultsRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 mt-3">
          {hasResults || (debouncedQuery.length >= 2 && isLoading) ? (
            <>
              {isLoading && pageResults.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {flatResults.map((item, idx) => {
                    const config = TYPE_CONFIG[item.groupType];
                    if (!config) return null;
                    const showHeader = idx === 0 || flatResults[idx - 1]?.groupType !== item.groupType;
                    const isSelected = idx === selectedIndex;
                    const IconComp = item.result.icon ? getIconComponent(item.result.icon) : config.icon;

                    return (
                      <div key={`${item.result.type}-${item.result.id}`}>
                        {showHeader && (
                          <div className="flex items-center gap-2 mb-1 mt-2 first:mt-0">
                            <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {config.label}
                            </span>
                          </div>
                        )}
                        <button
                          data-index={idx}
                          onClick={() => handleResultClick(item.result.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? "bg-accent" : "hover-elevate"
                          }`}
                          data-testid={`search-result-${item.result.type}-${item.result.id}`}
                        >
                          <div className={`p-1.5 rounded-lg ${item.groupType === "page" ? "bg-primary/10" : "bg-muted"}`}>
                            <IconComp className={`w-4 h-4 ${item.groupType === "page" ? "text-primary" : ""}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.result.title}</p>
                            {item.result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{item.result.subtitle}</p>
                            )}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {debouncedQuery.length >= 2 && (
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
              )}
            </>
          ) : showEmpty ? (
            <div className="text-center py-8 space-y-3">
              <Search className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sonuç bulunamadı</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Farklı bir arama terimi deneyin
                </p>
              </div>
            </div>
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

        <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Seç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Kapat
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
