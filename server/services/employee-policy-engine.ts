import { db } from "../db";
import { employeeTypes, employeeTypePolicies, orgEmployeeTypeAssignments, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface EmployeePolicyResult {
  employeeTypeKey: string | null;
  taskPackKey: string | null;
  restrictions: {
    hiddenBuckets: string[];
    maxDailyHours: number | null;
    maxDaysPerWeek: number | null;
    requiresSupervision: boolean;
    ageRestricted: boolean;
  };
  complianceAlerts: Array<{
    type: string;
    title: string;
    severity: 'critical' | 'warning' | 'info';
    count: number;
  }>;
  additionalActions: Array<{
    type: string;
    title: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
    deepLink: string;
    estimatedMinutes: number;
  }>;
}

const DEFAULT_RESULT: EmployeePolicyResult = {
  employeeTypeKey: null,
  taskPackKey: null,
  restrictions: {
    hiddenBuckets: [],
    maxDailyHours: null,
    maxDaysPerWeek: null,
    requiresSupervision: false,
    ageRestricted: false,
  },
  complianceAlerts: [],
  additionalActions: [],
};

export async function getEmployeeTypeForUser(userId: string): Promise<{ key: string; id: number } | null> {
  try {
    const [user] = await db
      .select({ employeeTypeId: users.employeeTypeId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.employeeTypeId) return null;

    const [empType] = await db
      .select({ id: employeeTypes.id, key: employeeTypes.key })
      .from(employeeTypes)
      .where(and(eq(employeeTypes.id, user.employeeTypeId), eq(employeeTypes.active, true)))
      .limit(1);

    if (!empType) return null;

    return { key: empType.key, id: empType.id };
  } catch {
    return null;
  }
}

export async function evaluateEmployeePolicies(userId: string): Promise<EmployeePolicyResult> {
  try {
    const [user] = await db
      .select({
        employeeTypeId: users.employeeTypeId,
        birthDate: users.birthDate,
        branchId: users.branchId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.employeeTypeId) {
      return { ...DEFAULT_RESULT };
    }

    const [empType] = await db
      .select()
      .from(employeeTypes)
      .where(and(eq(employeeTypes.id, user.employeeTypeId), eq(employeeTypes.active, true)))
      .limit(1);

    if (!empType) {
      return { ...DEFAULT_RESULT };
    }

    const policies = await db
      .select()
      .from(employeeTypePolicies)
      .where(and(
        eq(employeeTypePolicies.employeeTypeId, empType.id),
        eq(employeeTypePolicies.active, true),
      ));

    let taskPackKey: string | null = null;
    if (user.branchId) {
      const [assignment] = await db
        .select({ taskPackKey: orgEmployeeTypeAssignments.taskPackKey })
        .from(orgEmployeeTypeAssignments)
        .where(and(
          eq(orgEmployeeTypeAssignments.orgScope, 'branch'),
          eq(orgEmployeeTypeAssignments.orgId, user.branchId),
          eq(orgEmployeeTypeAssignments.employeeTypeId, empType.id),
          eq(orgEmployeeTypeAssignments.active, true),
        ))
        .limit(1);

      if (assignment) {
        taskPackKey = assignment.taskPackKey;
      }
    }

    const restrictions: EmployeePolicyResult['restrictions'] = {
      hiddenBuckets: [],
      maxDailyHours: null,
      maxDaysPerWeek: null,
      requiresSupervision: false,
      ageRestricted: false,
    };

    for (const policy of policies) {
      const json = policy.policyJson as Record<string, any> | null;
      if (!json) continue;

      switch (policy.policyKey) {
        case 'hidden_buckets':
          if (Array.isArray(json.buckets)) {
            restrictions.hiddenBuckets = json.buckets;
          }
          break;
        case 'max_daily_hours':
          if (typeof json.hours === 'number') {
            restrictions.maxDailyHours = json.hours;
          }
          break;
        case 'max_days_per_week':
          if (typeof json.days === 'number') {
            restrictions.maxDaysPerWeek = json.days;
          }
          break;
        case 'requires_supervision':
          restrictions.requiresSupervision = json.value === true;
          break;
      }
    }

    if (empType.maxAge && user.birthDate) {
      const birth = new Date(user.birthDate);
      const now = new Date();
      const ageMs = now.getTime() - birth.getTime();
      const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);

      if (ageYears > empType.maxAge) {
        restrictions.ageRestricted = true;
      }

      const ageMonthsUntilLimit = (empType.maxAge - ageYears) * 12;
      if (ageMonthsUntilLimit >= 0 && ageMonthsUntilLimit <= 3) {
        // Near the age limit (within 3 months)
      }
    }

    const complianceAlerts: EmployeePolicyResult['complianceAlerts'] = [];
    const additionalActions: EmployeePolicyResult['additionalActions'] = [];

    if (restrictions.ageRestricted) {
      complianceAlerts.push({
        type: 'age_compliance',
        title: 'MESEM yaş uyumu kontrol',
        severity: 'critical',
        count: 1,
      });
    } else if (empType.maxAge && user.birthDate) {
      const birth = new Date(user.birthDate);
      const now = new Date();
      const ageYears = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const monthsUntilLimit = (empType.maxAge - ageYears) * 12;

      if (monthsUntilLimit >= 0 && monthsUntilLimit <= 3) {
        complianceAlerts.push({
          type: 'age_compliance',
          title: 'MESEM yaş uyumu kontrol',
          severity: 'warning',
          count: 1,
        });
      }
    }

    if (empType.key === 'mesem') {
      if (restrictions.maxDailyHours !== null) {
        complianceAlerts.push({
          type: 'schedule_compliance',
          title: `MESEM günlük çalışma saati limiti: ${restrictions.maxDailyHours} saat`,
          severity: 'warning',
          count: 1,
        });
      }

      additionalActions.push({
        type: 'mesem_program',
        title: 'MESEM programını kontrol et',
        reason: 'MESEM stajyer programı takibi gerekli',
        severity: 'medium',
        deepLink: '/gorevler',
        estimatedMinutes: 10,
      });
    }

    if (empType.key === 'cleaning') {
      additionalActions.push({
        type: 'cleaning_tasks',
        title: 'Temizlik görevlerini tamamla',
        reason: 'Günlük temizlik görevleri atanmış',
        severity: 'medium',
        deepLink: '/gorevler',
        estimatedMinutes: 15,
      });
    }

    return {
      employeeTypeKey: empType.key,
      taskPackKey,
      restrictions,
      complianceAlerts,
      additionalActions,
    };
  } catch {
    return { ...DEFAULT_RESULT };
  }
}
