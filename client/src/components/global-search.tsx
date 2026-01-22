import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, Building2, User, ClipboardList, Wrench, BookOpen, FileText,
  ChevronRight, Loader2, Command
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  id: string | number;
  type: 'module' | 'branch' | 'employee' | 'task' | 'equipment' | 'recipe' | 'document';
  title: string;
  subtitle?: string;
  path: string;
  icon?: any;
}

const TYPE_ICONS: Record<string, any> = {
  module: BookOpen,
  branch: Building2,
  employee: User,
  task: ClipboardList,
  equipment: Wrench,
  recipe: FileText,
  document: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  module: 'Modül',
  branch: 'Şube',
  employee: 'Personel',
  task: 'Görev',
  equipment: 'Ekipman',
  recipe: 'Reçete',
  document: 'Döküman',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: searchResults, isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.path);
  }, [navigate]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border bg-background hover:bg-accent transition-colors"
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Modül, şube, personel, görev ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base"
              autoFocus
              data-testid="input-global-search"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <ScrollArea className="max-h-[60vh]">
            {query.length < 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aramak için en az 2 karakter yazın
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((result, idx) => {
                  const Icon = TYPE_ICONS[result.type] || FileText;
                  return (
                    <button
                      key={`${result.type}-${result.id}-${idx}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                      data-testid={`search-result-${result.type}-${result.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {TYPE_LABELS[result.type]}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : query.length >= 2 && !isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                "{query}" için sonuç bulunamadı
              </div>
            ) : null}
          </ScrollArea>

          <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
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
    </>
  );
}
