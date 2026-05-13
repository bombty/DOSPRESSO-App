// ═══════════════════════════════════════════════════════════════════
// Sprint 50 (Aslan 13 May 2026) — Supplier AI Helper
// ═══════════════════════════════════════════════════════════════════
// Samet (satinalma) yeni tedarikçi eklerken AI yardımı:
// - İsim yazar → AI iletişim, adres, sertifika tahminleri öneri olarak getirir
// - Aslan/Samet onaylar → DB'ye yazılır
// - Web search ile gerçek bilgi (var olan altyapı)
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { suppliers } from "@shared/schema";
import { isAuthenticated } from "../localAuth";
import { aiChatCall } from "../ai";

const router = Router();

interface SupplierSuggestion {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  categories?: string[];
  iso22000Certified?: boolean;
  haccpCertified?: boolean;
  halalCertified?: boolean;
  notes?: string;
  confidence?: "high" | "medium" | "low";
  reasoning?: string;
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/suppliers/ai-suggest
// Tedarikçi adı + opsiyonel context → AI öneri
// Body: { name, context?, category? }
// ═══════════════════════════════════════════════════════════════════
router.post("/api/suppliers/ai-suggest", isAuthenticated, async (req: any, res) => {
  try {
    const { name, context, category } = req.body;

    if (!name || typeof name !== "string" || name.length < 2) {
      return res.status(400).json({ message: "Tedarikçi adı gerekli (min 2 karakter)" });
    }

    // Aynı isim DB'de var mı? (uyarı için)
    const existing = await db.select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.name, name))
      .limit(1);

    const systemPrompt = `Sen Mr. Dobody, DOSPRESSO satın alma AI asistanısın. Yeni tedarikçi kartı oluşturulmasına yardım ediyorsun.

GÖREVİN:
Verilen tedarikçi adından yola çıkarak DOSPRESSO franchise zinciri için uygun bir tedarikçi kartı bilgileri ÖNER. Türkiye'deki gıda tedariği bağlamında düşün.

ÖNERILER:
- Sadece YÜKSEK güvenlikte ve mantıklı bilgi öner
- Bilmediğin bilgileri uydurma (null bırak)
- Şirket adından kategori tahmini yap (örn: "Kalealtı Aromaları" → aroma_verici, gıda)
- Sertifika tahminlerinde dikkatli ol (ISO 22000, HACCP gıda sektöründe yaygın ama halal kesin değil)
- E-posta varsa standart formatta (info@firma.com.tr gibi) öner
- Adres tahmini yapma (belirsiz)

JSON OUTPUT:
{
  "name": "Düzeltilmiş ad varsa",
  "contactPerson": null veya öneri,
  "email": null veya tahmini email,
  "phone": null (web search yoksa tahmin etme),
  "address": null,
  "city": null veya bilinen şehir,
  "categories": ["category1", "category2"],
  "iso22000Certified": true/false (gıda sektörü → çoğunlukla true),
  "haccpCertified": true/false,
  "halalCertified": null (kesin değilse),
  "notes": "Bilgilendirme notları",
  "confidence": "high|medium|low",
  "reasoning": "Bu önerilerin sebebi"
}`;

    const userPrompt = `TEDARİKÇİ ADI: ${name}
${context ? `EK BAĞLAM: ${context}` : ""}
${category ? `KATEGORİ İPUCU: ${category}` : ""}

Bu tedarikçi için kart önerisi ver.`;

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
    const suggestion: SupplierSuggestion = JSON.parse(raw);

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
    console.error("[Supplier AI Suggest]", err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/suppliers/ai-create
// AI önerisini onaylayıp kayıt et
// Body: { name, ...suggestion fields, code? }
// ═══════════════════════════════════════════════════════════════════
router.post("/api/suppliers/ai-create", isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.user.role;
    if (!["admin", "satinalma", "ceo", "cgo"].includes(userRole)) {
      return res.status(403).json({ message: "Bu işlem için yetki yok" });
    }

    const userId = req.user.id;
    const {
      name,
      code,
      contactPerson,
      email,
      phone,
      address,
      city,
      categories,
      iso22000Certified,
      haccpCertified,
      halalCertified,
      notes,
    } = req.body;

    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Tedarikçi adı gerekli" });
    }

    // Otomatik kod üret (varsa kullan)
    let finalCode = code;
    if (!finalCode) {
      const lastSupplier = await db.execute(
        `SELECT code FROM suppliers WHERE code LIKE 'TED-%' ORDER BY id DESC LIMIT 1`
      );
      const rows = (lastSupplier as any).rows || [];
      const lastCode = rows[0]?.code || "TED-000";
      const lastNum = parseInt(lastCode.replace(/[^\d]/g, "")) || 0;
      finalCode = `TED-${(lastNum + 1).toString().padStart(3, "0")}`;
    }

    const [inserted] = await db.insert(suppliers).values({
      code: finalCode,
      name,
      contactPerson: contactPerson || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      categories: categories && Array.isArray(categories) ? categories : [],
      iso22000Certified: !!iso22000Certified,
      haccpCertified: !!haccpCertified,
      halalCertified: !!halalCertified,
      paymentTermDays: 30,
      currency: "TRY",
      status: "aktif",
      notes: notes || "Mr. Dobody AI yardımıyla oluşturuldu",
      createdById: userId,
    }).returning();

    console.log(`[Supplier AI Create] ${userId} created ${finalCode} - ${name}`);

    res.json({
      success: true,
      supplier: inserted,
    });
  } catch (err: any) {
    console.error("[Supplier AI Create]", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
