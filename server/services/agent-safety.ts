import { z } from "zod";
import { db } from "../db";
import { agentPendingActions } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getRoleGroup, checkPolicy, type DomainPolicyResult } from "./ai-policy-engine";

const VALID_ACTION_TYPES = ["remind", "escalate", "report", "suggest_task", "alert"] as const;
export type AgentActionType = typeof VALID_ACTION_TYPES[number];

const MAX_ACTIONS_PER_BATCH = 5;
const MAX_ACTIONS_PER_USER_PER_DAY = 20;

const BLOCKED_PATTERNS: RegExp[] = [
  /\b\d{11}\b/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b\d{10,11}\b/,
  /\bT\.?C\.?\s*\d{11}\b/i,
  /\bIBAN\b/i,
  /\bTR\d{24,26}\b/i,
  /\bmaaş\b/i,
  /\bücreti?\b/i,
  /\bbordro\b/i,
  /\bsalary\b/i,
];

const HARMFUL_ACTION_PATTERNS: RegExp[] = [
  /kalite\s*(düşür|azalt|kıs)/i,
  /fiyat\s*(düşür|indir|kır)/i,
  /personel\s*(at|çıkar|kov)/i,
  /müşteri\s*(reddet|geri çevir)/i,
  /şube\s*(kapat|durdur)/i,
  /marka\s*(zarar|kötü|olumsuz)/i,
  /yasadışı/i,
  /hile|dolandır/i,
  /vergi\s*kaçır/i,
];

const NEGATIVE_BRAND_PATTERNS: RegExp[] = [
  /dospresso.*(kötü|başarısız|berbat|rezalet)/i,
  /(kötü|başarısız|berbat|rezalet).*dospresso/i,
  /rakip.*(daha iyi|üstün|tercih)/i,
];

export const SYSTEM_PROMPT_POLICY = `Sen DOSPRESSO'nun AI Agent'isin (Mr. Dobody). Aşağıdaki kurallara MUTLAKA uy:

1. DOSPRESSO LEHİNE: Her öneride DOSPRESSO'nun çıkarlarını koru. Markaya, çalışanlara veya müşterilere zarar verecek hiçbir öneri yapma.
2. ZARAR VERMEME: Kalite düşürme, personel hakları ihlali, müşteri memnuniyetini azaltma gibi öneriler YASAK.
3. PII KORUMA: Kişisel bilgileri (TC, email, telefon, IBAN, maaş, adres) ASLA paylaşma veya öneri metnine dahil etme.
4. FİNANSAL TALİMAT YASAĞI: Para transferi, ödeme yapma, fiyat değiştirme gibi doğrudan finansal talimatlar verme. Sadece "kontrol et" veya "incele" önerebilirsin.
5. YALNIZCA İZİNLİ AKSİYONLAR: Sadece şu aksiyon tiplerini üretebilirsin: remind, escalate, report, suggest_task, alert.
6. READ-ONLY PRENSIP: Sadece gözlem ve öneri yap. Doğrudan veri değişikliği veya işlem yapma.
7. SEVERİTY DÜRÜSTLÜĞÜ: Risk seviyelerini abartma veya küçümseme. Gerçek verilere dayalı değerlendirme yap.
8. TÜRKÇE YANIT: Tüm öneriler Türkçe olmalı.`;

export const AgentActionSchema = z.object({
  actionType: z.enum(VALID_ACTION_TYPES),
  targetUserId: z.number().int().positive().nullable().optional(),
  targetRoleScope: z.string().max(30).nullable().optional(),
  branchId: z.number().int().positive().nullable().optional(),
  title: z.string().min(3).max(255),
  description: z.string().max(2000).nullable().optional(),
  deepLink: z.string().max(500).nullable().optional(),
  severity: z.enum(["low", "med", "high", "critical"]),
  metadata: z.record(z.any()).optional(),
});

export type AgentActionInput = z.infer<typeof AgentActionSchema>;

export const AgentBatchOutputSchema = z.object({
  actions: z.array(AgentActionSchema).max(MAX_ACTIONS_PER_BATCH),
});

export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
  redactedAction?: AgentActionInput;
}

