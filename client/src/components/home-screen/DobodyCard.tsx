import { useState } from "react";
import { useLocation } from "wouter";
import { Bot, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useGuidanceData } from "@/hooks/useGuidanceData";
import type { GuidanceItem } from "@/hooks/useGuidanceData";

const SEVERITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "var(--ds-badge-danger-bg)", text: "var(--ds-badge-danger-text)", label: "Kritik" },
  high: { bg: "var(--ds-badge-warning-bg)", text: "var(--ds-badge-warning-text)", label: "Yüksek" },
  medium: { bg: "var(--ds-badge-info-bg)", text: "var(--ds-badge-info-text)", label: "Orta" },
  low: { bg: "var(--ds-badge-muted-bg)", text: "var(--ds-badge-muted-text)", label: "Düşük" },
};

function GuidanceRow({ item }: { item: GuidanceItem }) {
  const [, setLocation] = useLocation();
  const sev = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.low;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (item.deepLink) setLocation(item.deepLink);
      }}
      className="w-full text-left flex items-center gap-2 py-2 border-b last:border-b-0 transition-colors hover:opacity-80"
      style={{ borderColor: "var(--ds-border-subtle)" }}
    >
      <span
        className="text-[8px] md:text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: sev.bg, color: sev.text, minWidth: 36, textAlign: "center" }}
      >
        {sev.label}
      </span>
      <span className="flex-1 text-[11px] md:text-[12px] truncate" style={{ color: "var(--ds-text-mid)" }}>
        {item.title}
      </span>
      {item.deepLink && (
        <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ds-text-secondary)" }} />
      )}
    </button>
  );
}

