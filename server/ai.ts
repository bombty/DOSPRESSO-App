import OpenAI from "openai";
import QRCode from "qrcode";
import { PDFParse } from "pdf-parse";
import { optimizeGalleryImage } from "./imageProcessor";
import { cache, generateCacheKey, aiRateLimiter } from "./cache";
import { storage } from "./storage";
import type { SummaryCategoryType, AISummaryResponse, Task, EquipmentFault } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Separate client for embeddings (Replit proxy doesn't support embeddings endpoint)
const embeddingsClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Cost-optimized model selection
// gpt-4o is 60% cheaper than gpt-4-turbo for vision tasks
const VISION_MODEL = "gpt-4o"; // For photo analysis (task, fault, cleanliness, dress code)
const CHAT_MODEL = "gpt-4o"; // For RAG Q&A
const SUMMARY_MODEL = "gpt-4o-mini"; // For dashboard summaries (most cost-efficient)
const EMBEDDING_MODEL = "text-embedding-3-small"; // Already optimal

// Pricing map (per 1K tokens) - Updated as of 2024
const PRICING = {
  "gpt-4o": {
    input: 0.0025,  // $2.50 per 1M tokens
    output: 0.010,  // $10.00 per 1M tokens
  },
  "gpt-4o-mini": {
    input: 0.00015, // $0.15 per 1M tokens
    output: 0.0006, // $0.60 per 1M tokens
  },
  "text-embedding-3-small": {
    input: 0.00002, // $0.02 per 1M tokens
    output: 0,      // No output tokens for embeddings
  },
} as const;

// Helper to calculate cost based on token usage
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) {
    console.warn(`Unknown model pricing: ${model}, using $0`);
    return 0;
  }
  
  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

// ========================================
// DOSPRESSO AI SYSTEM PROMPT BUILDER
// Kapsamlı DOSPRESSO bilgisi, ekipman, webapp kılavuzu
// ========================================

function buildDospressoSystemPrompt(equipmentContext?: { 
  type: string; 
  serialNumber?: string; 
  branch?: string; 
  recentFaults?: Array<{ description: string; date: string }>;
  branchEquipment?: Array<{ name: string; type: string; brand?: string; model?: string }>;
}): string {
  
  // Temel DOSPRESSO bilgisi
  const dospressoInfo = `
## DOSPRESSO HAKKINDA
DOSPRESSO, Türkiye genelinde faaliyet gösteren premium kahve franchise zinciridir.
- **Misyon**: Kaliteli kahve deneyimini herkes için erişilebilir kılmak
- **Standartlar**: Tüm şubelerde tutarlı ürün kalitesi ve müşteri deneyimi
- **Değerler**: Kalite, tutarlılık, müşteri memnuniyeti, ekip çalışması

## ŞUBE STANDARTLARI
- Açılış prosedürü: Ekipman kontrolü → Temizlik → Malzeme kontrolü → Kasa açılış
- Kapanış prosedürü: Ekipman temizliği → Stok sayımı → Kasa kapanış → Güvenlik kontrolü
- Hijyen standartları: Saatlik el yıkama, 2 saatte bir yüzey temizliği
- Müşteri hizmetleri: 3 dakika içinde sipariş alma, 5 dakika içinde servis`;

  // Ekipman tipleri bilgisi
  const equipmentInfo = `
## ŞUBE EKİPMANLARI

### Espresso Makinesi
- **Günlük bakım**: Grup başlığı temizliği, buhar çubuğu purge, damlatma tepsisi boşaltma
- **Haftalık bakım**: Backflush (ilaçlı temizlik), su filtresi kontrolü
- **Sık arızalar**: Basınç düşüklüğü, su sıcaklığı sorunu, buhar çubuğu tıkanması
- **Kalibrasyon**: 9 bar basınç, 92-96°C su sıcaklığı, 25-30 saniye ekstraksiyon

### Kahve Değirmeni
- **Günlük bakım**: Hazne temizliği, çıkış ağzı silme
- **Haftalık bakım**: Bıçak temizliği, kalibrasyon kontrolü
- **Ayar**: Espresso için ince öğütme (200-250 mikron), filtre için orta (400-500 mikron)
- **Sık sorunlar**: Öğütme tutarsızlığı, motor aşırı ısınması, bıçak aşınması

### Buzdolabı / Soğutucu
- **Sıcaklık**: Süt ve süt ürünleri 2-4°C, diğer ürünler 4-7°C
- **Günlük kontrol**: Sıcaklık ölçümü, kapak contası kontrolü
- **Haftalık bakım**: İç temizlik, kondenser temizliği

### Blender / Frappe Makinesi
- **Her kullanım sonrası**: Su ile durulama
- **Günlük bakım**: Deterjanla temizlik, bıçak kontrolü
- **Sorunlar**: Motor yorgunluğu, sızdırmazlık sorunu

### Buz Makinesi
- **Hijyen**: Haftalık iç temizlik, su filtresi aylık değişim
- **Bakım**: Kondenser temizliği, su tahliye kontrolü`;

  // WebApp kullanım kılavuzu
  const webappGuide = `
## DOSPRESSO WEBAPP KULLANIM KILAVUZU

### ANA SAYFA (Dashboard)
- **Erişim**: / veya Ana Sayfa butonu
- **İçerik**: Günlük görevler, kritik uyarılar, özet istatistikler
- **Kiosk modu**: Hızlı erişim butonu ile tam ekran görünüm

### OPERASYONLAR (/operasyon)
- **Şubeler**: Tüm şubelerin listesi ve detayları
- **Görevler**: Atanan görevler, tamamlama durumu
- **Checklistler**: Günlük checklist tamamlama
- **Kayıp Eşya**: Kayıp/bulunan eşya takibi

### EKİPMAN YÖNETİMİ (/ekipman)
- **Ekipman Listesi**: Şubedeki tüm ekipmanlar
- **Arıza Bildirimi**: QR tarayarak veya manuel arıza kaydı
- **Bakım Takvimi**: Planlı bakım tarihleri
- **Nasıl Kullanılır**: 
  1. Ekipman listesinden cihaz seç
  2. "Arıza Bildir" butonuna tıkla
  3. Fotoğraf çek ve açıklama yaz
  4. Gönder

### PERSONEL & İK (/ik)
- **Personel Listesi**: Çalışan bilgileri
- **Vardiya Planlama**: Haftalık vardiya planı
- **İzin Talepleri**: İzin başvurusu ve onay
- **Mesai Takibi**: Giriş-çıkış kayıtları

### EĞİTİM & AKADEMİ (/akademi)
- **Eğitimler**: Mevcut eğitim modülleri
- **Quizler**: Bilgi testleri
- **Sertifikalar**: Kazanılan sertifikalar
- **Kariyer Yolu**: Terfi gereksinimleri

### RAPORLAR (/raporlar)
- **AI Özet Rapor**: Yapay zeka destekli analiz
- **Performans**: Şube ve personel performansı
- **Kalite Denetimi**: Denetim sonuçları

### MUTFAK & TARİFLER (/mutfak)
- **Tarifler**: Standart içecek/yiyecek tarifleri
- **Malzeme Ölçüleri**: Doğru porsiyonlar

### YARDIM & NAVIGASYON
- Bir sayfaya gitmek için: Sol menüden ilgili bölümü seç
- QR taramak için: Sağ üst köşedeki QR butonu
- Bildirimler: Sağ üst köşedeki zil ikonu
- Profil: Sağ üst köşedeki profil resmi`;

  // Rol bazlı erişim bilgisi
  const roleInfo = `
## ROL BAZLI ERİŞİM
- **Barista/Stajyer**: Dashboard, Operasyonlar, Ekipman, Eğitim, Mutfak
- **Supervisor**: + Personel yönetimi, Vardiya planlama, Raporlar
- **HQ (Genel Merkez)**: Tüm modüllere erişim + Admin paneli
- **Fabrika**: Dashboard, Fabrika modülü, Raporlar, Eğitim`;

  // Ekipman bağlamı varsa ekle
  let equipmentContextInfo = '';
  if (equipmentContext) {
    equipmentContextInfo = `
## MEVCUT EKİPMAN BAĞLAMI
- **Cihaz Tipi**: ${equipmentContext.type}
${equipmentContext.serialNumber ? `- **Seri No**: ${equipmentContext.serialNumber}` : ''}
${equipmentContext.branch ? `- **Şube**: ${equipmentContext.branch}` : ''}`;

    if (equipmentContext.recentFaults && equipmentContext.recentFaults.length > 0) {
      equipmentContextInfo += `\n- **Son Arızalar**:\n${equipmentContext.recentFaults.map(f => `  - ${f.description} (${f.date})`).join('\n')}`;
    }
    
    if (equipmentContext.branchEquipment && equipmentContext.branchEquipment.length > 0) {
      equipmentContextInfo += `\n\n## ŞUBE EKİPMAN LİSTESİ\n${equipmentContext.branchEquipment.map(e => `- ${e.name} (${e.type}${e.brand ? `, ${e.brand}` : ''}${e.model ? ` ${e.model}` : ''})`).join('\n')}`;
    }
  }

  return `Sen DOSPRESSO kahve franchise yönetim sisteminin AI asistanısın.

## GÖREVLER
1. Ekipman bakımı, kalibrasyonu ve arıza giderme konularında yardım et
2. DOSPRESSO sistemi ve standartları hakkında bilgi ver
3. WebApp kullanımı ve navigasyon konusunda rehberlik et
4. Şube prosedürleri ve çalışma standartları hakkında bilgilendir

## KURALLAR
- Her zaman Türkçe cevap ver
- Kısa, net ve uygulanabilir cevaplar ver
- Teknik terimleri basit açıkla
- Güvenlik konularında dikkatli ol ve her zaman uzman yönlendirmesi öner
- WebApp navigasyonu için sayfa yollarını (/) kullanarak yönlendir
- Samimi ama profesyonel ol

${dospressoInfo}
${equipmentInfo}
${webappGuide}
${roleInfo}
${equipmentContextInfo}`.trim();
}

// QR Code Generation for Equipment
export async function generateEquipmentQR(equipmentId: number): Promise<string> {
  // QR data: equipment path for frontend routing
  const qrData = `/ekipman/${equipmentId}`;
  
  // Generate base64 data URL
  const qrCodeDataURL = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 1,
  });
  
  return qrCodeDataURL; // base64 string
}

// AI usage logging wrapper
async function captureAiUsage<T>(
  operation: string,
  feature: string,
  fn: () => Promise<{ result: T; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string }>,
  userId?: string,
  branchId?: number,
  cachedHit: boolean = false,
  metadata?: any
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const { result, usage, model } = await fn();
    const latency = Date.now() - startTime;
    
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || 0;
    const costUsd = cachedHit ? 0 : calculateCost(model, promptTokens, completionTokens);
    
    // Log to database (fire and forget to not block response)
    storage.logAiUsage({
      feature,
      model,
      operation,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: costUsd.toString(),
      requestLatencyMs: latency,
      userId: userId || null,
      branchId: branchId || null,
      cachedHit,
      metadata: metadata || null,
    }).catch(err => {
      console.error('Failed to log AI usage:', err);
    });
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Log failed attempt
    storage.logAiUsage({
      feature,
      model: 'unknown',
      operation,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: '0',
      requestLatencyMs: latency,
      userId: userId || null,
      branchId: branchId || null,
      cachedHit: false,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error', ...metadata },
    }).catch(err => {
      console.error('Failed to log AI usage:', err);
    });
    
    throw error;
  }
}

export interface TaskPhotoAnalysis {
  analysis: string;
  score: number; // 0-100
  passed: boolean;
}

export interface FaultPhotoAnalysis {
  analysis: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

export interface CleanlinessAnalysis {
  isClean: boolean;
  score: number; // 0-100
  summary: string;
  issues: string[]; // List of cleanliness issues found
  recommendations: string[];
}

export interface DressCodeAnalysis {
  isCompliant: boolean;
  score: number; // 0-100
  summary: string;
  violations: string[]; // List of dress code violations
  details: {
    uniform: boolean;
    hair: boolean;
    facial: boolean; // beard/mustache
    hygiene: boolean;
  };
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    articleId: number;
    title: string;
    relevantChunk: string;
  }>;
}

export interface ShiftSuggestion {
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  shiftType: "morning" | "evening" | "night";
  assignedCandidateIds: string[]; // User IDs of recommended employees
  confidence: number; // 0-100
  notes: string; // AI reasoning
}

export interface ShiftPlanResponse {
  shifts?: Array<{
    shiftDate: string;
    startTime: string;
    endTime: string;
    shiftType: string;
    assignedToId: string;
    status: string;
  }>;
  suggestions?: ShiftSuggestion[];
  totalShifts: number;
  summary?: string;
  weekStart: string;
  weekEnd: string;
  cached: boolean;
}

export interface BranchPerformanceEvaluation {
  overallScore: number; // 0-100
  summary: string; // Genel değerlendirme (2-3 cümle)
  strengths: string[]; // Güçlü yönler
  weaknesses: string[]; // Zayıf yönler
  recommendations: string[]; // İyileştirme önerileri
  trend: "improving" | "stable" | "declining"; // Trend analizi
}

