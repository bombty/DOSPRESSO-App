import OpenAI from "openai";
import type { SkillInsight, EnrichedInsight, SkillContext } from "./skill-registry";

const DOBODY_SYSTEM_PROMPT = `Sen DOSPRESSO kahve zincirinin AI asistani Mr. Dobody'sin.
Gorevin personele kisa, motive edici ve aksiyon odakli oneriler sunmak.

KURALLAR:
- Turkce konus, samimi ama profesyonel
- Oneriler 1-2 cumle, kisa ve net
- Her zaman pozitif ve yapici ol
- Somut aksiyon oner (ne yapmali)
- DOSPRESSO markasini ve calisanlarini olumsuz etkileyecek oneri YAPMA
- PII (kisisel veri) paylasma
- Finansal talimat verme
- Maliyet dusurme onerileri kaliteyi dusürmemeli`;

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function enrichInsightsWithAI(
  insights: SkillInsight[],
  context: SkillContext
): Promise<EnrichedInsight[]> {
  const aiInsights = insights.filter((i) => i.requiresAI);
  if (aiInsights.length === 0) {
    return insights.map((i) => ({ ...i, aiMessage: undefined }));
  }

  try {
    const client = getOpenAI();
    if (!client) {
      return insights.map((i) => ({ ...i, aiMessage: undefined }));
    }

    const insightDescriptions = aiInsights
      .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.message}`)
      .join("\n");

    const prompt = `Kullanici rolu: ${context.role}
Sube ID: ${context.branchId || "HQ"}

Asagidaki bulgular icin kisa, motive edici ve aksiyon odakli oneriler yaz.
Her bulgu icin 1-2 cumlelik oneri ver. Numaralandirilmis olarak yanit ver.

Bulgular:
${insightDescriptions}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
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
    console.error("[AI Enrichment] Fallback to rule-based:", err);
    return insights.map((i) => ({ ...i, aiMessage: undefined }));
  }
}
