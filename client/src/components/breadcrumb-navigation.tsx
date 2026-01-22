import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Home, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BreadcrumbItem {
  path: string;
  label: string;
  timestamp: number;
}

const PATH_LABELS: Record<string, string> = {
  '/': 'Ana Sayfa',
  '/operasyon': 'Operasyon',
  '/sube': 'Şube',
  '/sube/dashboard': 'Şube Dashboard',
  '/ekipman': 'Ekipman',
  '/ariza': 'Arıza Yönetimi',
  '/personel': 'Personel',
  '/akademi': 'Akademi',
  '/raporlar': 'Raporlar',
  '/admin': 'Admin',
  '/gorev': 'Görevler',
  '/checklist': 'Checklistler',
  '/fabrika': 'Fabrika',
  '/yeni-sube': 'Yeni Şube',
  '/takvim': 'Takvim',
  '/izin': 'İzin Yönetimi',
  '/mesai': 'Mesai Takip',
  '/vardiya': 'Vardiya',
  '/kayip-esya': 'Kayıp Eşya',
  '/yoklama': 'Yoklama',
  '/canli-takip': 'Canlı Takip',
  '/tarif': 'Tarifler',
  '/duyuru': 'Duyurular',
};

const MAX_HISTORY = 10;
const STORAGE_KEY = 'dospresso-recent-visits';

function getPathLabel(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'Ana Sayfa';
  
  const basePath = '/' + parts[0];
  const baseLabel = PATH_LABELS[basePath] || parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  
  if (parts.length > 1) {
    return `${baseLabel} ${parts[1]}`;
  }
  
  return baseLabel;
}

function getBreadcrumbPath(path: string): BreadcrumbItem[] {
  const parts = path.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    items.push({
      path: currentPath,
      label: getPathLabel(currentPath),
      timestamp: Date.now()
    });
  }
  
  return items;
}

export function BreadcrumbNavigation() {
  const [location, navigate] = useLocation();
  const [history, setHistory] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
      }
    }
  }, []);

  useEffect(() => {
    if (location && location !== '/') {
      const newItem: BreadcrumbItem = {
        path: location,
        label: getPathLabel(location),
        timestamp: Date.now()
      };
      
      setHistory(prev => {
        const filtered = prev.filter(item => item.path !== location);
        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [location]);

  const breadcrumbs = getBreadcrumbPath(location);
  const recentPages = history.filter(item => item.path !== location).slice(0, 5);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (location === '/' || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-lg text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 gap-1"
        onClick={() => navigate('/')}
        data-testid="breadcrumb-home"
      >
        <Home className="h-3.5 w-3.5" />
      </Button>

      {breadcrumbs.map((item, idx) => (
        <div key={item.path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          {idx === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(item.path)}
              data-testid={`breadcrumb-${idx}`}
            >
              {item.label}
            </Button>
          )}
        </div>
      ))}

      {recentPages.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-auto gap-1 text-muted-foreground"
              data-testid="recent-history-trigger"
            >
              <History className="h-3.5 w-3.5" />
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                {recentPages.length}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Son Ziyaretler</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-[10px]"
                onClick={clearHistory}
              >
                <X className="h-3 w-3 mr-1" />
                Temizle
              </Button>
            </div>
            <ScrollArea className="h-[150px]">
              <div className="space-y-1">
                {recentPages.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs"
                    onClick={() => navigate(item.path)}
                    data-testid={`recent-page-${item.path.replace(/\//g, '-')}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
