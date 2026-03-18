import { useState, useRef } from 'react';
import { ArrowLeft, Maximize2, Minimize2, Send, Paperclip, UserPlus, Bell, FileText, Image, X, Loader2, Clock, Wrench, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getDeptConfig, getStatusConfig, isHQRole } from './categoryConfig';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SlaRemainingData {
  remainingHours: number | null;
  breached: boolean;
  deadline?: string;
}

interface TicketComment {
  id: number;
  author_name: string;
  content: string;
  is_internal: boolean;
  comment_type: string;
  created_at: string;
}

interface TicketAttachment {
  id: number;
  fileName: string;
  file_name?: string;
  fileSize: number;
  file_size?: number;
  mimeType: string;
  mime_type?: string;
  storageKey: string;
  storage_key?: string;
  createdAt: string;
  created_at?: string;
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
  assigned_to_user_id: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  created_at: string;
  related_equipment_id: number | null;
  comments: TicketComment[];
  attachments?: TicketAttachment[];
  isCoworkMember?: boolean;
}

interface EquipmentInfo {
  id: number;
  name: string;
  brand?: string | null;
  model?: string | null;
  equipmentType?: string | null;
  equipment_type?: string | null;
}

interface Props {
  ticket: TicketDetailData | null;
  isLoading?: boolean;
  onClose?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketChatPanel({ ticket, isLoading, onClose }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMode, setInputMode] = useState<'reply' | 'internal' | 'cowork'>('reply');
  const [message, setMessage] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showCoworkInvite, setShowCoworkInvite] = useState(false);
  const [chatTab, setChatTab] = useState<'chat' | 'history'>('chat');
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHQ = isHQRole(user?.role ?? '');
  const isClosed = ticket ? (ticket.status === 'cozuldu' || ticket.status === 'kapatildi') : false;

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/iletisim/tickets/${ticket?.id}/comments`, {
        content: message.trim(),
        isInternal: inputMode === 'internal',
        commentType: inputMode,
      });
    },
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
    },
  });

  const { data: coworkMembers = [] } = useQuery<{ user_id: string; user_name: string; user_role: string; invited_by_name: string }[]>({
    queryKey: ['/api/iletisim/tickets', ticket?.id, 'cowork', 'members'],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${ticket?.id}/cowork/members`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ticket?.id && isHQ,
  });

  const { data: hqUsers = [] } = useQuery<{ id: string; name: string; role: string }[]>({
    queryKey: ['/api/iletisim/assignable-users', 'all-hq'],
    queryFn: async () => {
      const res = await fetch('/api/iletisim/assignable-users?department=all', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isHQ && showCoworkInvite,
  });

  const coworkInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/iletisim/tickets/${ticket?.id}/cowork/invite`, { userId });
    },
    onSuccess: () => {
      toast({ title: "Davet edildi", description: "Kullanıcı cowork sohbetine davet edildi" });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id, 'cowork', 'members'] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Davet gönderilemedi", variant: "destructive" });
    },
  });

  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const statusMutation = useMutation({
    mutationFn: async ({ status, resolutionNote: note }: { status: string; resolutionNote?: string }) => {
      const body: Record<string, string> = { status };
      if (note !== undefined) body.resolutionNote = note;
      return apiRequest("PATCH", `/api/iletisim/tickets/${ticket?.id}`, body);
    },
    onSuccess: () => {
      setShowResolveDialog(false);
      setResolutionNote('');
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets'] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/dashboard'] });
      toast({ title: "Talep çözüldü", description: "Talep başarıyla çözüldü olarak işaretlendi" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/iletisim/tickets/${ticket?.id}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Yükleme başarısız');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dosya yüklendi", description: "Dosya başarıyla eklendi" });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id, 'attachments'] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Dosya yüklenemedi", variant: "destructive" });
    },
  });

  const { data: attachments = [] } = useQuery<TicketAttachment[]>({
    queryKey: ['/api/iletisim/tickets', ticket?.id, 'attachments'],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/tickets/${ticket?.id}/attachments`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ticket?.id,
  });

  const { data: slaRemaining } = useQuery<SlaRemainingData>({
    queryKey: ['/api/iletisim/tickets', ticket?.id, 'sla-remaining'],
    enabled: !!ticket?.id && !!ticket?.sla_deadline && !isClosed,
    refetchInterval: 60000,
  });

  const { data: equipmentInfo } = useQuery<EquipmentInfo>({
    queryKey: ['/api/equipment', ticket?.related_equipment_id],
    queryFn: async () => {
      const res = await fetch(`/api/equipment/${ticket?.related_equipment_id}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!ticket?.related_equipment_id,
  });

  const { data: assignableUsers = [] } = useQuery<{ id: string; name: string; role: string }[]>({
    queryKey: ['/api/iletisim/assignable-users', ticket?.department],
    queryFn: async () => {
      const res = await fetch(`/api/iletisim/assignable-users?department=${ticket?.department}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ticket?.department && isHQ && showAssignDropdown,
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToUserId: string) => {
      return apiRequest("PATCH", `/api/iletisim/tickets/${ticket?.id}/assign`, { assignedToUserId });
    },
    onSuccess: () => {
      toast({ title: "Atandı", description: "Ticket başarıyla atandı" });
      setShowAssignDropdown(false);
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets'] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Atama başarısız", variant: "destructive" });
    },
  });

  const slaRemindMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/iletisim/tickets/${ticket?.id}/sla-remind`, {});
    },
    onSuccess: () => {
      toast({ title: "Gönderildi", description: "SLA hatırlatması gönderildi" });
      qc.invalidateQueries({ queryKey: ['/api/iletisim/tickets', ticket?.id] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Hatırlatma gönderilemedi", variant: "destructive" });
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
        <TicketIcon className="w-12 h-12 opacity-30" />
        <div className="text-sm font-medium">Bir talep seçin</div>
        <div className="text-xs">Görüntülemek için soldan talep seçin</div>
      </div>
    );
  }

  const getSlaInfo = () => {
    if (!ticket.sla_deadline) return { label: '—', percent: 0, color: '#22c55e' };
    if (ticket.sla_breached) return { label: 'SLA Asildi', percent: 100, color: '#ef4444' };

    if (slaRemaining) {
      if (slaRemaining.breached || slaRemaining.remainingHours === 0) {
        return { label: 'SLA Asildi', percent: 100, color: '#ef4444' };
      }
      const h = slaRemaining.remainingHours ?? 0;
      if (h < 1) return { label: `${Math.floor(h * 60)} dk is saati`, percent: 85, color: '#ef4444' };
      if (h < 4) return { label: `${Number(h ?? 0).toFixed(1)} is saati`, percent: 60, color: '#f59e0b' };
      return { label: `${Number(h ?? 0).toFixed(0)} is saati`, percent: 30, color: '#22c55e' };
    }

    const hoursLeft = (new Date(ticket.sla_deadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) return { label: 'SLA Asildi', percent: 100, color: '#ef4444' };
    if (hoursLeft < 1) return { label: `${Math.floor(hoursLeft * 60)} dk kaldi`, percent: 85, color: '#ef4444' };
    if (hoursLeft < 4) return { label: `${Number(hoursLeft ?? 0).toFixed(1)} saat`, percent: 60, color: '#f59e0b' };
    return { label: `${Number(hoursLeft ?? 0).toFixed(0)} saat`, percent: 30, color: '#22c55e' };
  };

  const sla = getSlaInfo();
  const dept = getDeptConfig(ticket.department);
  const statusLabel = getStatusConfig(ticket.status)?.label ?? ticket.status;

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-card transition-all',
        isFullscreen ? 'fixed inset-0 z-50 md:left-[52px]' : 'flex-1'
      )}
      data-testid="ticket-chat-panel"
    >
      <div className="flex items-start justify-between px-4 py-3 border-b border-border flex-shrink-0 gap-2">
        <div className="flex-1 min-w-0 mr-3">
          {onClose && (
            <button onClick={onClose} className="md:hidden mr-2 text-muted-foreground" data-testid="button-chat-back">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-[#cc1f1f]" data-testid="text-chat-ticket-number">{ticket.ticket_number}</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {dept?.label?.split(' ')[0] ?? ticket.department}
            </span>
            <span className={cn(
              'text-xs font-semibold px-1.5 py-0.5 rounded',
              isClosed
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            )}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm font-bold text-foreground truncate" data-testid="text-chat-ticket-title">{ticket.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ticket.branch_name ?? '—'} · {ticket.created_by_name ?? '—'} · Atanan: {ticket.assigned_to_name ?? 'Atanmadı'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="hidden md:block text-right mr-1">
            <div className="text-xs font-semibold" style={{ color: sla.color }}>
              SLA: {sla.label}
            </div>
            <div className="w-16 h-1.5 rounded-full bg-muted mt-0.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${sla.percent}%`, background: sla.color }} />
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors"
            title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
            data-testid="button-fullscreen-toggle"
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4 text-muted-foreground" />
              : <Maximize2 className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {isHQ && !isClosed && (
            <button
              onClick={() => setShowResolveDialog(true)}
              disabled={statusMutation.isPending}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              data-testid="button-resolve-ticket"
            >
              Çöz
            </button>
          )}
        </div>
      </div>

      {isClosed && ticket.resolved_by_name && (
        <div className="px-4 py-2 border-b border-border bg-green-50 dark:bg-green-950/30 flex items-center gap-2 flex-shrink-0" data-testid="resolved-by-info">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300">
            <span className="font-semibold">Çözen:</span> {ticket.resolved_by_name}
            {ticket.resolved_at && (
              <span className="text-green-600/70 dark:text-green-400/70"> · {formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true, locale: tr })}</span>
            )}
          </span>
        </div>
      )}

      {(equipmentInfo || (attachments.length > 0)) && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex-shrink-0 space-y-2" data-testid="ticket-extras">
          {equipmentInfo && (
            <div className="flex items-center gap-2" data-testid="equipment-info">
              <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-semibold text-foreground">
                {equipmentInfo.name}
                {equipmentInfo.brand ? ` (${equipmentInfo.brand})` : ''}
                {equipmentInfo.model ? ` - ${equipmentInfo.model}` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {equipmentInfo.equipmentType || equipmentInfo.equipment_type || ''}
              </span>
            </div>
          )}
          {attachments.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">{attachments.length} Ek</div>
              <div className="flex gap-2 flex-wrap">
                {attachments.map((a) => {
                  const fname = a.fileName || a.file_name || 'dosya';
                  const fmime = a.mimeType || a.mime_type || '';
                  const fkey = a.storageKey || a.storage_key || '';
                  const fsize = a.fileSize || a.file_size || 0;
                  const isImage = fmime.startsWith('image/');
                  return isImage ? (
                    <a
                      key={a.id}
                      href={`/api/iletisim/attachments/${fkey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`attachment-thumb-${a.id}`}
                    >
                      <img
                        src={`/api/iletisim/attachments/${fkey}`}
                        className="w-16 h-16 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                        alt={fname}
                      />
                    </a>
                  ) : (
                    <a
                      key={a.id}
                      href={`/api/iletisim/attachments/${fkey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted border border-border hover:bg-accent transition-colors"
                      data-testid={`attachment-file-${a.id}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[100px]">{fname}</span>
                      <span className="text-muted-foreground flex-shrink-0">{formatFileSize(fsize)}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex border-b border-border px-4 flex-shrink-0 bg-card" data-testid="chat-history-tabs">
        <button
          onClick={() => setChatTab('chat')}
          className={cn(
            'text-sm font-semibold py-2.5 px-3 border-b-2 transition-colors',
            chatTab === 'chat'
              ? 'border-[#122549] text-foreground dark:border-white'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          data-testid="tab-chat"
        >
          Sohbet
        </button>
        <button
          onClick={() => setChatTab('history')}
          className={cn(
            'text-sm font-semibold py-2.5 px-3 border-b-2 transition-colors',
            chatTab === 'history'
              ? 'border-[#122549] text-foreground dark:border-white'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          data-testid="tab-history"
        >
          Gecmis
        </button>
      </div>

      {chatTab === 'history' ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-muted/20" data-testid="ticket-history">
          {(ticket.comments ?? []).filter((c: TicketComment) => c.is_internal).length > 0 ? (
            (ticket.comments ?? [])
              .filter((c: TicketComment) => c.is_internal)
              .map((c: TicketComment) => (
                <div key={c.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0" data-testid={`history-item-${c.id}`}>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-foreground">{c.content}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(c.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-no-history">
              Henuz gecmis kaydi yok
            </div>
          )}
        </div>
      ) : (

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-muted/20" data-testid="chat-messages">
        <div className="flex justify-center">
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            Talep açıldı · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: tr })}
          </span>
        </div>

        {ticket.description && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-3.5 bg-blue-600">
              {(ticket.created_by_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{ticket.created_by_name ?? 'Şube'} · Açılış</div>
              <div className="px-3 py-2.5 rounded-xl text-sm leading-relaxed bg-card border border-border text-foreground rounded-tl-sm">
                {ticket.description}
              </div>
            </div>
          </div>
        )}

        {(ticket.comments ?? []).map((c) => {
          if (c.comment_type === 'cowork') {
            if (!isHQ) return null;
            return (
              <div key={c.id} className="flex gap-2.5" data-testid={`comment-cowork-${c.id}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-3.5 bg-indigo-600">
                  {(c.author_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {c.author_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                  </div>
                  <div className="px-3 py-2.5 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30 text-xs text-indigo-800 dark:text-indigo-200">
                    <div className="text-xs font-bold uppercase tracking-wide opacity-60 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      COWORK
                    </div>
                    {c.content}
                  </div>
                </div>
              </div>
            );
          }

          if (c.is_internal || c.comment_type === 'internal') {
            if (!isHQ) return null;
            return (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-3.5 bg-purple-600">
                  {(c.author_name || 'H').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {c.author_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                  </div>
                  <div className="px-3 py-2.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200">
                    <div className="text-xs font-bold uppercase tracking-wide opacity-60 mb-1">Dahili Not</div>
                    {c.content}
                  </div>
                </div>
              </div>
            );
          }

          const isFromHQ = isHQRole(user?.role ?? '') && c.author_name !== ticket.created_by_name;
          return (
            <div key={c.id} className={cn('flex gap-2.5', isFromHQ && 'flex-row-reverse')}>
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-3.5',
                  isFromHQ ? 'bg-[#122549]' : 'bg-blue-600'
                )}
              >
                {(c.author_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className={cn('max-w-[75%]', isFromHQ && 'items-end flex flex-col')}>
                <div className={cn('text-xs text-muted-foreground mb-1', isFromHQ && 'text-right')}>
                  {c.author_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                </div>
                <div className={cn(
                  'px-3 py-2.5 rounded-xl text-sm leading-relaxed',
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

        {attachments.length > 0 && (
          <div className="space-y-2" data-testid="attachment-list">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ekler ({attachments.length})</div>
            {attachments.map((a) => {
              const fname = a.fileName || a.file_name || 'dosya';
              const fsize = a.fileSize || a.file_size || 0;
              const fmime = a.mimeType || a.mime_type || '';
              const fkey = a.storageKey || a.storage_key || '';
              return (
                <a
                  key={a.id}
                  href={`/api/iletisim/attachments/${fkey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs hover-elevate"
                  data-testid={`attachment-${a.id}`}
                >
                  {getAttachmentIcon(fmime)}
                  <span className="truncate flex-1">{fname}</span>
                  <span className="text-muted-foreground flex-shrink-0">{formatFileSize(fsize)}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
      )}

      {isClosed ? (
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex-1">
              <div className="text-xs font-semibold text-green-700 dark:text-green-300">Bu ticket kapatıldı</div>
              <div className="text-xs text-green-600 dark:text-green-400">Yeni sorun için ayrı ticket açın.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
          {isHQ && (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <button
                onClick={() => setInputMode('reply')}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
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
                  'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                  inputMode === 'internal'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
                data-testid="button-internal-mode"
              >
                Dahili Not
              </button>
              <button
                onClick={() => setInputMode('cowork')}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1',
                  inputMode === 'cowork'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
                data-testid="button-cowork-mode"
              >
                <Users className="w-3 h-3" />
                Cowork
              </button>
              {coworkMembers.length > 0 && (
                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{coworkMembers.length} cowork üyesi</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                inputMode === 'cowork'
                  ? 'Cowork mesajı yaz — sadece cowork üyeleri görebilir...'
                  : inputMode === 'internal'
                    ? 'Dahili not ekle — sadece HQ görebilir...'
                    : 'Şubeye yanıt yaz...'
              }
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm resize-none outline-none border',
                'bg-muted/50 border-border text-foreground placeholder:text-muted-foreground',
                'min-h-[40px] max-h-[100px]',
                inputMode === 'internal' && 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20',
                inputMode === 'cowork' && 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/20'
              )}
              rows={1}
              data-testid="input-chat-message"
            />
            <button
              onClick={() => message.trim() && commentMutation.mutate()}
              disabled={!message.trim() || commentMutation.isPending}
              className="w-9 h-9 rounded-lg bg-[#122549] flex items-center justify-center flex-shrink-0 hover:bg-[#0e1e3a] transition-colors disabled:opacity-50"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
            {isHQ && !isClosed && (
              <button
                onClick={() => setShowResolveDialog(true)}
                disabled={statusMutation.isPending}
                className="text-xs font-semibold px-2.5 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300 flex-shrink-0 hover:bg-green-100 transition-colors"
                data-testid="button-resolve-and-close"
              >
                Çöz & Kapat
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              data-testid="button-attach-file"
            >
              {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              {uploadMutation.isPending ? 'Yükleniyor...' : 'Dosya Ekle'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.mp4,.mov,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = '';
              }}
              data-testid="input-file-upload"
            />
            {isHQ && (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    disabled={assignMutation.isPending}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    data-testid="button-add-person"
                  >
                    {assignMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Ata
                  </button>
                  {showAssignDropdown && (
                    <div className="absolute left-0 bottom-full mb-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[200px] py-1 max-h-[200px] overflow-y-auto" data-testid="assign-dropdown">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border flex items-center justify-between gap-2">
                        <span>Kullanıcı Ata</span>
                        <button onClick={() => setShowAssignDropdown(false)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      {assignableUsers.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Yükleniyor...</div>
                      )}
                      {assignableUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => assignMutation.mutate(u.id)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2"
                          data-testid={`assign-user-${u.id}`}
                        >
                          <span className="truncate">{u.name}</span>
                          <span className="text-muted-foreground text-xs flex-shrink-0">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => slaRemindMutation.mutate()}
                  disabled={slaRemindMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  data-testid="button-sla-remind"
                >
                  {slaRemindMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  SLA Hatırlat
                </button>
                {isHQ && (
                <div className="relative">
                  <button
                    onClick={() => setShowCoworkInvite(!showCoworkInvite)}
                    disabled={coworkInviteMutation.isPending}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50"
                    data-testid="button-cowork-invite"
                  >
                    {coworkInviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                    Cowork Davet
                  </button>
                  {showCoworkInvite && (
                    <div className="absolute left-0 bottom-full mb-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[220px] py-1 max-h-[250px] overflow-y-auto" data-testid="cowork-invite-dropdown">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border flex items-center justify-between gap-2">
                        <span>Cowork Davet Et</span>
                        <button onClick={() => setShowCoworkInvite(false)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      {coworkMembers.length > 0 && (
                        <div className="px-3 py-1.5 border-b border-border">
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Mevcut Üyeler</div>
                          {coworkMembers.map((m) => (
                            <div key={m.user_id} className="text-xs text-muted-foreground py-0.5 flex items-center gap-1" data-testid={`cowork-member-${m.user_id}`}>
                              <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                                {(m.user_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{m.user_name}</span>
                              <span className="text-muted-foreground flex-shrink-0">({m.user_role})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {hqUsers.length === 0 && showCoworkInvite && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Yükleniyor...</div>
                      )}
                      {hqUsers.length > 0 && hqUsers.filter(u => u.id !== user?.id && !coworkMembers.some(m => m.user_id === u.id)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Davet edilecek kullanıcı kalmadı</div>
                      )}
                      {hqUsers
                        .filter(u => u.id !== user?.id && !coworkMembers.some(m => m.user_id === u.id))
                        .map((u) => (
                          <button
                            key={u.id}
                            onClick={() => coworkInviteMutation.mutate(u.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2"
                            data-testid={`cowork-invite-user-${u.id}`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-muted-foreground text-xs flex-shrink-0">{u.role}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent data-testid="resolve-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Talebi Çöz</AlertDialogTitle>
            <AlertDialogDescription>
              Bu talebi çözüldü olarak işaretlemek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Çözüm Notu (opsiyonel)</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Çözüm detaylarını yazın..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground min-h-[60px] max-h-[120px] outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              data-testid="input-resolution-note"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-resolve-cancel">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusMutation.mutate({ status: 'cozuldu', resolutionNote: resolutionNote.trim() || undefined })}
              disabled={statusMutation.isPending}
              className="bg-green-600 text-white hover:bg-green-700"
              data-testid="button-resolve-confirm"
            >
              {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Onayla ve Çöz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}
