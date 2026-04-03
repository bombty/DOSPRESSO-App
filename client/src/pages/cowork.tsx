import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Hash, Lock, Users, CheckSquare, ChevronRight, X } from "lucide-react";

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || "?";
  return (
    <div className="rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
      style={{ width: 28, height: 28, background: color, color: '#fff' }}>{initials}</div>
  );
}

const COLORS = ['#ef4444','#7F77DD','#1D9E75','#378ADD','#BA7517','#D85A30'];
const userColor = (id: string) => COLORS[id?.charCodeAt(0) % COLORS.length] || '#888';

export default function Cowork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat'|'tasks'|'members'|'timeline'|'files'>('chat');
  const [message, setMessage] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHQ = user?.role && ['ceo','cgo','coach','trainer','admin','muhasebe','ik','marketing','satinalma','teknik'].includes(user.role);

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ["/api/cowork/channels"],
    queryFn: async () => {
      const res = await fetch("/api/cowork/channels", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<any[]>({
    queryKey: ["/api/cowork/messages", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return [];
      const res = await fetch(`/api/cowork/channels/${selectedChannel.id}/messages?limit=50`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChannel?.id,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const { data: channelTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/cowork/tasks", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return [];
      const res = await fetch(`/api/cowork/channels/${selectedChannel.id}/tasks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChannel?.id,
    refetchInterval: 15000,
  });

  const { data: channelMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/cowork/members", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return [];
      const res = await fetch(`/api/cowork/channels/${selectedChannel.id}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChannel?.id,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/cowork/channels/${selectedChannel.id}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cowork/messages", selectedChannel?.id] });
      setMessage("");
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cowork/channels", data),
    onSuccess: (newCh: any) => {
      qc.invalidateQueries({ queryKey: ["/api/cowork/channels"] });
      setShowNewChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setSelectedChannel(newCh);
      toast({ title: "Kanal oluşturuldu" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) => apiRequest("POST", `/api/cowork/channels/${selectedChannel.id}/tasks`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cowork/tasks", selectedChannel?.id] });
      setNewTaskTitle("");
      toast({ title: "Task eklendi" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      apiRequest("PATCH", `/api/cowork/tasks/${taskId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/cowork/tasks", selectedChannel?.id] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sol: Kanal listesi */}
      <div className="w-56 flex-shrink-0 bg-background border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">Cowork</span>
          {isHQ && (
            <button onClick={() => setShowNewChannel(true)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground">
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Yeni kanal formu */}
        {showNewChannel && (
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
              placeholder="Kanal adı..." className="w-full text-xs border rounded px-2 py-1.5 bg-background outline-none" />
            <input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
              placeholder="Açıklama..." className="w-full text-xs border rounded px-2 py-1.5 bg-background outline-none" />
            <div className="flex gap-1">
              <button onClick={() => createChannelMutation.mutate({ name: newChannelName, description: newChannelDesc })}
                disabled={!newChannelName.trim()} className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">Oluştur</button>
              <button onClick={() => setShowNewChannel(false)} className="px-2 text-xs py-1 rounded border"><X size={12} /></button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground opacity-50">Kanallar</div>
          {channels.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              {isHQ ? "+ ile kanal oluştur" : "Henüz kanal yok"}
            </div>
          ) : channels.map((ch: any) => (
            <button key={ch.id} onClick={() => { setSelectedChannel(ch); setActiveTab('chat'); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${selectedChannel?.id === ch.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>
              {ch.isPrivate ? <Lock size={12} /> : <Hash size={12} />}
              <span className="flex-1 truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ana alan */}
      {!selectedChannel ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Hash size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Bir kanal seç veya oluştur</p>
            {isHQ && <p className="text-xs mt-1 opacity-60">Sol üstteki + ile yeni kanal aç</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Kanal header */}
          <div className="border-b px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
            <Hash size={14} className="text-muted-foreground" />
            <div>
              <div className="font-semibold text-sm">{selectedChannel.name}</div>
              {selectedChannel.description && (
                <div className="text-xs text-muted-foreground">{selectedChannel.description}</div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1">
              {(['chat','tasks','members','timeline','files'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3 py-1 rounded-md ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {tab === 'chat' ? 'Sohbet' : tab === 'tasks' ? `Tasks ${channelTasks.length > 0 ? `(${channelTasks.filter((t:any) => t.status !== 'done').length})` : ''}` : tab === 'members' ? `Üyeler (${channelMembers.length})` : tab === 'timeline' ? 'Timeline' : 'Dosyalar'}
                </button>
              ))}
            </div>
          </div>

          {/* CHAT */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgsLoading ? (
                  <div className="text-xs text-muted-foreground text-center">Yükleniyor...</div>
                ) : messages.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center mt-8">Henüz mesaj yok. İlk mesajı sen gönder!</div>
                ) : messages.map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  const isDobody = msg.messageType === 'dobody';
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && <Avatar name={msg.senderName || "?"} color={isDobody ? '#7F77DD' : userColor(msg.senderId)} />}
                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMe && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.senderName || "Kullanıcı"}</span>
                            {msg.senderRole && <span className="text-[10px] text-muted-foreground">{msg.senderRole}</span>}
                          </div>
                        )}
                        <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                          isDobody ? 'bg-purple-500/10 border border-purple-500/20' :
                          isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                        }`}>
                          {isDobody && <span className="text-[10px] text-purple-400 block mb-1 font-medium">◈ Dobody</span>}
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isMe && <Avatar name={user?.firstName || "?"} color={userColor(user?.id || '')} />}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-3 flex-shrink-0">
                <div className="flex gap-2 items-center">
                  <input value={message} onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && message.trim()) { e.preventDefault(); sendMutation.mutate(message); }}}
                    placeholder={`#${selectedChannel.name} kanalına yaz...`}
                    className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background outline-none focus:border-primary" />
                  <button onClick={() => message.trim() && sendMutation.mutate(message)}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                    <Send size={14} />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setActiveTab('tasks'); }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <CheckSquare size={11} /> /task ekle
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex gap-2 mb-4">
                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle); }}
                  placeholder="Yeni task ekle..." className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background outline-none" />
                <button onClick={() => newTaskTitle.trim() && createTaskMutation.mutate(newTaskTitle)}
                  disabled={!newTaskTitle.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {channelTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Henüz task yok</p>
                ) : channelTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
                    <button onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: task.status === 'done' ? 'todo' : 'done' })}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                      {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    {task.assignedToName && <span className="text-xs text-muted-foreground">{task.assignedToName}</span>}
                    {task.dueDate && <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString('tr')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {activeTab === 'members' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {channelMembers.map((m: any) => (
                  <div key={m.userId} className="flex items-center gap-3 p-2">
                    <Avatar name={m.userName || "?"} color={userColor(m.userId)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{m.userName}</div>
                      <div className="text-xs text-muted-foreground">{m.userRole} · {m.branchName || 'HQ'}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.role}</span>
                  </div>
                ))}
              </div>
              {isHQ && (
                <button className="mt-4 w-full py-2 border-dashed border rounded-lg text-xs text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1">
                  <Users size={12} /> Üye Davet Et
                </button>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages.length === 0 && channelTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Bu kanalda henüz aktivite yok.</p>
                ) : (
                  [...messages.map((m: any) => ({ ...m, _type: 'message', _time: new Date(m.createdAt).getTime() })),
                   ...channelTasks.map((t: any) => ({ ...t, _type: 'task', _time: new Date(t.createdAt).getTime() })),
                  ].sort((a, b) => b._time - a._time).slice(0, 50).map((item: any, i: number) => (
                    <div key={`${item._type}-${item.id || i}`} className="flex items-start gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        item._type === 'task' ? 'bg-blue-500' : 
                        item.messageType === 'file' ? 'bg-purple-500' :
                        item.messageType === 'dobody' ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.senderName || item.assigneeName || '?'}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(item.createdAt).toLocaleDateString('tr-TR')} {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate">
                          {item._type === 'task' ? `📋 Görev: ${item.title} (${item.status})` :
                           item.messageType === 'file' ? `📎 Dosya paylaşıldı` :
                           item.messageType === 'dobody' ? `🤖 Dobody: ${item.content?.slice(0, 60)}` :
                           item.content?.slice(0, 80)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const fileMessages = messages.filter((m: any) => m.messageType === 'file' || (m.metadata && m.metadata.includes('file')));
                return fileMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Bu kanalda henüz dosya paylaşılmamış.</p>
                    <p className="text-xs text-muted-foreground mt-1">Sohbette dosya paylaştığınızda burada görünecek.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fileMessages.map((f: any) => {
                      let meta: any = {};
                      try { meta = JSON.parse(f.metadata || '{}'); } catch {}
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs">📄</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{meta.fileName || 'Dosya'}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {f.senderName} · {new Date(f.createdAt).toLocaleDateString('tr-TR')}
                              {meta.fileSize ? ` · ${Math.round(meta.fileSize / 1024)}KB` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
