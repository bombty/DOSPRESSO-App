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
  '/sube/dashboard': 'Şube Gösterge Paneli',
  '/sube/employee-dashboard': 'Çalışan Paneli',
  '/sube/checklist-execution': 'Checklist Uygulama',
  '/ekipman': 'Ekipman',
  '/ekipman-detay': 'Ekipman Detay',
  '/ekipman-analitics': 'Ekipman Analitik',
  '/ariza': 'Arıza Yönetimi',
  '/ariza-detay': 'Arıza Detay',
  '/ariza-yeni': 'Yeni Arıza',
  '/personel': 'Personel',
  '/personel-detay': 'Personel Detay',
  '/personel-duzenle': 'Personel Düzenle',
  '/personel-onboarding': 'Personel Onboarding',
  '/akademi/personel-onboarding': 'Personel Onboarding',
  '/akademi/onboarding-programlar': 'Onboarding Programları',
  '/akademi/supervisor-onboarding': 'Onboarding Onayları',
  '/akademi/onboarding-studio': 'Onboarding Studio',
  '/personel-qr-tokenlar': 'QR Tokenlar',
  '/personel-musaitlik': 'Personel Müsaitlik',
  '/akademi': 'Akademi',
  '/akademi-badges': 'Akademi Rozetleri',
  '/akademi-rozet-koleksiyonum': 'Rozet Koleksiyonum',
  '/akademi-learning-paths': 'Öğrenme Yolları',
  '/akademi-learning-path': 'Öğrenme Yolu Detay',
  '/akademi-leaderboard': 'Liderlik Tablosu',
  '/akademi-certificates': 'Sertifikalar',
  '/akademi-analytics': 'Akademi Analitik',
  '/akademi-advanced-analytics': 'Gelişmiş Akademi Analitik',
  '/akademi-branch-analytics': 'Şube Akademi Analitik',
  '/akademi-cohort-analytics': 'Kohort Analitik',
  '/akademi-achievements': 'Başarılar',
  '/akademi-streak-tracker': 'Öğrenme Serisi',
  '/akademi-hq': 'Akademi HQ',
  '/akademi-supervisor': 'Akademi Süpervizör',
  '/akademi-progress-overview': 'İlerleme Genel Bakış',
  '/akademi-modul': 'Modül Detay',
  '/akademi-modul-editor': 'Modül Düzenleyici',
  '/akademi-quiz': 'Sınav',
  '/akademi-social-groups': 'Sosyal Gruplar',
  '/akademi-team-competitions': 'Takım Yarışmaları',
  '/akademi-adaptive-engine': 'Adaptif Öğrenme',
  '/akademi-ai-assistant': 'Akademi AI Asistan',
  '/raporlar': 'Raporlar',
  '/raporlar-hub': 'Raporlar',
  '/gelismis-raporlar': 'Gelişmiş Raporlar',
  '/e2e-raporlar': 'E2E Raporlar',
  '/admin': 'Admin',
  '/admin/kullanicilar': 'Kullanıcılar',
  '/admin/toplu-veri-yonetimi': 'Toplu Veri Yönetimi',
  '/gorev': 'Görevler',
  '/gorevler': 'Görevler',
  '/gorev-detay': 'Görev Detay',
  '/gorev-sablonlari': 'Görev Şablonları',
  '/checklist': 'Checklistler',
  '/checklistler': 'Checklistler',
  '/fabrika': 'Fabrika',
  '/fabrika/dashboard': 'Fabrika Gösterge Paneli',
  '/fabrika-istasyonlari': 'Fabrika İstasyonları',
  '/fire-sebepleri': 'Fire Sebepleri',
  '/kalite-kriterleri': 'Kalite Kriterleri',
  '/hq-fabrika-analitik': 'Fabrika Analitik',
  '/yeni-sube': 'Yeni Şube',
  '/yeni-sube-projeler': 'Yeni Şube Projeleri',
  '/yeni-sube-detay': 'Yeni Şube Detay',
  '/franchise-acilis': 'Franchise Açılış',
  '/takvim': 'Takvim',
  '/izin': 'İzin Yönetimi',
  '/izin-talepleri': 'İzin Talepleri',
  '/mesai': 'Mesai Takip',
  '/mesai-talepleri': 'Mesai Talepleri',
  '/vardiya': 'Vardiya',
  '/vardiyalar': 'Vardiyalar',
  '/vardiyalarim': 'Vardiyalarım',
  '/vardiya-planlama': 'Vardiya Planlama',
  '/vardiya-checkin': 'Vardiya Giriş',
  '/devam-takibi': 'Devam Takibi',
  '/sube-vardiya-takibi': 'Şube Vardiya Takibi',
  '/hq-vardiya-goruntuleme': 'Vardiya Görüntüleme',
  '/hq-personel-durum': 'Personel Durum',
  '/hq-personel-istatistikleri': 'Personel İstatistikleri',
  '/kayip-esya': 'Kayıp Eşya',
  '/kayip-esya-hq': 'Kayıp Eşya HQ',
  '/yoklama': 'Yoklama',
  '/canli-takip': 'Canlı Takip',
  '/tarif': 'Tarifler',
  '/receteler': 'Reçeteler',
  '/recete': 'Reçete Detay',
  '/duyuru': 'Duyurular',
  '/duyurular': 'Duyurular',
  '/icerik-studyosu': 'İçerik Stüdyosu',
  '/banner-editor': 'Banner Düzenleyici',
  '/pin-yonetimi': 'PIN Yönetimi',
  '/nfc-giris': 'NFC Giriş',
  '/ai-bilgi-yonetimi': 'AI Bilgi Yönetimi',
  '/bilgi-bankasi': 'Bilgi Bankası',
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
  '/cgo-command-center': 'CGO Komuta Merkezi',
  '/ceo-command-center': 'CEO Komuta Merkezi',
  '/satinalma': 'Satınalma',
  '/bildirimler': 'İletişim Merkezi',
  '/performans': 'Performans',
  '/performansim': 'Performansım',
  '/kalite-denetimi': 'Kalite Denetimi',
  '/kalite-kontrol-dashboard': 'Kalite Kontrol',
  '/denetimler': 'Denetimler',
  '/denetim-sablonlari': 'Denetim Şablonları',
  '/denetim': 'Denetim Detay',
  '/capa': 'Düzeltici Faaliyet',
  '/coach-sube-denetim': 'Coach Şube Denetim',
  '/destek': 'Destek',
  '/hq-destek': 'HQ Destek',
  '/ik': 'İnsan Kaynakları',
  '/ik-raporlari': 'İK Raporları',
  '/muhasebe': 'Muhasebe',
  '/muhasebe-raporlama': 'Muhasebe Raporlama',
  '/muhasebe-geribildirimi': 'Muhasebe Geri Bildirimi',
  '/mali-yonetim': 'Mali Yönetim',
  '/kasa-raporlari': 'Kasa Raporları',
  '/crm': 'CRM',
  '/kampanya-yonetimi': 'Kampanya Yönetimi',
  '/projeler': 'Projeler',
  '/proje-gorev': 'Proje Görev',
  '/sikayetler': 'Şikayetler',
  '/urun-sikayet': 'Ürün Şikayeti',
  '/misafir-memnuniyeti': 'Misafir Memnuniyeti',
  '/misafir-geri-bildirim': 'Misafir Geri Bildirim',
  '/sube-saglik-skoru': 'Şube Sağlık Skoru',
  '/sube-karsilastirma': 'Şube Karşılaştırma',
  '/sube-gorevler': 'Şube Görevler',
  '/subeler': 'Şubeler',
  '/merkez-dashboard': 'Merkez Gösterge Paneli',
  '/hq-dashboard': 'HQ Gösterge Paneli',
  '/gida-guvenligi-dashboard': 'Gıda Güvenliği',
  '/ayin-elemani': 'Ayın Elemanı',
  '/onboarding-programlar': 'Onboarding Programları',
  '/kullanim-kilavuzu': 'Kullanım Kılavuzu',
  '/gizlilik-politikasi': 'Gizlilik Politikası',
  '/egitim': 'Eğitim',
  '/egitim-ata': 'Eğitim Ata',
  '/egitim-programi': 'Eğitim Programı',
  '/qr-tara': 'QR Tara',
  '/yonetim': 'Yönetim',
  '/yonetim/ayarlar': 'Ayarlar',
  '/yonetim/kullanicilar': 'Kullanıcılar',
  '/yonetim/akademi': 'Akademi Yönetimi',
  '/yonetim/checklistler': 'Checklist Yönetimi',
  '/yonetim/checklist-takip': 'Checklist Takip',
  '/yonetim/ekipman-yonetimi': 'Ekipman Yönetimi',
  '/yonetim/ekipman-servis': 'Ekipman Servis',
  '/yonetim/servis-talepleri': 'Servis Talepleri',
  '/yonetim/ai-maliyetler': 'AI Maliyetleri',
  '/yonetim/degerlendirme': 'Değerlendirme',
  '/yonetim/icerik': 'İçerik',
  '/waste': 'Fire Yönetimi',
  '/hub/operations': 'Operasyon',
  '/hub/hr-shifts': 'İK & Vardiya',
  '/hub/fabrika': 'Fabrika',
  '/hub/training-academy-section': 'Eğitim',
  '/hub/audit-analytics': 'Denetim & Analitik',
  '/hub/finance-procurement': 'Finans & Tedarik',
  '/hub/marketing': 'Pazarlama',
  '/hub/communication': 'İletişim',
  '/hub/management': 'Yönetim',
};

