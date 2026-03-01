import { createContext, useContext, useEffect, useState } from "react";
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
  '/icerik-studyosu': 'İçerik Stüdyosu',
  '/pin-yonetimi': 'PIN Yönetimi',
  '/ai-bilgi-yonetimi': 'AI Bilgi Yönetimi',
  '/gorev-sablonlari': 'Görev Şablonları',
  '/ai-maliyetler': 'AI Maliyetleri',
  '/email-ayarlari': 'Email Ayarları',
  '/servis-mail-ayarlari': 'Servis Mail Ayarları',
  '/yapay-zeka-ayarlari': 'Yapay Zeka Ayarları',
  '/yedekleme': 'Yedekleme',
  '/checklist-yonetimi': 'Checklist Yönetimi',
  '/akademi-yonetimi': 'Akademi Yönetimi',
  '/ekipman-yonetimi': 'Ekipman Yönetimi',
  '/ekipman-servis': 'Ekipman Servis',
  '/servis-talepleri': 'Servis Talepleri',
  '/toplu-veri': 'Toplu Veri Yönetimi',
  '/fabrika-istasyonlari': 'Fabrika İstasyonları',
  '/fire-sebepleri': 'Fire Sebepleri',
  '/kalite-kriterleri': 'Kalite Kriterleri',
};

const MAX_HISTORY = 10;
const STORAGE_KEY = 'dospresso-recent-visits';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;

function isDynamicSegment(segment: string): boolean {
  return UUID_REGEX.test(segment) || NUMERIC_ID_REGEX.test(segment);
}

interface BreadcrumbContextType {
  dynamicLabels: Record<string, string>;
  setDynamicLabel: (path: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  dynamicLabels: {},
  setDynamicLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  const setDynamicLabel = (path: string, label: string) => {
    setDynamicLabels(prev => ({ ...prev, [path]: label }));
  };

  return (
    <BreadcrumbContext.Provider value={{ dynamicLabels, setDynamicLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb(label: string, path?: string) {
  const { setDynamicLabel } = useContext(BreadcrumbContext);
  const [location] = useLocation();
  const targetPath = path || location;

  useEffect(() => {
    if (label && targetPath) {
      setDynamicLabel(targetPath, label);
    }
  }, [label, targetPath]);
}

function getPathLabel(path: string, dynamicLabels: Record<string, string>): string {
  if (dynamicLabels[path]) return dynamicLabels[path];
  if (PATH_LABELS[path]) return PATH_LABELS[path];

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'Ana Sayfa';

  const basePath = '/' + parts[0];
  const baseLabel = PATH_LABELS[basePath] || parts[0].charAt(0).toLocaleUpperCase('tr-TR') + parts[0].slice(1).replace(/-/g, ' ');

  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (isDynamicSegment(lastPart)) {
      return baseLabel;
    }
    const segmentLabel = PATH_LABELS['/' + lastPart];
    if (segmentLabel) return segmentLabel;
    return lastPart.charAt(0).toLocaleUpperCase('tr-TR') + lastPart.slice(1).replace(/-/g, ' ');
  }

  return baseLabel;
}

function getBreadcrumbPath(path: string, dynamicLabels: Record<string, string>): BreadcrumbItem[] {
  const parts = path.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath += '/' + part;

    if (isDynamicSegment(part) && i > 0) {
      const label = dynamicLabels[currentPath] || dynamicLabels[path] || '';
      if (label) {
        items.push({
          path: currentPath,
          label,
          timestamp: Date.now()
        });
      }
    } else {
      items.push({
        path: currentPath,
        label: getPathLabel(currentPath, dynamicLabels),
        timestamp: Date.now()
      });
    }
  }

  return items;
}

export function BreadcrumbNavigation() {
  const [location, navigate] = useLocation();
  const [history, setHistory] = useState<BreadcrumbItem[]>([]);
  const { dynamicLabels } = useContext(BreadcrumbContext);

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
      const label = getPathLabel(location, dynamicLabels);
      const newItem: BreadcrumbItem = {
        path: location,
        label,
        timestamp: Date.now()
      };

      setHistory(prev => {
        const filtered = prev.filter(item => item.path !== location);
        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [location, dynamicLabels]);

  const breadcrumbs = getBreadcrumbPath(location, dynamicLabels);
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
            <span className="font-medium text-foreground truncate max-w-[200px]">{item.label}</span>
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
