import OpenAI from "openai";
import { cache, generateCacheKey, aiRateLimiter } from "./cache";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Cost-optimized model selection
// gpt-4o is 60% cheaper than gpt-4-turbo for vision tasks
const VISION_MODEL = "gpt-4o"; // For photo analysis (task, fault, cleanliness, dress code)
const CHAT_MODEL = "gpt-4o"; // For RAG Q&A
const EMBEDDING_MODEL = "text-embedding-3-small"; // Already optimal

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

export async function analyzeTaskPhoto(
  photoUrl: string,
  taskDescription: string,
  userId?: string,
  skipCache: boolean = false
): Promise<TaskPhotoAnalysis> {
  // Check cache first (24h TTL)
  const cacheKey = generateCacheKey('task-photo', photoUrl, taskDescription);
  if (!skipCache) {
    const cached = cache.get<TaskPhotoAnalysis>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT - Task photo analysis (cost saved!)');
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
    const analysis: TaskPhotoAnalysis = {
      analysis: result.analysis || "Analiz yapılamadı",
      score: Math.min(Math.max(result.score || 0, 0), 100),
      passed: result.passed || false,
    };

    // Cache for 24 hours
    cache.set(cacheKey, analysis, 24 * 60 * 60 * 1000);
    
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
  employeeName: string = "Çalışan"
): Promise<DressCodeAnalysis> {
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
1. Üniforma: Temiz DOSPRESSO önlüğü/gömleği, lekesiz
2. Saç: Toplı, temiz, doğal renk, varsa boneli
3. Sakal: Düzgün kesilmiş veya tıraşlı, hijyenik
4. Genel hijyen: Temiz, bakımlı görünüm

JSON formatında yanıt verin:
{
  "isCompliant": true/false,
  "score": 90,
  "summary": "Genel değerlendirme",
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
      max_completion_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Boş yanıt");

    const result = JSON.parse(content);
    return {
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
  } catch (error) {
    console.error("Dress code analiz hatası:", error);
    return {
      isCompliant: false, // FALSE - requires manual review
      score: 0,
      summary: "⚠️ Otomatik analiz BAŞARISIZ - Supervisor incelemesi zorunlu",
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
    const response = await openai.embeddings.create({
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
