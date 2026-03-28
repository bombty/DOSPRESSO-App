import { requireManifestAccess } from "../services/manifest-auth";
import { Router } from "express";
import { db } from "../db";
import { 
  franchiseInvestors, 
  franchiseInvestorBranches, 
  franchiseInvestorNotes,
  branches,
  users,
  customerFeedback,
  insertFranchiseInvestorSchema,
  insertFranchiseInvestorNoteSchema,
} from "@shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

const INVESTOR_ROLES = ["admin", "ceo", "cgo"];

function hasInvestorAccess(role: string): boolean {
  return INVESTOR_ROLES.includes(role);
}

router.get("/api/franchise/investors", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!hasInvestorAccess(user.role)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const investors = await db
      .select()
      .from(franchiseInvestors)
      .where(eq(franchiseInvestors.isDeleted, false))
      .orderBy(desc(franchiseInvestors.createdAt));

    const investorsWithBranches = await Promise.all(
      investors.map(async (investor) => {
        const investorBranches = await db
          .select({
            id: franchiseInvestorBranches.id,
            branchId: franchiseInvestorBranches.branchId,
            ownershipPercentage: franchiseInvestorBranches.ownershipPercentage,
            branchName: branches.name,
          })
          .from(franchiseInvestorBranches)
          .leftJoin(branches, eq(franchiseInvestorBranches.branchId, branches.id))
          .where(eq(franchiseInvestorBranches.investorId, investor.id));

        const branchIds = investorBranches.map((b) => b.branchId).filter(Boolean);
        let avgRating = 0;
        if (branchIds.length > 0) {
          try {
            const ratings = await db.execute(
              sql`SELECT AVG(overall_rating)::float as avg_rating FROM customer_feedback WHERE branch_id = ANY(${branchIds})`
            );
            const rows = Array.isArray(ratings) ? ratings : (ratings as any).rows || [];
            avgRating = Number(rows[0]?.avg_rating ?? 0);
          } catch { avgRating = 0; }
        }

        return {
          ...investor,
          branches: investorBranches,
          avgRating: Number(avgRating.toFixed(1)),
        };
      })
    );

    res.json(investorsWithBranches);
  } catch (error: unknown) {
    console.error("Error fetching investors:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.get("/api/franchise/investors/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!hasInvestorAccess(user.role)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const investorId = Number(req.params.id);
    const [investor] = await db
      .select()
      .from(franchiseInvestors)
      .where(and(eq(franchiseInvestors.id, investorId), eq(franchiseInvestors.isDeleted, false)));

    if (!investor) {
      return res.status(404).json({ message: "Yatırımcı bulunamadı" });
    }

    const investorBranches = await db
      .select({
        id: franchiseInvestorBranches.id,
        branchId: franchiseInvestorBranches.branchId,
        ownershipPercentage: franchiseInvestorBranches.ownershipPercentage,
        branchName: branches.name,
      })
      .from(franchiseInvestorBranches)
      .leftJoin(branches, eq(franchiseInvestorBranches.branchId, branches.id))
      .where(eq(franchiseInvestorBranches.investorId, investorId));

    const notes = await db
      .select({
        id: franchiseInvestorNotes.id,
        title: franchiseInvestorNotes.title,
        content: franchiseInvestorNotes.content,
        noteType: franchiseInvestorNotes.noteType,
        createdAt: franchiseInvestorNotes.createdAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(franchiseInvestorNotes)
      .leftJoin(users, eq(franchiseInvestorNotes.createdBy, users.id))
      .where(eq(franchiseInvestorNotes.investorId, investorId))
      .orderBy(desc(franchiseInvestorNotes.createdAt));

    res.json({
      ...investor,
      branches: investorBranches,
      notes,
    });
  } catch (error: unknown) {
    console.error("Error fetching investor detail:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.get("/api/franchise/investors/:id/performance", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!hasInvestorAccess(user.role)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const investorId = Number(req.params.id);
    const investorBranches = await db
      .select({
        branchId: franchiseInvestorBranches.branchId,
        ownershipPercentage: franchiseInvestorBranches.ownershipPercentage,
        branchName: branches.name,
        healthScore: branches.healthScore,
      })
      .from(franchiseInvestorBranches)
      .leftJoin(branches, eq(franchiseInvestorBranches.branchId, branches.id))
      .where(eq(franchiseInvestorBranches.investorId, investorId));

    const branchPerformances = await Promise.all(
      investorBranches.map(async (b) => {
        if (!b.branchId) return { ...b, avgRating: 0, staffCount: 0 };

        let ratingAvg = 0;
        try {
          const ratingRows = await db.execute(
            sql`SELECT AVG(overall_rating)::float as avg_rating FROM customer_feedback WHERE branch_id = ${b.branchId}`
          );
          const rows = Array.isArray(ratingRows) ? ratingRows : (ratingRows as any).rows || [];
          ratingAvg = Number(rows[0]?.avg_rating ?? 0);
        } catch { ratingAvg = 0; }

        const [staffResult] = await db
          .select({ count: count() })
          .from(users)
          .where(and(eq(users.branchId, b.branchId), eq(users.isActive, true)));

        return {
          ...b,
          avgRating: Number(ratingAvg.toFixed(1)),
          staffCount: Number(staffResult?.count ?? 0),
        };
      })
    );

    const totalStaff = branchPerformances.reduce((sum, b) => sum + b.staffCount, 0);
    const avgHealth = branchPerformances.length > 0
      ? branchPerformances.reduce((sum, b) => sum + Number(b.healthScore ?? 0), 0) / branchPerformances.length
      : 0;

    res.json({
      branches: branchPerformances,
      totalStaff,
      avgHealth: Number(avgHealth.toFixed(0)),
    });
  } catch (error: unknown) {
    console.error("Error fetching investor performance:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.post("/api/franchise/investors", isAuthenticated, requireManifestAccess("admin", "create"), async (req, res) => {
  try {
    const user = req.user as any;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Sadece admin yatırımcı oluşturabilir" });
    }

    const parsed = insertFranchiseInvestorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const [newInvestor] = await db.insert(franchiseInvestors).values(parsed.data).returning();

    if (req.body.branchIds && Array.isArray(req.body.branchIds)) {
      for (const branchId of req.body.branchIds) {
        await db.insert(franchiseInvestorBranches).values({
          investorId: newInvestor.id,
          branchId: Number(branchId),
        });
      }
    }

    res.status(201).json(newInvestor);
  } catch (error: unknown) {
    console.error("Error creating investor:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.patch("/api/franchise/investors/:id", isAuthenticated, requireManifestAccess("admin", "edit"), async (req, res) => {
  try {
    const user = req.user as any;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Sadece admin düzenleyebilir" });
    }

    const investorId = Number(req.params.id);
    const { branchIds, ...updateData } = req.body;

    const [updated] = await db
      .update(franchiseInvestors)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(franchiseInvestors.id, investorId), eq(franchiseInvestors.isDeleted, false)))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Yatırımcı bulunamadı" });
    }

    if (branchIds && Array.isArray(branchIds)) {
      await db.delete(franchiseInvestorBranches).where(eq(franchiseInvestorBranches.investorId, investorId));
      for (const branchId of branchIds) {
        await db.insert(franchiseInvestorBranches).values({
          investorId,
          branchId: Number(branchId),
        });
      }
    }

    res.json(updated);
  } catch (error: unknown) {
    console.error("Error updating investor:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.post("/api/franchise/investors/:id/notes", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (!hasInvestorAccess(user.role)) {
      return res.status(403).json({ message: "Erişim reddedildi" });
    }

    const investorId = Number(req.params.id);
    const [investor] = await db
      .select({ id: franchiseInvestors.id })
      .from(franchiseInvestors)
      .where(and(eq(franchiseInvestors.id, investorId), eq(franchiseInvestors.isDeleted, false)));

    if (!investor) {
      return res.status(404).json({ message: "Yatırımcı bulunamadı" });
    }

    const noteData = {
      ...req.body,
      investorId,
      createdBy: user.id,
    };

    const parsed = insertFranchiseInvestorNoteSchema.safeParse(noteData);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
    }

    const [note] = await db.insert(franchiseInvestorNotes).values(parsed.data).returning();
    res.status(201).json(note);
  } catch (error: unknown) {
    console.error("Error creating note:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.delete("/api/franchise/investors/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Sadece admin silebilir" });
    }

    const investorId = Number(req.params.id);
    const [updated] = await db
      .update(franchiseInvestors)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(franchiseInvestors.id, investorId), eq(franchiseInvestors.isDeleted, false)))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Yatırımcı bulunamadı" });
    }

    res.json({ message: "Yatırımcı silindi" });
  } catch (error: unknown) {
    console.error("Error deleting investor:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

export default router;