export async function analyzeTaskPhoto(
  photoUrl: string,
  taskDescription: string,
  userId?: string,
  skipCache: boolean = false,
  branchId?: number
): Promise<TaskPhotoAnalysis> {
  // Check cache first (24h TTL)
  const cacheKey = generateCacheKey('task-photo', photoUrl, taskDescription);
  if (!skipCache) {
    const cached = cache.get<TaskPhotoAnalysis>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Task photo analysis (cost saved!)');
      // Log cache hit
      storage.logAiUsage({
        feature: 'task_photo',
        model: VISION_MODEL,
        operation: 'analyzeTaskPhoto',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: '0',
        requestLatencyMs: 0,
        userId: userId || null,
        branchId: branchId || null,
        cachedHit: true,
        metadata: null,
      }).catch(err => console.error('Failed to log AI usage:', err));
      return cached;
    }
  }

  // CRITICAL: Rate limit check (only if making real AI call and userId provided)
  const PHOTO_LIMIT = 100; // 100 photo analyses per day ($200/month budget)
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      analysis: "Günlük fotoğraf analiz limitiniz doldu (100/gün). Yarın tekrar deneyin veya supervisor ile iletişime geçin.",
      score: 70, // Default pass score
      passed: true,
    };
  }

  try {
    // Convert GCS photoUrl to base64 for OpenAI (private URLs are not accessible)
    let imageDataUrl = photoUrl;
    if (photoUrl.startsWith('https://storage.googleapis.com/')) {
      try {
        console.log(`[AI] Attempting to download photo from GCS: ${photoUrl}`);
        const { objectStorageClient } = await import('./objectStorage');
        
        // Parse GCS URL: https://storage.googleapis.com/bucket/path
        const url = new URL(photoUrl);
        const pathParts = url.pathname.split('/').filter(p => p.length > 0);
        const bucketName = pathParts[0];
        const objectPath = pathParts.slice(1).join('/');
        
        console.log(`[AI] Parsed GCS URL - bucket: ${bucketName}, path: ${objectPath}`);
        
        // Download file from GCS
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectPath);
        
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
          console.error(`[AI] File does not exist in GCS: ${bucketName}/${objectPath}`);
          throw new Error(`File not found: ${objectPath}`);
        }
        
        const [fileBuffer] = await file.download();
        
        if (!fileBuffer || fileBuffer.length === 0) {
          console.error(`[AI] Downloaded file is empty (0 bytes)`);
          throw new Error('Downloaded file is empty');
        }
        
        // OpenAI Vision API requires minimum image size (reject tiny test images)
        const MIN_IMAGE_SIZE = 1024; // 1KB minimum
        if (fileBuffer.length < MIN_IMAGE_SIZE) {
          console.warn(`[AI] Image too small for AI analysis (${fileBuffer.length} bytes < ${MIN_IMAGE_SIZE} bytes minimum)`);
          throw new Error(`Image too small for AI analysis (${fileBuffer.length} bytes). Please upload a real photo.`);
        }
        
        // Detect mime type from path
        const ext = objectPath.toLowerCase().split('.').pop();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/jpeg';
        
        // Convert to base64 data URL
        const base64 = fileBuffer.toString('base64');
        imageDataUrl = `data:${mimeType};base64,${base64}`;
        console.log(`✅ Photo converted to base64 for AI analysis (${Math.round(fileBuffer.length / 1024)}KB, mime: ${mimeType})`);
      } catch (downloadError) {
        console.error('[AI] Failed to download photo from GCS for AI analysis:', downloadError);
        // If image is too small, return clear message instead of attempting OpenAI call
        if (downloadError instanceof Error && downloadError.message.includes('too small')) {
          return {
            analysis: "Fotoğraf çok küçük (test image). Lütfen gerçek bir fotoğraf yükleyin (minimum 1KB).",
            score: 0,
            passed: false,
          };
        }
        // For other errors, fallback to original URL (will likely fail but at least we tried)
      }
    }
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: VISION_MODEL, // gpt-4o: 60% cheaper than gpt-4-turbo
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Bir DOSPRESSO kahve dükkanında aşağıdaki görevi analiz edin:

Görev: ${taskDescription}

Fotoğraftaki görevi değerlendirin ve şunları yapın:
1. Görevin doğru bir şekilde tamamlanıp tamamlanmadığını analiz edin
2. 0-100 arası bir puan verin (100 = mükemmel, 0 = kabul edilemez)
3. Kısa bir Türkçe değerlendirme yazın (2-3 cümle)
4. Görevi "geçti" veya "kaldı" olarak sınıflandırın (60 puanın üzeri geçer)

JSON formatında yanıt verin:
{
  "analysis": "Türkçe değerlendirme",
  "score": 85,
  "passed": true
}`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });
    const latency = Date.now() - startTime;

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt içeriği boş");
    }

    const result = JSON.parse(content);
    const analysis: TaskPhotoAnalysis = {
      analysis: result.analysis || "Analiz yapılamadı",
      score: Math.min(Math.max(result.score || 0, 0), 100),
      passed: result.passed || false,
    };

    // Cache for 72 hours (extended for $200/month - task analysis rarely changes)
    cache.set(cacheKey, analysis, 72 * 60 * 60 * 1000);
    
    // Log AI usage
    const usage = response.usage;
    const costUsd = calculateCost(VISION_MODEL, usage?.prompt_tokens || 0, usage?.completion_tokens || 0);
    storage.logAiUsage({
      feature: 'task_photo',
      model: VISION_MODEL,
      operation: 'analyzeTaskPhoto',
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      costUsd: costUsd.toString(),
      requestLatencyMs: latency,
      userId: userId || null,
      branchId: branchId || null,
      cachedHit: false,
      metadata: null,
    }).catch(err => console.error('Failed to log AI usage:', err));
    
    // Increment rate limit counter (only on successful AI call)
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'photo');
      const remaining = aiRateLimiter.getRemainingCalls(userId, 'photo', PHOTO_LIMIT);
      console.log(`💰 AI call made - Task photo analysis (${remaining}/${PHOTO_LIMIT} remaining for user ${userId})`);
    } else {
      console.log('💰 AI call made - Task photo analysis (no userId, rate limit not tracked)');
    }

    return analysis;
  } catch (error) {
    console.error("Görev fotoğrafı analiz hatası:", error);
    return {
      analysis: "AI analizi yapılamadı. Fotoğraf başarıyla yüklendi ancak otomatik değerlendirme mevcut değil.",
      score: 70,
      passed: true,
    };
  }
}

export async function analyzeFaultPhoto(
  photoUrl: string,
  equipmentName: string,
  description: string,
  userId?: string,
  skipCache: boolean = false
): Promise<FaultPhotoAnalysis> {
  // Check cache first
  const cacheKey = generateCacheKey('fault-photo', photoUrl, equipmentName, description);
  if (!skipCache) {
    const cached = cache.get<FaultPhotoAnalysis>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Fault photo analysis (cost saved!)');
      return cached;
    }
  }

  // Rate limit check (shares photo quota)
  const PHOTO_LIMIT = 100; // $200/month budget
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      analysis: "Günlük fotoğraf analiz limitiniz doldu (100/gün). Arıza kaydedildi ancak otomatik analiz yapılamadı.",
      severity: "medium",
      recommendations: ["Bir teknisyen ile iletişime geçin", "Ekipmanın kullanımını durdurun"],
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL, // gpt-4o: cost-optimized
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Bir DOSPRESSO kahve dükkanında aşağıdaki ekipman arızasını analiz edin:

Ekipman: ${equipmentName}
Arıza Açıklaması: ${description}

Fotoğrafa bakarak şunları yapın:
1. Arızanın ciddiyetini değerlendirin (low, medium, high, critical)
2. Arızanın nedenini ve olası çözümleri Türkçe olarak açıklayın
3. Acil eylem gerektirip gerektirmediğini belirtin
4. Teknisyen için öneriler sunun

JSON formatında yanıt verin:
{
  "analysis": "Detaylı Türkçe arıza analizi (3-5 cümle)",
  "severity": "medium",
  "recommendations": ["Öneri 1", "Öneri 2", "Öneri 3"]
}`,
            },
            {
              type: "image_url",
              image_url: {
                url: photoUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt içeriği boş");
    }

    const result = JSON.parse(content);
    const analysis: FaultPhotoAnalysis = {
      analysis: result.analysis || "Analiz yapılamadı",
      severity: result.severity || "medium",
      recommendations: result.recommendations || [],
    };

    // Cache for 72 hours (extended for $200/month - fault analysis rarely changes)
    cache.set(cacheKey, analysis, 72 * 60 * 60 * 1000);
    
    // Increment rate limit counter (shares photo quota)
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'photo');
      const remaining = aiRateLimiter.getRemainingCalls(userId, 'photo', PHOTO_LIMIT);
      console.log(`💰 AI call made - Fault photo analysis (${remaining}/${PHOTO_LIMIT} remaining for user ${userId})`);
    } else {
      console.log('💰 AI call made - Fault photo analysis');
    }

    return analysis;
  } catch (error) {
    console.error("Arıza fotoğrafı analiz hatası:", error);
    return {
      analysis: "AI analizi yapılamadı. Fotoğraf başarıyla yüklendi ancak otomatik değerlendirme mevcut değil. Lütfen bir teknisyen ile iletişime geçin.",
      severity: "medium",
      recommendations: ["Bir teknisyen ile iletişime geçin", "Ekipmanın kullanımını durdurun", "Arızayı detaylı olarak belgeleyin"],
    };
  }
}

// Analyze cleanliness from photo (optimized for batch processing)
export async function analyzeCleanlinessPhoto(
  photoUrl: string,
  locationDescription: string = "cafe alanı"
): Promise<CleanlinessAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `DOSPRESSO kahve dükkanında ${locationDescription} temizlik fotoğrafını değerlendirin.

Kritik temizlik standartları:
- Yüzeyler temiz ve lekesiz olmalı
- Çöp kutuları dolu olmamalı
- Zemin temiz ve kuru olmalı
- Ekipmanlar parlak ve bakımlı olmalı
- Hiçbir yiyecek artığı görünmemeli

JSON formatında yanıt verin:
{
  "isClean": true/false,
  "score": 85,
  "summary": "Kısa genel değerlendirme",
  "issues": ["Sorun 1", "Sorun 2"],
  "recommendations": ["Öneri 1", "Öneri 2"]
}`,
            },
            {
              type: "image_url",
              image_url: { url: photoUrl, detail: "low" }, // Low detail for cost optimization
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500, // Limit tokens for cost
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    return {
      isClean: result.isClean ?? true,
      score: Math.min(Math.max(result.score || 0, 0), 100),
      summary: result.summary || "Analiz tamamlandı",
      issues: result.issues || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("Temizlik analiz hatası:", error);
    return {
      isClean: false, // FALSE - requires manual review
      score: 0,
      summary: "⚠️ Otomatik analiz BAŞARISIZ - Supervisor incelemesi zorunlu",
      issues: ["AI analizi yapılamadı - manuel kontrol gerekli"],
      recommendations: ["Fotoğrafı supervisor ile inceleyin", "Tekrar fotoğraf çekin"],
    };
  }
}

// Analyze dress code compliance from employee photo
export async function analyzeDressCodePhoto(
  photoUrl: string,
  employeeName: string = "Çalışan",
  userId?: string,
  skipCache: boolean = false
): Promise<DressCodeAnalysis> {
  // Check cache first (24h TTL)
  const cacheKey = generateCacheKey('dress-code', photoUrl, employeeName);
  if (!skipCache) {
    const cached = cache.get<DressCodeAnalysis>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Dress code analysis (cost saved!)');
      return cached;
    }
  }

  // CRITICAL: Rate limit check (shares photo quota with task/fault analysis)
  const PHOTO_LIMIT = 100; // 100 photo analyses per day ($200/month budget)
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      isCompliant: false,
      score: 0,
      summary: "Günlük fotoğraf analiz limitiniz doldu (100/gün). Yarın tekrar deneyin.",
      violations: ["Günlük limit aşıldı - manuel kontrol gerekli"],
      details: {
        uniform: false,
        hair: false,
        facial: false,
        hygiene: false,
      },
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `DOSPRESSO çalışanı ${employeeName} için dress code kontrolü yapın.

Dress code standartları:
1. Üniforma: Kırmızı DOSPRESSO önlüğü/logosu, temiz ve lekesiz
2. Saç: Toplı, temiz, doğal renk, hijyenik görünüm
3. Sakal/bıyık: Düzgün kesilmiş veya tıraşlı, bakımlı
4. Genel hijyen: Temiz, profesyonel görünüm, takılar minimal
5. Lokasyon: Çalışma alanında (kafe bar/counter görünümlü)

JSON formatında TÜRKÇE yanıt verin:
{
  "isCompliant": true/false,
  "score": 90,
  "summary": "Kısa genel değerlendirme (2-3 cümle)",
  "violations": ["İhlal 1", "İhlal 2"],
  "details": {
    "uniform": true,
    "hair": true,
    "facial": true,
    "hygiene": true
  }
}`,
            },
            {
              type: "image_url",
              image_url: { url: photoUrl, detail: "low" }, // Low detail for cost
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    const analysis: DressCodeAnalysis = {
      isCompliant: result.isCompliant ?? true,
      score: Math.min(Math.max(result.score || 0, 0), 100),
      summary: result.summary || "Analiz tamamlandı",
      violations: result.violations || [],
      details: result.details || {
        uniform: true,
        hair: true,
        facial: true,
        hygiene: true,
      },
    };

    // Cache for 72 hours (extended for $200/month - dress code rules rarely change)
    cache.set(cacheKey, analysis, 72 * 60 * 60 * 1000);
    
    // Increment rate limit counter (only on successful AI call)
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'photo');
      const remaining = aiRateLimiter.getRemainingCalls(userId, 'photo', PHOTO_LIMIT);
      console.log(`💰 AI call made - Dress code analysis (${remaining}/${PHOTO_LIMIT} remaining for user ${userId})`);
    } else {
      console.log('💰 AI call made - Dress code analysis (no userId, rate limit not tracked)');
    }

    return analysis;
  } catch (error) {
    console.error("Dress code analiz hatası:", error);
    return {
      isCompliant: false, // FALSE - requires manual review
      score: 0,
      summary: "⚠️ Otomatik analiz başarısız - Supervisor incelemesi zorunlu",
      violations: ["AI analizi yapılamadı - manuel kontrol gerekli"],
      details: {
        uniform: false,
        hair: false,
        facial: false,
        hygiene: false,
      },
    };
  }
}

