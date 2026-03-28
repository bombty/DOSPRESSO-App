import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bot } from "lucide-react";

export function DobodyCard() {
  const [, setLocation] = useLocation();

  const { data: briefing } = useQuery<{ summary?: string; suggestions?: number }>({
    queryKey: ["/api/me/ai-briefing-summary"],
    staleTime: 120_000,
    retry: false,
  });

  const summary = briefing?.summary || "Sisteminiz güncelleniyor. Detaylar için tıklayın.";
  const suggestionCount = briefing?.suggestions || 0;

  return (
    <button
      type="button"
      onClick={() => setLocation("/dobody")}
      data-testid="dobody-home-card"
      style={{
        width: "100%",
        textAlign: "left" as const,
        padding: "var(--ds-card-padding)",
        display: "flex",
        gap: "var(--ds-gap-lg)",
        alignItems: "flex-start",
        cursor: "pointer",
        background: "var(--ds-bg-card)",
        border: "1px solid var(--ds-border-red)",
        borderRadius: "var(--ds-card-radius)",
        boxShadow: "var(--ds-card-shadow), 0 0 0 1px rgba(192,57,43,0.05)",
        transition: "var(--ds-transition)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ds-bg-card-hover)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--ds-bg-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "var(--ds-icon-container-radius)",
        background: "rgba(192,57,43,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Bot style={{ width: 22, height: 22, color: "var(--ds-red)" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "var(--ds-font-card-title)", fontWeight: 600,
          color: "var(--ds-text-primary)", margin: 0,
        }}>
          Mr. Dobody
        </p>
        <p style={{
          fontSize: 13, lineHeight: 1.5,
          color: "var(--ds-text-mid)", margin: "4px 0 10px",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }}>
          {summary}
        </p>
        <div style={{ display: "flex", gap: "var(--ds-gap-sm)" }}>
          {suggestionCount > 0 && (
            <span style={{
              fontSize: "var(--ds-font-card-subtitle)", fontWeight: 500,
              padding: "5px 12px", borderRadius: 7,
              border: "1px solid var(--ds-border)",
              background: "rgba(242,230,208,0.04)",
              color: "var(--ds-text-mid)",
            }}>
              {suggestionCount} öneri
            </span>
          )}
          <span style={{
            fontSize: "var(--ds-font-card-subtitle)", fontWeight: 500,
            padding: "5px 12px", borderRadius: 7,
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
