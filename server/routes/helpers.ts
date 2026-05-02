import type { Response } from "express";
import { hasPermission, type UserRoleType } from "../permission-service";
import { generateBranchSummaryReport } from "../ai";
import { isAiBudgetError } from "../ai-budget-guard";

export function handleApiError(res: Response, error: unknown, context: string): void {
  if (!res.headersSent && isAiBudgetError(error)) {
    const e = error as { message?: string; monthToDateCost?: number; monthlyBudget?: number };
    console.warn(`[${context}] AI_BUDGET_EXCEEDED`);
    res.status(503).json({
      message: e.message || "AI aylık bütçe tavanı aşıldı",
      code: "AI_BUDGET_EXCEEDED",
      monthToDateCost: e.monthToDateCost,
      monthlyBudget: e.monthlyBudget,
    });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message);
  if (!res.headersSent) {
    res.status(500).json({ message: "Sunucu hatası oluştu" });
  }
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  wantsPagination: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function parsePagination(query: Record<string, any>): PaginationParams {
  const wantsPagination = query.pagination === '1' || query.pagination === 'true';
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(query.limit as string) || 50), 200);
  const offset = (page - 1) * limit;
  return { page, limit, offset, wantsPagination };
}

export function wrapPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): T[] | PaginatedResponse<T> {
  if (!params.wantsPagination) {
    return data;
  }
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}

export function sliceForPagination<T>(items: T[], params: PaginationParams): { sliced: T[]; total: number } {
  const total = items.length;
  const sliced = items.slice(params.offset, params.offset + params.limit);
  return { sliced, total };
}

export interface SummaryContext {
  pendingTasks: number;
  activeFaults: number;
  overdueChecklists: number;
  maintenanceReminders: number;
  criticalEquipment: number;
  avgHealth: number;
  period: 'daily' | 'weekly' | 'monthly';
  userId: string;
  role: string;
  branchId?: number;
  branchName?: string;
  totalBranches?: number;
  factoryStats?: { pendingOrders: number; qualityIssues: number };
}

export async function generateBranchSummary(ctx: SummaryContext): Promise<string> {
  try {
    const isHQ = !ctx.branchId || ['admin', 'owner', 'hq_manager', 'finance', 'coach'].includes(ctx.role);
    let scopeName: string;
    if (isHQ) {
      scopeName = "DOSPRESSO Genel Merkez (Tüm Şubeler)";
    } else {
      scopeName = ctx.branchName || `Şube #${ctx.branchId}`;
    }
    return await generateBranchSummaryReport(ctx.period, {
      activeFaults: ctx.activeFaults,
      pendingTasks: ctx.pendingTasks,
      overdueChecklists: ctx.overdueChecklists,
      maintenanceReminders: ctx.maintenanceReminders,
      criticalEquipment: ctx.criticalEquipment,
      totalAbsences: 0,
      slaBreaches: 0,
      averageEquipmentHealth: ctx.avgHealth,
      branchName: scopeName,
      isHQ,
      role: ctx.role,
      totalBranches: ctx.totalBranches,
      factoryStats: ctx.factoryStats
    }, ctx.userId);
  } catch (error: unknown) {
    const periodLabel = ctx.period === 'daily' ? 'Günlük' : ctx.period === 'weekly' ? 'Haftalık' : 'Aylık';
    return `${periodLabel}: ${ctx.activeFaults} arıza, ${ctx.pendingTasks} görev`;
  }
}

const CACHE_MAX_SIZE = 1000;
export const responseCache = new Map<string, { data: any; expiresAt: number }>();

export const getCachedResponse = (key: string) => {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
};

export const setCachedResponse = (key: string, data: unknown, ttlSeconds: number = 60) => {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (v.expiresAt <= now) responseCache.delete(k);
    }
    if (responseCache.size >= CACHE_MAX_SIZE) {
      const oldest = responseCache.keys().next().value;
      if (oldest) responseCache.delete(oldest);
    }
  }
  responseCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const invalidateCache = (pattern: string) => {
  const keysToDelete: string[] = [];
  responseCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => responseCache.delete(key));
};

export class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message || 'Yetkisiz işlem');
    this.name = 'AuthorizationError';
  }
}

export function ensurePermission(user: any, mod: string, action: string, errorMessage?: string): void {
  if (!hasPermission(user.role as UserRoleType, mod, action)) {
    throw new AuthorizationError(errorMessage || `Bu işlem için ${mod} ${action} yetkiniz yok`);
  }
}

export function assertBranchScope(user): number {
  if (!user.branchId) {
    throw new Error("Şube ataması yapılmamış");
  }
  return user.branchId;
}

export const normalizeTimeGlobal = (timeStr: string): string => {
  if (!timeStr) return '08:00';
  const parts = timeStr.split(':');
  const hh = String(parts[0] || '0').padStart(2, '0');
  const mm = String(parts[1] || '0').padStart(2, '0');
  return `${hh}:${mm}`;
};
