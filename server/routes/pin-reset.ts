/**
 * PIN Reset API — Aslan 11 May 2026
 *
 * 8 hatalı denemeden sonra kilitlenen kullanıcı için:
 * 1. POST /api/kiosk/pin-reset/request
 *    - Body: { email, branchId } (veya { firstName, lastName })
 *    - Kullanıcıyı bulur
 *    - Yeni 4 haneli random PIN üretir
 *    - DB güncellenir (hash) + lockout sıfırlanır
 *    - Mail gönderilir (DOSPRESSO branded)
 *
 * Senaryo:
 *  - Personel kiosk'ta 8 yanlış PIN giriyor
 *  - Sistem kilitlenir, "PIN'imi unuttum" linki gözükür
 *  - Email gir → backend yeni PIN üretir + mailler
 *  - 1 dakika sonra mail gelir → yeni PIN
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { branchStaffPins, users, branches } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendEmail } from "../email";

const router = Router();

function generatePIN(length: number = 4): string {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  // İlk hane 0 olmasın (yanlışlıkla kısalmasın)
  if (pin[0] === "0") {
    pin = (Math.floor(Math.random() * 9) + 1).toString() + pin.slice(1);
  }
  return pin;
}

router.post(
  "/api/kiosk/pin-reset/request",
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, branchId } = req.body;

      if (!email && !(firstName && lastName)) {
        return res.status(400).json({
          error: "E-posta veya ad-soyad gerekli",
        });
      }

      // Kullanıcıyı bul
      let user = null;
      if (email) {
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        user = found || null;
      }
      if (!user && firstName && lastName) {
        const allUsers = await db
          .select()
          .from(users)
          .where(eq(users.firstName, firstName));
        user = allUsers.find(
          (u) => u.lastName?.toLowerCase() === lastName.toLowerCase()
        );
      }

      if (!user) {
        // Güvenlik: kullanıcı yokmuş gibi davran ama yine başarı gibi göster
        // (email-enumeration saldırısını engellemek için)
        return res.json({
          success: true,
          message:
            "Eğer sistemde kayıtlı bir kullanıcısınız, yeni PIN'iniz e-posta adresinize gönderildi. Lütfen birkaç dakika içinde kontrol edin.",
        });
      }

      if (!user.email) {
        return res.status(400).json({
          error:
            "Bu kullanıcının e-posta adresi sistemde kayıtlı değil. Lütfen şube müdürünüze başvurun.",
        });
      }

      // Şube PIN kaydını bul
      let pinRecord;
      if (branchId) {
        const [found] = await db
          .select()
          .from(branchStaffPins)
          .where(
            and(
              eq(branchStaffPins.userId, user.id),
              eq(branchStaffPins.branchId, parseInt(branchId)),
              eq(branchStaffPins.isActive, true)
            )
          )
          .limit(1);
        pinRecord = found;
      } else {
        // branchId yoksa kullanıcının ana şubesini al
        const [found] = await db
          .select()
          .from(branchStaffPins)
          .where(
            and(
              eq(branchStaffPins.userId, user.id),
              eq(branchStaffPins.isActive, true)
            )
          )
          .limit(1);
        pinRecord = found;
      }

      if (!pinRecord) {
        return res.status(404).json({
          error:
            "Bu kullanıcının PIN kaydı bulunamadı. Lütfen şube müdürünüze başvurun.",
        });
      }

      // Yeni PIN üret
      const newPin = generatePIN(4);
      const hashedPin = await bcrypt.hash(newPin, 10);

      // DB güncelle + lockout sıfırla
      await db
        .update(branchStaffPins)
        .set({
          hashedPin,
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(branchStaffPins.id, pinRecord.id));

      // Şube adı (mail için)
      const [branch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, pinRecord.branchId))
        .limit(1);

      // Mail gönder
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, Segoe UI, sans-serif; background: #f5f5f5; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: #C0392B; padding: 30px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 28px;">DOSPRESSO</h1>
      <p style="color: #fff; margin: 8px 0 0; opacity: 0.9;">PIN Sıfırlama</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333;">Merhaba <strong>${user.firstName}</strong>,</p>
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        Kiosk PIN sıfırlama talebiniz alındı.
        ${branch?.name ? `<strong>${branch.name}</strong> şubesi için ` : ""}yeni PIN'iniz:
      </p>
      <div style="background: #192838; padding: 24px; border-radius: 10px; text-align: center; margin: 24px 0;">
        <div style="color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 8px;">Yeni PIN'iniz</div>
        <div style="font-size: 48px; font-weight: bold; color: #fff; font-family: 'Courier New', monospace; letter-spacing: 8px;">
          ${newPin}
        </div>
      </div>
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ Güvenlik Uyarısı</strong><br>
          - Bu PIN'i kimseyle paylaşmayın<br>
          - İlk kullanımdan sonra şube müdüründen PIN'inizi değiştirmesini isteyin<br>
          - Talebi siz yapmadıysanız hemen şube müdürüne haber verin
        </p>
      </div>
      <p style="font-size: 14px; color: #666; margin-top: 24px;">
        Bu mail otomatik olarak gönderildi. Yanıtlamayın.<br>
        Sorularınız için: <a href="mailto:destek@dospresso.com" style="color: #C0392B;">destek@dospresso.com</a>
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 16px; text-align: center; color: #999; font-size: 12px;">
      DOSPRESSO Coffee & Donut · Antalya, Türkiye<br>
      ${new Date().toLocaleString("tr-TR")}
    </div>
  </div>
</body>
</html>
      `;

      try {
        await sendEmail({
          to: user.email,
          subject: "DOSPRESSO — PIN Sıfırlama Talebi",
          html,
        });
      } catch (mailErr: any) {
        console.error("[pin-reset] Mail gönderilemedi:", mailErr);
        // Mail gitmediyse PIN'i geri al? Hayır - admin manuel bildirir.
        // Yine de admin'e bildirim
        return res.status(500).json({
          error:
            "Yeni PIN üretildi ancak mail gönderilemedi. Lütfen şube müdürüne başvurun.",
          mailFailed: true,
        });
      }

      // Audit log
      console.log(
        `[pin-reset] User=${user.id} (${user.firstName} ${user.lastName}) için yeni PIN üretildi ve mail gönderildi`
      );

      res.json({
        success: true,
        message:
          "Yeni PIN'iniz e-posta adresinize gönderildi. Lütfen birkaç dakika içinde kontrol edin.",
        email: user.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      });
    } catch (error: any) {
      console.error("[pin-reset/request]", error);
      res.status(500).json({
        error: "PIN sıfırlama başarısız oldu",
        message: error.message,
      });
    }
  }
);

export default router;