const MAX_HISTORY = 10;
const STORAGE_KEY = 'dospresso-recent-visits';

const DETAIL_PAGE_PARENTS: Record<string, { parentPath: string; parentLabel: string }> = {
  '/ariza-detay': { parentPath: '/ariza', parentLabel: 'Arızalar' },
  '/ekipman-detay': { parentPath: '/ekipman', parentLabel: 'Ekipman' },
  '/gorev-detay': { parentPath: '/gorevler', parentLabel: 'Görevler' },
  '/personel-detay': { parentPath: '/ik', parentLabel: 'Personel & İK' },
  '/recete': { parentPath: '/receteler', parentLabel: 'Reçeteler' },
  '/yeni-sube-detay': { parentPath: '/yeni-sube-projeler', parentLabel: 'Yeni Şube Projeleri' },
  '/proje-gorev': { parentPath: '/projeler', parentLabel: 'Projeler' },
  '/capa-detay': { parentPath: '/capa', parentLabel: 'Düzeltici Faaliyet' },
};

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

  const firstSegment = parts.length > 0 ? '/' + parts[0] : '';
  const parentMapping = DETAIL_PAGE_PARENTS[firstSegment];
  if (parentMapping && parts.length > 1) {
    items.push({
      path: parentMapping.parentPath,
      label: parentMapping.parentLabel,
      timestamp: Date.now()
    });
  }

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
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-lg text-sm overflow-x-auto scrollbar-hidden min-w-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 gap-1 shrink-0"
        onClick={() => navigate('/')}
        data-testid="breadcrumb-home"
      >
        <Home className="h-3.5 w-3.5" />
      </Button>

      {breadcrumbs.map((item, idx) => (
        <div key={item.path} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          {idx === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px] whitespace-nowrap">{item.label}</span>
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
              className="h-6 px-2 ml-auto gap-1 text-muted-foreground shrink-0"
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
