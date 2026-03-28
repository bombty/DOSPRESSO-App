import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { KPIBar } from "@/components/layout/KPIBar";
import { WidgetGrid } from "@/components/layout/WidgetGrid";
import { WidgetCard } from "@/components/layout/WidgetCard";
import { MiniStatGrid, ProgressBar, AlertBox } from "@/components/layout/MiniStatGrid";
import { Bot, Building2, CheckSquare, AlertTriangle, Bell, Wrench, BookOpen, Users, BarChart3, ClipboardList, TrendingUp } from "lucide-react";

interface ControlData {
  kpi: { branches: number; sla: number; tickets: number; staff: number; checklist: number; quality: number; faults: number };
  branchHealth: { healthy: number; warning: number; critical: number; alerts: string[] };
  tasks: { pending: number; overdue: number; items: Array<{ id: number; title: string; status: string; dueDate: string }> };
  notifications: { count: number; items: Array<{ id: number; title: string; type: string; time: string }> };
  warnings: { count: number; items: Array<{ title: string; severity: string }> };
  equipment: { open: number; resolved: number; resolutionRate: number };
  training: { completion: number; categories: Record<string, number> };
  staffSummary: { active: number; leave: number; fullTime: number; partTime: number; attendance: number };
  checklist: { daily: number; weekly: number; monthly: number };
  dobodySummary: string;
}

