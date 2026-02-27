import { db } from "../db";
import { aiDataDomains, aiDomainPolicies, aiAgentLogs } from "@shared/schema";
import { eq, and, sql, asc } from "drizzle-orm";

const VALID_DECISIONS = new Set(["ALLOW", "ALLOW_AGGREGATED", "DENY"]);

export type PolicyDecision = "ALLOW" | "ALLOW_AGGREGATED" | "DENY";
export type RedactionMode = "none" | "no_names" | "initials_only" | "numeric_only";
export type ScopeLevel = "self" | "branch" | "factory" | "hq" | "global";

export const ROLE_GROUP_MAP: Record<string, string> = {
  stajyer: "branch_floor",
  barista: "branch_floor",
  bar_buddy: "branch_floor",
  supervisor_buddy: "branch_floor",
  supervisor: "branch_mgmt",
  mudur: "branch_mgmt",
  coach: "hq_ops",
  trainer: "hq_ops",
  kalite_kontrol: "hq_ops",
  gida_muhendisi: "hq_ops",
  marketing: "hq_ops",
  destek: "hq_ops",
  teknik: "hq_ops",
  operasyon: "hq_ops",
  ekipman_teknik: "hq_ops",
  muhasebe: "hq_finance",
  muhasebe_ik: "hq_finance",
  satinalma: "hq_finance",
  ik: "hq_finance",
  fabrika: "factory",
  fabrika_mudur: "factory",
  fabrika_sorumlu: "factory",
  fabrika_operator: "factory",
  fabrika_personel: "factory",
  fabrika_teknisyen: "factory",
  ceo: "executive",
  cgo: "executive",
  admin: "executive",
};

export const ROLE_GROUP_LABELS: Record<string, string> = {
  branch_floor: "Şube Personel",
  branch_mgmt: "Şube Yönetim",
  hq_ops: "HQ Operasyon",
  hq_finance: "HQ Finans",
  factory: "Fabrika",
  executive: "Yönetim",
};

export const ROLE_GROUP_MEMBERS: Record<string, string[]> = {
  branch_floor: ["stajyer", "barista", "bar_buddy", "supervisor_buddy"],
  branch_mgmt: ["supervisor", "mudur"],
  hq_ops: ["coach", "trainer", "kalite_kontrol", "gida_muhendisi", "marketing", "destek", "teknik", "operasyon", "ekipman_teknik"],
  hq_finance: ["muhasebe", "muhasebe_ik", "satinalma", "ik"],
  factory: ["fabrika", "fabrika_mudur", "fabrika_sorumlu", "fabrika_operator", "fabrika_personel", "fabrika_teknisyen"],
  executive: ["ceo", "cgo", "admin"],
};

export function getRoleGroup(role: string): string {
  return ROLE_GROUP_MAP[role] || "branch_floor";
}

