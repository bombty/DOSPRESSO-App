import { Router, type Express } from "express";
import { z } from "zod";
import { isHQRole, isBranchRole, aiAgentLogs } from "@shared/schema";
import { computeBranchHealthScores } from "../services/branch-health-scoring";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { aiChatCall } from "../ai";
import { respondIfAiBudgetError } from "../ai-budget-guard";

const router = Router();

const CopilotResponseSchema = z.object({
  durum_ozeti: z.string(),
  ilk_3_risk: z.array(
    z.object({
      label: z.string(),
      neden: z.string(),
      severity: z.enum(["low", "med", "high"]),
    })
  ).max(3),
  ilk_3_aksiyon: z.array(
    z.object({
      label: z.string(),
      deepLink: z.string(),
      oncelik: z.enum(["yuksek", "orta", "dusuk"]),
    })
  ).max(3),
});

type CopilotResponse = z.infer<typeof CopilotResponseSchema> & {
  fallback_used: boolean;
  generatedAt: string;
  schemaVersion: string;
  rangeUsed: string;
};

const VALID_RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function buildFallback(report: Awaited<ReturnType<typeof computeBranchHealthScores>>, rangeUsed: string): CopilotResponse {
  const atRisk = report.branches
    .filter((b) => b.level === "red")
    .sort((a, b) => a.totalScore - b.totalScore)
    .slice(0, 3);

  const allFlags = report.branches.flatMap((b) =>
    b.riskFlags.map((f) => ({ ...f, branchName: b.branchName, deepLink: b.deepLinks.details }))
  );

  const topFlags = allFlags
    .filter((f) => f.severity === "high")
    .slice(0, 3);

  const avgScore =
    report.branches.length > 0
      ? Math.round(report.branches.reduce((s, b) => s + b.totalScore, 0) / report.branches.length)
      : 0;

  return {
    durum_ozeti: `${report.branches.length} şube analiz edildi. Ortalama skor: ${avgScore}/100. ${atRisk.length} şube kritik (kırmızı) seviyede.`,
    ilk_3_risk: topFlags.slice(0, 3).map((f) => ({
      label: f.branchName + " — " + f.label,
      neden: f.label,
      severity: f.severity as "low" | "med" | "high",
    })),
    ilk_3_aksiyon: atRisk.slice(0, 3).map((b) => ({
      label: `${b.branchName} şubesini incele (skor: ${b.totalScore})`,
      deepLink: b.deepLinks.details,
      oncelik: "yuksek" as const,
    })),
    fallback_used: true,
    generatedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    rangeUsed,
  };
}

