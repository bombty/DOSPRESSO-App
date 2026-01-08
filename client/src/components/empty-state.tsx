import { Button } from "@/components/ui/button";
import { 
  FileX, 
  Plus, 
  Search, 
  Inbox, 
  ClipboardList, 
  Users, 
  Calendar,
  Coffee,
  Wrench,
  GraduationCap,
  BarChart3,
  FolderOpen,
  MessageSquare,
  Bell,
  Award,
  AlertCircle,
  type LucideIcon
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'filter' | 'error';
}

const VARIANT_CONFIG = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  search: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
  },
  filter: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
  },
  error: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-500',
  },
};

export function EmptyState({ 
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-state">
      <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
        <Icon className={`h-8 w-8 ${config.iconColor}`} />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" size="sm" data-testid="button-empty-state-action">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export const EMPTY_STATE_PRESETS = {
  tasks: {
    icon: ClipboardList,
    title: "Henüz görev yok",
    description: "Yeni bir görev oluşturarak başlayabilirsiniz.",
    actionLabel: "Görev Oluştur",
  },
  checklists: {
    icon: ClipboardList,
    title: "Checklist bulunamadı",
    description: "Henüz size atanmış bir checklist bulunmuyor.",
  },
  employees: {
    icon: Users,
    title: "Personel bulunamadı",
    description: "Seçili kriterlere uygun personel yok.",
  },
  shifts: {
    icon: Calendar,
    title: "Vardiya bulunamadı",
    description: "Bu tarih aralığında vardiya kaydı yok.",
  },
  equipment: {
    icon: Coffee,
    title: "Ekipman bulunamadı",
    description: "Henüz ekipman kaydı oluşturulmamış.",
    actionLabel: "Ekipman Ekle",
  },
  faults: {
    icon: Wrench,
    title: "Arıza kaydı yok",
    description: "Açık arıza bildirimi bulunmuyor. Her şey yolunda!",
  },
  training: {
    icon: GraduationCap,
    title: "Eğitim içeriği yok",
    description: "Henüz eğitim modülü oluşturulmamış.",
  },
  reports: {
    icon: BarChart3,
    title: "Rapor verisi yok",
    description: "Seçili dönem için rapor verisi bulunamadı.",
  },
  search: {
    icon: Search,
    title: "Sonuç bulunamadı",
    description: "Arama kriterlerinizi değiştirip tekrar deneyin.",
    variant: 'search' as const,
  },
  messages: {
    icon: MessageSquare,
    title: "Mesaj yok",
    description: "Henüz mesaj alınmamış.",
  },
  notifications: {
    icon: Bell,
    title: "Bildirim yok",
    description: "Tüm bildirimleri okudunuz!",
  },
  badges: {
    icon: Award,
    title: "Rozet kazanılmadı",
    description: "Eğitimleri tamamlayarak rozet kazanabilirsiniz.",
  },
  error: {
    icon: AlertCircle,
    title: "Bir hata oluştu",
    description: "Veriler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.",
    variant: 'error' as const,
  },
  projects: {
    icon: FolderOpen,
    title: "Proje bulunamadı",
    description: "Henüz proje oluşturulmamış.",
    actionLabel: "Proje Oluştur",
  },
  documents: {
    icon: FileX,
    title: "Döküman bulunamadı",
    description: "Henüz döküman yüklenmemiş.",
    actionLabel: "Döküman Yükle",
  },
  aiInsights: {
    icon: Inbox,
    title: "AI önerisi yok",
    description: "Henüz AI tarafından oluşturulmuş içgörü bulunmuyor.",
  },
};

export function EmptyStatePreset({ 
  preset, 
  onAction,
  variant
}: { 
  preset: keyof typeof EMPTY_STATE_PRESETS;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'filter' | 'error';
}) {
  const config = EMPTY_STATE_PRESETS[preset];
  const presetVariant = 'variant' in config ? config.variant : undefined;
  return <EmptyState {...config} variant={variant || presetVariant} onAction={onAction} />;
}