// Helper function to chunk text for embedding
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

// Generate embedding for a text chunk
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await embeddingsClient.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding oluşturma hatası:", error);
    throw new Error("Embedding oluşturulamadı");
  }
}

// Generate embeddings for article content (splits into chunks)
export async function generateArticleEmbeddings(
  articleId: number,
  title: string,
  content: string
): Promise<Array<{ chunkText: string; chunkIndex: number; embedding: number[] }>> {
  try {
    const fullText = `${title}\n\n${content}`;
    const chunks = chunkText(fullText, 800);
    
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      embeddings.push({
        chunkText: chunks[i],
        chunkIndex: i,
        embedding,
      });
    }
    
    return embeddings;
  } catch (error) {
    console.error("Makale embedding oluşturma hatası:", error);
    throw error;
  }
}

// Answer a question using RAG (Retrieval Augmented Generation)
export async function answerQuestionWithRAG(
  question: string,
  relevantChunks: Array<{ chunkText: string; articleId: number; articleTitle: string }>,
  userId?: string,
  skipCache: boolean = false
): Promise<RAGResponse> {
  // Check cache first
  const cacheKey = generateCacheKey('rag-qa', question, relevantChunks.map(c => c.articleId).sort());
  if (!skipCache) {
    const cached = cache.get<RAGResponse>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - RAG Q&A (cost saved!)');
      return cached;
    }
  }

  // RAG rate limit removed - embedding costs are minimal with $200/month budget
  // Unlimited RAG queries allowed (only embedding + GPT-4o costs)

  try {
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.chunkText}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL, // gpt-4o for text generation
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve dükkanları için bir AI asistanısın. Sadece verilen bilgi bankası içeriğinden yararlanarak Türkçe cevap ver. Eğer cevap bilgi bankasında yoksa, "Bu konuda bilgi bankasında bilgi bulamadım" de.`,
        },
        {
          role: "user",
          content: `Bilgi Bankası İçeriği:\n${context}\n\nSoru: ${question}`,
        },
      ],
      max_completion_tokens: 8192,
    });

    const answer = response.choices[0]?.message?.content || "Cevap oluşturulamadı";

    const sources = relevantChunks.map((chunk) => ({
      articleId: chunk.articleId,
      title: chunk.articleTitle,
      relevantChunk: chunk.chunkText.substring(0, 200) + "...",
    }));

    const result: RAGResponse = { answer, sources };

    // Cache for 48 hours (extended for $200/month budget)
    cache.set(cacheKey, result, 48 * 60 * 60 * 1000);
    
    // No rate limiting for RAG - embedding costs are minimal
    console.log('💰 AI call made - RAG Q&A (unlimited with $200/month budget)');

    return result;
  } catch (error) {
    console.error("RAG soru-cevap hatası:", error);
    throw new Error("Soru cevaplanamadı");
  }
}

// Enhanced Technical Assistant with fallback LLM (for $100/month budget)
export async function answerTechnicalQuestion(
  question: string,
  equipmentContext?: { 
    type: string; 
    serialNumber?: string; 
    branch?: string; 
    recentFaults?: Array<{ description: string; date: string }>;
    branchEquipment?: Array<{ name: string; type: string; brand?: string; model?: string }>;
    knowledgeContext?: string;
    recipeContext?: string;
  },
  userId?: string,
  skipCache: boolean = false
): Promise<RAGResponse & { usedKnowledgeBase: boolean; systemMessage?: string }> {
  // Increased rate limit for $200/month budget
  const TECH_ASSIST_LIMIT = 200; // 200 calls per day (comprehensive AI assistance)
  
  // Use 'system' userId for unauthenticated requests to enforce global rate limit
  const effectiveUserId = userId || 'system';
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'tech_assist', TECH_ASSIST_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${effectiveUserId} exceeded daily tech assist quota`);
    throw new Error("Günlük AI asistan limitiniz doldu (50/gün). Yarın tekrar deneyin.");
  }

  // Build enriched context for better answers
  let enrichedQuestion = question;
  if (equipmentContext) {
    const contextParts = [
      `Cihaz Tipi: ${equipmentContext.type}`,
      equipmentContext.serialNumber ? `Seri No: ${equipmentContext.serialNumber}` : null,
      equipmentContext.branch ? `Şube: ${equipmentContext.branch}` : null,
    ].filter(Boolean);
    
    if (equipmentContext.recentFaults && equipmentContext.recentFaults.length > 0) {
      const faultsText = equipmentContext.recentFaults
        .map(f => `- ${f.description} (${f.date})`)
        .join('\n');
      contextParts.push(`Son Arızalar:\n${faultsText}`);
    }
    
    // Add branch equipment list for context
    if (equipmentContext.branchEquipment && equipmentContext.branchEquipment.length > 0) {
      const equipmentList = equipmentContext.branchEquipment
        .map(e => `- ${e.name} (${e.type})${e.brand ? `, ${e.brand}` : ''}${e.model ? ` ${e.model}` : ''}`)
        .join('\n');
      contextParts.push(`Şubedeki Ekipmanlar:\n${equipmentList}`);
    }
    
    // Add equipment knowledge context
    if (equipmentContext.knowledgeContext) {
      contextParts.push(`İlgili Bilgi Bankası:\n${equipmentContext.knowledgeContext}`);
    }
    
    // Add recipe context for menu/drink questions
    if (equipmentContext.recipeContext) {
      contextParts.push(`İlgili Reçeteler:\n${equipmentContext.recipeContext}`);
    }
    
    if (contextParts.length > 0) {
      enrichedQuestion = `${contextParts.join('\n\n')}\n\nSoru: ${question}`;
    }
  }

  // Step 1: Try knowledge base first (RAG)
  try {
    const queryEmbedding = await generateEmbedding(enrichedQuestion);
    const relevantChunks = await storage.semanticSearch(queryEmbedding, 5);

    if (relevantChunks.length > 0) {
      // Knowledge base found - use RAG
      const ragResponse = await answerQuestionWithRAG(enrichedQuestion, relevantChunks, userId, skipCache);
      
      aiRateLimiter.incrementRequest(effectiveUserId, 'tech_assist');
      const remaining = aiRateLimiter.getRemainingCalls(effectiveUserId, 'tech_assist', TECH_ASSIST_LIMIT);
      console.log(`💰 AI call - Tech Assist RAG (${remaining}/${TECH_ASSIST_LIMIT} remaining for user ${effectiveUserId})`);
      
      return {
        ...ragResponse,
        usedKnowledgeBase: true,
        systemMessage: "Bilgi bankasından cevap verildi"
      };
    }
  } catch (error) {
    console.warn("Knowledge base search failed, falling back to LLM:", error);
  }

  // Step 2: Fallback to general LLM (no knowledge base)
  const cacheKey = generateCacheKey('tech-assist-fallback', enrichedQuestion);
  if (!skipCache) {
    const cached = cache.get<RAGResponse & { usedKnowledgeBase: boolean }>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Fallback LLM (cost saved!)');
      return { ...cached, systemMessage: "Genel AI bilgisinden cevap verildi" };
    }
  }

  try {
    const systemPrompt = buildDospressoSystemPrompt(equipmentContext);

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_completion_tokens: 8192,
      temperature: 0.7,
    });

    const answer = response.choices[0]?.message?.content || "Cevap oluşturulamadı";
    
    const result = {
      answer,
      sources: [],
      usedKnowledgeBase: false,
      systemMessage: "Genel AI bilgisinden cevap verildi (bilgi bankasında ilgili içerik bulunamadı)"
    };

    // Cache for 24 hours (extended for $200/month budget)
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
    
    aiRateLimiter.incrementRequest(effectiveUserId, 'tech_assist');
    const remaining = aiRateLimiter.getRemainingCalls(effectiveUserId, 'tech_assist', TECH_ASSIST_LIMIT);
    console.log(`💰 AI call - Tech Assist Fallback LLM (${remaining}/${TECH_ASSIST_LIMIT} remaining for user ${effectiveUserId})`);

    return result;
  } catch (error) {
    console.error("Fallback LLM error:", error);
    throw new Error("AI asistan şu anda cevap veremiyor. Lütfen daha sonra tekrar deneyin.");
  }
}

