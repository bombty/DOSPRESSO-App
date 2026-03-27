import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bot } from "lucide-react";

export function DobodyCard() {
  const [, setLocation] = useLocation();

  // Fetch AI briefing summary (1-2 sentences)
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
      className="w-full text-left rounded-lg border border-dospresso-border bg-dospresso-bg2 p-3 flex gap-2.5 items-start transition-all duration-150 hover:bg-dospresso-bg3 active:scale-[0.99] cursor-pointer"
      style={{ borderColor: "rgba(192,57,43,0.12)" }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: "rgba(192,57,43,0.1)" }}
      >
        <Bot className="w-4 h-4" style={{ color: "var(--dospresso-red, #c0392b)" }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-dospresso-bej mb-0.5">Mr. Dobody</p>
        <p className="text-[10px] text-dospresso-bej-mid leading-relaxed line-clamp-2 mb-1.5">
          {summary}
        </p>
        <div className="flex gap-1.5">
          {suggestionCount > 0 && (
            <span
              className="text-[9px] px-2 py-0.5 rounded border cursor-pointer"
              style={{
                borderColor: "rgba(30,50,80,1)",
                backgroundColor: "rgba(242,230,208,0.03)",
                color: "var(--dospresso-bej-mid, #c8b698)",
              }}
            >
              {suggestionCount} öneri
            </span>
          )}
          <span
            className="text-[9px] px-2 py-0.5 rounded border cursor-pointer"
            style={{
              borderColor: "rgba(30,50,80,1)",
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