export interface BatchSafetyResult {
  passed: boolean;
  totalViolations: string[];
  approvedActions: AgentActionInput[];
  rejectedActions: Array<{ action: AgentActionInput; reasons: string[] }>;
}

function redactPII(text: string): string {
  let result = text;
  result = result.replace(/\b\d{11}\b/g, "[TC_REDACTED]");
  result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]");
  result = result.replace(/\bTR\d{24,26}\b/gi, "[IBAN_REDACTED]");
  result = result.replace(/\b0?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, "[PHONE_REDACTED]");
  return result;
}

function checkTextForPII(text: string): string[] {
  const violations: string[] = [];
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`PII tespit edildi: ${pattern.source}`);
    }
  }
  return violations;
}

function checkForHarmfulContent(text: string): string[] {
  const violations: string[] = [];
  for (const pattern of HARMFUL_ACTION_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Zararlı aksiyon tespit edildi: ${pattern.source}`);
    }
  }
  for (const pattern of NEGATIVE_BRAND_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Olumsuz marka referansı tespit edildi: ${pattern.source}`);
    }
  }
  return violations;
}

export function validateActionType(actionType: string): boolean {
  return (VALID_ACTION_TYPES as readonly string[]).includes(actionType);
}

export function checkSingleAction(action: AgentActionInput): SafetyCheckResult {
  const violations: string[] = [];

  if (!validateActionType(action.actionType)) {
    violations.push(`Geçersiz aksiyon tipi: ${action.actionType}. İzin verilenler: ${VALID_ACTION_TYPES.join(", ")}`);
  }

  const textsToCheck = [action.title, action.description || ""].filter(Boolean);
  for (const text of textsToCheck) {
    violations.push(...checkTextForPII(text));
    violations.push(...checkForHarmfulContent(text));
  }

  if (violations.length > 0) {
    const redactedAction = { ...action };
    redactedAction.title = redactPII(redactedAction.title);
    if (redactedAction.description) {
      redactedAction.description = redactPII(redactedAction.description);
    }

    const piiViolations = violations.filter(v => v.startsWith("PII"));
    const harmViolations = violations.filter(v => !v.startsWith("PII"));

    if (harmViolations.length > 0) {
      return { passed: false, violations, redactedAction };
    }

    if (piiViolations.length > 0 && harmViolations.length === 0) {
      return { passed: true, violations: piiViolations, redactedAction };
    }
  }

  return { passed: true, violations: [] };
}

export function checkBatchActions(actions: AgentActionInput[]): BatchSafetyResult {
  const totalViolations: string[] = [];
  const approvedActions: AgentActionInput[] = [];
  const rejectedActions: Array<{ action: AgentActionInput; reasons: string[] }> = [];

  if (actions.length > MAX_ACTIONS_PER_BATCH) {
    totalViolations.push(`Toplu aksiyon limiti aşıldı: ${actions.length}/${MAX_ACTIONS_PER_BATCH}`);
    const trimmed = actions.slice(0, MAX_ACTIONS_PER_BATCH);
    const excess = actions.slice(MAX_ACTIONS_PER_BATCH);
    for (const a of excess) {
      rejectedActions.push({ action: a, reasons: ["Batch limit aşıldı"] });
    }
    actions = trimmed;
  }

  for (const action of actions) {
    const result = checkSingleAction(action);
    if (result.passed) {
      approvedActions.push(result.redactedAction || action);
    } else {
      rejectedActions.push({ action, reasons: result.violations });
      totalViolations.push(...result.violations);
    }
  }

  return {
    passed: rejectedActions.length === 0 && totalViolations.length === 0,
    totalViolations,
    approvedActions,
    rejectedActions,
  };
}

export async function checkDailyActionLimit(targetUserId: string): Promise<{ allowed: boolean; currentCount: number; limit: number }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agentPendingActions)
    .where(
      and(
        eq(agentPendingActions.targetUserId, targetUserId),
        gte(agentPendingActions.createdAt, todayStart)
      )
    );

  const currentCount = result[0]?.count ?? 0;

  return {
    allowed: currentCount < MAX_ACTIONS_PER_USER_PER_DAY,
    currentCount,
    limit: MAX_ACTIONS_PER_USER_PER_DAY,
  };
}

