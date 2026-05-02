import type { SkillInsight, EnrichedInsight, SkillContext } from "./skill-registry";

const DOBODY_SYSTEM_PROMPT = `Sen DOSPRESSO kahve zincirinin AI asistanı Mr. Dobody'sin.
Görevin personele kısa, motive edici ve aksiyon odaklı öneriler sunmak.

KURALLAR:
- Türkçe konuş, samimi ama profesyonel
- Öneriler 1-2 cümle, kısa ve net
- Her zaman pozitif ve yapıcı ol
- Somut aksiyon öner (ne yapmalı)
- DOSPRESSO markasını ve çalışanlarını olumsuz etkileyecek öneri YAPMA
- PII (kişisel veri) paylaşma
- Finansal talimat verme
- Maliyet düşürme önerileri kaliteyi düşürmemeli`;

export async function enrichInsightsWithAI(
  insights: SkillInsight[],
  context: SkillContext
): Promise<EnrichedInsight[]> {
  const aiInsights = insights.filter((i) => i.requiresAI);
  if (aiInsights.length === 0) {
    return insights.map((i) => ({ ...i, aiMessage: undefined }));
  }

  try {
    const { chat } = await import("../../services/ai-client");

    const insightDescriptions = aiInsights
      .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.message}`)
      .join("\n");

    const prompt = `Kullanıcı rolü: ${context.role}
Şube ID: ${context.branchId || "HQ"}

Aşağıdaki bulgular için kısa, motive edici ve aksiyon odaklı öneriler yaz.
Her bulgu için 1-2 cümlelik öneri ver. Numaralandırılmış olarak yanıt ver.

Bulgular:
${insightDescriptions}`;

    const response = await chat({
      messages: [
        { role: "system", content: DOBODY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices?.[0]?.message?.content;
    if (!aiResponse) {
      return insights.map((i) => ({ ...i, aiMessage: undefined }));
    }

    const lines = aiResponse.split("\n").filter((l: string) => l.trim());
    const enrichedMap = new Map<number, string>();

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        enrichedMap.set(parseInt(match[1]) - 1, match[2].trim());
      }
    }

    let aiIdx = 0;
    return insights.map((insight) => {
      if (insight.requiresAI) {
        const aiMsg = enrichedMap.get(aiIdx) || undefined;
        aiIdx++;
        return { ...insight, aiMessage: aiMsg };
      }
      return { ...insight, aiMessage: undefined };
    });
  } catch (err) {
    const { isAiBudgetError } = await import("../../ai-budget-guard");
    if (isAiBudgetError(err)) throw err;
    console.error("[AI Enrichment] Fallback to rule-based:", err);
    return insights.map((i) => ({ ...i, aiMessage: undefined }));
  }
}
