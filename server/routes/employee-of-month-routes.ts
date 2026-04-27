import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, desc, and, sql, count, sum, notInArray } from "drizzle-orm";
import {
  branches,
  users,
  employeeOfMonthWeights,
  employeeOfMonthAwards,
  monthlyEmployeePerformance,
  managerMonthlyRatings,
  staffQrRatings,
  supportTickets,
} from "@shared/schema";

const router = Router();

  // ========================================
  // AYIN ELEMANI (EMPLOYEE OF MONTH) API
  // ========================================

  // GET /api/employee-of-month/rankings - Siralama listesi
  router.get("/api/employee-of-month/rankings", isAuthenticated, async (req, res) => {
    try {
      const { month, year, branchId } = req.query;
      const m = parseInt(month as string) || new Date().getMonth() + 1;
      const y = parseInt(year as string) || new Date().getFullYear();
      
      let conditions = [
        eq(monthlyEmployeePerformance.month, m),
        eq(monthlyEmployeePerformance.year, y)
      ];
      
      if (branchId && branchId !== "all") {
        conditions.push(eq(monthlyEmployeePerformance.branchId, parseInt(branchId as string)));
      }
      
      const rankings = await db.select().from(monthlyEmployeePerformance)
        .where(and(...conditions))
        .orderBy(desc(monthlyEmployeePerformance.totalScore));
      
      const enriched = await Promise.all(rankings.map(async (r) => {
        const [employee] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, r.employeeId)).limit(1);
        const [branch] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, r.branchId)).limit(1);
        return { ...r, employee, branch };
      }));
      
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching rankings:", error);
      res.status(500).json({ message: "Siralama alinamadi" });
    }
  });

  // POST /api/employee-of-month/calculate - Hesaplama yap
  router.post("/api/employee-of-month/calculate", isAuthenticated, async (req, res) => {
    try {
      const { month, year, branchId } = req.body;
      const m = month || new Date().getMonth() + 1;
      const y = year || new Date().getFullYear();
      
      // Get weights
      const [weights] = await db.select().from(employeeOfMonthWeights).limit(1);
      const w = weights || {
        attendanceWeight: 20, checklistWeight: 20, taskWeight: 15,
        customerRatingWeight: 15, managerRatingWeight: 20, leaveDeductionWeight: 10
      };
      
      // Get employees — kiosk cihaz hesapları ayın elemanı seçilemez
      let userConditions: any[] = [
        eq(users.isActive, true),
        notInArray(users.role, ['sube_kiosk', 'fabrika_kiosk']),
      ];
      if (branchId) {
        userConditions.push(eq(users.branchId, branchId));
      }
      const employees = await db.select().from(users).where(and(...userConditions));
      
      const results = [];
      for (const emp of employees) {
        if (!emp.branchId) continue;
        
        // Calculate scores (simplified - real implementation would query actual data)
        const attendanceScore = Math.random() * w.attendanceWeight;
        const checklistScore = Math.random() * w.checklistWeight;
        const taskScore = Math.random() * w.taskWeight;
        
        // Get customer ratings
        const customerRatings = await db.select().from(staffQrRatings)
          .where(and(
            eq(staffQrRatings.staffId, emp.id),
            sql`EXTRACT(MONTH FROM ${staffQrRatings.createdAt}) = ${m}`,
            sql`EXTRACT(YEAR FROM ${staffQrRatings.createdAt}) = ${y}`
          ));
        const avgCustomer = customerRatings.length > 0
          ? customerRatings.reduce((sum, r) => sum + r.overallRating, 0) / customerRatings.length
          : 0;
        const customerRatingScore = (avgCustomer / 5) * w.customerRatingWeight;
        
        // Get manager ratings
        const [managerRating] = await db.select().from(managerMonthlyRatings)
          .where(and(
            eq(managerMonthlyRatings.employeeId, emp.id),
            eq(managerMonthlyRatings.month, m),
            eq(managerMonthlyRatings.year, y)
          )).limit(1);
        const managerRatingScore = managerRating
          ? ((managerRating.averageRating || 0) / 5) * w.managerRatingWeight
          : 0;
        
        const leaveDeduction = 0;

        let complianceDeduction = 0;
        if (emp.branchId) {
          try {
            const [compRow] = await db
              .select({ cnt: count() })
              .from(supportTickets)
              .where(
                and(
                  eq(supportTickets.branchId, emp.branchId),
                  sql`${supportTickets.ticketType} = 'compliance'`,
                  eq(supportTickets.isDeleted, false),
                  sql`${supportTickets.status} IN ('acik', 'islemde', 'beklemede')`
                )
              );
            complianceDeduction = Math.min(Number(compRow?.cnt ?? 0) * 3, 15);
          } catch (e) { console.error(e); }
        }

        const totalScore = attendanceScore + checklistScore + taskScore +
          customerRatingScore + managerRatingScore - leaveDeduction - complianceDeduction;
        
        // Upsert performance record
        await db.insert(monthlyEmployeePerformance).values({
          employeeId: emp.id,
          branchId: emp.branchId,
          month: m,
          year: y,
          attendanceScore,
          checklistScore,
          taskScore,
          customerRatingScore,
          managerRatingScore,
          leaveDeduction,
          totalScore
        }).onConflictDoUpdate({
          target: [monthlyEmployeePerformance.employeeId, monthlyEmployeePerformance.month, monthlyEmployeePerformance.year],
          set: { attendanceScore, checklistScore, taskScore, customerRatingScore, managerRatingScore, leaveDeduction, totalScore, calculatedAt: new Date() }
        });
        
        results.push({ employeeId: emp.id, totalScore });
      }
      
      res.json({ success: true, count: results.length });
    } catch (error: unknown) {
      console.error("Error calculating employee of month:", error);
      res.status(500).json({ message: "Hesaplama yapilamadi" });
    }
  });

  // GET /api/employee-of-month/awards - Gecmis oduller
  router.get("/api/employee-of-month/awards", isAuthenticated, async (req, res) => {
    try {
      const { year } = req.query;
      const y = parseInt(year as string) || new Date().getFullYear();
      
      const awards = await db.select().from(employeeOfMonthAwards)
        .where(eq(employeeOfMonthAwards.year, y))
        .orderBy(employeeOfMonthAwards.month);
      
      const enriched = await Promise.all(awards.map(async (a) => {
        const [employee] = await db.select({ firstName: users.firstName, lastName: users.lastName })
          .from(users).where(eq(users.id, a.employeeId)).limit(1);
        const [branch] = await db.select({ name: branches.name })
          .from(branches).where(eq(branches.id, a.branchId)).limit(1);
        return { ...a, employee, branch };
      }));
      
      res.json(enriched);
    } catch (error: unknown) {
      console.error("Error fetching awards:", error);
      res.status(500).json({ message: "Oduller alinamadi" });
    }
  });

export default router;
