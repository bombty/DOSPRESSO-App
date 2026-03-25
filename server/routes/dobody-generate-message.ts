import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { z } from "zod";
import { chat } from "../services/ai-client";

const router = Router();

const SUPERVISOR_PLUS_ROLES = new Set([
  "supervisor", "supervisor_buddy", "mudur",
  "admin", "ceo", "cgo",
  "coach", "trainer", "kalite_kontrol", "gida_muhendisi",
  "fabrika_mudur", "muhasebe_ik", "muhasebe", "satinalma",
  "marketing", "teknik", "destek",
]);

const generateMessageSchema = z.object({
  templateKey: z.string().min(1),
  branchName: z.string().optional().default(""),
  details: z.string().optional().default(""),
  senderRole: z.string().optional().default(""),
  recipientName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  severity: z.string().optional().default(""),
});

const CATEGORY_CONTEXT: Record<string, string> = {
  overdue_stock_count: "stok sayımı gecikmesi",
  low_performance: "düşük performans skoru",
  missing_checklist: "eksik veya tamamlanmamış checklist",
  maintenance_overdue: "gecikmiş bakım işlemi",
  capa_overdue: "gecikmiş düzeltici aksiyon (CAPA)",
  low_customer_rating: "düşük müşteri memnuniyeti puanı",
  training_overdue: "gecikmiş eğitim modülü",
  branch_inactivity: "şube operasyonel inaktivite",
  onboarding_stuck: "takılmış onboarding süreci",
  fault_unresolved: "çözülmemiş ekipman arızası",
  generic_reminder: "genel hatırlatma",
};

const ROLE_TITLES: Record<string, string> = {
  ceo: "CEO",
  cgo: "CGO",
  coach: "Koç",
  trainer: "Eğitmen",
  admin: "Yönetici",
  kalite_kontrol: "Kalite Kontrol Sorumlusu",
  gida_muhendisi: "Gıda Mühendisi",
  supervisor: "Supervisor",
  mudur: "Şube Müdürü",
};

router.post("/api/dobody/generate-message", isAuthenticated, async (req: any, res) => {
  try {
    const role = req.user?.role;
    if (!SUPERVISOR_PLUS_ROLES.has(role)) {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const parsed = generateMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Geçersiz istek", errors: parsed.error.flatten() });
    }

    const { templateKey, branchName, details, senderRole, recipientName, severity } = parsed.data;

    const categoryContext = CATEGORY_CONTEXT[templateKey] || "genel uyarı";
    const senderTitle = ROLE_TITLES[senderRole] || ROLE_TITLES[role] || "Merkez Yönetim";

    const severityText = severity === "critical" ? "Kritik düzeyde" :
      severity === "high" ? "Yüksek öncelikli" :
      severity === "medium" ? "Orta düzeyde" : "";

    const systemPrompt = `Sen DOSPRESSO franchise yönetim sisteminin profesyonel bildirim yazarısın. 
Görüşmen kurumsal, resmi ve profesyonel Türkçe ile yazılmalıdır. 
Mesajlar ${senderTitle} adına yazılır ve franchise şubelerine gönderilen resmi uyarı/ikaz/hatırlatma niteliğindedir.
Mesaj kısa ve öz olmalı (3-5 cümle), açık ve net olmalı, çözüm odaklı olmalı.
Emoji kullanma. Selamlama ve kapanış cümleleri ekle.`;

    const userPrompt = `Aşağıdaki bilgilere göre profesyonel bir uyarı/ikaz metni oluştur:

Konu: ${categoryContext}
${branchName ? `Şube: ${branchName}` : ""}
${recipientName ? `Alıcı: ${recipientName}` : ""}
${details ? `Detaylar: ${details}` : ""}
${severityText ? `Önem: ${severityText}` : ""}
Gönderen: ${senderTitle}

Sadece mesaj metnini yaz, başka açıklama ekleme.`;

    const response = await chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const generatedMessage = response.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedMessage) {
      return res.status(500).json({ message: "AI metin üretilemedi" });
    }

    res.json({
      message: generatedMessage,
      templateKey,
      senderTitle,
    });
  } catch (error: any) {
    console.error("Generate message error:", error);
    res.status(500).json({ message: "Metin üretilirken hata oluştu" });
  }
});

export default router;
