import { AlertTriangle, CheckSquare, Clock } from "lucide-react";

interface WelcomeHeaderProps {
  firstName: string;
  role: string;
  branchName?: string | null;
  alerts?: { criticalCount: number; pendingTasks: number; pendingApprovals: number };
}

export function WelcomeHeader({ alerts }: WelcomeHeaderProps) {
  const criticalCount = alerts?.criticalCount || 0;
  const pendingTasks = alerts?.pendingTasks || 0;
  const pendingApprovals = alerts?.pendingApprovals || 0;

  if (criticalCount === 0 && pendingTasks === 0 && pendingApprovals === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-gap-sm)", marginBottom: "var(--ds-gap-lg)" }}>
      {criticalCount > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: "var(--ds-font-pill)", fontWeight: 500,
          padding: "6px 14px", borderRadius: 8,
          background: "var(--ds-pill-danger-bg)", color: "var(--ds-red-light)",
          border: "1px solid var(--ds-pill-danger-border)",
        }}>
          <AlertTriangle style={{ width: 13, height: 13 }} />
          {criticalCount} kritik uyarı
        </span>
      )}
      {pendingTasks > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: "var(--ds-font-pill)", fontWeight: 500,
          padding: "6px 14px", borderRadius: 8,
          background: "var(--ds-pill-info-bg)", color: "var(--ds-blue)",
          border: "1px solid var(--ds-pill-info-border)",
        }}>
          <CheckSquare style={{ width: 13, height: 13 }} />
          {pendingTasks} bekleyen görev
        </span>
      )}
      {pendingApprovals > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: "var(--ds-font-pill)", fontWeight: 500,
          padding: "6px 14px", borderRadius: 8,
          background: "var(--ds-pill-warning-bg)", color: "var(--ds-amber)",
          border: "1px solid var(--ds-pill-warning-border)",
        }}>
          <Clock style={{ width: 13, height: 13 }} />
          {pendingApprovals} onay bekliyor
        </span>
      )}
    </div>
  );
}
