// ═══════════════════════════════════════════════════════════════════
// Sprint 7 (5 May 2026) - TÜRKOMP Entegrasyonu
// ═══════════════════════════════════════════════════════════════════
// 
// Türkomp = Türkiye Ulusal Gıda Kompozisyon Veri Tabanı
// Kaynak: https://turkomp.tarimorman.gov.tr (Tarım ve Orman Bakanlığı)
// İçerik: 645 gıda × 100 bileşen = 63.000+ veri noktası
// 
// ⚠️ YASAL UYARI:
//   - Türkomp ücretsiz arama herkese açık
//   - Toplu veri çekme (bulk scraping) ticari kullanım sayılır → ÜCRETLİ LİSANS
//   - Bu modül SADECE kullanıcının manuel arama → tek tek getirme yapar
//   - Cache eski olabilir, kritik kararlar için orijinal kaynak doğrulanmalı
// 
// Kullanım akışı:
//   1) Kullanıcı (gıda mühendisi) hammadde ekler/düzenler
//   2) "TÜRKOMP'tan Getir" butonu → arama
//   3) Sonuçtan seçer → besin değerleri auto-fill
//   4) Onay → DB'ye yazılır (nutrition_source='turkomp')
// ═══════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { isAuthenticated } from '../localAuth';
import { db } from '../db';
import { turkompFoods, rawMaterials } from '@shared/schema';
import { eq, ilike, sql } from 'drizzle-orm';

const router = Router();

const TURKOMP_BASE = 'https://turkomp.tarimorman.gov.tr';
const TURKOMP_DB = `${TURKOMP_BASE}/database`;

// Yetki: Gıda mühendisi, satınalma, admin
const TURKOMP_ROLES = ['admin', 'ceo', 'satinalma', 'gida_muhendisi', 'kalite_kontrol', 'kalite'];