// Generate AI-powered shift plan based on historical data and workload
// Enhanced with branch hours, break staggering, and fatigue prevention
export async function generateShiftPlan(
  branchId: number,
  weekStart: string, // YYYY-MM-DD
  weekEnd: string, // YYYY-MM-DD
  historicalShifts: Array<{ shiftDate: string; shiftType: string; assignedToId: string | null; status: string }>,
  employees: Array<{ id: string; name: string; role: string; employmentType?: string; weeklyHours?: number }>,
  workloadMetrics?: { 
    averageDailySales?: number; 
    peakHours?: string[];
    branchHours?: { openingHours: string; closingHours: string };
  },
  userId?: string,
  skipCache: boolean = false
): Promise<ShiftPlanResponse> {
  // Check cache first (24h TTL, branch+week hash)
  const cacheKey = generateCacheKey('shift-plan', branchId, weekStart, weekEnd);
  if (!skipCache) {
    const cached = cache.get<ShiftPlanResponse>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Shift plan (cost saved!)');
      return { ...cached, cached: true };
    }
  }

  // Rate limit check (shift planning calls are expensive, separate quota)
  const SHIFT_PLAN_LIMIT = 10; // 10 shift plan calls per day ($200/month budget)
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'shift_plan', SHIFT_PLAN_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily shift plan quota`);
    throw new Error("Günlük vardiya planlama limitiniz doldu (10/gün). Yarın tekrar deneyin.");
  }

  try {
    // Prepare historical data summary
    const shiftStats = {
      totalShifts: historicalShifts.length,
      morningShifts: historicalShifts.filter(s => s.shiftType === 'morning').length,
      eveningShifts: historicalShifts.filter(s => s.shiftType === 'evening').length,
      nightShifts: historicalShifts.filter(s => s.shiftType === 'night').length,
      assignedShifts: historicalShifts.filter(s => s.assignedToId !== null).length,
      completedShifts: historicalShifts.filter(s => s.status === 'completed').length,
    };

    // Extract branch hours from workloadMetrics
    const openingHours = workloadMetrics?.branchHours?.openingHours || '08:00';
    const closingHours = workloadMetrics?.branchHours?.closingHours || '22:00';
    
    // Parse hours for shift calculations
    const openH = parseInt(openingHours.split(':')[0]);
    const closeH = parseInt(closingHours.split(':')[0]);
    const midShiftH = Math.floor((openH + closeH) / 2);

    // Format employee list with employment type info
    const employeeList = employees.map(e => {
      const empType = e.employmentType === 'parttime' ? 'PT' : 'FT';
      const hours = e.weeklyHours || (e.employmentType === 'parttime' ? 25 : 45);
      return `${e.name} (${e.role}, ${empType}, ${hours}s/hafta) [ID: ${e.id}]`;
    }).join('\n');

    // Identify experienced baristas for skill balancing
    const experiencedRoles = ['barista', 'supervisor', 'supervisor_buddy'];
    const internRoles = ['intern', 'stajyer'];

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL, // gpt-4o for planning
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve dükkanları için bir AI vardiya planlamacısısın. Şube çalışma saatlerine, personel tipine ve iş yoğunluğuna göre optimal vardiya planları oluşturursun. Mola saatlerini kademeli dağıt ve yorgunluk önleme kurallarına uy.`,
        },
        {
          role: "user",
          content: `DOSPRESSO Şube #${branchId} için ${weekStart} - ${weekEnd} tarihleri arası vardiya planı oluştur.

📍 ŞUBE ÇALIŞMA SAATLERİ (KESİNLİKLE UYULMALI):
- Açılış: ${openingHours}
- Kapanış: ${closingHours}
- Tüm vardiyalar bu saatler arasında olmalı!

⚠️ ZORUNLU KURALLAR:
1. ŞUBE SAATLERİNE UYUM: Vardiyalar ${openingHours}-${closingHours} arasında olmalı. Açılış vardiyası ${openingHours}'da başlar, kapanış vardiyası ${closingHours}'da biter.

2. VARDİYA SÜRESİ: Fulltime personel 8.5 saat (7.5 saat çalışma + 1 saat mola), Parttime personel 4 saat.

3. MOLA STAGGERING (15dk ARALIK): Aynı vardiyada çalışan personelin molaları farklı saatlerde başlamalı:
   - İlk kişi: Vardiya başlangıcından 4 saat sonra (ör: ${String(openH + 4).padStart(2,'0')}:00)
   - İkinci kişi: +15 dakika (ör: ${String(openH + 4).padStart(2,'0')}:15)
   - Üçüncü kişi: +30 dakika (ör: ${String(openH + 4).padStart(2,'0')}:30)
   Bu sayede hiçbir zaman tüm personel aynı anda molada olmaz!

4. STAJYER KURALI: Her stajyer/intern yanında mutlaka en az 1 deneyimli barista olmalı. Stajyer tek başına çalışamaz!

5. HER VARDİYADA TECRÜBELİ: Her vardiyada en az 1 tecrbeli personel (barista/supervisor) olmalı (Skill Balancing).

6. YORGUNLUK ÖNLEMİ (FATIGUE PREVENTION): Hiçbir personel ardışık 6 günden fazla çalışmamalı! 5 veya 6 ardışık günden sonra mutlaka OFF verin.

7. HAFTALİK SAAT LİMİTLERİ:
   - Fulltime (FT): Haftada max 45 saat
   - Parttime (PT): Haftada max 25 saat

8. ADİL HAFTA SONU DAĞILIMI: Hafta sonu vardiyaları (Cumartesi-Pazar) personeller arasında adil dağıtılmalı. Herkese dönüşümlü hafta sonu atayın.

9. YOĞUNLUK DENGESİ:
   - Sabah vardiyaları (${openingHours}-${String(midShiftH).padStart(2,'0')}:00): 2-3 personel
   - Akşam vardiyaları (${String(midShiftH).padStart(2,'0')}:00-${closingHours}): 3-4 personel (daha yoğun)
   - Kapanışta mutlaka minimum 3 personel

10. OFF GÜN KONSANTRASYONU: İzin günlerini zayıf satış günlerine yoğunlaştır (Pazartesi, Salı).

Geçmiş Vardiya İstatistikleri (son 6 hafta):
- Toplam: ${shiftStats.totalShifts}, Sabah: ${shiftStats.morningShifts}, Akşam: ${shiftStats.eveningShifts}

Mevcut Çalışanlar (FT=Fulltime, PT=Parttime):
${employeeList}

${workloadMetrics?.averageDailySales ? `Yoğunluk: Günlük ort. ${workloadMetrics.averageDailySales} satış` : ''}

GÖREV: ${weekStart} - ${weekEnd} tarihleri arası her gün için optimal vardiya planı oluştur.

Vardiya Tipleri:
- morning: ${openingHours}-${String(midShiftH).padStart(2,'0')}:30 (açılış vardiyası)
- evening: ${String(midShiftH).padStart(2,'0')}:00-${closingHours} (kapanış vardiyası)

⚠️ UYARILAR:
- Aynı personeli aynı gün birden fazla vardiyaya ATAMA!
- FULLTIME ÇALIŞMA KURALI: Fulltime (FT) personeli haftada KESİNLİKLE 6 GÜN planla (45 saat = 6 gün × 7.5 saat). 1 gün OFF ver.
- PARTTIME ÇALIŞMA KURALI: Parttime (PT) personeli haftada 3 GÜN planla (25 saat civarı).
- breakStartTime'ları 15dk arayla kademeli ver!
- Personel: ${employees.length} kişi.

JSON formatında yanıt ver:
{
  "shifts": [
    {
      "shiftDate": "YYYY-MM-DD",
      "startTime": "${openingHours}:00",
      "endTime": "${String(openH + 8).padStart(2,'0')}:30:00",
      "breakStartTime": "${String(openH + 4).padStart(2,'0')}:00:00",
      "breakEndTime": "${String(openH + 5).padStart(2,'0')}:00:00",
      "shiftType": "morning",
      "assignedToId": "user-id",
      "status": "draft"
    }
  ],
  "summary": "Planlama özeti"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096, // Limit tokens for cost
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt içeriği boş");
    }

    const result = JSON.parse(content);
    const planResponse: ShiftPlanResponse = {
      shifts: result.shifts || [],
      suggestions: result.suggestions || result.shifts || [],
      totalShifts: (result.shifts || result.suggestions)?.length || 0,
      summary: result.summary || '',
      weekStart,
      weekEnd,
      cached: false,
    };

    // Cache for 72 hours (extended for $200/month - weekly plans rarely change)
    cache.set(cacheKey, planResponse, 72 * 60 * 60 * 1000);
    
    // Increment rate limit counter
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'shift_plan');
      const remaining = aiRateLimiter.getRemainingCalls(userId, 'shift_plan', SHIFT_PLAN_LIMIT);
      console.log(`💰 AI call made - Shift plan (${remaining}/${SHIFT_PLAN_LIMIT} remaining for user ${userId})`);
    } else {
      console.log('💰 AI call made - Shift plan');
    }

    return planResponse;
  } catch (error) {
    console.error("Vardiya planı oluşturma hatası:", error);
    throw new Error("Vardiya planı oluşturulamadı");
  }
}

// AI Dashboard Summary (HQ + Branch Supervisors only)
const SUMMARY_LIMIT = 20; // 20 summaries per day ($200/month budget)

interface SummaryUser {
  id: string;
  role: string;
  branchId?: number;
  username?: string;
}

async function buildSummaryPrompt(
  category: SummaryCategoryType,
  user: SummaryUser
): Promise<string> {
  const isHQ = user.branchId === null || user.branchId === undefined;
  const branchId = isHQ ? undefined : user.branchId;
  
  // Fetch last 7 days data (fallback to 30 if insufficient)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let branchName = "Tüm Şubeler";
  if (branchId) {
    const branch = await storage.getBranch(branchId);
    branchName = branch?.name || `Şube #${branchId}`;
  }

  const scope = isHQ ? "HQ (Tüm Şubeler)" : branchName;

  if (category === "personel") {
    // Fetch attendance data
    const sevenDayDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const todayDateStr = new Date().toISOString().split('T')[0];
    
    const attendances = await storage.getShiftAttendances(
      undefined,
      undefined,
      sevenDayDateStr,
      todayDateStr
    );
    
    // Get all employees for the branch to map userId -> name
    const employees = await storage.getAllEmployees(branchId);
    const employeeMap = new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName.charAt(0)}.`]));
    
    // Group attendances by employee
    const employeeStats = new Map<string, { 
      name: string; 
      totalDays: number; 
      present: number; 
      absent: number; 
      late: number;
      violations: number;
    }>();
    
    attendances.forEach(att => {
      const name = employeeMap.get(att.userId) || `Kullanıcı ${att.userId}`;
      if (!employeeStats.has(att.userId)) {
        employeeStats.set(att.userId, { 
          name, 
          totalDays: 0, 
          present: 0, 
          absent: 0, 
          late: 0,
          violations: 0
        });
      }
      const stats = employeeStats.get(att.userId)!;
      stats.totalDays++;
      if (att.checkInTime) stats.present++;
      if (att.status === 'absent') stats.absent++;
      if (att.status === 'late') stats.late++;
      if (att.aiWarnings && att.aiWarnings.length > 0) stats.violations++;
    });
    
    // Sort by attendance count and get top 10
    const topEmployees = Array.from(employeeStats.values())
      .sort((a, b) => b.present - a.present)
      .slice(0, 10);
    
    const totalAttendances = attendances.length;
    const checkedIn = attendances.filter(a => a.checkInTime).length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;
    const dressCodeViolations = attendances.filter(a => 
      a.aiWarnings && a.aiWarnings.length > 0
    ).length;

    // Build detailed employee list for AI
    const employeeDetails = topEmployees.map(emp => 
      `- ${emp.name}: ${emp.present}/${emp.totalDays} gün geldi` + 
      (emp.absent > 0 ? `, ${emp.absent} gün devamsız` : '') +
      (emp.late > 0 ? `, ${emp.late} gün geç kaldı` : '') +
      (emp.violations > 0 ? `, ${emp.violations} kıyafet ihlali` : '')
    ).join('\n');

    return `DOSPRESSO ${scope} için son 7 günlük personel özeti oluştur:

**Yoklama İstatistikleri:**
- Toplam vardiya: ${totalAttendances}
- Giriş yapan: ${checkedIn}
- Devamsız: ${absent}
- Geç kalan: ${late}
- Kıyafet ihlali: ${dressCodeViolations}

**Personel Detayları (En Aktif ${topEmployees.length} Çalışan):**
${employeeDetails}

**Görev:** Yukarıdaki verileri analiz et ve şu konularda kısa, öz ve Türkçe bir özet sun:
1. Genel devam durumu (katılım oranı, trend) - SPESİFİK İSİMLER KULLAN
2. Problemli alanlar (devamsızlık, gecikmeler) - SPESİFİK İSİMLER KULLAN
3. Kıyafet uyumu (varsa ihlaller) - SPESİFİK İSİMLER KULLAN
4. Öneriler (HQ/supervisor için aksiyonlar)

ÖNEMLİ: Özette yukarıdaki çalışan isimlerini kullan (örnek: "Ahmet Y. 7/7 gün vardiyaya geldi, Zeynep K. 5/7 gün geldi ve 2 gün devamsız"). Generic ifadeler kullanma.

Maksimum 200 kelime, madde işaretleri kullan, profesyonel ton.`;
  } else if (category === "cihazlar") {
    // Fetch equipment faults
    const faults = await storage.getFaults(branchId);
    const sevenDayFaults = faults.filter(f => {
      const created = f.createdAt ? new Date(f.createdAt) : new Date(0);
      return created >= sevenDaysAgo;
    });

    // Get all equipment to map equipmentId -> equipmentType
    const allEquipment = await storage.getEquipment(branchId);
    const equipmentMap = new Map(allEquipment.map(e => [e.id, e.equipmentType]));

    const openFaults = sevenDayFaults.filter(f => f.status === 'acik').length;
    const resolvedFaults = sevenDayFaults.filter(f => f.status === 'cozuldu').length;
    const criticalFaults = sevenDayFaults.filter(f => f.priority === 'high' || f.priority === 'critical').length;

    // Build detailed fault list (top 10 most critical/recent)
    const topFaults = sevenDayFaults
      .sort((a, b) => {
        // Sort by priority (critical > high > medium > low), then by date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      })
      .slice(0, 10);

    const faultDetails = topFaults.map(fault => {
      const equipmentType = fault.equipmentId ? equipmentMap.get(fault.equipmentId) : null;
      const equipmentName = equipmentType || fault.equipmentName || `Cihaz #${fault.equipmentId || 'unknown'}`;
      const priorityLabel = fault.priority === 'critical' ? 'KRİTİK' : 
                           fault.priority === 'high' ? 'YÜKSEK' : 
                           fault.priority === 'medium' ? 'ORTA' : 'DÜŞÜK';
      const statusLabel = fault.status === 'acik' ? 'AÇIK' : 
                         fault.status === 'cozuldu' ? 'Çözülmüş' : 
                         fault.status;
      return `- ${equipmentName}: ${fault.description} [${priorityLabel} - ${statusLabel}]`;
    }).join('\n');

    return `DOSPRESSO ${scope} için son 7 günlük cihaz arıza özeti oluştur:

**Arıza İstatistikleri:**
- Toplam arıza: ${sevenDayFaults.length}
- Açık arıza: ${openFaults}
- Çözülmüş: ${resolvedFaults}
- Kritik arıza: ${criticalFaults}

**Arıza Detayları (En Kritik ${topFaults.length} Arıza):**
${faultDetails}

**Görev:** Yukarıdaki verileri analiz et ve şu konularda kısa, öz ve Türkçe bir özet sun:
1. Genel durum (arıza oranı, trend) - SPESİFİK CİHAZ İSİMLERİ KULLAN
2. Kritik problemler (acil müdahale gereken) - SPESİFİK CİHAZ İSİMLERİ KULLAN
3. Bakım önerileri (önleyici tedbirler)
4. Aksiyonlar (HQ/supervisor için)

ÖNEMLİ: Özette yukarıdaki cihaz isimlerini kullan (örnek: "Espresso Makinası kritik arızada, Buzdolabı #5'te hafif sorun"). Generic ifadeler kullanma.

Maksimum 200 kelime, madde işaretleri kullan, profesyonel ton.`;
  } else if (category === "gorevler") {
    // Fetch tasks
    const tasks = await storage.getTasks(branchId);
    const sevenDayTasks = tasks.filter(t => {
      const created = t.createdAt ? new Date(t.createdAt) : new Date(0);
      return created >= sevenDaysAgo;
    });

    // Get all employees for the branch to map assignedToId -> name
    const employees = await storage.getAllEmployees(branchId);
    const employeeMap = new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName.charAt(0)}.`]));

    // Group tasks by assignee
    const assigneeStats = new Map<string, {
      name: string;
      completed: number;
      pending: number;
      overdue: number;
      total: number;
    }>();

    sevenDayTasks.forEach(task => {
      const assigneeId = task.assignedToId;
      if (!assigneeId) return; // Skip unassigned tasks
      
      const name = employeeMap.get(assigneeId) || `Kullanıcı ${assigneeId}`;
      if (!assigneeStats.has(assigneeId)) {
        assigneeStats.set(assigneeId, {
          name,
          completed: 0,
          pending: 0,
          overdue: 0,
          total: 0,
        });
      }
      
      const stats = assigneeStats.get(assigneeId)!;
      stats.total++;
      if (task.status === 'onaylandi') stats.completed++;
      else if (task.status === 'beklemede') stats.pending++;
      else if (task.status === 'gecikmiş') stats.overdue++;
    });

    // Sort by total tasks and get top 10
    const topAssignees = Array.from(assigneeStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const completed = sevenDayTasks.filter(t => t.status === 'onaylandi').length;
    const pending = sevenDayTasks.filter(t => t.status === 'beklemede').length;
    const overdue = sevenDayTasks.filter(t => t.status === 'gecikmiş').length;
    const completionRate = sevenDayTasks.length > 0 
      ? Math.round((completed / sevenDayTasks.length) * 100) 
      : 0;

    // Build detailed assignee list for AI
    const assigneeDetails = topAssignees.map(assignee =>
      `- ${assignee.name}: ${assignee.completed} tamamlandı, ${assignee.pending} beklemede` +
      (assignee.overdue > 0 ? `, ${assignee.overdue} gecikmiş` : '') +
      ` (Toplam: ${assignee.total})`
    ).join('\n');

    return `DOSPRESSO ${scope} için son 7 günlük görev özeti oluştur:

