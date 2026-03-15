import { useState } from 'react';
import { ArrowLeft, Maximize2, Minimize2, Send, Paperclip, UserPlus, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getDeptConfig, getStatusConfig, isHQRole } from './categoryConfig';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface TicketComment {
  id: number;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetailData {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  status: string;
  branch_name: string | null;
  created_by_name: string | null;
  assigned_to_name: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  created_at: string;
  comments: TicketComment[];
}

interface Props {
  ticket: TicketDetailData | null;
  isLoading?: boolean;
  onClose?: () => void;
}

export function TicketChatPanel({ ticket, isLoading, onClose }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMode, setInputMode] = useState<'reply' | 'internal'>('reply');
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const qc = useQueryClient();

  const isHQ = isHQRole(user?.role ?? '');

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/iletisim/tickets/${ticket?.id}/comments`, {
        content: message.trim(),
        isInternal: inputMode === 'internal',
      });
    },
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/iletisim/tickets/${ticket?.id}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets'] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="chat-panel-loading">
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground" data-testid="chat-panel-empty">
        <Ticket className="w-10 h-10 opacity-30" />
        <div className="text-sm font-medium">Bir talep seçin</div>
        <div className="text-xs">Görüntülemek için soldan talep seçin</div>
      </div>
    );
  }

  const getSlaInfo = () => {
    if (!ticket.sla_deadline) return { label: '—', percent: 0, color: '#22c55e' };
    if (ticket.sla_breached) return { label: 'SLA Aşıldı', percent: 100, color: '#ef4444' };
    const hoursLeft = (new Date(ticket.sla_deadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) return { label: 'SLA Aşıldı', percent: 100, color: '#ef4444' };
    if (hoursLeft < 1) return { label: `${Math.floor(hoursLeft * 60)} dk kaldı`, percent: 85, color: '#ef4444' };
    if (hoursLeft < 4) return { label: `${Number(hoursLeft ?? 0).toFixed(1)} saat`, percent: 60, color: '#f59e0b' };
    return { label: `${Number(hoursLeft ?? 0).toFixed(0)} saat`, percent: 30, color: '#22c55e' };
  };

  const sla = getSlaInfo();
  const isClosed = ticket.status === 'cozuldu' || ticket.status === 'kapatildi';
  const dept = getDeptConfig(ticket.department);
  const statusLabel = getStatusConfig(ticket.status)?.label ?? ticket.status;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-card transition-all',
        isFullscreen ? 'fixed inset-0 z-50 md:left-[52px]' : 'flex-1'
      )}
      data-testid="ticket-chat-panel"
    >
      <div className="flex items-start justify-between px-4 py-2.5 border-b border-border flex-shrink-0 gap-2">
        <div className="flex-1 min-w-0 mr-3">
          {onClose && (
            <button onClick={onClose} className="md:hidden mr-2 text-muted-foreground" data-testid="button-chat-back">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] font-bold text-[#cc1f1f]" data-testid="text-chat-ticket-number">{ticket.ticket_number}</span>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {dept?.label?.split(' ')[0] ?? ticket.department}
            </span>
            <span className={cn(
              'text-[8px] font-semibold px-1.5 py-0.5 rounded',
              isClosed
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            )}>
              {statusLabel}
            </span>
          </div>
          <div className="text-[12px] font-bold text-foreground truncate" data-testid="text-chat-ticket-title">{ticket.title}</div>
          <div className="text-[8.5px] text-muted-foreground mt-0.5">
            {ticket.branch_name ?? '—'} · {ticket.created_by_name ?? '—'} · Atanan: {ticket.assigned_to_name ?? 'Atanmadı'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="hidden md:block text-right mr-1">
            <div className="text-[8px] font-semibold" style={{ color: sla.color }}>
              SLA: {sla.label}
            </div>
            <div className="w-14 h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${sla.percent}%`, background: sla.color }} />
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors"
            title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
            data-testid="button-fullscreen-toggle"
          >
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
              : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>

          {isHQ && !isClosed && (
            <button
              onClick={() => statusMutation.mutate('cozuldu')}
              disabled={statusMutation.isPending}
              className="text-[8.5px] font-semibold px-2 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              data-testid="button-resolve-ticket"
            >
              Çöz
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/20" data-testid="chat-messages">
        <div className="flex justify-center">
          <span className="text-[8.5px] px-3 py-1 rounded-full bg-muted text-muted-foreground">
            Talep açıldı · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })}
          </span>
        </div>

        {ticket.description && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-3.5 bg-blue-600">
              {(ticket.created_by_name ?? 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-[7.5px] text-muted-foreground mb-1">{ticket.created_by_name ?? 'Şube'} · Açılış</div>
              <div className="px-3 py-2 rounded-xl text-[10px] leading-relaxed bg-card border border-border text-foreground rounded-tl-sm">
                {ticket.description}
              </div>
            </div>
          </div>
        )}

        {(ticket.comments ?? []).map((c) => {
          if (c.is_internal) {
            if (!isHQ) return null;
            return (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-3.5 bg-purple-600">
                  {(c.author_name ?? 'H')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-[7.5px] text-muted-foreground mb-1">
                    {c.author_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                  </div>
                  <div className="px-3 py-2 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-[9.5px] text-amber-800 dark:text-amber-200">
                    <div className="text-[7.5px] font-bold uppercase tracking-wide opacity-60 mb-1">Dahili Not</div>
                    {c.content}
                  </div>
                </div>
              </div>
            );
          }

          const isFromHQ = isHQRole(user?.role ?? '') && c.author_name !== ticket.created_by_name;
          return (
            <div key={c.id} className={cn('flex gap-2', isFromHQ && 'flex-row-reverse')}>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-3.5',
                  isFromHQ ? 'bg-[#122549]' : 'bg-blue-600'
                )}
              >
                {(c.author_name ?? '?')[0].toUpperCase()}
              </div>
              <div className={cn('max-w-[75%]', isFromHQ && 'items-end flex flex-col')}>
                <div className={cn('text-[7.5px] text-muted-foreground mb-1', isFromHQ && 'text-right')}>
                  {c.author_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                </div>
                <div className={cn(
                  'px-3 py-2 rounded-xl text-[10px] leading-relaxed',
                  isFromHQ
                    ? 'bg-[#122549] text-white rounded-tr-sm'
                    : 'bg-card border border-border text-foreground rounded-tl-sm'
                )}>
                  {c.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isClosed ? (
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex-1">
              <div className="text-[9.5px] font-semibold text-green-700 dark:text-green-300">Bu ticket kapatıldı</div>
              <div className="text-[8.5px] text-green-600 dark:text-green-400">Yeni sorun için ayrı ticket açın.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
          {isHQ && (
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setInputMode('reply')}
                className={cn(
                  'text-[8.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                  inputMode === 'reply'
                    ? 'bg-[#122549] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
                data-testid="button-reply-mode"
              >
                Yanıt
              </button>
              <button
                onClick={() => setInputMode('internal')}
                className={cn(
                  'text-[8.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                  inputMode === 'internal'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
                data-testid="button-internal-mode"
              >
                Dahili Not
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                inputMode === 'internal'
                  ? 'Dahili not ekle — sadece HQ görebilir...'
                  : 'Şubeye yanıt yaz...'
              }
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-[10px] resize-none outline-none border',
                'bg-muted/50 border-border text-foreground placeholder:text-muted-foreground',
                'min-h-[36px] max-h-[80px]',
                inputMode === 'internal' && 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
              )}
              rows={1}
              data-testid="input-chat-message"
            />
            <button
              onClick={() => message.trim() && commentMutation.mutate()}
              disabled={!message.trim() || commentMutation.isPending}
              className="w-8 h-8 rounded-lg bg-[#122549] flex items-center justify-center flex-shrink-0 hover:bg-[#0e1e3a] transition-colors disabled:opacity-50"
              data-testid="button-send-message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
            {isHQ && !isClosed && (
              <button
                onClick={() => statusMutation.mutate('cozuldu')}
                disabled={statusMutation.isPending}
                className="text-[8.5px] font-semibold px-2 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300 flex-shrink-0 hover:bg-green-100 transition-colors"
                data-testid="button-resolve-and-close"
              >
                Çöz & Kapat
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              className="flex items-center gap-1 text-[8px] px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors"
              data-testid="button-attach-file"
            >
              <Paperclip className="w-3 h-3" /> Dosya Ekle
            </button>
            {isHQ && (
              <>
                <button
                  className="flex items-center gap-1 text-[8px] px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors"
                  data-testid="button-add-person"
                >
                  <UserPlus className="w-3 h-3" /> Kişi Ekle
                </button>
                <button
                  className="flex items-center gap-1 text-[8px] px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors"
                  data-testid="button-sla-remind"
                >
                  <Bell className="w-3 h-3" /> SLA Hatırlat
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Ticket({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}
