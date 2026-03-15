import { cn } from '@/lib/utils';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { getDeptConfig } from './categoryConfig';

export interface TicketListItem {
  id: number;
  ticket_number: string;
  title: string;
  branch_name: string | null;
  department: string;
  priority: string;
  status: string;
  sla_breached: boolean;
  sla_deadline: string | null;
  created_at: string;
  assigned_to_name: string | null;
}

interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  workDays: number[];
  timezone: string;
}

interface TicketListPanelProps {
  tickets: TicketListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  onNewTicket?: () => void;
}

function estimateRemainingBusinessHours(
  deadline: string,
  config: BusinessHoursConfig
): { hours: number; label: string; color: string; percent: number } {
  const deadlineDate = new Date(deadline);
  const now = new Date();

  if (deadlineDate.getTime() <= now.getTime()) {
    return { hours: 0, label: 'SLA Asildi', color: '#ef4444', percent: 100 };
  }

  const { startHour, endHour, workDays } = config;
  const businessMinutesPerDay = (endHour - startHour) * 60;
  let totalMinutes = 0;
  const current = new Date(now);

  for (let safety = 0; safety < 500; safety++) {
    const jsDay = current.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;

    if (workDays.includes(isoDay)) {
      const h = current.getHours();
      const m = current.getMinutes();

      if (current.toDateString() === deadlineDate.toDateString()) {
        const startMin = Math.max(h * 60 + m, startHour * 60);
        const endMin = Math.min(deadlineDate.getHours() * 60 + deadlineDate.getMinutes(), endHour * 60);
        if (endMin > startMin) totalMinutes += endMin - startMin;
        break;
      }

      if (safety === 0) {
        const startMin = Math.max(h * 60 + m, startHour * 60);
        const endMin = endHour * 60;
        if (endMin > startMin) totalMinutes += endMin - startMin;
      } else {
        totalMinutes += businessMinutesPerDay;
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(startHour, 0, 0, 0);

    if (current.getTime() > deadlineDate.getTime() + 86400000) break;
  }

  const hours = Math.max(0, totalMinutes / 60);

  if (hours <= 0) return { hours: 0, label: 'SLA Asildi', color: '#ef4444', percent: 100 };
  if (hours < 1) return { hours, label: `${Math.floor(hours * 60)} dk`, color: '#ef4444', percent: 85 };
  if (hours < 4) return { hours, label: `${Number(hours).toFixed(1)} is s.`, color: '#f59e0b', percent: 60 };
  return { hours, label: `${Number(hours).toFixed(0)} is s.`, color: '#22c55e', percent: 30 };
}

const DEPT_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  teknik:    { bg: '#eff6ff', text: '#1d4ed8', darkBg: '#1e3a8a', darkText: '#93c5fd' },
  lojistik:  { bg: '#fff7ed', text: '#c2410c', darkBg: '#7c2d12', darkText: '#fdba74' },
  muhasebe:  { bg: '#f0fdf4', text: '#166534', darkBg: '#14532d', darkText: '#86efac' },
  marketing: { bg: '#fdf4ff', text: '#7e22ce', darkBg: '#3b0764', darkText: '#d8b4fe' },
  trainer:   { bg: '#fef9c3', text: '#854d0e', darkBg: '#422006', darkText: '#fde68a' },
  hr:        { bg: '#f1f5f9', text: '#475569', darkBg: '#1e293b', darkText: '#94a3b8' },
};

export function TicketListPanel({ tickets, selectedId, onSelect, isLoading, onNewTicket }: TicketListPanelProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: bhConfig } = useQuery<BusinessHoursConfig>({
    queryKey: ['/api/iletisim/business-hours'],
  });

  const defaultConfig: BusinessHoursConfig = { startHour: 8, endHour: 18, workDays: [1,2,3,4,5], timezone: 'Europe/Istanbul' };
  const config = bhConfig ?? defaultConfig;

  const filtered = tickets.filter(t => {
    if (statusFilter === 'acik' && !['acik', 'islemde'].includes(t.status)) return false;
    if (statusFilter === 'islemde' && t.status !== 'islemde') return false;
    if (statusFilter === 'cozuldu' && !['cozuldu', 'kapatildi'].includes(t.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) || (t.branch_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="w-[260px] flex-shrink-0 border-r border-border flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div
      className="w-[260px] flex-shrink-0 flex flex-col border-r border-border bg-muted/30 overflow-hidden"
      data-testid="ticket-list-panel"
    >
      <div className="px-3 py-2.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="text-[11px] font-bold text-foreground">
            Talepler <span className="text-muted-foreground font-normal">({tickets.length})</span>
          </div>
          {onNewTicket && (
            <button
              onClick={onNewTicket}
              className="flex items-center gap-0.5 text-[8.5px] font-semibold px-2 py-1 rounded-md bg-[#cc1f1f] text-white"
              data-testid="button-new-ticket-panel"
            >
              <Plus className="w-3 h-3" /> Yeni
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border text-muted-foreground">
          <Search className="w-3 h-3 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Talep ara..."
            className="text-[9px] bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            data-testid="input-ticket-search"
          />
        </div>
        <div className="flex gap-1.5 mt-2 overflow-x-auto">
          {[
            { key: 'all', label: 'Tumu' },
            { key: 'acik', label: 'Acik' },
            { key: 'islemde', label: 'Islemde' },
            { key: 'cozuldu', label: 'Cozuldu' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'text-[7.5px] px-2 py-1 rounded-md border whitespace-nowrap flex-shrink-0 font-semibold',
                statusFilter === f.key
                  ? 'border-[#cc1f1f] bg-[#cc1f1f] text-white'
                  : 'border-border bg-transparent text-muted-foreground'
              )}
              data-testid={`filter-panel-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-muted-foreground" data-testid="text-no-tickets">
            Bu kategoride acik talep yok
          </div>
        ) : (
          filtered.map((ticket) => {
            const isSelected = ticket.id === selectedId;
            const dept = getDeptConfig(ticket.department);
            const dc = DEPT_COLORS[ticket.department] ?? { bg: '#f1f5f9', text: '#64748b', darkBg: '#1e293b', darkText: '#94a3b8' };
            const isClosed = ['cozuldu', 'kapatildi'].includes(ticket.status);

            const slaInfo = ticket.sla_breached
              ? { hours: 0, label: 'SLA Asildi', color: '#ef4444', percent: 100 }
              : ticket.sla_deadline && !isClosed
                ? estimateRemainingBusinessHours(ticket.sla_deadline, config)
                : { hours: 0, label: '', color: '#22c55e', percent: 0 };

            return (
              <button
                key={ticket.id}
                onClick={() => onSelect(ticket.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 border-b border-border transition-colors',
                  isSelected
                    ? 'bg-blue-50 border-l-2 border-l-[#122549] dark:bg-[#172554]'
                    : 'hover:bg-accent'
                )}
                data-testid={`ticket-item-${ticket.id}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {ticket.sla_breached ? (
                    <span className="w-2 h-2 rounded-full bg-[#cc1f1f] flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'text-[8.5px] font-bold',
                    isSelected ? 'text-[#122549] dark:text-blue-300' : 'text-muted-foreground'
                  )}>
                    {ticket.ticket_number}
                  </span>
                  <span
                    className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded dark:hidden"
                    style={{ background: dc.bg, color: dc.text }}
                  >
                    {dept?.label?.split(' ')[0] ?? ticket.department}
                  </span>
                  <span
                    className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded hidden dark:inline"
                    style={{ background: dc.darkBg, color: dc.darkText }}
                  >
                    {dept?.label?.split(' ')[0] ?? ticket.department}
                  </span>
                  <span className="ml-auto text-[7.5px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: false, locale: tr })}
                  </span>
                </div>
                <div className={cn(
                  'text-[10.5px] leading-snug mb-1.5 pl-3.5 truncate',
                  ticket.sla_breached ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                )}>
                  {ticket.title}
                </div>
                <div className="flex items-center gap-2 pl-3.5">
                  <span className="text-[8.5px] text-muted-foreground truncate flex-1">
                    {ticket.branch_name ?? '—'}
                  </span>
                  {slaInfo.label && (
                    <span
                      className="text-[7px] font-semibold flex-shrink-0"
                      style={{ color: slaInfo.color }}
                      data-testid={`sla-label-${ticket.id}`}
                    >
                      {slaInfo.label}
                    </span>
                  )}
                  <div className="w-8 h-1 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${slaInfo.percent}%`,
                        background: slaInfo.color,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
