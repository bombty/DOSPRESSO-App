import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Calendar, ClipboardCheck, Wrench, GraduationCap, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const DIM_META = {
  shift:     { label: "Vardiya", icon: Calendar,       color: "#ec4899" },
  checklist: { label: "Checklist", icon: ClipboardCheck, color: "#3b82f6" },
  fault:     { label: "Arıza",   icon: Wrench,          color: "#06b6d4" },
  training:  { label: "Eğitim",  icon: GraduationCap,   color: "#8b5cf6" },
};

function scoreColor(s: number) {
  if (s >= 80) return { bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.3)" };
  if (s >= 60) return { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" };
  return { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)" };
}

export default function CoachUyumPaneli() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState("week");

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<any>({
    queryKey: ["/api/agent/compliance-overview", period],
    queryFn: async () => {
      const res = await fetch(`/api/agent/compliance-overview?period=${period}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const branches: any[] = data?.branches || [];
  const summary = data?.summary;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Uyum Paneli</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tüm şubelerin vardiya, checklist, arıza ve eğitim uyum skorları
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => refetch()} className="p-1.5 rounded-md border hover:bg-muted/40 transition-colors">
            <RefreshCw size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Özet kartlar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Ortalama Skor", value: summary.avgScore, unit: "/100", color: scoreColor(summary.avgScore).text },
            { label: "Sağlıklı", value: summary.healthy, unit: " şube", color: "#4ade80" },
            { label: "Uyarı", value: summary.warning, unit: " şube", color: "#fbbf24" },
            { label: "Kritik", value: summary.critical, unit: " şube", color: "#f87171" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}<span className="text-sm font-normal text-muted-foreground">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Boyut başlıkları */}
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-[200px_1fr_1fr_1fr_1fr_80px] gap-0 border-b bg-muted/20 px-4 py-2.5">
          <div className="text-xs font-medium text-muted-foreground">Şube</div>
          {Object.values(DIM_META).map(d => (
            <div key={d.label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <d.icon size={12} style={{ color: d.color }} />
              {d.label}
            </div>
          ))}
          <div className="text-xs font-medium text-muted-foreground text-right">Genel</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Yükleniyor...</div>
        ) : branches.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Veri bulunamadı</div>
        ) : (
          branches.map((branch: any) => {
            const overall = scoreColor(branch.scores.overall);
            return (
              <div
                key={branch.branchId}
                className="grid grid-cols-[200px_1fr_1fr_1fr_1fr_80px] gap-0 border-b last:border-0 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => navigate("/sube-uyum-merkezi")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: overall.text }} />
                  <span className="text-sm font-medium truncate">{branch.branchName}</span>
                </div>
                {(["shift", "checklist", "fault", "training"] as const).map(dim => {
                  const s = branch.scores[dim];
                  const c = scoreColor(s);
                  return (
                    <div key={dim} className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px]">
                        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${s}%`, background: DIM_META[dim].color, opacity: 0.7 }} />
                        </div>
                      </div>
                      <span className="text-xs font-medium w-6 text-right" style={{ color: c.text }}>{s}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-end">
                  <span className="text-sm font-bold px-2 py-0.5 rounded-md" style={{ background: overall.bg, color: overall.text, border: `1px solid ${overall.border}` }}>
                    {branch.scores.overall}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trend notu */}
      {dataUpdatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Son güncelleme: {new Date(dataUpdatedAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          {" · "}
          <button className="underline hover:no-underline" onClick={() => navigate("/sube-uyum-merkezi")}>
            Detaylı görünüm →
          </button>
        </p>
      )}
    </div>
  );
}
