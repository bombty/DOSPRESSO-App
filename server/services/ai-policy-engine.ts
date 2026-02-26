import { db } from "../db";
import { aiDataDomains, aiDomainPolicies, aiAgentLogs } from "@shared/schema";
import { eq, and, sql, asc } from "drizzle-orm";

const VALID_DECISIONS = new Set(["ALLOW", "ALLOW_AGGREGATED", "DENY"]);

export type PolicyDecision = "ALLOW" | "ALLOW_AGGREGATED" | "DENY";

export interface DomainPolicyResult {
  domainKey: string;
  domainLabel: string;
  decision: PolicyDecision;
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  factory_costs: ["fabrika maliyet", "üretim maliyet", "batch maliyet", "üretim gider", "fabrika gider", "production cost", "factory cost"],
  procurement_prices: ["satınalma fiyat", "alış fiyat", "birim fiyat", "tedarik fiyat", "purchase price", "procurement price", "birim maliyet"],
  supplier_contracts: ["tedarikçi sözleşme", "tedarik sözleşme", "supplier contract", "sözleşme detay", "sözleşme koşul"],
  recipes: ["reçete", "tarif", "recipe", "hammadde oran", "malzeme listesi"],
  equipment_faults: ["arıza", "ekipman sorun", "makine arıza", "equipment fault", "bakım", "maintenance"],
  branch_health: ["şube sağlık", "şube performans", "şube skor", "branch health", "sağlık skoru", "şube durum"],
  personnel_performance: ["personel performans", "çalışan performans", "performans skor", "düşük performans", "yüksek performans", "en iyi çalışan", "en kötü çalışan"],
  personnel_pii: ["telefon", "e-posta", "email", "mail", "tc kimlik", "adres", "maaş", "salary", "ücret", "bordro", "kişisel bilgi", "iletişim bilgi"],
  academy: ["eğitim", "akademi", "quiz", "sertifika", "kariyer", "rozet", "training", "academy"],
  crm: ["müşteri", "geri bildirim", "memnuniyet", "feedback", "customer", "şikayet", "misafir"],
};

export function classifyIntent(question: string): string[] {
  const q = question.toLowerCase().replace(/[ıİ]/g, m => m === 'ı' ? 'i' : 'i');
  const matched: string[] = [];

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      const normalizedKw = kw.toLowerCase().replace(/[ıİ]/g, m => m === 'ı' ? 'i' : 'i');
      if (q.includes(normalizedKw)) {
        if (!matched.includes(domain)) {
          matched.push(domain);
        }
        break;
      }
    }
  }

  return matched;
}

let policyCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

async function loadPolicies(): Promise<any[]> {
  if (policyCache && Date.now() - policyCache.timestamp < CACHE_TTL) {
    return policyCache.data;
  }

  const rows = await db
    .select({
      domainId: aiDomainPolicies.domainId,
      domainKey: aiDataDomains.key,
      domainActive: aiDataDomains.isActive,
      role: aiDomainPolicies.role,
      employeeType: aiDomainPolicies.employeeType,
      decision: aiDomainPolicies.decision,
      scope: aiDomainPolicies.scope,
    })
    .from(aiDomainPolicies)
    .innerJoin(aiDataDomains, and(eq(aiDomainPolicies.domainId, aiDataDomains.id), eq(aiDataDomains.isActive, true)))
    .orderBy(asc(aiDomainPolicies.domainId), asc(aiDomainPolicies.role), asc(aiDomainPolicies.id));

  policyCache = { data: rows, timestamp: Date.now() };
  return rows;
}

export function invalidatePolicyCache() {
  policyCache = null;
}

export async function checkPolicy(
  role: string,
  employeeType: string | null | undefined,
  domains: string[]
): Promise<DomainPolicyResult[]> {
  const allPolicies = await loadPolicies();
  const results: DomainPolicyResult[] = [];

  for (const domainKey of domains) {
    let bestMatch: any = null;

    for (const p of allPolicies) {
      if (p.domainKey !== domainKey) continue;
      if (p.role !== role) continue;

      if (p.employeeType && employeeType && p.employeeType === employeeType) {
        bestMatch = p;
        break;
      }

      if (!p.employeeType && !bestMatch) {
        bestMatch = p;
      }
    }

    const decision: PolicyDecision = bestMatch?.decision as PolicyDecision || "DENY";

    results.push({
      domainKey,
      domainLabel: domainKey,
      decision,
    });
  }

  return results;
}

export async function checkAndEnforcePolicy(
  question: string,
  userId: string,
  role: string,
  employeeType: string | null | undefined,
  branchId: number | null | undefined
): Promise<{
  detectedDomains: string[];
  policyResults: DomainPolicyResult[];
  deniedDomains: string[];
  aggregatedDomains: string[];
  allowedDomains: string[];
  shouldBlock: boolean;
  blockMessage: string | null;
}> {
  const startTime = Date.now();
  const detectedDomains = classifyIntent(question);

  if (detectedDomains.length === 0) {
    return {
      detectedDomains: [],
      policyResults: [],
      deniedDomains: [],
      aggregatedDomains: [],
      allowedDomains: [],
      shouldBlock: false,
      blockMessage: null,
    };
  }

  const policyResults = await checkPolicy(role, employeeType, detectedDomains);

  const deniedDomains = policyResults.filter(p => p.decision === "DENY").map(p => p.domainKey);
  const aggregatedDomains = policyResults.filter(p => p.decision === "ALLOW_AGGREGATED").map(p => p.domainKey);
  const allowedDomains = policyResults.filter(p => p.decision === "ALLOW").map(p => p.domainKey);

  const allDenied = policyResults.length > 0 && policyResults.every(p => p.decision === "DENY");

  try {
    await db.insert(aiAgentLogs).values({
      runType: "dobody_chat",
      triggeredByUserId: userId,
      targetRoleScope: role,
      branchId: branchId || null,
      inputSummary: `domains:${detectedDomains.join(",")} | decisions:${policyResults.map(p => `${p.domainKey}=${p.decision}`).join(",")}`,
      outputSummary: allDenied ? "BLOCKED" : `allowed:${allowedDomains.join(",")};agg:${aggregatedDomains.join(",")};denied:${deniedDomains.join(",")}`,
      actionCount: detectedDomains.length,
      status: allDenied ? "denied" : "success",
      executionTimeMs: Date.now() - startTime,
    });
  } catch (logErr) {
    console.error("AI policy log error:", logErr);
  }

  return {
    detectedDomains,
    policyResults,
    deniedDomains,
    aggregatedDomains,
    allowedDomains,
    shouldBlock: allDenied,
    blockMessage: allDenied ? "Bu bilgiye erişim yetkiniz bulunmuyor. Başka bir konuda yardımcı olabilirim." : null,
  };
}
