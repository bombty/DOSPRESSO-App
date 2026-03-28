import { AlertTriangle, CheckSquare, Clock } from "lucide-react";

interface WelcomeHeaderProps {
  firstName: string;
  role: string;
  branchName?: string | null;
  alerts?: { criticalCount: number; pendingTasks: number; pendingApprovals: number };
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Sistem Yöneticisi", ceo: "CEO", cgo: "CGO",
  coach: "Koç", trainer: "Eğitmen",
  muhasebe_ik: "Muhasebe İK", muhasebe: "Muhasebe",
  satinalma: "Satınalma", marketing: "Pazarlama",
  gida_muhendisi: "Gıda Mühendisi", kalite_kontrol: "Kalite Kontrol",
  teknik: "Teknik", destek: "Destek",
  supervisor: "Süpervizör", supervisor_buddy: "Süpervizör Yrd.",
  mudur: "Müdür",
  barista: "Barista", bar_buddy: "Bar Buddy", stajyer: "Stajyer",
  fabrika_mudur: "Fabrika Müdür", uretim_sefi: "Üretim Şefi",
  yatirimci_branch: "Yatırımcı", yatirimci_hq: "Yatırımcı",
};

function getDateStr(): string {
  const now = new Date();
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${days[now.getDay()]}`;
}

export function WelcomeHeader({ firstName, role, branchName, alerts }: WelcomeHeaderProps) {
  const roleLabel = ROLE_LABELS[role] || role;
  const dateStr = getDateStr();
  const criticalCount = alerts?.criticalCount || 0;
  const pendingTasks = alerts?.pendingTasks || 0;
  const pendingApprovals = alerts?.pendingApprovals || 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "#f2e6d0", margin: 0 }}>
        Hoş geldin, {firstName}
      </h1>
      <p style={{ fontSize: 13, color: "#8a7d6d", margin: "4px 0 0" }}>
        {dateStr} · {branchName || roleLabel}
      </p>

      {(criticalCount > 0 || pendingTasks > 0 || pendingApprovals > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
          {criticalCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 8,
              backgroundColor: "rgba(192,57,43,0.12)", color: "#e74c3c",
              border: "1px solid rgba(192,57,43,0.2)",
            }}>
              <AlertTriangle style={{ width: 13, height: 13 }} />
              {criticalCount} kritik uyarı
            </span>
          )}
          {pendingTasks > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 8,
              backgroundColor: "rgba(41,128,185,0.10)", color: "#5dade2",
              border: "1px solid rgba(41,128,185,0.15)",
            }}>
              <CheckSquare style={{ width: 13, height: 13 }} />
              {pendingTasks} bekleyen görev
            </span>
          )}
          {pendingApprovals > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 8,
              backgroundColor: "rgba(212,168,75,0.10)", color: "#d4a84b",
              border: "1px solid rgba(212,168,75,0.15)",
            }}>
              <Clock style={{ width: 13, height: 13 }} />
              {pendingApprovals} onay bekliyor
            </span>
          )}
        </div>
      )}
    </div>
  );
}
