import OpenAI from "openai";
import QRCode from "qrcode";
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

// QR Code Generation for Equipment
export async function generateEquipmentQR(equipmentId: number): Promise<string> {
  // QR data: equipment ID with DOSPRESSO prefix
  const qrData = `DOSPRESSO-EQ-${equipmentId}`;
  
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
  suggestions: ShiftSuggestion[];
  totalShifts: number;
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
  const PHOTO_LIMIT = 10; // 10 photo analyses per day
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      analysis: "Günlük fotoğraf analiz limitiniz doldu (10/gün). Yarın tekrar deneyin veya supervisor ile iletişime geçin.",
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

    // Cache for 24 hours
    cache.set(cacheKey, analysis, 24 * 60 * 60 * 1000);
    
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
  const PHOTO_LIMIT = 10;
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      analysis: "Günlük fotoğraf analiz limitiniz doldu (10/gün). Arıza kaydedildi ancak otomatik analiz yapılamadı.",
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

    // Cache for 24 hours
    cache.set(cacheKey, analysis, 24 * 60 * 60 * 1000);
    
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
  const PHOTO_LIMIT = 10; // 10 photo analyses per day
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'photo', PHOTO_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily photo analysis quota`);
    return {
      isCompliant: false,
      score: 0,
      summary: "Günlük fotoğraf analiz limitiniz doldu (10/gün). Yarın tekrar deneyin.",
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

    // Cache for 24 hours
    cache.set(cacheKey, analysis, 24 * 60 * 60 * 1000);
    
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

  // Rate limit check (RAG calls are more expensive, separate quota)
  const RAG_LIMIT = 5; // 5 RAG Q&A calls per day (independent of photo quota)
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'rag', RAG_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily RAG quota`);
    throw new Error("Günlük soru-cevap limitiniz doldu (5/gün). Yarın tekrar deneyin.");
  }

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

    // Cache for 24 hours
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
    
    // Increment rate limit counter (RAG has separate quota from photos)
    if (userId) {
      aiRateLimiter.incrementRequest(userId, 'rag');
      const remaining = aiRateLimiter.getRemainingCalls(userId, 'rag', RAG_LIMIT);
      console.log(`💰 AI call made - RAG Q&A (${remaining}/${RAG_LIMIT} remaining for user ${userId})`);
    } else {
      console.log('💰 AI call made - RAG Q&A');
    }

    return result;
  } catch (error) {
    console.error("RAG soru-cevap hatası:", error);
    throw new Error("Soru cevaplanamadı");
  }
}

// Generate AI-powered shift plan based on historical data and workload
export async function generateShiftPlan(
  branchId: number,
  weekStart: string, // YYYY-MM-DD
  weekEnd: string, // YYYY-MM-DD
  historicalShifts: Array<{ shiftDate: string; shiftType: string; assignedToId: string | null; status: string }>,
  employees: Array<{ id: string; name: string; role: string }>,
  workloadMetrics?: { averageDailySales?: number; peakHours?: string[] },
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
  const SHIFT_PLAN_LIMIT = 3; // 3 shift plan calls per day per supervisor
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'shift_plan', SHIFT_PLAN_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily shift plan quota`);
    throw new Error("Günlük vardiya planlama limitiniz doldu (3/gün). Yarın tekrar deneyin.");
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

    const employeeList = employees.map(e => `${e.name} (${e.role}) [ID: ${e.id}]`).join('\n');

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL, // gpt-4o for planning
      messages: [
        {
          role: "system",
          content: `Sen DOSPRESSO kahve dükkanları için bir AI vardiya planlamacısısın. Geçmiş verileri analiz ederek optimal vardiya planları oluşturursun. Her vardiya için en uygun çalışanları öner ve güven skoru ver.`,
        },
        {
          role: "user",
          content: `DOSPRESSO Şube #${branchId} için ${weekStart} - ${weekEnd} tarihleri arası vardiya planı oluştur.

Geçmiş Vardiya İstatistikleri (son 6 hafta):
- Toplam vardiya: ${shiftStats.totalShifts}
- Sabah vardiyas ı: ${shiftStats.morningShifts}
- Akşam vardiyası: ${shiftStats.eveningShifts}
- Gece vardiyası: ${shiftStats.nightShifts}
- Atanmış vardiya: ${shiftStats.assignedShifts}
- Tamamlanan vardiya: ${shiftStats.completedShifts}

Mevcut Çalışanlar:
${employeeList}

${workloadMetrics ? `Yoğunluk Metrikleri:
- Ortalama günlük satış: ${workloadMetrics.averageDailySales || 'Bilinmiyor'}
- Yoğun saatler: ${workloadMetrics.peakHours?.join(', ') || 'Bilinmiyor'}` : ''}

GÖREV: ${weekStart} - ${weekEnd} tarihleri arası her gün için vardiya planı oluştur. Her vardiya için:
1. Vardiya tipi (morning: 08:00-16:00, evening: 16:00-00:00, night: 00:00-08:00)
2. En uygun çalışan(lar)ın ID'lerini öner
3. Güven skoru (0-100: ne kadar emin olduğun)
4. Kısa açıklama (neden bu çalışanları seçtin?)

JSON formatında yanıt ver:
{
  "suggestions": [
    {
      "shiftDate": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "shiftType": "morning",
      "assignedCandidateIds": ["user-id-1", "user-id-2"],
      "confidence": 85,
      "notes": "Açıklama"
    }
  ]
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
      suggestions: result.suggestions || [],
      totalShifts: result.suggestions?.length || 0,
      weekStart,
      weekEnd,
      cached: false,
    };

    // Cache for 24 hours
    cache.set(cacheKey, planResponse, 24 * 60 * 60 * 1000);
    
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
const SUMMARY_LIMIT = 3; // 3 summaries per day

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

    // Cache for 24 hours
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);

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
const INSIGHTS_LIMIT = 3; // 3 insights per day per user

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

    // Cache for 24 hours
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);

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
  const EVAL_LIMIT = 10; // 10 branch evaluations per day
  if (userId && !aiRateLimiter.canMakeRequest(userId, 'evaluation', EVAL_LIMIT)) {
    console.warn(`⚠️ RATE LIMIT - User ${userId} exceeded daily evaluation quota`);
    throw new Error("Günlük değerlendirme limitiniz doldu (10/gün). Yarın tekrar deneyin.");
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

    // Cache for 6 hours (branch performance changes slowly)
    cache.set(cacheKey, evaluation, 6 * 60 * 60 * 1000);

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