router.get("/api/ai/ops-copilot/summary", isAuthenticated, async (req: any, res: any) => {
  const startTime = Date.now();
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Giriş yapmanız gerekiyor" });

  const role = user.role as string;
  const rangeParam = (req.query.range as string) || "30d";
  const rangeDays = VALID_RANGES[rangeParam] ?? 30;
  const rangeUsed = VALID_RANGES[rangeParam] ? rangeParam : "30d";

  let branchIds: number[] | undefined;

  if (isHQRole(role as any)) {
    const queryBranchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    if (queryBranchId && !isNaN(queryBranchId)) {
      branchIds = [queryBranchId];
    }
  } else if (isBranchRole(role as any)) {
    if (!user.branchId) {
      return res.json(buildFallback({ range: rangeUsed, generatedAt: new Date().toISOString(), branches: [] }, rangeUsed));
    }
    branchIds = [user.branchId];
  } else {
    return res.status(403).json({ message: "Bu özelliğe erişim yetkiniz bulunmamaktadır" });
  }

  const report = await computeBranchHealthScores({ rangeDays, branchIds });

  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const fallback = buildFallback(report, rangeUsed);
    await logRun(user.id, role, user.branchId, rangeUsed, report.branches.length, "fallback_no_key", Date.now() - startTime, true);
    return res.json(fallback);
  }

  const atRisk = report.branches.filter((b) => b.level === "red");
  const avgScore = report.branches.length > 0
    ? Math.round(report.branches.reduce((s, b) => s + b.totalScore, 0) / report.branches.length)
    : 0;

  const topRiskBranches = report.branches
    .sort((a, b) => a.totalScore - b.totalScore)
    .slice(0, 5)
    .map((b) => ({
      sube: b.branchName,
      skor: b.totalScore,
      seviye: b.level,
      risk_bayraklari: b.riskFlags.map((f) => f.label),
      deepLink: b.deepLinks.details,
    }));

  const systemPrompt = `Sen DOSPRESSO franchising operasyon asistanısın. Yalnızca aşağıdaki veriyi kullanarak Türkçe kısa bir günlük aksiyon özeti üret. 
YASAKLAR: DB'ye yazma, rol/yetki önerme, finansal talimat verme, uydurulan veri ekleme.
Yanıt ZORUNLU olarak aşağıdaki JSON formatında olmalı:
{
  "durum_ozeti": "string (1-2 cümle)",
  "ilk_3_risk": [{"label": "string", "neden": "string", "severity": "low|med|high"}],
  "ilk_3_aksiyon": [{"label": "string", "deepLink": "string", "oncelik": "yuksek|orta|dusuk"}]
}
deepLink değerleri YALNIZCA verilen veri içindeki deepLink alanlarından seçilmeli. Uydurulmuş URL kullanma.`;

  const userContent = `Periyot: ${rangeUsed}
Toplam şube: ${report.branches.length}
Kritik şube sayısı: ${atRisk.length}
Ortalama skor: ${avgScore}/100
En riskli şubeler: ${JSON.stringify(topRiskBranches)}`;

  try {
    const openaiData = await aiChatCall({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      __aiContext: { feature: "ai_ops_copilot", operation: "summarize", userId: user.id, branchId: user.branchId ?? null },
    } as Parameters<typeof aiChatCall>[0]);

    const rawContent = openaiData.choices?.[0]?.message?.content;
    const tokenUsage = openaiData.usage?.total_tokens ?? 0;

    let parsed: z.infer<typeof CopilotResponseSchema>;
    try {
      parsed = CopilotResponseSchema.parse(JSON.parse(rawContent));
    } catch {
      const fallback = buildFallback(report, rangeUsed);
      await logRun(user.id, role, user.branchId, rangeUsed, report.branches.length, "fallback_schema_fail", Date.now() - startTime, true, tokenUsage);
      return res.json(fallback);
    }

    const result: CopilotResponse = {
      ...parsed,
      fallback_used: false,
      generatedAt: new Date().toISOString(),
      schemaVersion: "1.0",
      rangeUsed,
    };

    await logRun(user.id, role, user.branchId, rangeUsed, report.branches.length, "success", Date.now() - startTime, false, tokenUsage);
    return res.json(result);

  } catch (err) {
    if (respondIfAiBudgetError(err, res)) {
      await logRun(user.id, role, user.branchId, rangeUsed, report.branches.length, "budget_exceeded", Date.now() - startTime, false);
      return;
    }
    const fallback = buildFallback(report, rangeUsed);
    await logRun(user.id, role, user.branchId, rangeUsed, report.branches.length, "fallback_error", Date.now() - startTime, true);
    return res.json(fallback);
  }
});

async function logRun(
  userId: string,
  role: string,
  branchId: number | null | undefined,
  rangeUsed: string,
  branchCount: number,
  status: string,
  executionTimeMs: number,
  fallbackUsed: boolean,
  tokenUsage?: number
) {
  try {
    await db.insert(aiAgentLogs).values({
      runType: "ops_copilot",
      triggeredByUserId: userId,
      targetRoleScope: role,
      branchId: branchId ?? null,
      inputSummary: `range=${rangeUsed} branches=${branchCount}`,
      outputSummary: `status=${status} fallback=${fallbackUsed} tokens=${tokenUsage ?? 0}`,
      actionCount: 3,
      status: fallbackUsed ? "fallback" : "success",
      executionTimeMs,
    });
  } catch {
  }
}

export function registerAiOpsCopilotRoutes(app: Express) {
  app.use(router);
}
