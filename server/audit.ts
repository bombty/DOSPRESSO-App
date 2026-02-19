import { Request } from "express";
import { randomUUID } from "crypto";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

export interface AuditContext {
  requestId: string;
  userId?: string;
  actorRole?: string;
  scopeBranchId?: number | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEntryParams {
  eventType: string;
  action: string;
  resource: string;
  resourceId?: string;
  targetResource?: string;
  targetResourceId?: string;
  before?: any;
  after?: any;
  details?: any;
}

export function getAuditContext(req: Request): AuditContext {
  const user = req.user as any;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket?.remoteAddress
    || "unknown";

  return {
    requestId: (req as any).__auditRequestId || randomUUID().replace(/-/g, "").substring(0, 32),
    userId: user?.id || undefined,
    actorRole: user?.role || undefined,
    scopeBranchId: user?.branchId || null,
    ipAddress: ip,
    userAgent: req.headers["user-agent"]?.substring(0, 500) || undefined,
  };
}

export async function createAuditEntry(
  ctx: AuditContext,
  params: AuditEntryParams,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      eventType: params.eventType,
      userId: ctx.userId || null,
      actorRole: ctx.actorRole || null,
      scopeBranchId: ctx.scopeBranchId || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId || null,
      targetResource: params.targetResource || null,
      targetResourceId: params.targetResourceId || null,
      before: params.before || null,
      after: params.after || null,
      details: params.details || null,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
    });
  } catch (error) {
    console.error(`[Audit] Failed to log ${params.eventType}:`, error);
  }
}

export async function auditLog(
  req: Request,
  params: AuditEntryParams,
): Promise<void> {
  const ctx = getAuditContext(req);
  await createAuditEntry(ctx, params);
}

export async function auditLogSystem(
  params: AuditEntryParams & { userId?: string; actorRole?: string },
): Promise<void> {
  const ctx: AuditContext = {
    requestId: randomUUID().replace(/-/g, "").substring(0, 32),
    userId: params.userId,
    actorRole: params.actorRole,
    ipAddress: "system",
    userAgent: "system/background-job",
  };
  await createAuditEntry(ctx, params);
}

export function attachRequestId(req: Request): void {
  if (!(req as any).__auditRequestId) {
    (req as any).__auditRequestId = randomUUID().replace(/-/g, "").substring(0, 32);
  }
}

export function auditMiddleware() {
  return (req: Request, _res: any, next: any) => {
    attachRequestId(req);
    next();
  };
}