**Görev İstatistikleri:**
- Toplam görev: ${sevenDayTasks.length}
- Tamamlanan: ${completed}
- Bekleyen: ${pending}
- Gecikmiş: ${overdue}
- Tamamlanma oranı: %${completionRate}

**Görev Detayları (En Aktif ${topAssignees.length} Çalışan):**
${assigneeDetails}

**Görev:** Yukarıdaki verileri analiz et ve şu konularda kısa, öz ve Türkçe bir özet sun:
1. Genel performans (tamamlanma oranı, trend) - SPESİFİK İSİMLER KULLAN
2. Problemli alanlar (geciken görevler) - SPESİFİK İSİMLER KULLAN
3. Takım verimliliği - SPESİFİK İSİMLER KULLAN
4. Öneriler (HQ/supervisor için)

ÖNEMLİ: Özette yukarıdaki çalışan isimlerini kullan (örnek: "Ali B. tarafından 3 görev tamamlandı, Fatma S. tarafından 2 görev beklemede"). Generic ifadeler kullanma.

Maksimum 200 kelime, madde işaretleri kullan, profesyonel ton.`;
  }

  throw new Error(`Geçersiz kategori: ${category}`);
}

export async function generateAISummary(
  category: SummaryCategoryType,
  user: SummaryUser,
  skipCache: boolean = false
): Promise<AISummaryResponse> {
  const isHQ = user.branchId === null || user.branchId === undefined;
  const role = user.role || 'unknown';
  const branchId = user.branchId;

  // Generate cache key based on role and scope
  const cacheKey = generateCacheKey('ai-summary', category, role, branchId || 'hq');
  
  // Check cache first (24h TTL)
  if (!skipCache) {
    const cached = cache.get<AISummaryResponse>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT - AI Summary [${category}] (cost saved!)`);
      return { ...cached, cached: true };
    }
  }

  // Rate limit check (3 summaries per day)
  if (!aiRateLimiter.canMakeRequest(user.id, 'summary', SUMMARY_LIMIT)) {
    const remaining = aiRateLimiter.getRemainingCalls(user.id, 'summary', SUMMARY_LIMIT);
    throw new Error(`Günlük AI özet limitiniz doldu (${SUMMARY_LIMIT}/gün). Kalan: ${remaining}. Yarın tekrar deneyin.`);
  }

  try {
    // Build prompt with data
    const prompt = await buildSummaryPrompt(category, user);

    // Call OpenAI with GPT-4o-mini (cost-efficient)
    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        {
          role: "system",
          content: "Sen DOSPRESSO franchise yönetim sisteminin AI asistanısın. Kısa, öz ve aksiyona yönelik özetler sunarsın.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 500, // Keep it short for cost
      temperature: 0.7,
    });

    const summary = response.choices[0]?.message?.content?.trim() || "Özet oluşturulamadı.";
    const generatedAt = new Date().toISOString();

    // Get branch info if applicable
    let branchName: string | undefined;
    if (branchId) {
      const branch = await storage.getBranch(branchId);
      branchName = branch?.name;
    }

    const result: AISummaryResponse = {
      summary,
      cached: false,
      generatedAt,
      category,
      scope: branchId ? { branchId, branchName } : undefined,
    };

    // Cache for 8 hours (dashboard summaries need frequent updates)
    cache.set(cacheKey, result, 8 * 60 * 60 * 1000);

    // Increment rate limit counter
    aiRateLimiter.incrementRequest(user.id, 'summary');
    const remaining = aiRateLimiter.getRemainingCalls(user.id, 'summary', SUMMARY_LIMIT);
    console.log(`💰 AI call made - Summary [${category}] (${remaining}/${SUMMARY_LIMIT} remaining for user ${user.id})`);

    return result;
  } catch (error) {
    console.error(`AI özet oluşturma hatası [${category}]:`, error);
    throw error;
  }
}

// Dashboard Insights: Role-specific AI insights
const INSIGHTS_LIMIT = 20; // 20 insights per day ($200/month budget)

interface DashboardInsightsResponse {
  insights: string[];
  cached: boolean;
  generatedAt: string;
  role: string;
  scope?: {
    branchId: number;
    branchName?: string;
  };
}

