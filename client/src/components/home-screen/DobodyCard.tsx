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
      className="w-full text-left rounded-lg p-[10px] flex gap-[10px] items-start cursor-pointer transition-all duration-150 active:scale-[0.99]"
      style={{
        backgroundColor: "var(--dospresso-bg2, #0f1d32)",
        border: "0.5px solid rgba(192,57,43,0.12)",
        borderRadius: "8px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--dospresso-bg3, #152640)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--dospresso-bg2, #0f1d32)")}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 30, height: 30, borderRadius: 7,
          backgroundColor: "rgba(192,57,43,0.10)",
        }}
      >
        <Bot style={{ width: 14, height: 14, color: "var(--dospresso-red, #c0392b)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium" style={{ color: "var(--dospresso-bej, #f2e6d0)", margin: 0 }}>
          Mr. Dobody
        </p>
        <p
          className="line-clamp-2"
          style={{
            fontSize: 10, lineHeight: 1.4, margin: "2px 0 5px",
            color: "var(--dospresso-bej-mid, #c8b698)",
          }}
        >
          {summary}
        </p>
        <div className="flex gap-[5px]">
          {suggestionCount > 0 && (
            <span
              className="text-[9px] rounded-[4px]"
              style={{
                padding: "3px 7px",
                border: "0.5px solid var(--dospresso-border, #1e3250)",
                backgroundColor: "rgba(242,230,208,0.03)",
                color: "var(--dospresso-bej-mid, #c8b698)",
              }}
            >
              {suggestionCount} öneri
            </span>
          )}
          <span
            className="text-[9px] rounded-[4px]"
            style={{
              padding: "3px 7px",
              border: "0.5px solid var(--dospresso-border, #1e3250)",
              backgroundColor: "rgba(242,230,208,0.03)",
              color: "var(--dospresso-bej-mid, #c8b698)",
            }}
          >
            Soru sor
          </span>
        </div>
      </div>
    </button>
  );
}