export function validateLLMOutput(rawOutput: string): { valid: boolean; actions: AgentActionInput[]; errors: string[] } {
  const errors: string[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    return { valid: false, actions: [], errors: ["LLM çıktısı geçerli JSON değil"] };
  }

  const schemaResult = AgentBatchOutputSchema.safeParse(parsed);
  if (!schemaResult.success) {
    const zodErrors = schemaResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
    return { valid: false, actions: [], errors: zodErrors };
  }

  const batchResult = checkBatchActions(schemaResult.data.actions);

  if (batchResult.rejectedActions.length > 0) {
    for (const rejected of batchResult.rejectedActions) {
      errors.push(`Reddedilen aksiyon "${rejected.action.title}": ${rejected.reasons.join(", ")}`);
    }
  }

  return {
    valid: batchResult.approvedActions.length > 0,
    actions: batchResult.approvedActions,
    errors,
  };
}

export async function enforceRoleDomainAccess(
  role: string,
  employeeType: string | null | undefined,
  actions: AgentActionInput[]
): Promise<{ allowed: AgentActionInput[]; denied: Array<{ action: AgentActionInput; reason: string }> }> {
  const roleGroup = getRoleGroup(role);
  const allowed: AgentActionInput[] = [];
  const denied: Array<{ action: AgentActionInput; reason: string }> = [];

  for (const action of actions) {
    const domainKey = mapActionTypeToDomain(action.actionType, action.metadata);

    if (!domainKey) {
      allowed.push(action);
      continue;
    }

    try {
      const policyResults = await checkPolicy(role, employeeType, [domainKey]);
      const policy = policyResults[0];

      if (policy && policy.decision === "DENY") {
        denied.push({
          action,
          reason: `Rol "${role}" (grup: ${roleGroup}) için "${domainKey}" domain erişimi engellendi`,
        });
      } else {
        allowed.push(action);
      }
    } catch {
      allowed.push(action);
    }
  }

  return { allowed, denied };
}

function mapActionTypeToDomain(actionType: string, metadata?: Record<string, any>): string | null {
  const domain = metadata?.domain;
  if (domain && typeof domain === "string") {
    return domain;
  }

  switch (actionType) {
    case "remind":
      return "checklists";
    case "escalate":
      return "branch_health";
    case "report":
      return "personnel_performance";
    case "alert":
      return "equipment_faults";
    default:
      return null;
  }
}

export function getSystemPromptPolicy(): string {
  return SYSTEM_PROMPT_POLICY;
}

export function getMaxActionsPerBatch(): number {
  return MAX_ACTIONS_PER_BATCH;
}

export function getMaxActionsPerUserPerDay(): number {
  return MAX_ACTIONS_PER_USER_PER_DAY;
}

export async function runFullSafetyPipeline(
  rawLLMOutput: string,
  targetUserId: number,
  role: string,
  employeeType: string | null | undefined
): Promise<{
  passed: boolean;
  actions: AgentActionInput[];
  violations: string[];
  dailyLimitReached: boolean;
}> {
  const allViolations: string[] = [];

  const dailyCheck = await checkDailyActionLimit(targetUserId);
  if (!dailyCheck.allowed) {
    return {
      passed: false,
      actions: [],
      violations: [`Günlük aksiyon limiti aşıldı: ${dailyCheck.currentCount}/${dailyCheck.limit}`],
      dailyLimitReached: true,
    };
  }

  const llmValidation = validateLLMOutput(rawLLMOutput);
  if (!llmValidation.valid && llmValidation.actions.length === 0) {
    return {
      passed: false,
      actions: [],
      violations: llmValidation.errors,
      dailyLimitReached: false,
    };
  }
  allViolations.push(...llmValidation.errors);

  const domainCheck = await enforceRoleDomainAccess(role, employeeType, llmValidation.actions);
  for (const d of domainCheck.denied) {
    allViolations.push(d.reason);
  }

  const remainingSlots = MAX_ACTIONS_PER_USER_PER_DAY - dailyCheck.currentCount;
  const finalActions = domainCheck.allowed.slice(0, remainingSlots);

  return {
    passed: finalActions.length > 0,
    actions: finalActions,
    violations: allViolations,
    dailyLimitReached: remainingSlots <= 0,
  };
}