async function buildDashboardPrompt(role: string, branchId?: number | null): Promise<string> {
  const isHQ = !branchId;
  const scope = isHQ ? 'tüm şubeler' : 'şube';

  // Fetch data based on role
  let prompt = `DOSPRESSO ${scope} için ${role} rolüne özel dashboard içgörüleri oluştur.\n\n`;

  const HQ_ROLES = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
  const isHQRole = HQ_ROLES.includes(role);

  if (isHQRole) {
    // HQ roles: Cross-branch analysis
    const branches = await storage.getBranches();
    const tasks = await storage.getTasks();
    const faults = await storage.getFaults();

    prompt += `**Şubeler:** ${branches.length} adet\n`;
    prompt += `**Görevler (son 7 gün):** ${tasks.filter((t: Task) => {
      const created = new Date(t.createdAt!);
      return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length}\n`;
    prompt += `**Arızalar (açık):** ${faults.filter((f: EquipmentFault) => f.status === 'acik').length}\n\n`;
    
    prompt += `**Görev:** 3-5 madde halinde, şu konularda kısa ve aksiyona yönelik içgörüler sun:\n`;
    prompt += `1. Şubeler arası performans karşılaştırması\n`;
    prompt += `2. Anomali tespiti (dikkat gereken şubeler)\n`;
    prompt += `3. Maliyet optimizasyon önerileri\n`;
  } else if (role === 'supervisor' || role === 'supervisor_buddy') {
    // Supervisor: Branch-specific insights
    if (!branchId) throw new Error('Supervisor role requires branchId');

    const tasks = await storage.getTasksByBranch(branchId);
    const shifts = await storage.getShiftsByBranch(branchId);
    const employees = await storage.getUsersByBranch(branchId);
    const faults = await storage.getFaultsByBranch(branchId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentShifts = shifts.filter(s => new Date(s.shiftDate) >= sevenDaysAgo);
    const uncoveredShifts = recentShifts.filter(s => !s.assignedToId).length;
    const completedTasks = tasks.filter(t => t.status === 'onaylandi').length;
    const totalTasks = tasks.length;

    prompt += `**Personel:** ${employees.length} kişi\n`;
    prompt += `**Vardiyalar (son 7 gün):** ${recentShifts.length} (${uncoveredShifts} atanmamış)\n`;
    prompt += `**Görevler:** ${completedTasks}/${totalTasks} tamamlandı\n`;
    prompt += `**Arızalar (açık):** ${faults.filter(f => f.status === 'acik').length}\n\n`;
    
    prompt += `**Görev:** 3-5 madde halinde, şu konularda kısa ve aksiyona yönelik içgörüler sun:\n`;
    prompt += `1. Vardiya kapsama boşlukları\n`;
    prompt += `2. Çalışan performans trendleri\n`;
    prompt += `3. Görev tamamlanma oranı analizi\n`;
  } else {
    // Should never reach here due to backend permission check
    throw new Error(`Unauthorized role: ${role}`);
  }

  prompt += `\n**Format:** Her içgörü tek satır, madde işareti ile başlasın. Maksimum 150 kelime. Profesyonel ton, Türkçe.`;
  prompt += `\n**Çıktı formatı:** JSON array olarak döndür: ["içgörü 1", "içgörü 2", ...]`;

  return prompt;
}

export async function generateDashboardInsights(
  userId: number,
  role: string,
  branchId?: number | null,
  skipCache: boolean = false
): Promise<DashboardInsightsResponse> {
  // Generate cache key
  const cacheKey = generateCacheKey('dashboard-insights', role, branchId || 'hq');
  
  // Check cache FIRST (before rate limiter) - cost optimization!
  if (!skipCache) {
    const cached = cache.get<DashboardInsightsResponse>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT - Dashboard Insights [${role}] (cost saved, no quota used!)`);
      return { ...cached, cached: true };
    }
  }

  // Rate limit check AFTER cache (only charge quota for actual AI calls)
  if (!aiRateLimiter.canMakeRequest(userId.toString(), 'insights', INSIGHTS_LIMIT)) {
    const remaining = aiRateLimiter.getRemainingCalls(userId.toString(), 'insights', INSIGHTS_LIMIT);
    throw new Error(`Günlük AI içgörü limitiniz doldu (${INSIGHTS_LIMIT}/gün). Kalan: ${remaining}. Yarın tekrar deneyin.`);
  }

  try {
    // Build role-specific prompt
    const prompt = await buildDashboardPrompt(role, branchId);

    // Call OpenAI with GPT-4o-mini (cost-efficient)
    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        {
          role: "system",
          content: "Sen DOSPRESSO franchise yönetim sisteminin AI asistanısın. Kısa, öz ve aksiyona yönelik içgörüler sunarsın. JSON formatında yanıt verirsin.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{"insights": []}';
    const parsed = JSON.parse(content);
    const insights = Array.isArray(parsed.insights) ? parsed.insights : [];

    // Get branch info if applicable
    let branchName: string | undefined;
    if (branchId) {
      const branch = await storage.getBranch(branchId);
      branchName = branch?.name;
    }

    const result: DashboardInsightsResponse = {
      insights,
      cached: false,
      generatedAt: new Date().toISOString(),
      role,
      scope: branchId ? { branchId, branchName } : undefined,
    };

    // Cache for 12 hours (insights should refresh regularly)
    cache.set(cacheKey, result, 12 * 60 * 60 * 1000);

    // Increment rate limit counter
    aiRateLimiter.incrementRequest(userId.toString(), 'insights');
    const remaining = aiRateLimiter.getRemainingCalls(userId.toString(), 'insights', INSIGHTS_LIMIT);
    console.log(`💰 AI call made - Dashboard Insights [${role}] (${remaining}/${INSIGHTS_LIMIT} remaining for user ${userId})`);

    return result;
  } catch (error) {
    console.error(`AI dashboard insights hatası [${role}]:`, error);
    throw error;
  }
}

// ==================== TRAINING AI FUNCTIONS ====================

interface GeneratedQuizQuestion {
  question: string;
  questionType: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

/**
 * Generate quiz questions from lesson content using AI
 * Cost-optimized with GPT-4o-mini + caching (24h)
 */
export async function generateQuizQuestionsFromLesson(
  lessonContent: string,
  count: number = 5,
  lessonId?: number
): Promise<GeneratedQuizQuestion[]> {
  // Cache key based on lesson content hash
  const cacheKey = generateCacheKey('quiz-gen', lessonContent, count.toString());
  
  // Check cache first (24h TTL)
  const cached = cache.get<GeneratedQuizQuestion[]>(cacheKey);
  if (cached) {
    console.log('✅ Cache HIT - Quiz generation (cost saved!)');
    return cached;
  }

  try {
    const prompt = `DOSPRESSO kahve dükkanı eğitim içeriğinden ${count} adet quiz sorusu oluştur.

**Eğitim İçeriği:**
${lessonContent}

**Görev:** İçeriği değerlendiren ${count} adet quiz sorusu oluştur.

**Gereksinimler:**
1. Çoğunluk çoktan seçmeli (4 seçenek), birkaç doğru/yanlış
2. Sorular eğitim içeriğine dayalı olmalı
3. Her soru için açıklama ekle
4. Zorluk derecesi: orta seviye
5. Türkçe dilinde

**JSON Formatı:**
{
  "questions": [
    {
      "question": "Soru metni?",
      "questionType": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Açıklama",
      "points": 1
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL, // gpt-4o-mini for cost optimization
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 1500,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{"questions": []}';
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    // Cache for 24 hours
    cache.set(cacheKey, questions, 24 * 60 * 60 * 1000);

    console.log(`🎓 Generated ${questions.length} quiz questions from lesson content`);
    return questions;
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw error;
  }
}

interface GeneratedFlashcard {
  front: string;
  back: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Generate flashcards from lesson content using AI
 * Cost-optimized with GPT-4o-mini + caching (24h)
 */
export async function generateFlashcardsFromLesson(
  lessonContent: string,
  count: number = 10,
  lessonId?: number
): Promise<GeneratedFlashcard[]> {
  // Cache key based on lesson content hash
  const cacheKey = generateCacheKey('flashcard-gen', lessonContent, count.toString());
  
  // Check cache first (24h TTL)
  const cached = cache.get<GeneratedFlashcard[]>(cacheKey);
  if (cached) {
    console.log('✅ Cache HIT - Flashcard generation (cost saved!)');
    return cached;
  }

  try {
    const prompt = `DOSPRESSO kahve dükkanı eğitim içeriğinden ${count} adet flashcard oluştur.

**Eğitim İçeriği:**
${lessonContent}

**Görev:** İçeriğin önemli kavramlarını kapsayan ${count} adet flashcard oluştur.

**Gereksinimler:**
1. Ön yüz: Kısa soru veya terim
2. Arka yüz: Net ve özlü cevap (1-2 cümle)
3. Kategori: İçerik konusuyla alakalı
4. Zorluk: Dengeli dağılım (kolay/orta/zor)
5. Türkçe dilinde

**JSON Formatı:**
{
  "flashcards": [
    {
      "front": "Soru veya terim?",
      "back": "Kısa cevap",
      "category": "Barista Temelleri",
      "difficulty": "medium"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL, // gpt-4o-mini for cost optimization
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 1200,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() || '{"flashcards": []}';
    const parsed = JSON.parse(content);
    const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];

    // Cache for 24 hours
    cache.set(cacheKey, flashcards, 24 * 60 * 60 * 1000);

    console.log(`🎓 Generated ${flashcards.length} flashcards from lesson content`);
    return flashcards;
  } catch (error) {
    console.error("Flashcard generation error:", error);
    throw error;
  }
}

// Evaluate branch performance with AI-powered insights
export async function evaluateBranchPerformance(
  branchName: string,
  performanceData: {
    avgAttendanceScore: number;
    avgLatenessScore: number;
    avgEarlyLeaveScore: number;
    avgBreakComplianceScore: number;
    avgShiftComplianceScore: number;
    avgOvertimeComplianceScore: number;
    avgDailyTotalScore: number;
    totalPenaltyMinutes: number;
    totalEmployees: number;
    dateRange: string;
  },
  userId?: string,
  skipCache: boolean = false
): Promise<BranchPerformanceEvaluation> {
  // Check cache first (6h TTL - branch performance changes slowly)
  const cacheKey = generateCacheKey('branch-eval', branchName, performanceData.dateRange, performanceData.avgDailyTotalScore);
  if (!skipCache) {
    const cached = cache.get<BranchPerformanceEvaluation>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Branch performance evaluation (cost saved!)');
      return cached;
    }
  }

  // Rate limit check (evaluation calls are text-based, separate quota)
  const EVAL_LIMIT = 50; // 50 branch evaluations per day ($200/month budget)
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'evaluation', EVAL_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily evaluation quota`);
    throw new Error("Günlük değerlendirme limitiniz doldu (50/gün). Yarın tekrar deneyin.");
  }

  try {
    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL, // gpt-4o-mini for cost optimization
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve dükkanları için bir AI performans analisti ve danışmanısın. Şube performans verilerini analiz ederek yöneticilere içgörüler ve öneriler sunuyorsun. Türkçe yanıt ver.`,
        },
        {
          role: "user",
          content: `**${branchName}** şubesinin son 7 günlük performans verilerini analiz et:

**Performans Skorları (0-100):**
- Devamsızlık Skoru: ${performanceData.avgAttendanceScore.toFixed(1)}
- Geç Kalma Skoru: ${performanceData.avgLatenessScore.toFixed(1)}
- Erken Ayrılma Skoru: ${performanceData.avgEarlyLeaveScore.toFixed(1)}
- Mola Uyumu Skoru: ${performanceData.avgBreakComplianceScore.toFixed(1)}
- Vardiya Uyumu Skoru: ${performanceData.avgShiftComplianceScore.toFixed(1)}
- Mesai Uyumu Skoru: ${performanceData.avgOvertimeComplianceScore.toFixed(1)}
- **Genel Skor: ${performanceData.avgDailyTotalScore.toFixed(1)}**

**Ek Bilgiler:**
- Toplam Ceza Dakikası: ${performanceData.totalPenaltyMinutes} dk
- Çalışan Sayısı: ${performanceData.totalEmployees}
- Tarih Aralığı: ${performanceData.dateRange}

**Görev:** Yukarıdaki verileri analiz et ve şu JSON formatında yanıt ver:
{
  "overallScore": 85,
  "summary": "Şubenin genel performansı hakkında 2-3 cümle özet",
  "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
  "weaknesses": ["Zayıf yön 1", "Zayıf yön 2"],
  "recommendations": ["Öneri 1", "Öneri 2", "Öneri 3"],
  "trend": "improving" | "stable" | "declining"
}

**Yönergeler:**
1. overallScore: Genel performans skoru (tüm metrikleri dengeli değerlendir)
2. summary: Şubenin performansı hakkında kısa özet (2-3 cümle)
3. strengths: En iyi 2 performans alanı (skorlara göre)
4. weaknesses: İyileştirilmesi gereken 2 alan (düşük skorlara göre)
5. recommendations: 3 somut, uygulanabilir öneri
6. trend: Genel performans eğilimi (sadece mevcut verilere göre tahmin et)`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI yanıt içeriği boş");
    }

    const result = JSON.parse(content);
    const evaluation: BranchPerformanceEvaluation = {
      overallScore: Math.min(Math.max(result.overallScore || 0, 0), 100),
      summary: result.summary || "Değerlendirme tamamlandı",
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendations: result.recommendations || [],
      trend: result.trend || "stable",
    };

    // Cache for 12 hours (extended for $200/month - evaluations update regularly)
    cache.set(cacheKey, evaluation, 12 * 60 * 60 * 1000);

    // Track usage (fire and forget)
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'evaluation');
    }

    console.log(`🎯 Generated AI evaluation for branch: ${branchName}`);
    return evaluation;
  } catch (error) {
    console.error("Branch performance evaluation error:", error);
    throw error;
  }
}

export interface FaultDiagnosis {
  diagnosis: string;
  troubleshootingSteps: string[];
  estimatedSeverity: 'low' | 'medium' | 'high' | 'critical';
  estimatedRepairTime: string;
  recommendedAction: string;
}

export async function diagnoseFault(
  equipmentType: string,
  faultDescription: string,
  userId?: string
): Promise<FaultDiagnosis> {
  const cacheKey = generateCacheKey('fault-diagnosis', `${equipmentType}-${faultDescription}`);
  
  // Check cache first
  const cached = cache.get<FaultDiagnosis>(cacheKey);
  if (cached) {
    console.log('✅ Cache HIT - Fault Diagnosis');
    return cached;
  }

  const FAULT_DIAGNOSIS_LIMIT = 50;
  const effectiveUserId = userId || 'system';
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'fault_diagnosis', FAULT_DIAGNOSIS_LIMIT)) {
    throw new Error("Günlük arıza tanı limitiniz doldu. Yarın tekrar deneyin.");
  }

  try {
    const systemPrompt = `Sen DOSPRESSO kahve makineleri için bir AI tanı uzmanısın.
Görevin, ekipman arızalarını analiz etmek ve çözüm önerileri sunmaktır.

Türkçe, net ve teknik olarak doğru cevaplar ver.
JSON formatında yanıt ver: {
  "diagnosis": "Arızanın muhtemel nedeni",
  "troubleshootingSteps": ["Adım 1", "Adım 2", "Adım 3"],
  "estimatedSeverity": "low|medium|high|critical",
  "estimatedRepairTime": "Tahmini onarım süresi",
  "recommendedAction": "Önerilen eylem (onarım/değişim/teknik destek)"
}`;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${equipmentType} - Arıza: ${faultDescription}` }
      ],
      max_completion_tokens: 1024,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI yanıt boş");

    const result = JSON.parse(content);
    const diagnosis: FaultDiagnosis = {
      diagnosis: result.diagnosis || "Tanı yapılamadı",
      troubleshootingSteps: result.troubleshootingSteps || [],
      estimatedSeverity: result.estimatedSeverity || 'medium',
      estimatedRepairTime: result.estimatedRepairTime || "Belirsiz",
      recommendedAction: result.recommendedAction || "Teknik destek ile iletişime geçin",
    };

    cache.set(cacheKey, diagnosis, 24 * 60 * 60 * 1000);
    aiRateLimiter.incrementRequest(effectiveUserId, 'fault_diagnosis');
    const remaining = aiRateLimiter.getRemainingCalls(effectiveUserId, 'fault_diagnosis', FAULT_DIAGNOSIS_LIMIT);
    console.log(`💰 AI call - Fault Diagnosis (${remaining}/${FAULT_DIAGNOSIS_LIMIT} remaining)`);

    return diagnosis;
  } catch (error) {
    console.error("Fault diagnosis error:", error);
    throw new Error("Arıza analiz edilemedi");
  }
}

// AI Training Module Generator
export interface GeneratedTrainingModule {
  title: string;
  description: string;
  estimatedDuration: number;
  learningObjectives: string[];
  steps: {
    stepNumber: number;
    title: string;
    content: string;
    mediaSuggestions: string[];
  }[];
  quiz: {
    questionId: string;
    questionType: 'mcq' | 'true_false';
    questionText: string;
    options: string[];
    correctOptionIndex: number;
  }[];
  scenarioTasks: {
    scenarioId: string;
    title: string;
    description: string;
    tasks: string[];
  }[];
  supervisorChecklist: {
    itemId: string;
    title: string;
    description: string;
  }[];
}

export async function generateTrainingModule(
  inputText: string,
  roleLevel: string,
  estimatedMinutes: number,
  userId?: string
): Promise<GeneratedTrainingModule> {
  const MODULE_GEN_LIMIT = 20;
  const effectiveUserId = userId || 'system';
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'module_generation', MODULE_GEN_LIMIT)) {
    throw new Error("Günlük modül oluşturma limitiniz doldu. Yarın tekrar deneyin.");
  }

  const systemPrompt = `Sen DOSPRESSO Academy için bir AI Eğitim Tasarımcısısın.
Görevin, verilen metin/makaleyi profesyonel bir eğitim modülüne dönüştürmektir.

DOSPRESSO STANDARTLARI VE MARKA KÜLTÜRÜne KESIN UYUM:
- Kalite odaklı premium kahve deneyimi
- Hijyen ve HACCP standartlarına kesin uyum (tüm proseslerde vurgula)
- Müşteri memnuniyeti ve profesyonel sunuş
- Barista eğitimi için teknik detay ve pratik uygulama
- Ekipman kullanımında güvenlik ve kalite kontrol
- DOSPRESSO marka kimliği ve değerlerinin yansıması

ÖNEMLİ: BILINEN MARKA EKİPMANLAR İÇİN:
Modülde MARKA EKİPMANI (örn: La Marzocco, Mahlkönig, Victoria Arduino vb.) geçerse:
- EKİPMANIN ÖZGÜL kalibrasyon, ayar ve bakım bilgilerini dahil et
- Güvenilir ve resmi kaynaklar referans göster (üretici belgeleri, teknik kılavuzlar)
- Koruma ve yapılandırma prosedürlerini AYRINTILI yaz
- Bakım çizelgesi ve kontrol noktalarını ekle
- Yaygın sorunlar ve çözümleri belirt

Rol Seviyesi: ${roleLevel}
Hedef Süre: ${estimatedMinutes} dakika

Eğitim modülünü şu JSON formatında üret:
{
  "title": "Modül başlığı (kısa, net)",
  "description": "Modül açıklaması (2-3 cümle)",
  "estimatedDuration": ${estimatedMinutes},
  "learningObjectives": ["Hedef 1", "Hedef 2", "Hedef 3", "Hedef 4"],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Adım başlığı",
      "content": "Detaylı açıklama (2-4 paragraf)",
      "mediaSuggestions": ["video: konu", "resim: görsel açıklama"]
    }
  ],
  "quiz": [
    {
      "questionId": "q1",
      "questionType": "mcq",
      "questionText": "Soru metni?",
      "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
      "correctOptionIndex": 0
    }
  ],
  "scenarioTasks": [
    {
      "scenarioId": "s1",
      "title": "Senaryo başlığı",
      "description": "Senaryo açıklaması",
      "tasks": ["Görev 1", "Görev 2"]
    }
  ],
  "supervisorChecklist": [
    {
      "itemId": "c1",
      "title": "Kontrol noktası",
      "description": "Değerlendirme açıklaması"
    }
  ]
}

ZORUNLU KURALLAR:
- 4-6 öğrenme hedefi (DOSPRESSO standartlarını yansıt)
- 3-5 eğitim adımı (her biri AYRINTILI ve pratik)
- 3-5 quiz sorusu (çoktan seçmeli veya doğru/yanlış)
- 1-2 senaryo görevi (gerçekçi ve günlük iş senaryoları)
- 3-5 denetçi kontrol maddesi (ölçülebilir kriterler)
- Türkçe, profesyonel ton
- HACCP ve hijyen notlarını TÜM ADIMLAR'DA dahil et
- ${roleLevel} seviyesine uygun dil ve derinlik kullan
- Ekipman bahsedilirse: kalibrasyon/ayar/bakım bilgilerini resmi kaynaklardan yansıt`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bu metni eğitim modülüne dönüştür:\n\n${inputText}` }
      ],
      max_completion_tokens: 4096,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI yanıt içeriği boş");

    const result = JSON.parse(content);
    
    const module: GeneratedTrainingModule = {
      title: result.title || "Başlıksız Modül",
      description: result.description || "",
      estimatedDuration: result.estimatedDuration || estimatedMinutes,
      learningObjectives: result.learningObjectives || [],
      steps: (result.steps || []).map((s: unknown, idx: number) => ({
        stepNumber: s.stepNumber || idx + 1,
        title: s.title || `Adım ${idx + 1}`,
        content: s.content || "",
        mediaSuggestions: s.mediaSuggestions || [],
      })),
      quiz: (result.quiz || []).map((q: unknown, idx: number) => ({
        questionId: q.questionId || `q${idx + 1}`,
        questionType: q.questionType === 'true_false' ? 'true_false' : 'mcq',
        questionText: q.questionText || "",
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex || 0,
      })),
      scenarioTasks: (result.scenarioTasks || []).map((s: unknown, idx: number) => ({
        scenarioId: s.scenarioId || `s${idx + 1}`,
        title: s.title || `Senaryo ${idx + 1}`,
        description: s.description || "",
        tasks: s.tasks || [],
      })),
      supervisorChecklist: (result.supervisorChecklist || []).map((c: unknown, idx: number) => ({
        itemId: c.itemId || `c${idx + 1}`,
        title: c.title || `Kontrol ${idx + 1}`,
        description: c.description || "",
      })),
    };

    aiRateLimiter.incrementRequest(effectiveUserId, 'module_generation');
    const remaining = aiRateLimiter.getRemainingCalls(effectiveUserId, 'module_generation', MODULE_GEN_LIMIT);
    console.log(`🎓 AI Module Generation (${remaining}/${MODULE_GEN_LIMIT} remaining)`);

    return module;
  } catch (error: Error | unknown) {
    console.error("Module generation error:", error);
    throw new Error("Modül oluşturulamadı: " + (error.message || "Bilinmeyen hata"));
  }
}

// Extract text from PDF file buffer
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Create PDFParse instance with buffer data
    const pdfParser = new PDFParse({ data: buffer });
    await pdfParser.init();
    
    // Extract text from all pages
    const textResults = await pdfParser.text({});
    const allText = textResults.map((t: any) => t.text || t).join('\n').trim();
    
    if (!allText || allText.length < 20) {
      throw new Error("PDF dosyasından yeterli metin çıkarılamadı");
    }
    
    console.log(`📄 PDF parsed: ${allText.length} characters extracted`);
    return allText;
  } catch (error: Error | unknown) {
    console.error("PDF parsing error:", error);
    throw new Error("PDF dosyası okunamadı: " + (error.message || "Bilinmeyen hata"));
  }
}

// Extract text from image using Vision API
export async function extractTextFromImage(
  base64Image: string,
  mimeType: string,
  userId?: string
): Promise<string> {
  const effectiveUserId = userId || 'system';
  const VISION_LIMIT = 30;
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'image_extraction', VISION_LIMIT)) {
    throw new Error("Günlük görüntü işleme limitiniz doldu. Yarın tekrar deneyin.");
  }

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: `Sen bir OCR ve içerik çıkarma asistanısın. Görevin görüntüdeki tüm metni, prosedürleri, talimatları ve önemli bilgileri Türkçe olarak ayıklamaktır.

DOSPRESSO Academy için eğitim modülü oluşturmak amacıyla içerik çıkarıyorsun.

Çıkarılacak bilgiler:
- Başlıklar ve alt başlıklar
- Prosedürler ve adım adım talimatlar
- Ekipman kalibrasyon ve bakım bilgileri
- Güvenlik ve hijyen uyarıları
- Teknik parametreler ve ayarlar

Görüntüdeki metni düzenli, okunabilir bir formatta yaz. Eğer tablo veya liste varsa, bunları koruyarak yaz.`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            },
            {
              type: "text",
              text: "Bu görseldeki tüm metni ve içeriği çıkar. Eğitim modülü oluşturmak için kullanılacak."
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.3
    });

    const extractedText = response.choices[0]?.message?.content?.trim();
    
    if (!extractedText || extractedText.length < 20) {
      throw new Error("Görüntüden yeterli metin çıkarılamadı");
    }

    aiRateLimiter.incrementRequest(effectiveUserId, 'image_extraction');
    console.log(`📷 Image text extracted: ${extractedText.length} characters`);
    
    return extractedText;
  } catch (error: Error | unknown) {
    console.error("Image extraction error:", error);
    throw new Error("Görüntü işlenemedi: " + (error.message || "Bilinmeyen hata"));
  }
}

// Process uploaded file (PDF or image) and extract text
export async function processUploadedFile(
  buffer: Buffer,
  mimeType: string,
  userId?: string
): Promise<string> {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic'
  ];

  if (!allowedTypes.includes(mimeType)) {
    throw new Error("Desteklenmeyen dosya türü. PDF, JPEG, PNG veya HEIC yükleyin.");
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else {
    const base64 = buffer.toString('base64');
    return extractTextFromImage(base64, mimeType, userId);
  }
}

// Optimize image for module gallery
export async function optimizeImageForGallery(buffer: Buffer, mimeType: string): Promise<Buffer> {
  return optimizeGalleryImage(buffer, mimeType);
}

// Generate image with DALL-E
export async function generateImageWithAI(
  prompt: string,
  userId?: string
): Promise<string> {
  const effectiveUserId = userId || 'system';
  const IMAGE_GEN_LIMIT = 5; // 5 images per day
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'image_generation', IMAGE_GEN_LIMIT)) {
    throw new Error("Günlük görüntü üretme limitiniz doldu. Yarın tekrar deneyin.");
  }

  try {
    console.log(`🎨 Generating image with prompt: ${prompt.substring(0, 50)}...`);
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: `DOSPRESSO kahvesine uygun, profesyonel görünümlü banner-style fotoğraf: ${prompt}. Fotoğraf 600x400 piksel için optimize edilmiş, profesyonel, yüksek kaliteli ve eğitim materyali için uygun.`,
      n: 1,
      size: "1024x1024"
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error("Görüntü URL'si alınamadı");
    }

    aiRateLimiter.incrementRequest(effectiveUserId, 'image_generation');
    console.log(`✅ AI image generated successfully: ${imageUrl.substring(0, 50)}...`);
    
    return imageUrl;
  } catch (error: Error | unknown) {
    console.error("❌ Image generation error:", error.message || error);
    throw new Error("Görüntü üretilmesi başarısız oldu: " + (error.message || "Bilinmeyen hata"));
  }
}

// Generate AI-powered branch summary report (for daily/weekly/monthly analytics)
// Now supports role-based summaries for HQ vs Branch perspectives
export async function generateBranchSummaryReport(
  period: 'daily' | 'weekly' | 'monthly',
  data: {
    activeFaults: number;
    pendingTasks: number;
    overdueChecklists: number;
    maintenanceReminders: number;
    criticalEquipment: number;
    totalAbsences: number;
    slaBreaches: number;
    averageEquipmentHealth: number;
    branchName: string;
    // New role-based fields
    isHQ?: boolean;
    role?: string;
    totalBranches?: number;
    factoryStats?: { pendingOrders: number; qualityIssues: number };
  },
  userId?: string
): Promise<string> {
  const effectiveUserId = userId || 'system';
  const periodLabel = period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık';
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'summary_generation', 10)) {
    return `${data.branchName} ${periodLabel} Özet: ${data.activeFaults} aktif arıza, ${data.pendingTasks} bekleyen görev, ${data.overdueChecklists} geciken checklist.`;
  }

  try {
    // Build role-specific system prompt
    let systemPrompt: string;
    let userPrompt: string;
    
    if (data.isHQ) {
      // HQ/Admin perspective - organization-wide summary
      systemPrompt = `Sen DOSPRESSO kahve franchise zincirinin Genel Merkez (HQ) yönetim AI asistanısın. 
Tüm şubelerin genel durumunu özetlersin. Stratejik bakış açısıyla, üst düzey yöneticilere hitap eden profesyonel raporlar hazırlarsın.
Şube bazlı değil, organizasyon geneli metrikler ve trendlere odaklan. Türkçe kullan.`;

      userPrompt = `DOSPRESSO Genel Merkez için ${periodLabel.toLowerCase()} organizasyon özeti hazırla.

**Tüm Şubeler Geneli Veriler:**
- Toplam aktif arıza: ${data.activeFaults} (tüm şubelerde)
- Bekleyen görevler: ${data.pendingTasks} (organizasyon geneli)
- Geciken checklistler: ${data.overdueChecklists}
- Kritik ekipman sayısı: ${data.criticalEquipment}
- Bakım hatırlatmaları: ${data.maintenanceReminders}
- Ortalama ekipman sağlığı: %${data.averageEquipmentHealth}
- SLA ihlalleri: ${data.slaBreaches}
${data.totalBranches ? `- Toplam şube sayısı: ${data.totalBranches}` : ''}
${data.factoryStats ? `- Fabrika: ${data.factoryStats.pendingOrders} bekleyen sipariş, ${data.factoryStats.qualityIssues} kalite sorunu` : ''}

**İstenen Format:**
1. Organizasyon genel durumu (1 satır)
2. Dikkat gerektiren alanlar (şube kategorileri veya bölgeler bazında)
3. HQ için stratejik öneriler (2-3 madde)

Maksimum 5 satır, profesyonel ve stratejik ton.`;
    } else {
      // Branch perspective - single branch summary
      systemPrompt = `Sen DOSPRESSO kahve franchise yönetim sisteminin AI raporlama asistanısın. Kısa, önemli, ve şube yöneticisi için kullanışlı raporlar hazırlarsın. Somut öneriler ve aksiyonlar sun. Türkçe kullan.`;

      userPrompt = `${data.branchName} için ${periodLabel.toLowerCase()} özet ve öneri raporu hazırla. 

Veriler: ${data.activeFaults} aktif arıza, ${data.pendingTasks} bekleyen görev, ${data.overdueChecklists} geciken checklist, ${data.maintenanceReminders} bakım hatırlatması, ${data.criticalEquipment} kritik ekipman, ${data.totalAbsences} devamsızlık, ${data.slaBreaches} SLA ihlali, ortalama ekipman sağlığı %${data.averageEquipmentHealth}. 

Önce kısa durum özeti ver, sonra 1-2 somut aksiyon önerisi ekle (örn: "Öneri: Geciken checklistleri tamamlayın" veya "Öneri: Kritik ekipmanları öncelikli olarak kontrol edin"). Maksimum 4 satır, düz metin.`;
    }

    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const summary = response.choices[0]?.message?.content?.trim() || `${data.branchName} ${period}: ${data.activeFaults} arıza, ${data.pendingTasks} görev`;
    aiRateLimiter.incrementRequest(effectiveUserId, 'summary_generation');
    return summary;
  } catch (error: Error | unknown) {
    console.error("Summary generation error:", error);
    return `${data.branchName} ${periodLabel} Özet: ${data.activeFaults} aktif arıza, ${data.pendingTasks} bekleyen görev.`;
  }
}

// AI-powered personal summary for individual employees
export async function generatePersonalSummaryReport(
  data: {
    firstName: string;
    completedTasks: number;
    pendingTasks: number;
    completedChecklists: number;
    pendingChecklists: number;
    performanceScore: number | null;
    hasShiftToday: boolean;
    shiftTime?: string;
  },
  userId: string
): Promise<string> {
  if (!aiRateLimiter.canMakeRequest(userId, 'personal_summary', 5)) {
    const taskStatus = data.pendingTasks > 0 ? `${data.pendingTasks} bekleyen görev` : 'Tüm görevler tamam';
    const checklistStatus = data.pendingChecklists > 0 ? `${data.pendingChecklists} checklist bekliyor` : 'Checklistler tamam';
    return `${data.firstName}, ${taskStatus}, ${checklistStatus}.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve franchise yönetim sisteminin kişisel asistanısın. Çalışanlara motive edici, kısa ve samimi günlük özetler hazırlarsın. Türkçe kullan, 2. tekil şahıs (sen) ile hitap et.`
        },
        {
          role: "user",
          content: `${data.firstName} için kişisel günlük özet hazırla. Veriler: ${data.completedTasks} tamamlanan görev, ${data.pendingTasks} bekleyen görev, ${data.completedChecklists} tamamlanan checklist, ${data.pendingChecklists} bekleyen checklist, performans puanı: ${data.performanceScore ?? 'henüz yok'}, bugün vardiya: ${data.hasShiftToday ? `Evet (${data.shiftTime})` : 'Hayır'}. Motive edici, kısa (2-3 cümle) bir özet ver. Bekleyen iş varsa nazik bir hatırlatma ekle.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const summary = response.choices[0]?.message?.content?.trim() || `${data.firstName}, bugün ${data.pendingTasks} görev ve ${data.pendingChecklists} checklist bekliyor.`;
    aiRateLimiter.incrementRequest(userId, 'personal_summary');
    return summary;
  } catch (error: Error | unknown) {
    console.error("Personal summary generation error:", error);
    const taskStatus = data.pendingTasks > 0 ? `${data.pendingTasks} bekleyen görev` : 'Tüm görevler tamam';
    return `${data.firstName}, ${taskStatus}.`;
  }
}

