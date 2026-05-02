// ========================================
// DOSPRESSO Mr. Dobody — AI Mesaj Üretici
// Bağlama özel, kişiselleştirilmiş mesaj üretimi
// Multi-provider: OpenAI / Claude / Gemini
// ========================================

import { chat } from "../services/ai-client";

interface MessageContext {
  workflowType: string;
  branchName?: string;
  branchId?: number;
  recipientRole?: string;
  recipientName?: string;
  issueType?: string;
  severity?: string;
  data?: Record<string, any>;
  history?: { date: string; action: string }[];
}

const SYSTEM_PROMPT = `Sen DOSPRESSO kahve franchise zincirinin yapay zeka asistanı Mr. Dobody'sin.
Görevin: Yöneticilere gönderilecek profesyonel, net ve aksiyona yönelik Türkçe mesajlar hazırlamak.

Kurallar:
- Resmi ama samimi ton kullan
- Mesaj 3-5 paragraf olsun
- İlk paragraf: durumu özetle
- İkinci paragraf: kök nedeni açıkla (varsa)
- Son paragraf: önerilen aksiyon adımlarını listele
- Tarih ve sayıları kesin ver
- "Lütfen" ile başla, "Saygılarımızla" ile bitir
- Mesajı Türkçe yaz`;

/**
 * AI ile bağlama özel mesaj üret
 */
export async function generateContextMessage(context: MessageContext): Promise<string> {
  try {
    const userPrompt = buildPrompt(context);

    const response = await chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiMessage = response.choices?.[0]?.message?.content;
    if (aiMessage && aiMessage.length > 20) {
      return aiMessage.trim();
    }

    // AI yanıt vermezse template kullan
    return generateTemplateMessage(context);
  } catch (error) {
    const { isAiBudgetError } = await import("../ai-budget-guard");
    if (isAiBudgetError(error)) throw error;
    console.error("AI mesaj üretme hatası:", error);
    return generateTemplateMessage(context);
  }
}

function buildPrompt(ctx: MessageContext): string {
  const parts = [`Aşağıdaki durum için ${ctx.recipientRole || 'sorumlu kişi'}ye gönderilecek bir mesaj hazırla.\n`];

  switch (ctx.workflowType) {
    case 'WF-1':
      parts.push(`Konu: Denetim sonucu — ${ctx.branchName || 'Şube'} şubesinin denetim skoru düşük.`);
      if (ctx.data?.score) parts.push(`Skor: ${ctx.data.score}/100`);
      if (ctx.history?.length) parts.push(`Geçmiş: Son ${ctx.history.length} denetim trendi kötüleşiyor.`);
      break;
    case 'WF-5':
      parts.push(`Konu: Vardiya planı — ${ctx.branchName || 'Şube'} yarınki vardiya planını oluşturmamış.`);
      if (ctx.history?.length) parts.push(`Bu ${ctx.history.length}. kez plan gecikmesi yaşanıyor.`);
      break;
    case 'WF-3':
      parts.push(`Konu: Stok kritik — ${ctx.branchName || 'Şube'} şubesinde ${ctx.data?.productName || 'ürün'} stoku kritik seviyede.`);
      if (ctx.data?.daysLeft) parts.push(`Tahmini ${ctx.data.daysLeft} gün kaldı.`);
      break;
    case 'WF-CRM':
      parts.push(`Konu: Müşteri memnuniyeti — ${ctx.branchName || 'Şube'} NPS skoru düştü.`);
      if (ctx.data?.currentNps) parts.push(`Mevcut NPS: ${ctx.data.currentNps}, önceki: ${ctx.data.previousNps}`);
      break;
    case 'WF-FAB':
      parts.push(`Konu: Fabrika — ${ctx.issueType || 'üretim sorunu'}.`);
      if (ctx.data) parts.push(`Detay: ${JSON.stringify(ctx.data)}`);
      break;
    default:
      parts.push(`Konu: ${ctx.issueType || 'Dikkat gerektiren durum'} — ${ctx.branchName || 'şube/fabrika'}.`);
  }

  if (ctx.severity === 'acil') parts.push('ÖNCELİK: ACİL — aynı gün içinde yanıt bekleniyor.');
  
  return parts.join('\n');
}

/**
 * AI olmadan template mesaj üret (fallback)
 */
function generateTemplateMessage(ctx: MessageContext): string {
  const branch = ctx.branchName || 'Şube';
  const recipient = ctx.recipientName || 'Sayın ilgili';

  switch (ctx.workflowType) {
    case 'WF-1':
      return `${recipient},\n\n${branch} şubesinin son denetim skoru kabul edilebilir seviyenin altında tespit edilmiştir.\n\nLütfen aşağıdaki konularda iyileştirme yapınız:\n- Hijyen ve temizlik standartları\n- Personel eğitim eksiklikleri\n- Ekipman bakımları\n\nBelirtilen süre içinde gerekli düzeltmelerin yapılması beklenmektedir.\n\nSaygılarımızla,\nMr. Dobody`;
    case 'WF-5':
      return `${recipient},\n\n${branch} şubesinin yarınki vardiya planı henüz oluşturulmamıştır.\n\nLütfen vardiya planlama sayfasından planınızı en kısa sürede oluşturunuz.\n\nSaygılarımızla,\nMr. Dobody`;
    case 'WF-3':
      return `${recipient},\n\n${branch} şubesinde ${ctx.data?.productName || 'ürün'} stoğu kritik seviyeye düşmüştür.\n\nMevcut stok tahmini tüketim hızına göre ${ctx.data?.daysLeft || 'birkaç'} gün yetecek düzeydedir. Sipariş oluşturmanız önerilir.\n\nSaygılarımızla,\nMr. Dobody`;
    case 'WF-CRM':
      return `${recipient},\n\n${branch} şubesinde müşteri memnuniyet skoru düşüş göstermiştir (${ctx.data?.previousNps || '?'} → ${ctx.data?.currentNps || '?'}).\n\nSon müşteri geri bildirimlerini inceleyerek kök neden analizi yapmanız önerilir.\n\nSaygılarımızla,\nMr. Dobody`;
    case 'WF-FAB':
      return `${recipient},\n\nFabrika üretim sürecinde dikkat gerektiren bir durum tespit edilmiştir: ${ctx.issueType || 'Kontrol gerekli'}.\n\nLütfen ilgili bölümü kontrol ediniz ve gerekli aksiyonu alınız.\n\nSaygılarımızla,\nMr. Dobody`;
    default:
      return `${recipient},\n\n${branch} ile ilgili dikkat gerektiren bir durum tespit edilmiştir.\n\nLütfen konuyu inceleyerek gerekli aksiyonu alınız.\n\nSaygılarımızla,\nMr. Dobody`;
  }
}
