import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Users, Building2, User, Globe, ChevronRight, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type TargetMode = "branches" | "role_filter" | "specific_users" | "all_branches";
type SourceType = "hq_manual" | "dobody" | "periodic";

const ROLES = [
  { value: "supervisor", label: "Supervisor" },
  { value: "mudur", label: "Müdür" },
  { value: "barista", label: "Barista" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "stajyer", label: "Stajyer" },
  { value: "all", label: "Tüm Personel" },
];

const SOURCE_LABELS: Record<SourceType, { label: string; color: string; bg: string }> = {
  hq_manual: { label: "HQ Manuel",  color: "#93c5fd", bg: "rgba(59,130,246,0.1)" },
  dobody:     { label: "Dobody",     color: "#a5a0f0", bg: "rgba(127,119,221,0.1)" },
  periodic:   { label: "Periyodik",  color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
};

export default function TaskAtama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sourceType, setSourceType] = useState<SourceType>("hq_manual");
  const [targetMode, setTargetMode] = useState<TargetMode>("branches");
  const [selectedBranches, setSelectedBranches] = useState<{id: number; name: string}[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["supervisor"]);
  const [selectedUsers, setSelectedUsers] = useState<{id: number; name: string}[]>([]);
  const [requiresPhoto, setRequiresPhoto] = useState(false);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks/bulk-assign", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Görev başarıyla gönderildi" });
      navigate("/task-takip");
    },
    onError: () => toast({ title: "Görev gönderilemedi", variant: "destructive" }),
  });

  // Tahmini alıcı sayısı
  const estimatedRecipients = (() => {
    if (targetMode === "all_branches") return (branches as any[]).length * 2;
    if (targetMode === "branches") return selectedBranches.length * selectedRoles.length;
    if (targetMode === "specific_users") return selectedUsers.length;
    return 0;
  })();

  const canSubmit = title.trim() && (
    (targetMode === "branches" && selectedBranches.length > 0) ||
    (targetMode === "specific_users" && selectedUsers.length > 0) ||
    targetMode === "all_branches" ||
    targetMode === "role_filter"
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate({
      title, description, dueDate, priority, sourceType, requiresPhoto,
      targetMode,
      targetBranchIds: selectedBranches.map(b => b.id),
      targetRoles: selectedRoles,
      targetUserIds: selectedUsers.map(u => u.id),
    });
  };

  const removeChip = (id: number, type: "branch" | "user") => {
    if (type === "branch") setSelectedBranches(p => p.filter(b => b.id !== id));
    else setSelectedUsers(p => p.filter(u => u.id !== id));
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Yeni Görev Oluştur</h1>
          <p className="text-sm text-muted-foreground mt-0.5">HQ → Şube / Rol / Kişi toplu atama</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted/40">
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || createMutation.isPending}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? "Gönderiliyor..." : `Gönder (${estimatedRecipients} kişi)`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sol: Görev Detayı */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Görev Detayı</h2>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Başlık *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                placeholder="Görev başlığını girin..." />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none h-20"
                placeholder="Görevin detayları..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Son Tarih</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Öncelik</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="low">Düşük</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kaynak</label>
              <div className="flex gap-2">
                {(Object.entries(SOURCE_LABELS) as [SourceType, any][]).map(([key, meta]) => (
                  <button key={key} onClick={() => setSourceType(key)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: sourceType === key ? meta.bg : undefined,
                      color: sourceType === key ? meta.color : undefined,
                      border: `0.5px solid ${sourceType === key ? meta.color : 'var(--border)'}`,
                    }}>
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={requiresPhoto} onChange={e => setRequiresPhoto(e.target.checked)}
                className="rounded" />
              <span className="text-sm">Tamamlama fotoğrafı zorunlu</span>
            </label>
          </div>
        </div>

        {/* Sağ: Hedef */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Hedef Seçimi</h2>

            {/* Mod seçimi */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: "branches", icon: Building2, label: "Şubeler", sub: "Seçilen şubeler" },
                { mode: "role_filter", icon: Users, label: "Rol Filtresi", sub: "Rol bazlı" },
                { mode: "specific_users", icon: User, label: "Kişiler", sub: "İsim bazlı" },
                { mode: "all_branches", icon: Globe, label: "Tüm Şubeler", sub: "Franchise geneli" },
              ] as const).map(({ mode, icon: Icon, label, sub }) => (
                <button key={mode} onClick={() => setTargetMode(mode as TargetMode)}
                  className="flex items-start gap-2 p-3 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: targetMode === mode ? '#c0392b' : undefined,
                    background: targetMode === mode ? 'rgba(192,57,43,0.04)' : undefined,
                  }}>
                  <Icon size={14} className="mt-0.5 flex-shrink-0"
                    style={{ color: targetMode === mode ? '#c0392b' : undefined }} />
                  <div>
                    <div className="text-xs font-medium">{label}</div>
                    <div className="text-[10px] text-muted-foreground">{sub}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Şube seçimi */}
            {(targetMode === "branches" || targetMode === "role_filter") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {targetMode === "role_filter" ? "Şube (boş bırakırsan tümü)" : "Şube *"}
                </label>
                <Select onValueChange={v => {
                  const b = (branches as any[]).find((br: any) => String(br.id) === v);
                  if (b && !selectedBranches.find(sb => sb.id === b.id))
                    setSelectedBranches(p => [...p, { id: b.id, name: b.name }]);
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Şube ekle..." /></SelectTrigger>
                  <SelectContent>
                    {(branches as any[]).map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBranches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedBranches.map(b => (
                      <span key={b.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd" }}>
                        {b.name}
                        <button onClick={() => removeChip(b.id, "branch")}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rol filtresi */}
            {(targetMode === "role_filter" || targetMode === "branches") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rol Filtresi</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => setSelectedRoles(p =>
                      p.includes(r.value) ? p.filter(x => x !== r.value) : [...p, r.value]
                    )}
                      className="px-2 py-0.5 rounded-full text-xs transition-all"
                      style={{
                        background: selectedRoles.includes(r.value) ? "rgba(34,197,94,0.12)" : undefined,
                        color: selectedRoles.includes(r.value) ? "#22c55e" : undefined,
                        border: `0.5px solid ${selectedRoles.includes(r.value) ? "#22c55e" : "var(--border)"}`,
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kişi seçimi */}
            {targetMode === "specific_users" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Kişiler *</label>
                <Select onValueChange={v => {
                  const u = (users as any[]).find((usr: any) => String(usr.id) === v);
                  if (u && !selectedUsers.find(su => su.id === u.id))
                    setSelectedUsers(p => [...p, { id: u.id, name: u.name || u.username }]);
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kişi ekle..." /></SelectTrigger>
                  <SelectContent>
                    {(users as any[]).slice(0, 50).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name || u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedUsers.map(u => (
                      <span key={u.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: "rgba(127,119,221,0.1)", color: "#a5a0f0" }}>
                        {u.name}
                        <button onClick={() => removeChip(u.id, "user")}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Özet */}
            <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: "var(--muted)" }}>
              <div className="font-medium mb-1">Gönderim Özeti</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hedef mod</span>
                <span className="font-medium">
                  {targetMode === "branches" ? "Şube bazlı" :
                   targetMode === "role_filter" ? "Rol filtreli" :
                   targetMode === "specific_users" ? "Kişi bazlı" : "Tüm franchise"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kaynak</span>
                <span className="font-medium" style={{ color: SOURCE_LABELS[sourceType].color }}>
                  {SOURCE_LABELS[sourceType].label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tahmini alıcı</span>
                <span className="font-medium" style={{ color: estimatedRecipients > 0 ? "#22c55e" : undefined }}>
                  ~{estimatedRecipients} kişi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
