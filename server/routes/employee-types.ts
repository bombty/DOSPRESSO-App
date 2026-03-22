import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import {
  employeeTypes,
  employeeTypePolicies,
  orgEmployeeTypeAssignments,
  users,
  insertEmployeeTypeSchema,
  insertEmployeeTypePolicySchema,
  insertOrgEmployeeTypeAssignmentSchema,
} from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { handleApiError } from "./helpers";

const router = Router();

function isAdmin(req: any, res: any): boolean {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Admin yetkisi gereklidir" });
    return false;
  }
  return true;
}

router.get("/api/admin/employee-types", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const types = await db
      .select({
        id: employeeTypes.id,
        key: employeeTypes.key,
        name: employeeTypes.name,
        description: employeeTypes.description,
        minAge: employeeTypes.minAge,
        maxAge: employeeTypes.maxAge,
        allowedGroups: employeeTypes.allowedGroups,
        active: employeeTypes.active,
        createdAt: employeeTypes.createdAt,
        updatedAt: employeeTypes.updatedAt,
        policiesCount: count(employeeTypePolicies.id),
      })
      .from(employeeTypes)
      .leftJoin(employeeTypePolicies, eq(employeeTypePolicies.employeeTypeId, employeeTypes.id))
      .groupBy(employeeTypes.id)
      .orderBy(employeeTypes.name);

    res.json(types);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee types list error");
  }
});

router.post("/api/admin/employee-types", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const parsed = insertEmployeeTypeSchema.parse(req.body);
    const [created] = await db.insert(employeeTypes).values([{
      ...parsed,
      allowedGroups: parsed.allowedGroups as string[] | undefined,
    }]).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type create error");
  }
});

router.patch("/api/admin/employee-types/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [updated] = await db
      .update(employeeTypes)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(employeeTypes.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Çalışan tipi bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type update error");
  }
});

router.delete("/api/admin/employee-types/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [updated] = await db
      .update(employeeTypes)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(employeeTypes.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Çalışan tipi bulunamadı" });
    res.json({ message: "Çalışan tipi devre dışı bırakıldı", id });
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type soft delete error");
  }
});

router.get("/api/admin/employee-types/:typeId/policies", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const typeId = parseInt(req.params.typeId);
    if (isNaN(typeId)) return res.status(400).json({ message: "Geçersiz tip ID" });

    const policies = await db
      .select()
      .from(employeeTypePolicies)
      .where(eq(employeeTypePolicies.employeeTypeId, typeId))
      .orderBy(employeeTypePolicies.policyKey);

    res.json(policies);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type policies list error");
  }
});

router.post("/api/admin/employee-types/:typeId/policies", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const typeId = parseInt(req.params.typeId);
    if (isNaN(typeId)) return res.status(400).json({ message: "Geçersiz tip ID" });

    const parsed = insertEmployeeTypePolicySchema.parse({
      ...req.body,
      employeeTypeId: typeId,
    });
    const [created] = await db.insert(employeeTypePolicies).values(parsed).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type policy create error");
  }
});

router.patch("/api/admin/employee-type-policies/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [updated] = await db
      .update(employeeTypePolicies)
      .set(req.body)
      .where(eq(employeeTypePolicies.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Politika bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type policy update error");
  }
});

router.delete("/api/admin/employee-type-policies/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [deleted] = await db
      .delete(employeeTypePolicies)
      .where(eq(employeeTypePolicies.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Politika bulunamadı" });
    res.json({ message: "Politika silindi", id });
  } catch (error: unknown) {
    handleApiError(res, error, "Employee type policy delete error");
  }
});

router.get("/api/admin/org-assignments", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const assignments = await db
      .select({
        id: orgEmployeeTypeAssignments.id,
        orgScope: orgEmployeeTypeAssignments.orgScope,
        orgId: orgEmployeeTypeAssignments.orgId,
        employeeTypeId: orgEmployeeTypeAssignments.employeeTypeId,
        taskPackKey: orgEmployeeTypeAssignments.taskPackKey,
        active: orgEmployeeTypeAssignments.active,
        createdAt: orgEmployeeTypeAssignments.createdAt,
        employeeTypeName: employeeTypes.name,
      })
      .from(orgEmployeeTypeAssignments)
      .leftJoin(employeeTypes, eq(employeeTypes.id, orgEmployeeTypeAssignments.employeeTypeId))
      .orderBy(orgEmployeeTypeAssignments.orgScope, orgEmployeeTypeAssignments.orgId);

    res.json(assignments);
  } catch (error: unknown) {
    handleApiError(res, error, "Org assignments list error");
  }
});

router.post("/api/admin/org-assignments", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const parsed = insertOrgEmployeeTypeAssignmentSchema.parse(req.body);
    const [created] = await db.insert(orgEmployeeTypeAssignments).values(parsed).returning();
    res.status(201).json(created);
  } catch (error: unknown) {
    handleApiError(res, error, "Org assignment create error");
  }
});

router.patch("/api/admin/org-assignments/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [updated] = await db
      .update(orgEmployeeTypeAssignments)
      .set(req.body)
      .where(eq(orgEmployeeTypeAssignments.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Atama bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "Org assignment update error");
  }
});

router.delete("/api/admin/org-assignments/:id", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Geçersiz ID" });

    const [deleted] = await db
      .delete(orgEmployeeTypeAssignments)
      .where(eq(orgEmployeeTypeAssignments.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Atama bulunamadı" });
    res.json({ message: "Atama silindi", id });
  } catch (error: unknown) {
    handleApiError(res, error, "Org assignment delete error");
  }
});

router.patch("/api/admin/users/:userId/employee-type", isAuthenticated, async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "Geçersiz kullanıcı ID" });

    const { employeeTypeId } = req.body;

    const [updated] = await db
      .update(users)
      .set({ employeeTypeId: employeeTypeId ?? null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, employeeTypeId: users.employeeTypeId });

    if (!updated) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    res.json(updated);
  } catch (error: unknown) {
    handleApiError(res, error, "User employee type assign error");
  }
});

router.get("/api/employee-types/active", isAuthenticated, async (req, res) => {
  try {
    const activeTypes = await db
      .select({
        id: employeeTypes.id,
        key: employeeTypes.key,
        name: employeeTypes.name,
        description: employeeTypes.description,
      })
      .from(employeeTypes)
      .where(eq(employeeTypes.active, true))
      .orderBy(employeeTypes.name);

    res.json(activeTypes);
  } catch (error: unknown) {
    handleApiError(res, error, "Active employee types list error");
  }
});

export default router;
