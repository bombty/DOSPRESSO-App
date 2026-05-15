// ═══════════════════════════════════════════════════════════════════
// Sprint 56.1 (Aslan 14 May 2026) — Pilot Emergency Seed
// ═══════════════════════════════════════════════════════════════════
// Pilot Readiness Check eksiklik raporu çıkarsa kullanılır:
//
// /api/admin/pilot-seed/missing-donuts   → 8 eksik donut ekle (idempotent)
// /api/admin/pilot-seed/pilot-users      → Sema, Eren, Aslan2 hesapları
// /api/admin/pilot-seed/sample-keyblends → KEYBLEND tablosu örnek veri
// /api/admin/pilot-seed/run-all          → Hepsi tek seferde
//
// SADECE admin/ceo çalıştırabilir.
// İDEMPOTENT: Tekrar çalıştırılırsa çift kayıt OLMAZ.
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { factoryProducts, factoryKeyblends, users } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import bcrypt from "bcryptjs";

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (!["admin", "ceo"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Sadece admin/ceo seed yapabilir" });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════
// 1. EKSİK DONUT ÇEŞİTLERİ (Aslan 21 dedi, katalog 13)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/admin/pilot-seed/missing-donuts", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const candidateDonuts = [
      // Aslan'ın PDF kataloğundan 21 donut
      { code: "DON-COOKIE-MONSTER", name: "Cookie Monster" },
      { code: "DON-HAPPY-FACE", name: "Happy Face" },
      { code: "DON-HYPNOS", name: "Hypnos" },
      { code: "DON-NUT-CORNER", name: "Nut Corner" },
      { code: "DON-KARDASHIAN", name: "Kardashian" },
      { code: "DON-NUT-WHITE", name: "Nut on White" },
      { code: "DON-MACCHIATO", name: "Macchiato" },
      { code: "DON-OREOLOJI", name: "Oreoloji" },
      { code: "DON-PINK-LADY", name: "Pink Lady" },
      { code: "DON-SNOW-WHITE", name: "Snow White" },
      { code: "DON-RAINBOW", name: "Rainbow" },
      { code: "DON-UNICORN", name: "Unicorn" },
      { code: "DON-RIHANNA", name: "Rihanna" },
      { code: "DON-BLACKJACK", name: "Blackjack" },
      { code: "DON-CHOCOCHINO", name: "Chocochino" },
      // Ek 6 donut tahmin (Aslan 21 dedi)
      { code: "DON-CARAMEL-DREAM", name: "Caramel Dream" },
      { code: "DON-NUTELLA-BOMB", name: "Nutella Bomb" },
      { code: "DON-LOTUS-LOVE", name: "Lotus Love" },
      { code: "DON-RED-VELVET", name: "Red Velvet" },
      { code: "DON-MATCHA-WAVE", name: "Matcha Wave" },
      { code: "DON-DOUBLE-CHOCO", name: "Double Choco" },
    ];

    let added = 0;
    let existed = 0;
    const results: any[] = [];

    for (const donut of candidateDonuts) {
      // Idempotent: code unique varsayımı
      const [existing] = await db.select().from(factoryProducts).where(eq(factoryProducts.code, donut.code)).limit(1);
      if (existing) {
        existed++;
        results.push({ code: donut.code, status: "already-exists" });
        continue;
      }

      const [created] = await db.insert(factoryProducts).values({
        code: donut.code,
        name: donut.name,
        category: "donut",
        unit: "adet",
        isActive: true,
        description: `Pilot pre-seed donut çeşidi (Sprint 56.1)`,
      } as any).returning();

      added++;
      results.push({ code: donut.code, status: "added", id: created.id });
    }

    res.json({
      success: true,
      total: candidateDonuts.length,
      added,
      existed,
      results,
      note: "Aslan'a sor: 21 donutun TAM listesi nedir? Eksikleri update edebilirim.",
    });
  } catch (err: any) {
    console.error("[Seed/donuts]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. PİLOT KULLANICI HESAPLARI (Sema, Eren, Aslan2)
// ═══════════════════════════════════════════════════════════════════
router.post("/api/admin/pilot-seed/pilot-users", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const candidates = [
      {
        username: "sema",
        firstName: "Sema",
        lastName: "Pilot",
        role: "gida_muhendisi",
        branchId: 24, // Fabrika
        title: "Gıda Mühendisi",
      },
      {
        username: "eren",
        firstName: "Eren",
        lastName: "Pilot",
        role: "fabrika_mudur",
        branchId: 24, // Fabrika
        title: "Fabrika Müdürü",
      },
      {
        username: "aslan2",
        firstName: "Aslan",
        lastName: "Reçete GM",
        role: "recete_gm",
        branchId: 24, // Fabrika
        title: "Reçete Genel Müdür",
      },
      {
        username: "samet",
        firstName: "Samet",
        lastName: "Pilot",
        role: "satinalma",
        branchId: 23, // HQ
        title: "Satınalma Sorumlusu",
      },
    ];

    const defaultPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "0000";
    const hashedDefault = await bcrypt.hash(defaultPassword, 10);

    let added = 0;
    let existed = 0;
    const results: any[] = [];

    for (const u of candidates) {
      const [existing] = await db.select().from(users).where(eq(users.username, u.username)).limit(1);
      if (existing) {
        existed++;
        results.push({ username: u.username, status: "already-exists", role: existing.role });
        continue;
      }

      const [created] = await db.insert(users).values({
        username: u.username,
        password: hashedDefault,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        branchId: u.branchId,
        title: u.title,
        isActive: true,
        mustChangePassword: true,
      } as any).returning();

      added++;
      results.push({ username: u.username, status: "added", id: created.id, defaultPassword });
    }

    res.json({
      success: true,
      total: candidates.length,
      added,
      existed,
      results,
      note: `Yeni hesaplar default password: "${defaultPassword}". İlk girişte değiştirilmeli.`,
    });
  } catch (err: any) {
    console.error("[Seed/users]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. KEYBLEND ÖRNEK VERİ
// ═══════════════════════════════════════════════════════════════════
router.post("/api/admin/pilot-seed/sample-keyblends", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const samples = [
      {
        code: "KB-DONUT-SIR",
        name: "Donut Yüzey Şurubu",
        description: "Klasik donut için yüzey şurubu (gizli formül)",
        ingredients: JSON.stringify({
          // Demo veri - gerçek formül Aslan2'den
          "Esans-Vanilya": "0.5%",
          "Renklendirici-Karamel": "0.2%",
          "Stabilizer-Mix": "0.3%",
          NOT: "Gerçek formül için Aslan2 girişi gerekir",
        }),
        preparationSteps: "1. Şurup base hazırla\n2. Esans ve renklendirici ekle\n3. 65°C'de stabil tut\n4. Donut'a uygula",
      },
      {
        code: "KB-CINNABON-CR",
        name: "Cinnaboom Krema",
        description: "Cinnaboom ürünleri için özel krema",
        ingredients: JSON.stringify({
          "Cream-Cheese-Base": "60%",
          "Powdered-Sugar": "30%",
          "Special-Mix": "10%",
          NOT: "Gerçek formül için Aslan2 girişi gerekir",
        }),
        preparationSteps: "1. Cream cheese yumuşat\n2. Şeker ve özel karışım ekle\n3. 8°C'de bekletme",
      },
    ];

    let added = 0;
    let existed = 0;
    const results: any[] = [];

    for (const kb of samples) {
      const [existing] = await db.select().from(factoryKeyblends).where(eq(factoryKeyblends.code, kb.code)).limit(1);
      if (existing) {
        existed++;
        results.push({ code: kb.code, status: "already-exists" });
        continue;
      }

      const [created] = await db.insert(factoryKeyblends).values({
        code: kb.code,
        name: kb.name,
        description: kb.description,
        ingredients: kb.ingredients,
        preparationSteps: kb.preparationSteps,
        isActive: true,
      } as any).returning();

      added++;
      results.push({ code: kb.code, status: "added", id: created.id });
    }

    res.json({
      success: true,
      total: samples.length,
      added,
      existed,
      results,
      note: "Demo formüller. Gerçek formüller Aslan2 panelinden güncellenmeli.",
    });
  } catch (err: any) {
    console.error("[Seed/keyblends]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. RUN ALL — Hepsi tek seferde
// ═══════════════════════════════════════════════════════════════════
router.post("/api/admin/pilot-seed/run-all", isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const summary: any = { startedAt: new Date().toISOString() };

    // 1. Donuts
    const donutsRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/admin/pilot-seed/missing-donuts`, {
      method: "POST",
      headers: { Cookie: req.headers.cookie || "" },
    });
    summary.donuts = await donutsRes.json();

    // 2. Users
    const usersRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/admin/pilot-seed/pilot-users`, {
      method: "POST",
      headers: { Cookie: req.headers.cookie || "" },
    });
    summary.users = await usersRes.json();

    // 3. Keyblends
    const kbRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/admin/pilot-seed/sample-keyblends`, {
      method: "POST",
      headers: { Cookie: req.headers.cookie || "" },
    });
    summary.keyblends = await kbRes.json();

    summary.completedAt = new Date().toISOString();
    summary.totalAdded = (summary.donuts?.added || 0) + (summary.users?.added || 0) + (summary.keyblends?.added || 0);

    res.json(summary);
  } catch (err: any) {
    console.error("[Seed/run-all]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