function canUseTurkomp(role: string): boolean {
  return TURKOMP_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// Bileşen kod → DB kolonu mapping
// ═══════════════════════════════════════════════════════════════════
const COMPONENT_MAP: Record<string, string> = {
  'ENERC': 'energyKcal',     // Enerji kcal
  'TR_ENERJ': 'energyKj',    // Enerji kJ
  'WATER': 'water',          // Su
  'PROT': 'protein',         // Protein
  'FAT': 'fat',              // Yağ
  'FASAT': 'saturatedFat',   // Doymuş yağ
  'CHO': 'carbohydrate',     // Karbonhidrat
  'SUGAR': 'sugar',          // Şeker (toplam)
  'FIBT': 'fiber',           // Lif
  'NACL': 'salt',            // Tuz
  'NA': 'sodium',            // Sodyum
};

// ═══════════════════════════════════════════════════════════════════
// HTML PARSER - tek bir gıda detayı parse et
// ═══════════════════════════════════════════════════════════════════
function parseFoodPage(html: string, turkompId: number, slug: string) {
  const data: any = {
    turkompId,
    slug,
    allComponents: {},
  };

  // Gıda adı (başlık)
  const nameMatch = html.match(/<h[12][^>]*>([^<]+)<\/h[12]>/);
  if (nameMatch) data.name = nameMatch[1].trim();

  // TÜRKOMP kodu
  const codeMatch = html.match(/Türkomp Gıda Kodu[\s\S]*?(\d{2}\.\d{2}\.\d{4})/);
  if (codeMatch) data.turkompCode = codeMatch[1];

  // Bilimsel isim
  const sciMatch = html.match(/Bilimsel isim[\s\S]*?:[\s\S]*?<[^>]+>([^<]+)</);
  if (sciMatch) data.scientificName = sciMatch[1].trim();

  // Gıda grubu
  const groupMatch = html.match(/Gıda Grupları[\s\S]*?»\s*([^<]+)</);
  if (groupMatch) data.foodGroup = groupMatch[1].trim();

  // Langual kod
  const langualMatch = html.match(/Langual Code[\s\S]*?<[^>]*>([A-Z0-9]+)</);
  if (langualMatch) data.langualCode = langualMatch[1];

  // Faktörler
  const nFactorMatch = html.match(/Azot Faktörü[\s\S]*?:[\s\S]*?([\d,]+)/);
  if (nFactorMatch) data.nitrogenFactor = parseFloat(nFactorMatch[1].replace(',', '.'));
  
  const fatFactorMatch = html.match(/Yağ Dönüşüm Faktörü[\s\S]*?:[\s\S]*?([\d,]+)/);
  if (fatFactorMatch) data.fatConversionFactor = parseFloat(fatFactorMatch[1].replace(',', '.'));

  // Bileşen tablosu - her satır: comp=XXX değer min max
  // Pattern: comp=ENERC) | min | max
  const componentRegex = /\?comp=([A-Z0-9_]+)["][^>]*>([\d,.\-]+)<\/a>[\s\S]*?<td[^>]*>([\d,.\-]+)<\/td>[\s\S]*?<td[^>]*>([\d,.\-]+)<\/td>/g;
  let match;
  while ((match = componentRegex.exec(html)) !== null) {
    const code = match[1];
    const avg = parseFloat(match[2].replace(',', '.'));
    const min = parseFloat(match[3].replace(',', '.'));
    const max = parseFloat(match[4].replace(',', '.'));
    
    data.allComponents[code] = { avg, min, max };
    
    // Kritik bileşenleri ana kolonlara da yaz
    if (COMPONENT_MAP[code]) {
      data[COMPONENT_MAP[code]] = avg;
    }
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════
// 1) GET /api/turkomp/search?q=... — Türkomp'ta gıda ara
// ═══════════════════════════════════════════════════════════════════
// Önce local cache'e bak, yoksa Türkomp listesinden arama yap
// ═══════════════════════════════════════════════════════════════════

router.get('/api/turkomp/search', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canUseTurkomp(user.role)) {
      return res.status(403).json({ message: 'TÜRKOMP arama yetkiniz yok' });
    }

    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ source: 'cache', results: [] });
    }

    // 1) Önce local cache'e bak (case insensitive)
    const cached = await db.select({
      id: turkompFoods.id,
      turkompId: turkompFoods.turkompId,
      turkompCode: turkompFoods.turkompCode,
      name: turkompFoods.name,
      foodGroup: turkompFoods.foodGroup,
      energyKcal: turkompFoods.energyKcal,
      protein: turkompFoods.protein,
      fat: turkompFoods.fat,
      carbohydrate: turkompFoods.carbohydrate,
    })
      .from(turkompFoods)
      .where(ilike(turkompFoods.name, `%${q}%`))
      .limit(20);

    if (cached.length > 0) {
      return res.json({ source: 'cache', count: cached.length, results: cached });
    }

    // 2) Cache'de yok → kullanıcıyı uyar (toplu scraping yasak)
    res.json({
      source: 'no_cache',
      results: [],
      message: 'Local cache\'de bulunamadı. Türkomp\'ta manuel arama yapın ve "Getir" butonuyla ekleyin.',
      turkompUrl: `${TURKOMP_DB}?type=foods&search=${encodeURIComponent(q)}`,
    });
  } catch (error: unknown) {
    console.error('/api/turkomp/search error:', error);
    res.status(500).json({ message: 'TÜRKOMP araması başarısız' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2) POST /api/turkomp/fetch — Belirli bir gıdayı TÜRKOMP'tan çek
// ═══════════════════════════════════════════════════════════════════
// Body: { turkompId: number, slug: string } veya { url: string }
// Cache'e yazar ve döndürür
// ═══════════════════════════════════════════════════════════════════

router.post('/api/turkomp/fetch', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canUseTurkomp(user.role)) {
      return res.status(403).json({ message: 'TÜRKOMP veri çekme yetkiniz yok' });
    }

    let { turkompId, slug, url } = req.body;
    
    // URL verildi ise ID/slug çıkar
    if (url) {
      const m = url.match(/food-(.+)-(\d+)$/);
      if (m) {
        slug = m[1];
        turkompId = parseInt(m[2]);
      }
    }
    
    if (!turkompId) {
      return res.status(400).json({ message: 'turkompId veya url gerekli' });
    }

    // Cache kontrolü
    const [existing] = await db.select()
      .from(turkompFoods)
      .where(eq(turkompFoods.turkompId, turkompId))
      .limit(1);
    
    if (existing) {
      return res.json({ source: 'cache', food: existing });
    }

    // Türkomp'tan çek
    const fetchUrl = `${TURKOMP_BASE}/food-${slug}-${turkompId}`;
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (DOSPRESSO Food Compliance Module)',
        'Accept': 'text/html',
        'Accept-Language': 'tr,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ 
        message: `TÜRKOMP ${response.status} döndü`,
        url: fetchUrl,
      });
    }

    const html = await response.text();
    const parsed = parseFoodPage(html, turkompId, slug);
    
    if (!parsed.name) {
      return res.status(422).json({ 
        message: 'Türkomp sayfası parse edilemedi',
        url: fetchUrl,
      });
    }

    // Cache'e yaz
    parsed.fetchedById = user.id;
    parsed.source = 'turkomp';
    
    const [created] = await db.insert(turkompFoods).values(parsed).returning();

    res.json({ 
      source: 'fresh', 
      food: created,
      message: 'TÜRKOMP\'tan başarıyla çekildi ve cache\'e yazıldı.',
    });
  } catch (error: unknown) {
    console.error('/api/turkomp/fetch error:', error);
    res.status(500).json({ message: 'TÜRKOMP veri çekme başarısız', error: String(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3) POST /api/girdi/:id/apply-turkomp — Hammaddeye TÜRKOMP verisini uygula
// ═══════════════════════════════════════════════════════════════════
// Body: { turkompFoodId: number }
// Hammadde besin değerlerini TÜRKOMP'tan kopyalar
// ═══════════════════════════════════════════════════════════════════

router.post('/api/girdi/:id/apply-turkomp', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canUseTurkomp(user.role)) {
      return res.status(403).json({ message: 'TÜRKOMP uygulama yetkiniz yok' });
    }

    const girdiId = parseInt(req.params.id);
    const { turkompFoodId } = req.body;
    if (!turkompFoodId) return res.status(400).json({ message: 'turkompFoodId gerekli' });

    const [tf] = await db.select().from(turkompFoods).where(eq(turkompFoods.id, turkompFoodId)).limit(1);
    if (!tf) return res.status(404).json({ message: 'TÜRKOMP gıdası bulunamadı' });

    const [updated] = await db.update(rawMaterials)
      .set({
        energyKcal: tf.energyKcal,
        energyKj: tf.energyKj,
        protein: tf.protein,
        fat: tf.fat,
        saturatedFat: tf.saturatedFat,
        carbohydrate: tf.carbohydrate,
        sugar: tf.sugar,
        fiber: tf.fiber,
        salt: tf.salt,
        turkompFoodId: turkompFoodId,
        nutritionSource: 'turkomp',
        updatedAt: new Date(),
      })
      .where(eq(rawMaterials.id, girdiId))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Hammadde bulunamadı' });

    res.json({ 
      message: 'TÜRKOMP verisi uygulandı',
      food: tf.name,
      updated,
    });
  } catch (error: unknown) {
    console.error('/api/girdi/:id/apply-turkomp error:', error);
    res.status(500).json({ message: 'TÜRKOMP uygulama başarısız' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4) GET /api/turkomp/cache/list — Cache'deki tüm gıdaları listele
// ═══════════════════════════════════════════════════════════════════

router.get('/api/turkomp/cache/list', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!canUseTurkomp(user.role)) {
      return res.status(403).json({ message: 'Yetki yok' });
    }

    const items = await db.select({
      id: turkompFoods.id,
      turkompId: turkompFoods.turkompId,
      name: turkompFoods.name,
      foodGroup: turkompFoods.foodGroup,
      energyKcal: turkompFoods.energyKcal,
      fetchedAt: turkompFoods.fetchedAt,
    })
      .from(turkompFoods)
      .orderBy(turkompFoods.name);
    
    res.json({ count: items.length, foods: items });
  } catch (error: unknown) {
    console.error('/api/turkomp/cache/list error:', error);
    res.status(500).json({ message: 'Cache liste alınamadı' });
  }
});

export default router;
