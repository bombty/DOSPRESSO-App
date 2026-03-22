import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { sql, max } from "drizzle-orm";
import { z } from "zod";
import {
  branches,
  users,
  isHQRole,
} from "@shared/schema";

const router = Router();

  // ============================================
  // EMPLOYEE BENEFITS - Çalışan Yan Haklar API
  // ============================================

  // GET /api/employee-benefits - Tüm yan hakları listele
  router.get('/api/employee-benefits', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const result = await db.execute(sql`
        SELECT eb.*, u.first_name, u.last_name, u.username, u.role, b.name as branch_name
        FROM employee_benefits eb
        JOIN users u ON eb.user_id = u.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE eb.is_active = true
        ORDER BY u.first_name, u.last_name
      `);
      
      res.json(result.rows);
    } catch (error: unknown) {
      console.error("Get employee benefits error:", error);
      res.status(500).json({ message: "Yan haklar alınamadı" });
    }
  });

  // GET /api/employee-benefits/:userId - Belirli kullanıcının yan haklarını getir
  router.get('/api/employee-benefits/:userId', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      const { userId } = req.params;

      // Admin/HQ veya kendi bilgilerini görme
      if (!isHQRole(userRole) && userRole !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const result = await db.execute(sql`
        SELECT * FROM employee_benefits 
        WHERE user_id = ${userId} AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1
      `);
      
      res.json(result.rows[0] || null);
    } catch (error: unknown) {
      console.error("Get employee benefit error:", error);
      res.status(500).json({ message: "Yan haklar alınamadı" });
    }
  });

  // POST /api/employee-benefits - Yeni yan hak kaydı oluştur
  router.post('/api/employee-benefits', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      // Validate input (values already in kuruş from frontend)
      const benefitsSchema = z.object({
        userId: z.string().min(1, "Kullanıcı ID zorunlu"),
        mealBenefitType: z.enum(['none', 'card', 'cash', 'workplace']).optional().default('none'),
        mealBenefitAmount: z.number().int().min(0).optional().default(0), // kuruş
        transportBenefitType: z.enum(['none', 'card', 'cash']).optional().default('none'),
        transportBenefitAmount: z.number().int().min(0).optional().default(0), // kuruş
        bonusEligible: z.boolean().optional().default(true),
        bonusPercentage: z.string().optional().default('0'),
        disabilityDiscount: z.boolean().optional().default(false),
        disabilityDegree: z.number().int().min(1).max(3).nullable().optional(),
        effectiveFrom: z.string().min(1, "Geçerlilik tarihi zorunlu"),
        notes: z.string().nullable().optional(),
      });

      const parsed = benefitsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
      }

      const { 
        userId, 
        mealBenefitType, 
        mealBenefitAmount, 
        transportBenefitType, 
        transportBenefitAmount,
        bonusEligible,
        bonusPercentage,
        disabilityDiscount,
        disabilityDegree,
        effectiveFrom,
        notes
      } = parsed.data;

      // Mevcut aktif kaydı pasifleştir
      await db.execute(sql`
        UPDATE employee_benefits 
        SET is_active = false, effective_to = ${effectiveFrom}
        WHERE user_id = ${userId} AND is_active = true
      `);

      // Yeni kayıt ekle
      const result = await db.execute(sql`
        INSERT INTO employee_benefits (
          user_id, meal_benefit_type, meal_benefit_amount, 
          transport_benefit_type, transport_benefit_amount,
          bonus_eligible, bonus_percentage, disability_discount, disability_degree,
          effective_from, is_active, notes, created_by_id
        ) VALUES (
          ${userId}, ${mealBenefitType || 'none'}, ${mealBenefitAmount || 0},
          ${transportBenefitType || 'none'}, ${transportBenefitAmount || 0},
          ${bonusEligible !== false}, ${bonusPercentage || '0'}, 
          ${disabilityDiscount || false}, ${disabilityDegree || null},
          ${effectiveFrom}, true, ${notes || null}, ${req.user.id}
        )
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Create employee benefit error:", error);
      res.status(500).json({ message: "Yan hak kaydı oluşturulamadı" });
    }
  });

  // PATCH /api/employee-benefits/:id - Yan hak kaydını güncelle
  router.patch('/api/employee-benefits/:id', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const benefitId = parseInt(id);
      if (isNaN(benefitId)) {
        return res.status(400).json({ message: "Geçersiz ID" });
      }

      // Validate input (values already in kuruş from frontend)
      const updateBenefitsSchema = z.object({
        mealBenefitType: z.enum(['none', 'card', 'cash', 'workplace']).optional(),
        mealBenefitAmount: z.number().int().min(0).optional(), // kuruş
        transportBenefitType: z.enum(['none', 'card', 'cash']).optional(),
        transportBenefitAmount: z.number().int().min(0).optional(), // kuruş
        bonusEligible: z.boolean().optional(),
        bonusPercentage: z.string().optional(),
        disabilityDiscount: z.boolean().optional(),
        disabilityDegree: z.number().int().min(1).max(3).nullable().optional(),
        notes: z.string().nullable().optional(),
      });

      const parsed = updateBenefitsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Geçersiz veri", errors: parsed.error.flatten() });
      }

      const { 
        mealBenefitType, 
        mealBenefitAmount, 
        transportBenefitType, 
        transportBenefitAmount,
        bonusEligible,
        bonusPercentage,
        disabilityDiscount,
        disabilityDegree,
        notes
      } = parsed.data;

      const result = await db.execute(sql`
        UPDATE employee_benefits SET
          meal_benefit_type = COALESCE(${mealBenefitType}, meal_benefit_type),
          meal_benefit_amount = COALESCE(${mealBenefitAmount}, meal_benefit_amount),
          transport_benefit_type = COALESCE(${transportBenefitType}, transport_benefit_type),
          transport_benefit_amount = COALESCE(${transportBenefitAmount}, transport_benefit_amount),
          bonus_eligible = COALESCE(${bonusEligible}, bonus_eligible),
          bonus_percentage = COALESCE(${bonusPercentage}, bonus_percentage),
          disability_discount = COALESCE(${disabilityDiscount}, disability_discount),
          disability_degree = COALESCE(${disabilityDegree}, disability_degree),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${benefitId}
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Update employee benefit error:", error);
      res.status(500).json({ message: "Yan hak kaydı güncellenemedi" });
    }
  });

  // PUT /api/users/:id/compensation - Personel maaş ve yan haklarını güncelle
  router.put('/api/users/:id/compensation', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const { netSalary, mealAllowance, transportAllowance, bonusBase, bonusType, bonusPercentage } = req.body;

      // Validate all values are non-negative integers (kuruş)
      const validateValue = (val: any, name: string) => {
        if (val !== undefined && (typeof val !== 'number' || val < 0 || !Number.isInteger(val))) {
          throw new Error(`Geçersiz ${name} değeri`);
        }
        return val ?? null;
      };

      const safeNetSalary = validateValue(netSalary, 'net maaş');
      const safeMealAllowance = validateValue(mealAllowance, 'yemek yardımı');
      const safeTransportAllowance = validateValue(transportAllowance, 'ulaşım yardımı');
      const safeBonusBase = validateValue(bonusBase, 'prim');
      const safeBonusType = bonusType || null;
      const safeBonusPercentage = bonusPercentage !== undefined ? bonusPercentage : null;

      const result = await db.execute(sql`
        UPDATE users 
        SET 
          net_salary = COALESCE(${safeNetSalary}, net_salary),
          meal_allowance = COALESCE(${safeMealAllowance}, meal_allowance),
          transport_allowance = COALESCE(${safeTransportAllowance}, transport_allowance),
          bonus_base = COALESCE(${safeBonusBase}, bonus_base),
          bonus_type = COALESCE(${safeBonusType}, bonus_type),
          bonus_percentage = COALESCE(${safeBonusPercentage}, bonus_percentage),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, first_name, last_name, net_salary, meal_allowance, transport_allowance, bonus_base, bonus_type, bonus_percentage
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Update user compensation error:", error);
      res.status(400).json({ message: error.message || "Maaş bilgileri güncellenemedi" });
    }
  });
  
  // PATCH /api/users/:id/salary - Personel maaş bilgilerini güncelle (legacy)
  router.patch('/api/users/:id/salary', isAuthenticated, async (req, res) => {
    try {
      const userRole = req.user?.role;
      if (!isHQRole(userRole) && userRole !== 'admin' && userRole !== 'muhasebe') {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }

      const { id } = req.params;
      const { netSalary } = req.body;

      if (typeof netSalary !== 'number' || netSalary < 0) {
        return res.status(400).json({ message: "Geçersiz maaş değeri" });
      }

      const result = await db.execute(sql`
        UPDATE users 
        SET net_salary = ${netSalary}
        WHERE id = ${id}
        RETURNING id, username, first_name, last_name, net_salary
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json(result.rows[0]);
    } catch (error: unknown) {
      console.error("Update user salary error:", error);
      res.status(500).json({ message: "Maaş güncellenemedi" });
    }
  });


export default router;
