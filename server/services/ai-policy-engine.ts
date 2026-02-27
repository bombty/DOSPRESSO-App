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
  recipes: ["reçete", "tarif", "recipe", "hammadde oran", "malzeme listesi", "gramaj"],
  equipment_faults: ["arıza", "ekipman sorun", "makine arıza", "equipment fault", "bakım", "maintenance"],
  branch_health: ["şube sağlık", "şube performans", "şube skor", "branch health", "sağlık skoru", "şube durum"],
  personnel_performance: ["personel performans", "çalışan performans", "performans skor", "düşük performans", "yüksek performans", "en iyi çalışan", "en kötü çalışan", "en sorunlu personel", "sorunlu personel"],
  personnel_pii: ["telefon", "e-posta", "email", "mail", "tc kimlik", "adres", "maaş", "salary", "ücret", "bordro", "kişisel bilgi", "iletişim bilgi", "iban", "tckn"],
  academy: ["eğitim", "akademi", "quiz", "sertifika", "kariyer", "rozet", "training", "academy"],
  crm: ["müşteri", "geri bildirim", "memnuniyet", "feedback", "customer", "şikayet", "misafir"],
  checklists: ["checklist", "kontrol listesi", "günlük kontrol", "açılış kapanış", "temizlik kontrol", "hijyen kontrol"],
  shifts: ["vardiya", "mesai", "nöbet", "çalışma saati", "shift", "izin", "devamsızlık"],
};

const DOMAIN_LABELS_TR: Record<string, string> = {
  factory_costs: "Fabrika Maliyetleri",
  procurement_prices: "Satınalma Fiyatları",
  supplier_contracts: "Tedarikçi Sözleşmeleri",
  recipes: "Reçeteler",
  equipment_faults: "Ekipman Arızaları",
  branch_health: "Şube Sağlık Skoru",
  personnel_performance: "Personel Performansı",
  personnel_pii: "Kişisel Bilgiler",
  academy: "Akademi/Eğitim",
  crm: "Müşteri İlişkileri",
  checklists: "Kontrol Listeleri",
  shifts: "Vardiya/Mesai",
};

const AGGREGATION_RULES: Record<string, string> = {
  personnel_performance: "KESINLIKLE personel ismi, soyismi, TC veya kimlik bilgisi verme. Yalnizca sube bazli sayi, oran, risk bandi veya trend bilgisi paylas. Ornek: 'Sube X: 3 personel dusuk performans bandinda' seklinde.",
  branch_health: "Yalnizca sube bazli genel skor ve trend bilgisi ver. Bireysel personel ismi verme.",
  equipment_faults: "Ariza sayisi ve kategorileri paylasabilirsin ama spesifik teknisyen isimleri verme.",
  factory_costs: "Yalnizca yuzdesel degisim ve trend bilgisi ver. Mutlak maliyet tutarlari (TL cinsinden) paylasma.",
  procurement_prices: "Yalnizca fiyat trendi ve yuzdesel degisim paylasabilirsin. Mutlak birim fiyat verme.",
  crm: "Genel memnuniyet skoru ve trend paylas, bireysel musteri bilgisi verme.",
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
      domainLabel: DOMAIN_LABELS_TR[domainKey] || domainKey,
      decision,
    });
  }

  return results;
}

async function getAllowedDomainsForRole(role: string, employeeType: string | null | undefined): Promise<string[]> {
  const allPolicies = await loadPolicies();
  const allowed: string[] = [];
  const seen = new Set<string>();

  for (const p of allPolicies) {
    if (p.role !== role) continue;
    if (seen.has(p.domainKey)) continue;
    seen.add(p.domainKey);

    if (p.decision === "ALLOW" || p.decision === "ALLOW_AGGREGATED") {
      const label = DOMAIN_LABELS_TR[p.domainKey];
      if (label) allowed.push(label);
    }
  }

  return allowed;
}

export function buildAggregationPrompt(aggregatedDomains: string[]): string {
  const rules: string[] = [];
  for (const domain of aggregatedDomains) {
    const rule = AGGREGATION_RULES[domain];
    if (rule) {
      rules.push(`[${DOMAIN_LABELS_TR[domain] || domain}]: ${rule}`);
    } else {
      rules.push(`[${DOMAIN_LABELS_TR[domain] || domain}]: Yalnizca ozet/istatistiksel bilgi ver. Bireysel isim, kimlik veya detay paylasma.`);
    }
  }
  return rules.join("\n");
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
  aggregationPrompt: string | null;
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
      aggregationPrompt: null,
    };
  }

  const policyResults = await checkPolicy(role, employeeType, detectedDomains);

  const deniedDomains = policyResults.filter(p => p.decision === "DENY").map(p => p.domainKey);
  const aggregatedDomains = policyResults.filter(p => p.decision === "ALLOW_AGGREGATED").map(p => p.domainKey);
  const allowedDomains = policyResults.filter(p => p.decision === "ALLOW").map(p => p.domainKey);

  const allDenied = policyResults.length > 0 && policyResults.every(p => p.decision === "DENY");

  const redactionApplied = aggregatedDomains.length > 0;

  try {
    await db.insert(aiAgentLogs).values({
      runType: "dobody_chat",
      triggeredByUserId: userId,
      targetRoleScope: role,
      branchId: branchId || null,
      inputSummary: `domains:${detectedDomains.join(",")} | decisions:${policyResults.map(p => `${p.domainKey}=${p.decision}`).join(",")}${redactionApplied ? " | redaction:yes" : ""}`,
      outputSummary: allDenied ? "BLOCKED" : `allowed:${allowedDomains.join(",")};agg:${aggregatedDomains.join(",")};denied:${deniedDomains.join(",")}`,
      actionCount: detectedDomains.length,
      status: allDenied ? "denied" : "success",
      executionTimeMs: Date.now() - startTime,
    });
  } catch (logErr) {
    console.error("AI policy log error:", logErr);
  }

  let blockMessage: string | null = null;
  if (allDenied) {
    const deniedLabels = policyResults.map(p => p.domainLabel).join(", ");
    const allowedAlternatives = await getAllowedDomainsForRole(role, employeeType);
    const altText = allowedAlternatives.length > 0
      ? `\n\nBunun yerine su konularda yardimci olabilirim: ${allowedAlternatives.slice(0, 5).join(", ")}.`
      : "";
    blockMessage = `${deniedLabels} alanina erisim yetkiniz bulunmuyor.${altText}`;
  }

  const aggregationPrompt = aggregatedDomains.length > 0 ? buildAggregationPrompt(aggregatedDomains) : null;

  return {
    detectedDomains,
    policyResults,
    deniedDomains,
    aggregatedDomains,
    allowedDomains,
    shouldBlock: allDenied,
    blockMessage,
    aggregationPrompt,
  };
}
