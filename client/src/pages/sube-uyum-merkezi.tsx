import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ChevronRight, RefreshCw, Users, ClipboardCheck, Clock, BookOpen, Wrench, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DIM_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  attendance:  { label: "Devam",        icon: Users,          color: "#22c55e" },
  checklist:   { label: "Checklist",    icon: ClipboardCheck, color: "#3b82f6" },
  customer:    { label: "Müşteri",      icon: TrendingUp,     color: "#f59e0b" },
  training:    { label: "Eğitim",       icon: BookOpen,       color: "#8b5cf6" },
  equipment:   { label: "Ekipman",      icon: Wrench,         color: "#06b6d4" },
  shift:       { label: "Vardiya",      icon: Calendar,       color: "#ec4899" },
};

function statusColor(score: number) {
  if (score >= 80) return { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#4ade80" };
  if (score >= 60) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#fbbf24" };
  return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171" };
}

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const { text } = statusColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*0.08} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={text} strokeWidth={size*0.08}
        strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={text} fontSize={size*0.22} fontWeight={700}>{score}</text>
    </svg>
  );
}

function DimBar({ name, score }: { name: string; score: number }) {
  const meta = DIM_META[name] || { label: name, icon: TrendingUp, color: "#6b7280" };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} color={meta.color} style={{ flexShrink: 0 }} />
      <span className="text-[10px] text-muted-foreground w-14 truncate">{meta.label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: meta.color, opacity: 0.8 }} />
      </div>
      <span className="text-[10px] font-medium w-5 text-right" style={{ color: meta.color }}>{score}</span>
    </div>
  );
}

