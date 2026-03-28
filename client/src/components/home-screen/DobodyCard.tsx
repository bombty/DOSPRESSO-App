import { useLocation } from "wouter";
import { Bot, AlertTriangle } from "lucide-react";
import { useGuidanceData } from "@/hooks/useGuidanceData";

export function DobodyCard() {
  const [, setLocation] = useLocation();
  const { guidance, isEligible } = useGuidanceData();

  const totalGaps = guidance?.totalGaps || 0;
  const criticalCount = guidance?.criticalCount || 0;
  const topItems = [
    ...(guidance?.grouped?.critical || []),
    ...(guidance?.grouped?.high || []),
  ].slice(0, 3);

  const summary = topItems.length > 0
    ? topItems.map(i => i.title).join(". ") + "."
    : "Tüm sistemler normal çalışıyor. Detaylar için tıklayın.";

  return (
    <button
      type="button"
      onClick={() => setLocation("/dobody")}
      data-testid="dobody-home-card"
      className="w-full text-left p-3 md:p-[18px_22px] flex gap-3 md:gap-4 items-start cursor-pointer rounded-xl md:rounded-[14px] transition-all duration-150 hover:translate-y-[-1px] active:scale-[0.99]"
      style={{
        background: "var(--ds-bg-card)",
        border: "1px solid var(--ds-border-red)",
        boxShadow: "var(--ds-card-shadow), 0 0 0 1px rgba(192,57,43,0.05)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-bg-card-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ds-bg-card)"; }}
    >
      {/* Icon */}
      <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(192,57,43,0.12)" }}>
        <Bot className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" style={{ color: "var(--ds-red)" }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[14px] md:text-[16px] font-semibold"
            style={{ color: "var(--ds-text-primary)", margin: 0 }}>
            Mr. Dobody
          </p>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded"
              style={{ background: "var(--ds-badge-danger-bg)", color: "var(--ds-badge-danger-text)" }}>
              <AlertTriangle className="w-2.5 h-2.5" />
              {criticalCount} kritik
            </span>
          )}
          {totalGaps > 0 && totalGaps !== criticalCount && (
            <span className="text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded"
              style={{ background: "var(--ds-badge-warning-bg)", color: "var(--ds-badge-warning-text)" }}>
              {totalGaps} toplam
            </span>
          )}
        </div>

        <p className="text-[11px] md:text-[13px] line-clamp-2 mb-2 md:mb-2.5"
          style={{ color: "var(--ds-text-mid)", lineHeight: 1.5 }}>
          {summary}
        </p>

        <div className="flex gap-1.5 md:gap-2">
          {totalGaps > 0 && (
            <span className="text-[10px] md:text-[12px] font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-md"
              style={{
                border: "1px solid var(--ds-border)",
                background: "rgba(242,230,208,0.04)",
                color: "var(--ds-text-mid)",
              }}>
              {totalGaps} öneri
            </span>
          )}
          <span className="text-[10px] md:text-[12px] font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-md"
            style={{
              border: "1px solid var(--ds-border)",
              background: "rgba(242,230,208,0.04)",
              color: "var(--ds-text-mid)",
            }}>
            Soru sor
          </span>
        </div>
      </div>
    </button>
  );
}