function ControlSkeleton() {
  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <Skeleton className="h-8 w-48 rounded-lg mb-4" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 flex-1 rounded-lg" />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}

function getTaskStatusBadge(status: string) {
  if (status === "overdue") return { bg: "var(--ds-badge-danger-bg)", color: "var(--ds-badge-danger-text)", label: "Gecikli" };
  if (status === "pending") return { bg: "var(--ds-badge-warning-bg)", color: "var(--ds-badge-warning-text)", label: "Bekliyor" };
  return { bg: "var(--ds-badge-success-bg)", color: "var(--ds-badge-success-text)", label: "OK" };
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  return `${Math.floor(hours / 24)}g`;
}

export default function ControlDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<ControlData>({
    queryKey: ["/api/me/control-widgets"],
    staleTime: 60_000,
  });

  if (isLoading || !data) return <ControlSkeleton />;

  const kpi = data.kpi;
  const roleLabel = user?.role?.toUpperCase() || "";

  return (
    <PageShell
      title="Control"
      subtitle={`Tüm şubeler · ${roleLabel}`}
      showDateFilter={true}
    >
      {/* KPI Bar */}
      <KPIBar items={[
        { value: kpi.branches, label: "Şube", color: "var(--ds-blue)" },
        { value: kpi.sla, label: "SLA", color: kpi.sla > 0 ? "var(--ds-red-light)" : "var(--ds-green)" },
        { value: kpi.tickets, label: "Ticket", color: "var(--ds-amber)" },
        { value: kpi.staff, label: "Personel", color: "var(--ds-green)" },
        { value: `%${kpi.checklist}`, label: "Checklist", color: "var(--ds-green)" },
        { value: `%${kpi.quality}`, label: "Kalite", color: "var(--ds-purple)" },
        { value: kpi.faults, label: "Arıza", color: kpi.faults > 10 ? "var(--ds-red-light)" : "var(--ds-amber)" },
      ]} />

      {/* Widget Grid */}
      <WidgetGrid columns={3}>
        {/* Row 1: Branch Health + Tasks + Notifications */}
        <WidgetCard title="Şube sağlığı" icon={Building2} badge={{ label: `${data.branchHealth.healthy}/${kpi.branches}`, color: "success" }}>
          <MiniStatGrid items={[
            { value: data.branchHealth.healthy, label: "Sağlıklı", color: "var(--ds-green)" },
            { value: data.branchHealth.critical, label: "Kritik", color: "var(--ds-red-light)" },
          ]} />
          {data.branchHealth.alerts.map((alert, i) => (
            <AlertBox key={i} message={alert} />
          ))}
        </WidgetCard>

        <WidgetCard title="Görevler" icon={CheckSquare} badge={{ label: String(data.tasks.pending), color: data.tasks.overdue > 0 ? "danger" : "warning" }}>
          {data.tasks.items.slice(0, 3).map((task) => {
            const badge = getTaskStatusBadge(task.status);
            return (
              <div key={task.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: "1px solid var(--ds-border-subtle)",
                fontSize: "var(--ds-font-small)", color: "var(--ds-text-mid)",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{task.title}</span>
                <span style={{
                  fontSize: "var(--ds-font-tiny)", fontWeight: 600,
                  padding: "2px 7px", borderRadius: 4,
                  background: badge.bg, color: badge.color, marginLeft: 8, flexShrink: 0,
                }}>{badge.label}</span>
              </div>
            );
          })}
          {data.tasks.items.length === 0 && (
            <p style={{ fontSize: "var(--ds-font-small)", color: "var(--ds-text-secondary)" }}>Görev yok</p>
          )}
        </WidgetCard>

        <WidgetCard title="Bildirimler" icon={Bell} badge={{ label: String(data.notifications.count), color: data.notifications.count > 5 ? "danger" : "info" }}>
          {data.notifications.items.slice(0, 4).map((notif) => (
            <div key={notif.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 0", borderBottom: "1px solid var(--ds-border-subtle)",
              fontSize: "var(--ds-font-small)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: notif.type === "critical" ? "var(--ds-red-light)" : notif.type === "warning" ? "var(--ds-amber)" : "var(--ds-blue)",
              }} />
              <span style={{ flex: 1, color: "var(--ds-text-mid)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {notif.title}
              </span>
              <span style={{ fontSize: "var(--ds-font-tiny)", color: "var(--ds-text-secondary)", minWidth: 28, textAlign: "right" }}>
                {timeAgo(notif.time)}
              </span>
            </div>
          ))}
          {data.notifications.items.length === 0 && (
            <p style={{ fontSize: "var(--ds-font-small)", color: "var(--ds-text-secondary)" }}>Bildirim yok</p>
          )}
        </WidgetCard>

        {/* Row 2: Equipment + Training + Checklist */}
        <WidgetCard title="Ekipman" icon={Wrench} badge={{ label: `${data.equipment.open} arıza`, color: data.equipment.open > 10 ? "danger" : "warning" }}>
          <MiniStatGrid items={[
            { value: data.equipment.open, label: "Açık", color: "var(--ds-red-light)" },
            { value: data.equipment.resolved, label: "Çözüldü", color: "var(--ds-green)" },
          ]} />
          <ProgressBar label="Çözüm" value={data.equipment.resolutionRate} color={data.equipment.resolutionRate > 50 ? "var(--ds-green)" : "var(--ds-red-light)"} />
        </WidgetCard>

        <WidgetCard title="Eğitim" icon={BookOpen} badge={{ label: `%${data.training.completion}`, color: data.training.completion > 70 ? "success" : "warning" }}>
          {Object.entries(data.training.categories).map(([key, val]) => (
            <ProgressBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val as number} color={(val as number) > 70 ? "var(--ds-green)" : "var(--ds-amber)"} />
          ))}
        </WidgetCard>

        <WidgetCard title="Checklist" icon={ClipboardList}>
          <ProgressBar label="Günlük" value={data.checklist.daily} color={data.checklist.daily > 80 ? "var(--ds-green)" : "var(--ds-amber)"} />
          <ProgressBar label="Haftalık" value={data.checklist.weekly} color={data.checklist.weekly > 80 ? "var(--ds-green)" : "var(--ds-amber)"} />
          <ProgressBar label="Aylık" value={data.checklist.monthly} color={data.checklist.monthly > 80 ? "var(--ds-green)" : "var(--ds-amber)"} />
        </WidgetCard>

        {/* Row 3: Staff (2 col) + Trend */}
        <WidgetCard title="Personel özet" icon={Users} badge={{ label: String(data.staffSummary.active + data.staffSummary.leave), color: "info" }} span={2}>
          <MiniStatGrid columns={4} items={[
            { value: data.staffSummary.active, label: "Aktif", color: "var(--ds-green)" },
            { value: data.staffSummary.leave, label: "İzinli", color: "var(--ds-amber)" },
            { value: data.staffSummary.fullTime, label: "Tam", color: "var(--ds-blue)" },
            { value: data.staffSummary.partTime, label: "Yarı", color: "var(--ds-text-secondary)" },
          ]} />
          <ProgressBar label="Devam" value={data.staffSummary.attendance} color="var(--ds-green)" />
        </WidgetCard>

        <WidgetCard title="6 aylık trend" icon={TrendingUp}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 50, marginTop: 6 }}>
            {["Eki", "Kas", "Ara", "Oca", "Şub", "Mar"].map((m, i) => {
              const heights = [60, 75, 50, 85, 90, 70];
              return (
                <div key={m} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: `${heights[i]}%`, borderRadius: "3px 3px 0 0",
                    background: `rgba(41,128,185,${0.3 + i * 0.06})`,
                  }} />
                  <div style={{ fontSize: 8, color: "var(--ds-text-secondary)", marginTop: 3 }}>{m}</div>
                </div>
              );
            })}
          </div>
        </WidgetCard>

        {/* Row 4: Mr. Dobody full width */}
        <WidgetCard title="" span={3} style={{
          background: "rgba(192,57,43,0.04)",
          border: "1px solid rgba(192,57,43,0.18)",
        }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "rgba(192,57,43,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Bot style={{ width: 18, height: 18, color: "var(--ds-red)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "var(--ds-font-widget-title)", fontWeight: 600, color: "var(--ds-text-primary)", margin: 0 }}>
                Mr. Dobody özet
              </p>
              <p style={{
                fontSize: "var(--ds-font-small)", color: "var(--ds-text-mid)",
                lineHeight: 1.5, margin: "4px 0 8px",
              }}>
                {data.dobodySummary || "Tüm sistemler normal çalışıyor."}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Detaylı analiz", "Aksiyon oluştur", "Rapor indir"].map((label) => (
                  <span key={label} style={{
                    fontSize: "var(--ds-font-kpi-label)", fontWeight: 500,
                    padding: "4px 10px", borderRadius: 5,
                    border: "1px solid rgba(192,57,43,0.2)",
                    color: "var(--ds-text-mid)",
                    background: "rgba(192,57,43,0.04)",
                    cursor: "pointer",
                  }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </WidgetCard>
      </WidgetGrid>
    </PageShell>
  );
}
