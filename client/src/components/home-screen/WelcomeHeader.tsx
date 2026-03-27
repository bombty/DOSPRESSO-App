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
    <div className="mb-3">
      <h1 className="text-[14px] font-medium" style={{ color: "var(--dospresso-bej, #f2e6d0)" }}>
        Hoş geldin, {firstName}
      </h1>
      <p className="text-[10px]" style={{ color: "var(--dospresso-bej-muted, #8a7d6d)" }}>
        {dateStr} · {branchName || roleLabel}
      </p>

      {(criticalCount > 0 || pendingTasks > 0 || pendingApprovals > 0) && (
        <div className="flex flex-wrap gap-[5px] mt-2">
          {criticalCount > 0 && (
            <span
              className="inline-flex items-center gap-[3px] text-[9px] rounded-[5px]"
              style={{
                padding: "3px 7px",
                backgroundColor: "rgba(192,57,43,0.10)",
                color: "#e74c3c",
                border: "0.5px solid rgba(192,57,43,0.18)",
              }}
            >
              <AlertTriangle style={{ width: 10, height: 10 }} />
              {criticalCount} kritik uyarı
            </span>
          )}
          {pendingTasks > 0 && (
            <span
              className="inline-flex items-center gap-[3px] text-[9px] rounded-[5px]"
              style={{
                padding: "3px 7px",
                backgroundColor: "rgba(41,128,185,0.07)",
                color: "#5dade2",
                border: "0.5px solid rgba(41,128,185,0.12)",
              }}
            >
              <CheckSquare style={{ width: 10, height: 10 }} />
              {pendingTasks} bekleyen görev
            </span>
          )}
          {pendingApprovals > 0 && (
            <span
              className="inline-flex items-center gap-[3px] text-[9px] rounded-[5px]"
              style={{
                padding: "3px 7px",
                backgroundColor: "rgba(212,168,75,0.08)",
                color: "#d4a84b",
                border: "0.5px solid rgba(212,168,75,0.12)",
              }}
            >
              <Clock style={{ width: 10, height: 10 }} />
              {pendingApprovals} onay bekliyor
            </span>
          )}
        </div>
      )}
    </div>
  );
}
