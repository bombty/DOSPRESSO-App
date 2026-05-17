// ═══════════════════════════════════════════════════════════════════
// Sprint 56 (Aslan 14 May 2026) — Pilot Readiness Check Endpoint
// ═══════════════════════════════════════════════════════════════════
// /api/admin/pilot-readiness-check
// Aslan bu endpoint'i Console'dan çağırır, pilot için tüm eksiklikleri
// tek seferde tarayıp rapor verir.
//
// KONTROL EDİLEN:
//   1. Personel sayısı (4 pilot şube)
//   2. Sema, Eren, Aslan2 hesapları var mı
//   3. Donut çeşit sayısı (Aslan 21 dedi)
//   4. Fabrika istasyon sayısı + yeni 3 var mı
//   5. factory_keyblends boş mu
//   6. raw_materials nutrition tamlığı
//   7. factory_recipes onay durumu
//   8. factoryStationProducts mapping kuruldu mu
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { sql, eq, and, isNull, isNotNull } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (!["admin", "ceo", "cgo"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Sadece admin/ceo/cgo erişebilir" });
  }
  next();
};

router.get("/api/admin/pilot-readiness-check", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const checks: any = {
      timestamp: new Date().toISOString(),
      pilotDate: "18 May 2026 Pazar 15:00",
      results: {},
      warnings: [],
      errors: [],
    };

    // ═══════════════════════════════════════════════════════════════════
    // 1. PERSONEL (4 PİLOT ŞUBE)
    // ═══════════════════════════════════════════════════════════════════
    const personnel = await db.execute(sql`
      SELECT 
        branch_id,
        role,
        COUNT(*) as count
      FROM users 
      WHERE is_active = true 
        AND branch_id IN (5, 8, 23, 24)
      GROUP BY branch_id, role
      ORDER BY branch_id, role
    `);
    
    const branchSummary: any = {};
    for (const row of (personnel as any).rows || []) {
      const bid = row.branch_id;
      if (!branchSummary[bid]) branchSummary[bid] = { total: 0, roles: {} };
      branchSummary[bid].total += parseInt(row.count);
      branchSummary[bid].roles[row.role] = parseInt(row.count);
    }
    checks.results.personnel = branchSummary;
    if (Object.keys(branchSummary).length < 4) {
      checks.warnings.push(`4 pilot şubeden ${Object.keys(branchSummary).length} tanesinde personel var`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. SEMA, EREN, ASLAN2 HESAPLARI
    // ═══════════════════════════════════════════════════════════════════
    const keyUsers = await db.execute(sql`
      SELECT username, role, is_active, branch_id, first_name, last_name
      FROM users 
      WHERE LOWER(username) IN ('sema', 'eren', 'aslan2', 'samet')
        OR role IN ('gida_muhendisi', 'fabrika_mudur', 'recete_gm', 'satinalma')
    `);
    checks.results.keyUsers = (keyUsers as any).rows || [];
    
    const keyRoles = ['gida_muhendisi', 'fabrika_mudur', 'recete_gm', 'satinalma'];
    for (const role of keyRoles) {
      const has = ((keyUsers as any).rows || []).some((u: any) => u.role === role && u.is_active);
      if (!has) {
        checks.errors.push(`Aktif ${role} kullanıcı YOK — manuel oluşturmak gerekecek`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. FACTORY PRODUCTS (DONUT 21 + DİĞERLERİ)
    // ═══════════════════════════════════════════════════════════════════
    const products = await db.execute(sql`
      SELECT category, COUNT(*) as count 
      FROM factory_products 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY count DESC
    `);
    checks.results.factoryProducts = (products as any).rows || [];
    
    const donutCount = ((products as any).rows || []).find((r: any) => r.category === 'donut')?.count || 0;
    if (parseInt(donutCount) < 13) {
      checks.errors.push(`Donut çeşidi sadece ${donutCount} adet (Aslan 21 dedi, katalogda 13)`);
    } else if (parseInt(donutCount) < 21) {
      checks.warnings.push(`Donut ${donutCount} adet (21 hedef). Pazar öncesi tamamlanmalı`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. FACTORY STATIONS
    // ═══════════════════════════════════════════════════════════════════
    const stations = await db.execute(sql`
      SELECT id, code, name, category, target_hourly_output, is_active 
      FROM factory_stations 
      ORDER BY sort_order, name
    `);
    checks.results.factoryStations = (stations as any).rows || [];
    
    const newStations = ['CINNABOOM_HATTI', 'SANDVIC_PAKETLEME', 'SURUP_PAKETLEME'];
    for (const code of newStations) {
      const exists = ((stations as any).rows || []).some((s: any) => s.code === code);
      if (!exists) {
        checks.errors.push(`Yeni pilot istasyon EKSİK: ${code} (auto-seed çalıştırılmamış olabilir)`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. FACTORY_KEYBLENDS
    // ═══════════════════════════════════════════════════════════════════
    const keyblends = await db.execute(sql`SELECT COUNT(*) as count FROM factory_keyblends`);
    const kbCount = parseInt(((keyblends as any).rows || [{}])[0]?.count || "0");
    checks.results.factoryKeyblends = { count: kbCount };
    if (kbCount === 0) {
      checks.warnings.push("factory_keyblends boş — Aslan2 paneli KEYBLEND tab'ında veri olmayacak");
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. RAW_MATERIALS NUTRITION TAMLIĞI (TGK Madde 9)
    // ═══════════════════════════════════════════════════════════════════
    const rawMaterials = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN energy_kcal IS NOT NULL THEN 1 END) as with_energy,
        COUNT(CASE WHEN protein IS NOT NULL THEN 1 END) as with_protein,
        COUNT(CASE WHEN allergen_present = true THEN 1 END) as with_allergens
      FROM raw_materials 
      WHERE is_active = true
    `);
    const rmStats = ((rawMaterials as any).rows || [{}])[0];
    checks.results.rawMaterialsNutrition = {
      total: parseInt(rmStats?.total || "0"),
      withEnergy: parseInt(rmStats?.with_energy || "0"),
      withProtein: parseInt(rmStats?.with_protein || "0"),
      withAllergens: parseInt(rmStats?.with_allergens || "0"),
    };
    const total = parseInt(rmStats?.total || "0");
    const withEnergy = parseInt(rmStats?.with_energy || "0");
    if (total > 0 && withEnergy / total < 0.5) {
      checks.warnings.push(`${total - withEnergy}/${total} hammadde besin değeri eksik (TGK uyum)`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. FACTORY_RECIPES ONAY DURUMU
    // ═══════════════════════════════════════════════════════════════════
    const recipes = await db.execute(sql`
      SELECT 
        approval_status,
        output_type,
        COUNT(*) as count 
      FROM factory_recipes 
      WHERE is_active = true 
      GROUP BY approval_status, output_type
    `);
    checks.results.factoryRecipes = (recipes as any).rows || [];

    // ═══════════════════════════════════════════════════════════════════
    // 8. STATION-PRODUCTS MAPPING (Sprint 54.2/55.1 tablosu)
    // ═══════════════════════════════════════════════════════════════════
    try {
      const mapping = await db.execute(sql`
        SELECT 
          fs.name as station_name,
          COUNT(fsp.product_id) as product_count 
        FROM factory_stations fs
        LEFT JOIN factory_station_products fsp ON fs.id = fsp.station_id
        WHERE fs.is_active = true
        GROUP BY fs.id, fs.name
        ORDER BY product_count DESC
      `);
      checks.results.stationProductsMapping = (mapping as any).rows || [];
      
      const emptyStations = ((mapping as any).rows || []).filter((s: any) => parseInt(s.product_count) === 0);
      if (emptyStations.length > 0) {
        checks.warnings.push(`${emptyStations.length} istasyonda ürün mapping YOK — auto-seed gerekli`);
      }
    } catch (err: any) {
      checks.errors.push("factory_station_products tablosu DB'de YOK — drizzle-kit push çalıştırın");
    }

    // ═══════════════════════════════════════════════════════════════════
    // ÖZET
    // ═══════════════════════════════════════════════════════════════════
    checks.summary = {
      totalChecks: 8,
      errorCount: checks.errors.length,
      warningCount: checks.warnings.length,
      readinessScore: Math.max(0, 100 - (checks.errors.length * 15) - (checks.warnings.length * 5)),
      verdict: checks.errors.length === 0 
        ? (checks.warnings.length <= 2 ? "✅ PILOT'A HAZIR" : "⚠️ KÜÇÜK EKSİKLER VAR")
        : "🔴 KRİTİK SORUNLAR — PILOT ERTELENMELİ",
    };

    console.log(`[PilotCheck] Skor: ${checks.summary.readinessScore}/100 - ${checks.summary.verdict}`);
    res.json(checks);
  } catch (err: any) {
    console.error("[PilotCheck] error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

export default router;
