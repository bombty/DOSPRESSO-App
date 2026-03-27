import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckSquare } from "lucide-react";

interface WelcomeHeaderProps {
  firstName: string;
  role: string;
  branchName?: string | null;
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

export function WelcomeHeader({ firstName, role, branchName }: WelcomeHeaderProps) {
  const roleLabel = ROLE_LABELS[role] || role;
  const dateStr = getDateStr();

  // Fetch summary alerts (lightweight endpoint)
  const { data: alerts } = useQuery<{
    criticalCount?: number;
    pendingTasks?: number;
    pendingApprovals?: number;
  }>({
    queryKey: ["/api/me/home-alerts"],
    staleTime: 60_000,
    retry: false,
  });

  const criticalCount = alerts?.criticalCount || 0;
  const pendingTasks = alerts?.pendingTasks || 0;

  return (
    <div className="mb-3">
      {/* Name + date */}
      <h1 className="text-sm font-medium text-dospresso-bej">
        Hoş geldin, {firstName}
      </h1>
      <p className="text-[10px] text-dospresso-bej-muted">
        {dateStr} · {branchName || roleLabel}
      </p>

      {/* Alert pills */}
      {(criticalCount > 0 || pendingTasks > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {criticalCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: "rgba(192,57,43,0.1)",
                color: "var(--dospresso-red-light, #e74c3c)",
                border: "0.5px solid rgba(192,57,43,0.18)",
              }}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {criticalCount} kritik uyarı
            </span>
          )}
          {pendingTasks > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: "rgba(41,128,185,0.07)",
                color: "#5dade2",
                border: "0.5px solid rgba(41,128,185,0.12)",
              }}
            >
              <CheckSquare className="w-2.5 h-2.5" />
              {pendingTasks} bekleyen görev
            </span>
          )}
        </div>
      )}
    </div>
  );
}
