// ═══════════════════════════════════════════════════════════════════
// Sprint 51 (Aslan 13 May 2026) — AI ile Hammadde Kategori Tahmini
// ═══════════════════════════════════════════════════════════════════
// 185 raw_materials için main_category değerini AI ile tahmin et,
// Aslan onayına sun (ya da otomatik kategori belirle).
//
// USAGE:
//   npx tsx scripts/predict-raw-material-categories.ts [--dry-run]
//
// 4 kategori:
//   - hammadde:        üretimde kullanılan (un, şeker, yağ, aroma)
//   - al_sat:          toptan alıp doğrudan satılan
//   - uretim_malzeme:  ambalaj, etiket, kutu, ipler
//   - fabrika_kullanim: temizlik, ofis, sarf
// ═══════════════════════════════════════════════════════════════════

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq, sql } from "drizzle-orm";
import { rawMaterials } from "@shared/schema";
import OpenAI from "openai";

neonConfig.webSocketConstructor = ws;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

const DRY_RUN = process.argv.includes("--dry-run");
const maxBatchesArg = process.argv.find(a => a.startsWith("--max-batches="));
const MAX_BATCHES = maxBatchesArg ? parseInt(maxBatchesArg.split("=")[1]) : Infinity;

interface MaterialBatch {
  id: number;
  code: string;
  name: string;
  currentCategory: string | null;
}

interface AIResponse {
  predictions: Array<{
    code: string;
    category: "hammadde" | "al_sat" | "uretim_malzeme" | "fabrika_kullanim";
    confidence: "high" | "medium" | "low";
    reason?: string;
  }>;
}

async function predictBatch(batch: MaterialBatch[]): Promise<AIResponse["predictions"]> {
  const systemPrompt = `Sen DOSPRESSO fabrika sınıflandırma uzmanısın. Verilen hammadde/ürün listesini 4 ana kategoriye ayır.

KATEGORİ TANIMLARI:

1. **hammadde**: Üretimde kullanılan ham gıda malzemeleri
   Örnekler: un, şeker, yağ, aroma, vanilya, kakao, süt tozu, yumurta, peynir, maya, glukoz, fındık ezmesi, kuru meyve, gluten, nişasta, tuz, karbonat

2. **al_sat**: Toptan alıp ürettiğimiz değil, doğrudan satılan ürünler
   Örnekler: hazır içecekler (cola, fanta), su şişesi, hazır snack, dış marka kahve çekirdeği (yeniden paketlenmiyor), şişelenmiş hazır şuruplar

3. **uretim_malzeme**: Üretim sırasında kullanılan ambalaj/yardımcı malzeme
   Örnekler: poşet, kutu, etiket, streç film, alüminyum folyo, kraft kağıt, ipler, taşıma kasası, üretim eldiveni

4. **fabrika_kullanim**: Fabrika operasyonel ihtiyaçları (üretime girmez)
   Örnekler: temizlik kimyasalları, dezenfektan, kağıt havlu, çöp poşeti, ofis malzemesi, deterjan, sünger

KURALLAR:
- T- ile başlayan kodlar genelde uretim_malzeme veya al_sat
- Y- ile başlayan kodlar genelde fabrika_kullanim veya uretim_malzeme
- H- ile başlayan kodlar genelde hammadde
- ÇOĞUNLUK hammadde olacak (DOSPRESSO bir gıda üreticisi)
- Şüphedeyse "hammadde" tercih et
- Confidence: high (kesin), medium (mantıklı tahmin), low (belirsiz)

JSON FORMAT:
{
  "predictions": [
    { "code": "H-1001", "category": "hammadde", "confidence": "high" }
  ]
}`;

  const userPrompt = `Bu ${batch.length} kalemi kategorize et:

${batch.map(m => `${m.code}: ${m.name}`).join("\n")}

JSON formatında kategori tahmini yap.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed: AIResponse = JSON.parse(raw);
    return parsed.predictions || [];
  } catch (err: any) {
    console.error("[AI Error]", err.message);
    return [];
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Sprint 51 — AI Hammadde Kategori Tahmini");
  console.log(DRY_RUN ? "[DRY RUN — DB güncellemesi yapılmayacak]" : "[CANLI — DB güncellenecek]");
  console.log("═══════════════════════════════════════════════════════════\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  // Önce SQL migration ile genel atama yapıldı, sadece NULL veya 'hammadde'
  // olanlardan H-/T-/Y- pattern'iyle çelişenler için AI öneri al
  const allMaterials = await db.select({
    id: rawMaterials.id,
    code: rawMaterials.code,
    name: rawMaterials.name,
    mainCategory: rawMaterials.mainCategory,
  })
    .from(rawMaterials)
    .where(eq(rawMaterials.isActive, true));

  console.log(`📊 Toplam aktif hammadde: ${allMaterials.length}\n`);

  // Kategori dağılımı (mevcut)
  const distribution: Record<string, number> = {};
  for (const m of allMaterials) {
    const c = m.mainCategory || "null";
    distribution[c] = (distribution[c] || 0) + 1;
  }
  console.log("📈 Mevcut dağılım:");
  for (const [cat, count] of Object.entries(distribution)) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log("");

  // Batch'ler halinde işle (50'şer)
  const BATCH_SIZE = 50;
  const updates: { id: number; category: string; reason?: string }[] = [];
  let totalProcessed = 0;
  let totalChanged = 0;

  for (let i = 0; i < allMaterials.length && Math.floor(i / BATCH_SIZE) < MAX_BATCHES; i += BATCH_SIZE) {
    const batch = allMaterials.slice(i, i + BATCH_SIZE).map(m => ({
      id: m.id,
      code: m.code,
      name: m.name,
      currentCategory: m.mainCategory,
    }));

    console.log(`🔮 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} kalem...`);
    const predictions = await predictBatch(batch);

    for (const pred of predictions) {
      const material = batch.find(m => m.code === pred.code);
      if (!material) continue;

      if (material.currentCategory !== pred.category) {
        updates.push({
          id: material.id,
          category: pred.category,
          reason: `${material.name} → ${pred.category} (${pred.confidence})`,
        });
        totalChanged++;
      }
      totalProcessed++;
    }

    // Rate limit korumalı
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 İşlenen: ${totalProcessed}, Değişen: ${totalChanged}\n`);

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN — DB güncellenmedi. İlk 20 değişiklik:");
    updates.slice(0, 20).forEach(u => console.log(`  #${u.id}: ${u.reason}`));
    if (updates.length > 20) console.log(`  ... +${updates.length - 20} daha`);
  } else {
    console.log("✅ Güncelleniyor...");
    for (const u of updates) {
      await db.update(rawMaterials)
        .set({ mainCategory: u.category })
        .where(eq(rawMaterials.id, u.id));
    }
    console.log(`✅ ${updates.length} hammadde güncellendi.`);
  }

  // Yeni dağılım
  console.log("\n📈 Sonuç dağılım (kategori bazlı):");
  const final = await db.select({
    cat: rawMaterials.mainCategory,
    count: sql<number>`count(*)::int`,
  })
    .from(rawMaterials)
    .where(eq(rawMaterials.isActive, true))
    .groupBy(rawMaterials.mainCategory);

  for (const row of final) {
    console.log(`  ${row.cat || "NULL"}: ${row.count}`);
  }

  await pool.end();
  console.log("\n✅ Tamamlandı.");
}

main().catch(err => {
  console.error("❌ HATA:", err);
  process.exit(1);
});
