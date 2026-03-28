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
        textAlign: "left",
        padding: "16px 18px",
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        cursor: "pointer",
        backgroundColor: "#0f1d32",
        border: "1px solid rgba(192,57,43,0.2)",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(192,57,43,0.05)",
        transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#152640";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(192,57,43,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#0f1d32";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(192,57,43,0.05)";
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: "rgba(192,57,43,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Bot style={{ width: 20, height: 20, color: "#c0392b" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#f2e6d0", margin: 0 }}>
          Mr. Dobody
        </p>
        <p style={{
          fontSize: 13, lineHeight: 1.5, margin: "4px 0 8px",
          color: "#c8b698",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }}>
          {summary}
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {suggestionCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
              border: "1px solid #1e3250",
              backgroundColor: "rgba(242,230,208,0.04)", color: "#c8b698",
            }}>
              {suggestionCount} öneri
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
            border: "1px solid #1e3250",
            backgroundColor: "rgba(242,230,208,0.04)", color: "#c8b698",
          }}>
            Soru sor
          </span>
        </div>
      </div>
    </button>
  );
}