// AI-powered article draft generator for Knowledge Base
export interface ArticleDraftResponse {
  title: string;
  content: string;
  tags: string[];
}

export async function generateArticleDraft(
  topic: string,
  category: string,
  userId?: string
): Promise<ArticleDraftResponse> {
  const effectiveUserId = userId || 'system';
  
  // Rate limit: 20 drafts per user per day
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'article_draft', 20)) {
    console.warn(`⚠️ RATE LIMIT - User ${effectiveUserId} exceeded daily article draft quota`);
    const error = new Error('Günlük makale taslak limitiniz doldu (20/gün). Yarın tekrar deneyin.');
    (error as any).statusCode = 429;
    throw error;
  }

  const categoryPrompts: Record<string, string> = {
    recipe: `Bir kahve içeceği veya yiyecek tarifi yaz. Malzemeler, ölçüler (MASSIVO 350ml ve LONG DIVA 550ml için), hazırlama adımları ve sunum önerileri dahil et.`,
    procedure: `Bir standart operasyon prosedürü (SOP) veya bakım kılavuzu yaz. Adım adım talimatlar, güvenlik uyarıları ve sıklık bilgileri dahil et.`,
    training: `Bir eğitim materyali veya kurs içeriği hazırla. Öğrenme hedefleri, temel konular ve pratik egzersizler dahil et.`,
  };

  const categoryLabel = category === 'recipe' ? 'Tarif' : category === 'procedure' ? 'Prosedür' : 'Eğitim';
  const prompt = categoryPrompts[category] || categoryPrompts.procedure;

  try {
    const response = await openai.chat.completions.create({
      model: SUMMARY_MODEL, // gpt-4o-mini: cost-efficient for text generation
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve franchise yönetim sisteminin içerik yazarısın. Profesyonel, net ve uygulanabilir bilgi bankası içerikleri hazırlarsın. Türkçe yaz.`
        },
        {
          role: "user",
          content: `"${topic}" konusunda bir ${categoryLabel} makalesi taslağı oluştur.

${prompt}

JSON formatında yanıt ver:
{
  "title": "Makale başlığı (açıklayıcı, kısa)",
  "content": "Detaylı içerik (minimum 200 kelime, paragraflar halinde)",
  "tags": ["etiket1", "etiket2", "etiket3"]
}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    aiRateLimiter.incrementRequest(effectiveUserId, 'article_draft');
    
    console.log(`✅ AI article draft generated for topic: ${topic}`);

    return {
      title: result.title || `${topic} - ${categoryLabel}`,
      content: result.content || '',
      tags: result.tags || [],
    };
  } catch (error: Error | unknown) {
    console.error("Article draft generation error:", error);
    throw new Error("Makale taslağı oluşturulamadı: " + ((error as Error).message || "Bilinmeyen hata"));
  }
}

// ========================================
// AI CHECKLIST PHOTO VERIFICATION
// ========================================

// Verification types and their prompts
const AI_VERIFICATION_PROMPTS: Record<string, string> = {
  cleanliness: `Temizlik kontrolü yapıyorsun. Referans fotoğraf ile yüklenen fotoğrafı karşılaştır:
    - Yüzey temizliği ve parlaklığı
    - Leke, toz veya pislik var mı
    - Düzen ve organizasyon
    - Genel hijyen standardı`,
  arrangement: `Düzenleme/yerleşim kontrolü yapıyorsun. Referans fotoğraf ile yüklenen fotoğrafı karşılaştır:
    - Objelerin konumları doğru mu
    - Sıralama ve hizalama uyumlu mu
    - Eşyalar düzenli yerleştirilmiş mi
    - Eksik veya fazla öğe var mı`,
  machine_settings: `Makine ayarları kontrolü yapıyorsun. Referans fotoğraf ile yüklenen fotoğrafı karşılaştır:
    - Gösterge/kadran okumaları uyumlu mu
    - Basınç, sıcaklık değerleri doğru mu
    - Ayar düğmeleri doğru pozisyonda mı
    - LED göstergeler doğru renkte mi`,
  general: `Genel görsel karşılaştırma yapıyorsun. Referans fotoğraf ile yüklenen fotoğrafı karşılaştır:
    - Görsel benzerlik
    - Belirgin farklılıklar
    - Standartlara uygunluk
    - Genel durum değerlendirmesi`,
};

export interface ChecklistPhotoVerificationResult {
  passed: boolean;
  similarityScore: number; // 0-100
  verificationNote: string;
  details?: {
    matchingAspects: string[];
    differences: string[];
    suggestions?: string[];
  };
}

export async function verifyChecklistPhoto(
  referencePhotoBase64: string,
  uploadedPhotoBase64: string,
  verificationType: string,
  tolerancePercent: number,
  taskDescription: string,
  userId?: string,
  branchId?: number
): Promise<ChecklistPhotoVerificationResult> {
  const effectiveUserId = userId || 'system';
  
  // Rate limit: 100 verifications per user per day
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'checklist_photo_verify', 100)) {
    console.warn(`⚠️ RATE LIMIT - User ${effectiveUserId} exceeded daily checklist photo verification quota`);
    const error = new Error('Günlük fotoğraf doğrulama limitiniz doldu. Lütfen daha sonra tekrar deneyin.');
    (error as any).statusCode = 429;
    throw error;
  }

  const verificationPrompt = AI_VERIFICATION_PROMPTS[verificationType] || AI_VERIFICATION_PROMPTS.general;

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL, // gpt-4o for vision tasks
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve franchise yönetim sisteminin AI kalite kontrol asistanısın. 
          Checklist görevleri için fotoğraf doğrulama yapıyorsun.
          Görev: "${taskDescription}"
          Tolerans seviyesi: %${tolerancePercent} (bu değerin altındaki benzerlik başarısız sayılır)
          
          ${verificationPrompt}
          
          JSON formatında yanıt ver:
          {
            "similarityScore": 0-100 arası sayı (görsel benzerlik yüzdesi),
            "passed": true/false (similarityScore >= ${tolerancePercent} ise true),
            "verificationNote": "Kısa açıklama (max 100 karakter)",
            "matchingAspects": ["Uyumlu nokta 1", "Uyumlu nokta 2"],
            "differences": ["Farklılık 1", "Farklılık 2"],
            "suggestions": ["İyileştirme önerisi 1"]
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Referans fotoğraf (ilk) ve yüklenen fotoğrafı (ikinci) karşılaştır:"
            },
            {
              type: "image_url",
              image_url: {
                url: referencePhotoBase64.startsWith('data:') 
                  ? referencePhotoBase64 
                  : `data:image/webp;base64,${referencePhotoBase64}`,
                detail: "low" // Cost optimization
              }
            },
            {
              type: "image_url",
              image_url: {
                url: uploadedPhotoBase64.startsWith('data:') 
                  ? uploadedPhotoBase64 
                  : `data:image/webp;base64,${uploadedPhotoBase64}`,
                detail: "low" // Cost optimization
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3 // Lower temperature for consistent scoring
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    const similarityScore = Math.min(100, Math.max(0, Number(result.similarityScore) || 0));
    const passed = similarityScore >= tolerancePercent;

    aiRateLimiter.incrementRequest(effectiveUserId, 'checklist_photo_verify');
    
    // Log AI usage for analytics
    console.log(`✅ Checklist photo verification: ${passed ? 'PASSED' : 'FAILED'} (${similarityScore}% similarity, ${tolerancePercent}% required)`);

    return {
      passed,
      similarityScore,
      verificationNote: result.verificationNote || (passed ? 'Fotoğraf uyumlu' : 'Fotoğraf uyumsuz'),
      details: {
        matchingAspects: result.matchingAspects || [],
        differences: result.differences || [],
        suggestions: result.suggestions || [],
      }
    };
  } catch (error: Error | unknown) {
    console.error("Checklist photo verification error:", error);
    
    // Return a failed result instead of throwing for graceful handling
    return {
      passed: false,
      similarityScore: 0,
      verificationNote: 'AI doğrulama yapılamadı: ' + ((error as Error).message || 'Bilinmeyen hata'),
      details: {
        matchingAspects: [],
        differences: ['AI analiz hatası'],
        suggestions: ['Fotoğrafı tekrar yükleyip deneyin'],
      }
    };
  }
}