export interface DomainPolicyResult {
  domainKey: string;
  domainLabel: string;
  decision: PolicyDecision;
  scope: ScopeLevel;
  redactionMode: RedactionMode;
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

const REDACTION_PROMPTS: Record<string, string> = {
  no_names: "KESINLIKLE personel ismi, soyismi, TC veya kimlik bilgisi verme. Yalnizca sube/fabrika bazli sayi, oran, risk bandi veya trend bilgisi paylas. Ornek: 'Sube X: 3 personel dusuk performans bandinda' seklinde.",
  initials_only: "Personel isimleri yerine sadece bas harfleri kullan (ornek: A.Y.). TC, email, telefon gibi PII bilgilerini kesinlikle verme.",
  numeric_only: "Yalnizca yuzdesel degisim, sayi ve trend bilgisi ver. Mutlak tutarlar (TL cinsinden), isimler veya bireysel detaylar paylasma.",
  none: "Tam bilgi paylas ancak PII (TC, email, telefon, IBAN, maas) kesinlikle verme.",
};

const DEFAULT_REDACTION_FOR_DOMAIN: Record<string, RedactionMode> = {
  personnel_performance: "no_names",
  factory_costs: "numeric_only",
  procurement_prices: "numeric_only",
  branch_health: "no_names",
  crm: "no_names",
  equipment_faults: "no_names",
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
      redactionMode: aiDomainPolicies.redactionMode,
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
  const roleGroup = getRoleGroup(role);
  const results: DomainPolicyResult[] = [];

  for (const domainKey of domains) {
    let bestMatch: any = null;
    let roleGroupMatch: any = null;

    for (const p of allPolicies) {
      if (p.domainKey !== domainKey) continue;

      if (p.role === role) {
        if (p.employeeType && employeeType && p.employeeType === employeeType) {
          bestMatch = p;
          break;
        }
        if (!p.employeeType && !bestMatch) {
          bestMatch = p;
        }
      }

      if (p.role === roleGroup && !roleGroupMatch) {
        roleGroupMatch = p;
      }
    }

    const matched = bestMatch || roleGroupMatch;
    const decision: PolicyDecision = (matched?.decision as PolicyDecision) || "DENY";
    const rawScope = matched?.scope || "org_wide";
    const scope: ScopeLevel = rawScope === "org_wide" ? "global" : (rawScope as ScopeLevel);
    const redactionMode: RedactionMode = (matched?.redactionMode as RedactionMode) ||
      (decision === "ALLOW_AGGREGATED" ? (DEFAULT_REDACTION_FOR_DOMAIN[domainKey] || "no_names") : "none");

    results.push({
      domainKey,
      domainLabel: DOMAIN_LABELS_TR[domainKey] || domainKey,
      decision,
      scope,
      redactionMode,
    });
  }

  return results;
}

async function getAllowedDomainsForRole(role: string, employeeType: string | null | undefined): Promise<string[]> {
  const allPolicies = await loadPolicies();
  const roleGroup = getRoleGroup(role);
  const allowed: string[] = [];
  const seen = new Set<string>();

  for (const p of allPolicies) {
    if (p.role !== role && p.role !== roleGroup) continue;
    if (seen.has(p.domainKey)) continue;
    seen.add(p.domainKey);

    if (p.decision === "ALLOW" || p.decision === "ALLOW_AGGREGATED") {
      const label = DOMAIN_LABELS_TR[p.domainKey];
      if (label) allowed.push(label);
    }
  }

  return allowed;
}

export function buildAggregationPrompt(aggregatedDomains: DomainPolicyResult[]): string {
  const rules: string[] = [];
  for (const domainResult of aggregatedDomains) {
    const mode = domainResult.redactionMode || "no_names";
    const prompt = REDACTION_PROMPTS[mode] || REDACTION_PROMPTS.no_names;
    rules.push(`[${domainResult.domainLabel}] (maskeleme: ${mode}): ${prompt}`);
  }
  return rules.join("\n");
}

export function buildScopePrompt(scopeResults: DomainPolicyResult[]): string {
  const scopeInstructions: string[] = [];
  const scopeSet = new Set<ScopeLevel>();

  for (const r of scopeResults) {
    if (r.decision === "DENY") continue;
    scopeSet.add(r.scope);
  }

  if (scopeSet.has("self")) {
    scopeInstructions.push("SELF SCOPE: Bazi alanlarda yalnizca kullanicinin kendi verileriyle cevap ver. Baska personelin verilerini paylasma.");
  }
  if (scopeSet.has("branch")) {
    scopeInstructions.push("BRANCH SCOPE: Bazi alanlarda yalnizca kullanicinin kendi subesindeki verilerle cevap ver. Diger subelerin verilerini paylasma.");
  }
  if (scopeSet.has("factory")) {
    scopeInstructions.push("FACTORY SCOPE: Bazi alanlarda yalnizca fabrika scope'undaki verilerle cevap ver.");
  }
  if (scopeSet.has("hq")) {
    scopeInstructions.push("HQ SCOPE: Bazi alanlarda tum subeler/fabrika genelindeki verilere erisebilir.");
  }

  return scopeInstructions.join("\n");
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
  scopePrompt: string | null;
  roleGroup: string;
}> {
  const startTime = Date.now();
  const detectedDomains = classifyIntent(question);
  const roleGroup = getRoleGroup(role);

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
      scopePrompt: null,
      roleGroup,
    };
  }

  const policyResults = await checkPolicy(role, employeeType, detectedDomains);

  const deniedDomains = policyResults.filter(p => p.decision === "DENY").map(p => p.domainKey);
  const aggregatedResults = policyResults.filter(p => p.decision === "ALLOW_AGGREGATED");
  const aggregatedDomains = aggregatedResults.map(p => p.domainKey);
  const allowedDomains = policyResults.filter(p => p.decision === "ALLOW").map(p => p.domainKey);

  const allDenied = policyResults.length > 0 && policyResults.every(p => p.decision === "DENY");

  const redactionApplied = aggregatedDomains.length > 0;
  const redactionModes = aggregatedResults.map(r => r.redactionMode).filter(Boolean);
  const scopeLevels = policyResults.filter(p => p.decision !== "DENY").map(p => p.scope);

  try {
    await db.insert(aiAgentLogs).values({
      runType: "dobody_chat",
      triggeredByUserId: userId,
      targetRoleScope: `${role}(${roleGroup})`,
      branchId: branchId || null,
      inputSummary: `domains:${detectedDomains.join(",")} | decisions:${policyResults.map(p => `${p.domainKey}=${p.decision}`).join(",")}${redactionApplied ? ` | redaction:${redactionModes.join(",")}` : ""} | scopes:${scopeLevels.join(",")}`,
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

  const aggregationPrompt = aggregatedResults.length > 0 ? buildAggregationPrompt(aggregatedResults) : null;
  const scopePrompt = buildScopePrompt(policyResults);

  return {
    detectedDomains,
    policyResults,
    deniedDomains,
    aggregatedDomains,
    allowedDomains,
    shouldBlock: allDenied,
    blockMessage,
    aggregationPrompt,
    scopePrompt: scopePrompt || null,
    roleGroup,
  };
}