export function DobodyCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { guidance } = useGuidanceData();

  const totalGaps = guidance?.totalGaps || 0;
  const criticalCount = guidance?.criticalCount || 0;

  const allItems = [
    ...(guidance?.grouped?.critical || []),
    ...(guidance?.grouped?.high || []),
    ...(guidance?.grouped?.medium || []),
    ...(guidance?.grouped?.low || []),
  ];

  const topItems = allItems.slice(0, 3);
  const healthAvg = guidance?.healthSummary?.average;
  const summary = healthAvg != null
    ? `Şube sağlık ortalaması %${healthAvg}. ` + (topItems.length > 0 ? topItems[0].title + "." : "")
    : topItems.length > 0
      ? topItems.map(i => i.title).join(". ") + "."
      : "Tüm sistemler normal çalışıyor.";

  return (
    <div
      data-testid="dobody-home-card"
      className="rounded-xl md:rounded-[14px] transition-all duration-200 overflow-hidden"
      style={{
        background: "var(--ds-bg-card)",
        border: "1px solid var(--ds-border-red)",
        boxShadow: "var(--ds-card-shadow), 0 0 0 1px rgba(180,42,42,0.08)",
      }}
    >
      {/* Header — always visible, toggles expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-3 md:p-[16px_20px] flex gap-3 md:gap-4 items-start cursor-pointer transition-colors hover:opacity-95"
      >
        <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: "#b42a2a" }}>
          <Bot className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" style={{ color: "var(--ds-red)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[14px] md:text-[16px] font-semibold" style={{ color: "var(--ds-text-primary)", margin: 0 }}>
              Mr. Dobody
            </p>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded"
                style={{ background: "var(--ds-badge-danger-bg)", color: "var(--ds-badge-danger-text)" }}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {criticalCount} kritik
              </span>
            )}
            {totalGaps > 0 && (
              <span className="text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded"
                style={{ background: "var(--ds-badge-warning-bg)", color: "var(--ds-badge-warning-text)" }}>
                {totalGaps} uyarı
              </span>
            )}
          </div>

          {!isExpanded && (
            <p className="text-[11px] md:text-[13px] line-clamp-2" style={{ color: "var(--ds-text-mid)", lineHeight: 1.5 }}>
              {summary}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mt-1" style={{ color: "var(--ds-text-secondary)" }}>
          {isExpanded ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
        </div>
      </button>

      {/* Expanded — uyarı ve bildirim listesi */}
      {isExpanded && (
        <div className="px-3 md:px-5 pb-3 md:pb-4" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
          {/* Şube Sağlık Skoru Özeti */}
          {guidance?.healthSummary && (
            <div className="pt-2 pb-2 mb-2" style={{ borderBottom: "1px solid var(--ds-border-subtle)" }}>
              <p className="text-[10px] md:text-[11px] font-semibold mb-1.5" style={{ color: "var(--ds-text-mid)" }}>
                Şube Sağlık Skoru
              </p>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] md:text-[20px] font-bold" style={{
                    color: guidance.healthSummary.average >= 80 ? "var(--ds-green)" :
                           guidance.healthSummary.average >= 60 ? "var(--ds-amber)" : "var(--ds-red-light)"
                  }}>
                    %{guidance.healthSummary.average}
                  </span>
                  <span className="text-[9px] md:text-[10px]" style={{ color: "var(--ds-text-secondary)" }}>ortalama</span>
                </div>
                <div className="flex gap-2 text-[9px] md:text-[10px]">
                  <span style={{ color: "var(--ds-green)" }}>●{guidance.healthSummary.healthyCount}</span>
                  <span style={{ color: "var(--ds-amber)" }}>●{guidance.healthSummary.warningCount}</span>
                  <span style={{ color: "var(--ds-red-light)" }}>●{guidance.healthSummary.criticalCount}</span>
                </div>
              </div>
              {guidance.healthSummary.worstBranches?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {guidance.healthSummary.worstBranches.map(b => (
                    <span key={b.name} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: b.status === 'critical' ? "rgba(231,76,60,0.15)" :
                                   b.status === 'warning' ? "rgba(243,156,18,0.15)" : "rgba(46,204,113,0.1)",
                        color: b.status === 'critical' ? "var(--ds-red-light)" :
                               b.status === 'warning' ? "var(--ds-amber)" : "var(--ds-green)",
                      }}>
                      {b.name}: %{b.score}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pattern Bildirimleri */}
          {guidance?.patterns && guidance.patterns.length > 0 && (
            <div className="pb-2 mb-2" style={{ borderBottom: "1px solid var(--ds-border-subtle)" }}>
              {guidance.patterns.map((p, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1">
                  <span className="text-[8px] md:text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{
                      background: p.severity === 'critical' ? "var(--ds-badge-danger-bg)" :
                                 p.severity === 'high' ? "var(--ds-badge-warning-bg)" : "var(--ds-badge-info-bg)",
                      color: p.severity === 'critical' ? "var(--ds-badge-danger-text)" :
                             p.severity === 'high' ? "var(--ds-badge-warning-text)" : "var(--ds-badge-info-text)",
                    }}>
                    Trend
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-[11px]" style={{ color: "var(--ds-text-mid)" }}>{p.pattern}</p>
                    <p className="text-[8px] md:text-[9px]" style={{ color: "var(--ds-text-secondary)" }}>{p.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mevcut uyarı listesi */}
          {allItems.length > 0 ? (
            <div className="pt-1">
              {allItems.map((item, idx) => (
                <GuidanceRow key={item.id || idx} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] md:text-[12px] py-3 text-center" style={{ color: "var(--ds-text-secondary)" }}>
              Aktif uyarı veya bildirim yok
            </p>
          )}

          <div className="flex gap-1.5 md:gap-2 mt-3 pt-2" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
            <span className="text-[10px] md:text-[12px] font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-md cursor-pointer hover:opacity-80"
              style={{ border: "1px solid var(--ds-border)", background: "rgba(242,230,208,0.04)", color: "var(--ds-text-mid)" }}>
              Tümünü gör
            </span>
            <span className="text-[10px] md:text-[12px] font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-md cursor-pointer hover:opacity-80"
              style={{ border: "1px solid var(--ds-border)", background: "rgba(242,230,208,0.04)", color: "var(--ds-text-mid)" }}>
              Soru sor
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
