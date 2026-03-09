import { db } from "../db";
import { storage } from "../storage";
import { agentRoutingRules, agentRejectionPatterns, users } from "@shared/schema";
import { eq, and, gt, or } from "drizzle-orm";

export interface RoutingResult {
  targetRole: string;
  targetUserId: string | null;
  escalationDate: Date | null;
  escalationRole: string | null;
}

async function findUserByRoleAndBranch(role: string, branchId: number): Promise<{ id: string; firstName: string | null; lastName: string | null } | null> {
  const [user] = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
  }).from(users).where(
    and(
      eq(users.role, role),
      eq(users.branchId, branchId),
      eq(users.isActive, true)
    )
  ).limit(1);
  return user || null;
}

async function findActiveUserByRole(role: string): Promise<{ id: string; firstName: string | null; lastName: string | null } | null> {
  const [user] = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
  }).from(users).where(
    and(
      eq(users.role, role),
      eq(users.isActive, true)
    )
  ).limit(1);
  return user || null;
}

export async function routeAgentAction(action: {
  category?: string;
  subcategory?: string;
  targetUserId?: string;
  branchId?: number;
  title?: string;
  description?: string;
}): Promise<RoutingResult | null> {
  if (!action.category) {
    return { targetRole: "cgo", targetUserId: null, escalationDate: null, escalationRole: null };
  }

  try {
    const conditions: any[] = [
      eq(agentRoutingRules.category, action.category),
      eq(agentRoutingRules.isActive, true),
    ];
    if (action.subcategory) {
      conditions.push(eq(agentRoutingRules.subcategory, action.subcategory));
    }

    const [rule] = await db.select().from(agentRoutingRules)
      .where(and(...conditions))
      .limit(1);

    if (!rule) {
      return { targetRole: "cgo", targetUserId: null, escalationDate: null, escalationRole: null };
    }

    if (action.targetUserId) {
      const [recentRejection] = await db.select({ id: agentRejectionPatterns.id })
        .from(agentRejectionPatterns)
        .where(and(
          eq(agentRejectionPatterns.targetUserId, action.targetUserId),
          eq(agentRejectionPatterns.category, action.category),
          gt(agentRejectionPatterns.expiresAt, new Date())
        ))
        .limit(1);

      if (recentRejection) {
        return null;
      }
    }

    const branchRoles = ["supervisor", "mudur", "fabrika_mudur"];
    let recipientUser: { id: string; firstName: string | null; lastName: string | null } | null = null;

    if (branchRoles.includes(rule.primaryRole) && action.branchId) {
      recipientUser = await findUserByRoleAndBranch(rule.primaryRole, action.branchId);
    }
    if (!recipientUser) {
      recipientUser = await findActiveUserByRole(rule.primaryRole);
    }

    if (rule.secondaryRole) {
      let secondaryUser: { id: string } | null = null;
      if (branchRoles.includes(rule.secondaryRole) && action.branchId) {
        secondaryUser = await findUserByRoleAndBranch(rule.secondaryRole, action.branchId);
      }
      if (!secondaryUser) {
        secondaryUser = await findActiveUserByRole(rule.secondaryRole);
      }
      if (secondaryUser) {
        try {
          await storage.createNotification({
            userId: secondaryUser.id,
            type: "agent_info",
            title: `[Bilgi] ${action.title || "Agent bildirimi"}`,
            message: action.description || "",
            link: "/agent-merkezi",
            isRead: false,
          });
        } catch {}
      }
    }

    const escalationDate = rule.escalationDays
      ? new Date(Date.now() + rule.escalationDays * 86400000)
      : null;

    return {
      targetRole: rule.primaryRole,
      targetUserId: recipientUser?.id || null,
      escalationDate,
      escalationRole: rule.escalationRole || null,
    };
  } catch (err) {
    console.error("[AgentRouting] Routing error:", err);
    return { targetRole: "cgo", targetUserId: null, escalationDate: null, escalationRole: null };
  }
}