export default function SubeUyumMerkezi() {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  const { data: healthData, isLoading, refetch, dataUpdatedAt } = useQuery<any>({
    queryKey: ["/api/agent/branch-health"],
    queryFn: async () => {
      const res = await fetch("/api/agent/branch-health", { credentials: "include" });
      if (!res.ok) return { branches: [] };
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });

  const { data: selectedDetail } = useQuery<any>({
    queryKey: ["/api/agent/branch-health", selectedBranch?.branchId],
    queryFn: async () => {
      const res = await fetch(`/api/agent/branch-health/${selectedBranch.branchId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedBranch?.branchId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: teamStatus } = useQuery<any>({
    queryKey: ["/api/branches", selectedBranch?.branchId, "team-status"],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${selectedBranch.branchId}/kiosk/team-status`, { credentials: "include" });
      if (!res.ok) return { team: [] };
      return res.json();
    },
    enabled: !!selectedBranch?.branchId,
    refetchInterval: 30000,
  });

  const branches: any[] = healthData?.branches || [];
  const sorted = [...branches].sort((a, b) =>
    sortBy === "score" ? a.overallScore - b.overallScore : (a.branchName || "").localeCompare(b.branchName || "")
  );

  const avgScore = branches.length > 0
    ? Math.round(branches.reduce((s, b) => s + b.overallScore, 0) / branches.length)
    : 0;
  const criticalCount = branches.filter(b => b.overallScore < 60).length;
  const warningCount = branches.filter(b => b.overallScore >= 60 && b.overallScore < 80).length;
  const healthyCount = branches.filter(b => b.overallScore >= 80).length;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sol: Şube listesi */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-base">Şube Uyum Merkezi</h1>
            <button onClick={() => refetch()} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
          </div>
          {/* Özet sayaçlar */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Sağlıklı", count: healthyCount, color: "#22c55e" },
              { label: "Uyarı", count: warningCount, color: "#f59e0b" },
              { label: "Kritik", count: criticalCount, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} className="text-center rounded-lg p-2" style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Ortalama skor */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg border">
            <ScoreRing score={avgScore} size={44} />
            <div>
              <p className="text-xs text-muted-foreground">Genel Ortalama</p>
              <p className="text-sm font-semibold">{branches.length} şube</p>
            </div>
          </div>
          {/* Sort */}
          <div className="flex gap-1.5 mt-3">
            <button onClick={() => setSortBy("score")} className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${sortBy === "score" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              Skora göre
            </button>
            <button onClick={() => setSortBy("name")} className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${sortBy === "name" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              İsme göre
            </button>
          </div>
        </div>

        {/* Branch listesi */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center mt-8">Yükleniyor...</div>
          ) : sorted.map(branch => {
            const { bg, border, text } = statusColor(branch.overallScore);
            const isSelected = selectedBranch?.branchId === branch.branchId;
            return (
              <button key={branch.branchId} onClick={() => setSelectedBranch(branch)}
                className="w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors"
                style={{ background: isSelected ? "rgba(192,57,43,0.08)" : undefined, borderLeft: isSelected ? "3px solid #c0392b" : "3px solid transparent" }}>
                <div className="flex items-center gap-3">
                  <ScoreRing score={branch.overallScore} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{branch.branchName || `Şube #${branch.branchId}`}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {branch.dimensions?.slice(0, 3).map((d: any) => (
                        <span key={d.name} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${DIM_META[d.name]?.color || "#6b7280"}18`, color: DIM_META[d.name]?.color || "#6b7280" }}>
                          {DIM_META[d.name]?.label || d.name} {d.score}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sağ: Detay paneli */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedBranch ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <TrendingUp size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sol taraftan bir şube seçin</p>
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl">
            {/* Branch header */}
            <div className="flex items-center gap-4">
              <ScoreRing score={selectedBranch.overallScore} size={64} />
              <div>
                <h2 className="text-xl font-bold">{selectedBranch.branchName || `Şube #${selectedBranch.branchId}`}</h2>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs" style={{ color: statusColor(selectedBranch.overallScore).text, borderColor: statusColor(selectedBranch.overallScore).border }}>
                    {selectedBranch.overallScore >= 80 ? "Sağlıklı" : selectedBranch.overallScore >= 60 ? "Uyarı" : "Kritik"}
                  </Badge>
                  {dataUpdatedAt && (
                    <span className="text-[11px] text-muted-foreground">Son: {new Date(dataUpdatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 6 Boyut grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(selectedDetail?.dimensions || selectedBranch.dimensions || []).map((dim: any) => {
                const meta = DIM_META[dim.name] || { label: dim.name, icon: TrendingUp, color: "#6b7280" };
                const Icon = meta.icon;
                const { bg, border, text } = statusColor(dim.score);
                return (
                  <div key={dim.name} className="rounded-xl border p-4" style={{ background: bg, borderColor: border }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: meta.color }} />
                      <span className="text-xs font-semibold text-foreground">{dim.nameTr || meta.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-bold" style={{ color: text }}>{dim.score}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground">ağırlık</span>
                        <p className="text-xs font-medium">{Math.round(dim.weight * 100)}%</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: meta.color, opacity: 0.8 }} />
                    </div>
                    {dim.dataPoints !== undefined && (
                      <p className="text-[10px] text-muted-foreground mt-1">{dim.dataPoints} veri noktası</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Canlı personel durumu */}
            {teamStatus?.team && teamStatus.team.length > 0 && (
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Canlı Personel Durumu
                  <span className="text-xs text-muted-foreground ml-auto">{teamStatus.team.filter((m: any) => m.status === "active").length} aktif</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {teamStatus.team.map((member: any) => {
                    const statusColors: Record<string, string> = { active: "#22c55e", on_break: "#f59e0b", late: "#ef4444", missing: "#ef4444", scheduled: "#3b82f6" };
                    const col = statusColors[member.status] || "#6b7280";
                    return (
                      <div key={member.userId} className="flex items-center gap-2 p-2 rounded-lg border text-xs" style={{ borderColor: `${col}30`, background: `${col}08` }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                        <span className="font-medium truncate">{member.firstName} {member.lastName}</span>
                        <span className="ml-auto text-muted-foreground whitespace-nowrap">
                          {member.status === "active" ? "✓" : member.status === "on_break" ? "☕" : member.status === "late" ? "⏰" : member.status === "missing" ? "✗" : "→"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patterns / Uyarılar */}
            {selectedDetail?.patterns && selectedDetail.patterns.length > 0 && (
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Tespit Edilen Örüntüler
                </h3>
                <div className="space-y-2">
                  {selectedDetail.patterns.map((p: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border text-xs" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)" }}>
                      <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{p.message || p.description || JSON.stringify(p)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
