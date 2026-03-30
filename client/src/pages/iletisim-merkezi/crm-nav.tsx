import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Ticket, BarChart3,
  Wrench, Package, Calculator, Megaphone, GraduationCap, Users,
  Settings, MessageSquare, Inbox
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
  delegatedDepts?: string[];
  isHQ: boolean;
  branchName?: string;
}

const HQ_NAV_SECTIONS: CrmNavSection[] = [
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
      { key: 'trainer', label: 'Egitim', icon: GraduationCap },
      { key: 'hr', label: 'IK', icon: Users },
    ],
  },
  {
    header: 'AYARLAR',
    items: [
      { key: 'sla', label: 'SLA Kurallari', icon: Settings },
    ],
  },
];

const BRANCH_NAV_ITEMS: CrmNavItem[] = [
  { key: 'taleplerim', label: 'Taleplerim', icon: Inbox },
  { key: 'teknik', label: 'Teknik', icon: Wrench },
  { key: 'lojistik', label: 'Lojistik', icon: Package },
  { key: 'muhasebe', label: 'Muhasebe', icon: Calculator },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
  { key: 'hr', label: 'IK', icon: Users },
];

export function CrmNav({ activeKey, onSelect, ticketCounts, delegatedDepts = [], isHQ, branchName }: CrmNavProps) {
  return (
    <aside
      className="hidden md:flex flex-col w-[220px] flex-shrink-0 border-r border-border bg-card overflow-hidden"
      data-testid="crm-nav"
    >
      <div className="px-4 py-3.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-foreground flex-shrink-0" />
          <div>
            <div className="text-sm font-extrabold text-foreground">
              {isHQ ? 'Iletisim M.' : 'Destek Taleplerim'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isHQ ? 'HQ · Tum subeler' : branchName ?? 'Subem'}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {isHQ ? (
          HQ_NAV_SECTIONS.map((section) => (
            <div key={section.header}>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 pt-3 pb-1.5">
                {section.header}
              </div>
              {section.items?.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  isActive={activeKey === item.key}
                  count={ticketCounts[item.key] ?? 0}
                  isDelegated={delegatedDepts.includes(item.key)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))
        ) : (
          BRANCH_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              count={ticketCounts[item.key] ?? 0}
              isDelegated={false}
              onSelect={onSelect}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

function NavButton({
  item,
  isActive,
  count,
  isDelegated,
  onSelect,
}: {
  item: CrmNavItem;
  isActive: boolean;
  count: number;
  isDelegated: boolean;
  onSelect: (key: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-100 mb-0.5',
        isActive
          ? 'bg-[rgba(204,31,31,0.08)] text-[#cc1f1f] font-bold dark:bg-[rgba(204,31,31,0.12)] dark:text-red-300'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      data-testid={`crm-nav-${item.key}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {isDelegated && (
        <span className="text-xs font-bold ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0">
          DEV
        </span>
      )}
      {count > 0 && (
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[#cc1f1f] text-white flex-shrink-0">
          {count}
        </span>
      )}
    </button>
  );
}
