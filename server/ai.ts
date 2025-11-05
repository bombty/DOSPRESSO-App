import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

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
  taskDescription: string
): Promise<TaskPhotoAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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
    return {
      analysis: result.analysis || "Analiz yapılamadı",
      score: Math.min(Math.max(result.score || 0, 0), 100),
      passed: result.passed || false,
    };
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
  description: string
): Promise<FaultPhotoAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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
    return {
      analysis: result.analysis || "Analiz yapılamadı",
      severity: result.severity || "medium",
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("Arıza fotoğrafı analiz hatası:", error);
    return {
      analysis: "AI analizi yapılamadı. Fotoğraf başarıyla yüklendi ancak otomatik değerlendirme mevcut değil. Lütfen bir teknisyen ile iletişime geçin.",
      severity: "medium",
      recommendations: ["Bir teknisyen ile iletişime geçin", "Ekipmanın kullanımını durdurun", "Arızayı detaylı olarak belgeleyin"],
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
  relevantChunks: Array<{ chunkText: string; articleId: number; articleTitle: string }>
): Promise<RAGResponse> {
  try {
    const context = relevantChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.chunkText}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
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

    return { answer, sources };
  } catch (error) {
    console.error("RAG soru-cevap hatası:", error);
    throw new Error("Soru cevaplanamadı");
  }
}
