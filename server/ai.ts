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
