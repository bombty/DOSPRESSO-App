import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Ticket, BarChart3,
  Wrench, Package, Calculator, Megaphone, GraduationCap, Users,
  Settings, MessageSquare
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CrmNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface CrmNavSection {
  header: string;
  items: CrmNavItem[];
}

interface CrmNavProps {
  activeKey: string;
  onSelect: (key: string) => void;
  ticketCounts: Record<string, number>;
}

const NAV_SECTIONS: CrmNavSection[] = [
  {
    header: 'GENEL',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'talepler', label: 'Talepler', icon: Ticket },
      { key: 'analizler', label: 'Analizler', icon: BarChart3 },
    ],
  },
  {
    header: 'DEPARTMANLAR',
    items: [
      { key: 'teknik', label: 'Teknik', icon: Wrench },
      { key: 'lojistik', label: 'Lojistik', icon: Package },
      { key: 'muhasebe', label: 'Muhasebe', icon: Calculator },
      { key: 'marketing', label: 'Marketing', icon: Megaphone },
      { key: 'trainer', label: 'Eğitim', icon: GraduationCap },
      { key: 'hr', label: 'İK', icon: Users },
    ],
  },
  {
    header: 'AYARLAR',
    items: [
      { key: 'sla', label: 'SLA Kuralları', icon: Settings },
    ],
  },
];

export function CrmNav({ activeKey, onSelect, ticketCounts }: CrmNavProps) {
  return (
    <aside
      className="hidden md:flex flex-col w-[195px] flex-shrink-0 border-r border-border bg-card overflow-hidden"
      data-testid="crm-nav"
    >
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-foreground flex-shrink-0" />
          <div>
            <div className="text-[12.5px] font-extrabold text-foreground">İletişim M.</div>
            <div className="text-[8.5px] text-muted-foreground mt-0.5">HQ · Tüm şubeler</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5 px-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.header}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground px-2 pt-3 pb-1">
              {section.header}
            </div>
            {section.items.map((item) => {
              const isActive = activeKey === item.key;
              const count = ticketCounts[item.key] ?? 0;
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-medium transition-all duration-100 mb-0.5',
                    isActive
                      ? 'bg-[rgba(204,31,31,0.08)] text-[#cc1f1f] font-bold dark:bg-[rgba(204,31,31,0.12)] dark:text-red-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  data-testid={`crm-nav-${item.key}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#cc1f1f] text-white flex-shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
