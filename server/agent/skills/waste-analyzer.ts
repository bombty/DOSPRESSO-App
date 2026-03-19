import { db } from "../../db";
import { factoryProductionOutputs, factoryStations } from "@shared/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight, type SkillAction } from "./skill-registry";

const wasteAnalyzerSkill: AgentSkill = {
  id: "waste_analyzer",
  name: "Fire Analizi",
  description: "Fabrika üretim fire oranlarını istasyon bazında analiz eder, yüksek fire olan istasyonları tespit eder",
  targetRoles: ["fabrika_mudur", "gida_muhendisi"],
  schedule: "weekly",
  autonomyLevel: "info_only",
  dataSources: ["factoryProductionOutputs", "factoryStations"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];

    try {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const currentWeekData = await db
        .select({
          stationId: factoryProductionOutputs.stationId,
          stationName: factoryStations.name,
          totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
          totalWaste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
        })
        .from(factoryProductionOutputs)
        .innerJoin(factoryStations, eq(factoryProductionOutputs.stationId, factoryStations.id))
        .where(gte(factoryProductionOutputs.createdAt, weekAgo))
        .groupBy(factoryProductionOutputs.stationId, factoryStations.name);

      const prevWeekData = await db
        .select({
          stationId: factoryProductionOutputs.stationId,
          totalProduced: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.producedQuantity} AS numeric)), 0)`,
          totalWaste: sql<string>`COALESCE(SUM(CAST(${factoryProductionOutputs.wasteQuantity} AS numeric)), 0)`,
        })
        .from(factoryProductionOutputs)
        .where(
          and(
            gte(factoryProductionOutputs.createdAt, twoWeeksAgo),
            lt(factoryProductionOutputs.createdAt, weekAgo)
          )
        )
        .groupBy(factoryProductionOutputs.stationId);

      const prevMap = new Map<number, { produced: number; waste: number }>();
      for (const row of prevWeekData) {
        prevMap.set(row.stationId, {
          produced: parseFloat(row.totalProduced) || 0,
          waste: parseFloat(row.totalWaste) || 0,
        });
      }

      const highWasteStations: Array<{
        stationId: number;
        stationName: string;
        wastePercent: number;
        prevWastePercent: number;
        produced: number;
        waste: number;
      }> = [];

      for (const row of currentWeekData) {
        const produced = parseFloat(row.totalProduced) || 0;
        const waste = parseFloat(row.totalWaste) || 0;
        if (produced === 0) continue;

        const wastePercent = (waste / (produced + waste)) * 100;
        const prev = prevMap.get(row.stationId);
        const prevProduced = prev?.produced || 0;
        const prevWaste = prev?.waste || 0;
        const prevWastePercent = prevProduced > 0 ? (prevWaste / (prevProduced + prevWaste)) * 100 : 0;

        if (wastePercent > 5) {
          highWasteStations.push({
            stationId: row.stationId,
            stationName: row.stationName || `İstasyon #${row.stationId}`,
            wastePercent: Math.round(wastePercent * 100) / 100,
            prevWastePercent: Math.round(prevWastePercent * 100) / 100,
            produced,
            waste,
          });
        }
      }

      if (highWasteStations.length > 0) {
        insights.push({
          type: "high_waste_stations",
          severity: highWasteStations.some((s) => s.wastePercent > 10) ? "critical" : "warning",
          message: `${highWasteStations.length} istasyonda fire oranı %5'in üzerinde`,
          data: { stations: highWasteStations },
          requiresAI: true,
        });
      }

      if (currentWeekData.length > 0 && highWasteStations.length === 0) {
        insights.push({
          type: "waste_normal",
          severity: "positive",
          message: "Tüm istasyonlarda fire oranları normal seviyede",
          data: { stationCount: currentWeekData.length },
          requiresAI: false,
        });
      }
    } catch (error) {
      console.error("[waste-analyzer] Skill error:", error instanceof Error ? error.message : error);
      return [];
    }

    return insights;
  },

  generateActions(insights: SkillInsight[], context: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const insight of insights) {
      if (insight.type === "high_waste_stations") {
        const stations = insight.data.stations || [];
        const stationNames = stations.map((s: any) => `${s.stationName} (%${s.wastePercent})`).join(", ");

        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Yüksek Fire Uyarısı",
          description: `${stations.length} istasyonda fire oranı kritik: ${stationNames}`,
          deepLink: "/fabrika/dashboard",
          severity: insight.severity === "critical" ? "high" : "med",
          category: "factory",
          subcategory: "waste_high",
          metadata: {
            stationCount: stations.length,
            stations: stations.map((s: any) => ({
              id: s.stationId,
              name: s.stationName,
              wastePercent: s.wastePercent,
              prevWastePercent: s.prevWastePercent,
            })),
            insightType: "high_waste_stations",
          },
        });
      }

      if (insight.type === "waste_normal") {
        actions.push({
          actionType: "report",
          targetUserId: context.userId,
          title: "Fire Analizi - Normal",
          description: insight.message,
          severity: "low",
          category: "factory",
          subcategory: "waste_normal",
          metadata: { insightType: "waste_normal" },
        });
      }
    }

    return actions;
  },
};

registerSkill(wasteAnalyzerSkill);
export default wasteAnalyzerSkill;