// Verify photo without reference (just quality check)
export async function verifyPhotoQuality(
  photoBase64: string,
  verificationType: string,
  taskDescription: string,
  userId?: string
): Promise<{ passed: boolean; score: number; note: string }> {
  const effectiveUserId = userId || 'system';
  
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'photo_quality_check', 100)) {
    return { passed: true, score: 70, note: 'Rate limit - varsayılan kabul' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kalite kontrol asistanısın. Fotoğrafın görev için yeterli olup olmadığını kontrol et.
          Görev: "${taskDescription}"
          Kontrol türü: ${verificationType}
          
          JSON yanıt ver:
          {
            "score": 0-100 arası kalite puanı,
            "passed": true/false (score >= 60 ise true),
            "note": "Kısa açıklama"
          }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Bu fotoğrafı değerlendir:" },
            {
              type: "image_url",
              image_url: {
                url: photoBase64.startsWith('data:') ? photoBase64 : `data:image/webp;base64,${photoBase64}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    aiRateLimiter.incrementRequest(effectiveUserId, 'photo_quality_check');
    
    return {
      passed: result.passed ?? true,
      score: Number(result.score) || 70,
      note: result.note || 'Kontrol tamamlandı'
    };
  } catch (error) {
    console.error("Photo quality check error:", error);
    return { passed: true, score: 70, note: 'Kontrol yapılamadı - varsayılan kabul' };
  }
}

// Generate equipment knowledge from manual/troubleshooting text
export async function generateEquipmentKnowledgeFromManual(
  manualText: string,
  equipmentType: string,
  brand?: string,
  model?: string,
  userId?: string
): Promise<{
  items: Array<{
    category: string;
    title: string;
    content: string;
    keywords: string[];
  }>;
  summary: string;
}> {
  const effectiveUserId = userId || 'system';
  
  // Rate limiting
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'knowledge_generation')) {
    throw new Error("Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.");
  }

  const systemPrompt = `Sen bir DOSPRESSO teknik dokümantasyon uzmanısın. Sana verilen cihaz kılavuzu veya troubleshooting metnini analiz edip, yapılandırılmış bilgi kayıtları oluşturacaksın.

GÖREV:
1. Metni analiz et (İngilizce ise Türkçeye çevir)
2. İçeriği kategorilere ayır: maintenance (bakım), troubleshooting (arıza giderme), usage (kullanım), safety (güvenlik)
3. Her kategori için ayrı bir bilgi kaydı oluştur
4. İçeriği adım adım, anlaşılır şekilde düzenle
5. Anahtar kelimeler ekle

ÖNEMLİ KURALLAR:
- Türkçe olarak yaz
- Teknik terimleri koru ama açıkla
- Adım adım talimatlar ver
- Pratik ve uygulanabilir bilgiler sun
- Her kayıt 500 kelimeyi geçmesin

JSON formatında yanıt ver:
{
  "items": [
    {
      "category": "maintenance|troubleshooting|usage|safety",
      "title": "Başlık (Türkçe)",
      "content": "İçerik - Markdown formatında, adım adım",
      "keywords": ["anahtar", "kelimeler"]
    }
  ],
  "summary": "Kısa özet - ne tür bilgiler oluşturuldu"
}`;

  const userPrompt = `Ekipman: ${equipmentType}${brand ? ` - Marka: ${brand}` : ''}${model ? ` - Model: ${model}` : ''}

Kılavuz/Troubleshooting Metni:
${manualText.substring(0, 8000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI yanıt içeriği boş");

    const result = JSON.parse(content);
    aiRateLimiter.incrementRequest(effectiveUserId, 'knowledge_generation');

    return {
      items: result.items || [],
      summary: result.summary || "Bilgiler oluşturuldu"
    };
  } catch (error: any) {
    console.error("Knowledge generation error:", error);
    throw new Error(error.message || "Bilgi oluşturulamadı");
  }
}

// Auto-research equipment troubleshooting from AI knowledge base
export async function researchEquipmentTroubleshooting(
  equipmentType: string,
  brand: string,
  model: string,
  userId?: string
): Promise<{
  items: Array<{
    category: string;
    title: string;
    content: string;
    keywords: string[];
  }>;
  summary: string;
}> {
  const effectiveUserId = userId || 'system';
  
  // Rate limiting
  if (!aiRateLimiter.canMakeRequest(effectiveUserId, 'knowledge_generation')) {
    throw new Error("Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.");
  }

  const equipmentLabels: Record<string, string> = {
    'espresso_machine': 'Espresso Makinesi',
    'grinder': 'Kahve Değirmeni',
    'refrigerator': 'Buzdolabı',
    'blender': 'Blender',
    'ice_machine': 'Buz Makinesi',
    'dishwasher': 'Bulaşık Makinesi',
    'oven': 'Fırın',
    'pos': 'POS Cihazı',
    'water_filter': 'Su Filtresi',
    'general': 'Genel Ekipman'
  };

  const typeLabel = equipmentLabels[equipmentType] || equipmentType;

  const systemPrompt = `Sen bir profesyonel ekipman teknisyenisin. Senden ${brand} ${model} ${typeLabel} için kapsamlı teknik bilgi ve troubleshooting rehberi oluşturmanı istiyorum.

BİLGİ TABANINI KULLANARAK şu konularda detaylı içerik oluştur:

1. **BAKIM (maintenance)**: Günlük, haftalık, aylık bakım prosedürleri
2. **ARIZA GİDERME (troubleshooting)**: En sık karşılaşılan arızalar ve çözümleri
3. **KULLANIM (usage)**: Doğru kullanım talimatları, kalibrasyon, ayarlar
4. **GÜVENLİK (safety)**: Güvenlik uyarıları, tehlikeler, koruyucu önlemler

HER KATEGORİ İÇİN:
- Spesifik, uygulanabilir adımlar yaz
- Yaygın hata kodlarını ve çözümlerini dahil et
- Parça isimleri ve teknik terimleri Türkçe açıkla
- Café/kahve dükkanı ortamına uygun pratik bilgiler ver

JSON formatında yanıt ver:
{
  "items": [
    {
      "category": "maintenance|troubleshooting|usage|safety",
      "title": "Başlık (Türkçe)",
      "content": "Detaylı içerik - Markdown formatında, adım adım, en az 300 kelime",
      "keywords": ["anahtar", "kelimeler", "hata kodları"]
    }
  ],
  "summary": "Oluşturulan içeriğin özeti"
}

ÖNEMLİ: Bu marka ve model için spesifik bilgiler ver. Genel bilgilerden kaçın. Eğer bu spesifik model hakkında bilgin yoksa, aynı markanın benzer modelleri veya aynı kategorideki endüstri standartları hakkında bilgi ver.`;

  const userPrompt = `${brand} ${model} ${typeLabel} için kapsamlı teknik dokümantasyon oluştur.

Bu ekipman bir DOSPRESSO kahve franchise şubesinde kullanılmaktadır. Barista ve teknisyenler için pratik, uygulanabilir bilgiler gerekiyor.

En az 4 farklı kategori için içerik oluştur (bakım, arıza giderme, kullanım, güvenlik).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 6000,
      temperature: 0.4
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI yanıt içeriği boş");

    const result = JSON.parse(content);
    aiRateLimiter.incrementRequest(effectiveUserId, 'knowledge_generation');

    // Ensure we have at least some items
    if (!result.items || result.items.length === 0) {
      throw new Error("AI içerik oluşturamadı. Lütfen farklı bir marka/model deneyin.");
    }

    return {
      items: result.items,
      summary: result.summary || `${brand} ${model} için ${result.items.length} bilgi kaydı oluşturuldu`
    };
  } catch (error: any) {
    console.error("Equipment research error:", error);
    throw new Error(error.message || "Ekipman araştırması yapılamadı");
  }
}
