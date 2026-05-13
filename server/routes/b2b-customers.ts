// ═══════════════════════════════════════════════════════════════════
// Sprint 52 (Aslan 13 May 2026) — B2B Customers API
// ═══════════════════════════════════════════════════════════════════
// Toptan B2B müşteri yönetimi (franchise dışı dış satış kanalı)
//
//   GET    /api/b2b-customers              — Liste (filtreli)
//   GET    /api/b2b-customers/:id          — Detay
//   POST   /api/b2b-customers              — Yeni müşteri
//   PUT    /api/b2b-customers/:id          — Güncelle
//   DELETE /api/b2b-customers/:id          — Soft delete (pasif yap)
//   POST   /api/b2b-customers/ai-suggest   — AI öneri (vergi no, adres)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { b2bCustomers } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { aiChatCall } from "../ai";

const router = Router();

// Yetki kontrolü middleware
const requireB2bAccess = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (!["admin", "ceo", "cgo", "satinalma"].includes(role)) {
    return res.status(403).json({ message: "Bu işlem için yetki yok" });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/b2b-customers
// Liste — search + status filter
// ═══════════════════════════════════════════════════════════════════
router.get("/api/b2b-customers", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const { search, status, companyType, limit = 100 } = req.query;

    const conditions: any[] = [];

    if (status && typeof status === "string" && status !== "all") {
      conditions.push(eq(b2bCustomers.status, status));
    }

    if (companyType && typeof companyType === "string" && companyType !== "all") {
      conditions.push(eq(b2bCustomers.companyType, companyType));
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(
        ilike(b2bCustomers.name, term),
        ilike(b2bCustomers.code, term),
        ilike(b2bCustomers.taxNumber, term),
        ilike(b2bCustomers.city, term),
      ));
    }

    const customers = await db.select()
      .from(b2bCustomers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(b2bCustomers.createdAt))
      .limit(parseInt(limit as string) || 100);

    res.json({ customers, count: customers.length });
  } catch (err: any) {
    console.error("[B2B/list]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/b2b-customers/:id
// ═══════════════════════════════════════════════════════════════════
router.get("/api/b2b-customers/:id", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select()
      .from(b2bCustomers)
      .where(eq(b2bCustomers.id, id))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı" });
    }

    res.json(customer);
  } catch (err: any) {
    console.error("[B2B/detail]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/b2b-customers
// ═══════════════════════════════════════════════════════════════════
router.post("/api/b2b-customers", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    if (!data.name || data.name.trim().length < 2) {
      return res.status(400).json({ message: "Müşteri adı gerekli (min 2 karakter)" });
    }

    // Kod otomatik üret eğer verilmediyse
    let code = data.code;
    if (!code) {
      const lastResult = await db.execute(sql`
        SELECT code FROM b2b_customers 
        WHERE code LIKE 'B2B-%' 
        ORDER BY id DESC LIMIT 1
      `);
      const rows = (lastResult as any).rows || [];
      const lastCode = rows[0]?.code || "B2B-000";
      const lastNum = parseInt(lastCode.replace(/[^\d]/g, "")) || 0;
      code = `B2B-${(lastNum + 1).toString().padStart(3, "0")}`;
    }

    const [created] = await db.insert(b2bCustomers).values({
      code,
      name: data.name.trim(),
      companyType: data.companyType || null,
      taxNumber: data.taxNumber || null,
      taxOffice: data.taxOffice || null,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      mobilePhone: data.mobilePhone || null,
      address: data.address || null,
      city: data.city || null,
      district: data.district || null,
      postalCode: data.postalCode || null,
      creditLimit: data.creditLimit || "0",
      paymentTermDays: data.paymentTermDays || 30,
      discountRate: data.discountRate || "0",
      currency: data.currency || "TRY",
      status: data.status || "aktif",
      notes: data.notes || null,
      createdById: userId,
    }).returning();

    console.log(`[B2B] ${userId} created ${code} - ${data.name}`);
    res.json({ success: true, customer: created });
  } catch (err: any) {
    console.error("[B2B/create]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /api/b2b-customers/:id
// ═══════════════════════════════════════════════════════════════════
router.put("/api/b2b-customers/:id", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const updateData: any = { updatedAt: new Date() };
    // Sadece gelen alanları güncelle
    const allowedFields = [
      "name", "companyType", "taxNumber", "taxOffice", "contactPerson",
      "email", "phone", "mobilePhone", "address", "city", "district",
      "postalCode", "creditLimit", "paymentTermDays", "discountRate",
      "currency", "status", "notes",
    ];
    for (const f of allowedFields) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }

    const [updated] = await db.update(b2bCustomers)
      .set(updateData)
      .where(eq(b2bCustomers.id, id))
      .returning();

    res.json({ success: true, customer: updated });
  } catch (err: any) {
    console.error("[B2B/update]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/b2b-customers/:id — soft delete (status=pasif)
// ═══════════════════════════════════════════════════════════════════
router.delete("/api/b2b-customers/:id", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(b2bCustomers)
      .set({ status: "pasif", updatedAt: new Date() })
      .where(eq(b2bCustomers.id, id));

    res.json({ success: true });
  } catch (err: any) {
    console.error("[B2B/delete]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/b2b-customers/ai-suggest
// Müşteri adından AI ile bilgi tahmin
// Body: { name, context? }
// ═══════════════════════════════════════════════════════════════════
router.post("/api/b2b-customers/ai-suggest", isAuthenticated, requireB2bAccess, async (req: any, res) => {
  try {
    const { name, context } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Müşteri adı gerekli" });
    }

    const systemPrompt = `Sen Mr. Dobody, DOSPRESSO B2B satış AI asistanısın.
Yeni toptan müşteri kartı için bilgi öneri.

KURALLAR:
- Türkiye'deki gıda/horeca sektörü bağlamında düşün
- Bilmediğin bilgiyi UYDURMA (null bırak)
- Vergi numarası tahmin etme (kesin bilgi yoksa null)
- Şirket adından tipini çıkar (restoran, otel, cafe, market vb.)
- İletişim için standart format öner

JSON FORMAT:
{
  "name": "Düzeltilmiş ad",
  "companyType": "restoran|otel|cafe|market|ofis|catering|diger",
  "taxNumber": null,
  "taxOffice": null,
  "contactPerson": null,
  "email": null veya tahmini standart email,
  "phone": null,
  "city": null veya bilinen şehir,
  "district": null,
  "creditLimit": önerilen sayı (10000-100000 TL),
  "paymentTermDays": 15/30/45/60,
  "discountRate": önerilen indirim (0-15),
  "notes": "Bilgilendirme notları",
  "confidence": "high|medium|low",
  "reasoning": "Sebep"
}`;

    const userPrompt = `MÜŞTERİ ADI: ${name}
${context ? `EK BAĞLAM: ${context}` : ""}

Bu müşteri için kart önerisi ver.`;

    const response = await aiChatCall({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const suggestion = JSON.parse(raw);

    // Aynı isim DB'de var mı?
    const existing = await db.select({ id: b2bCustomers.id, name: b2bCustomers.name })
      .from(b2bCustomers)
      .where(ilike(b2bCustomers.name, name))
      .limit(1);

    res.json({
      success: true,
      suggestion,
      duplicateWarning: existing.length > 0 ? {
        existingId: existing[0].id,
        existingName: existing[0].name,
      } : null,
      tokens: response.usage?.total_tokens || 0,
    });
  } catch (err: any) {
    console.error("[B2B/ai-suggest]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
