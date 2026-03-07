import { Router, Request, Response } from 'express';
import { db } from '../db';
import { pushSubscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { sendPushNotification, cleanExpiredSubscriptions } from '../lib/push-service';

const router = Router();

router.get('/api/push/vapid-key', (req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notification yapılandırılmamış' });
  }
  res.json({ publicKey });
});

router.post('/api/push/subscribe', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?.id) return res.status(401).json({ error: 'Giriş gerekli' });

  const { endpoint, keys, deviceInfo } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Eksik subscription bilgisi' });
  }

  try {
    const existing = await db.select().from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      ));

    if (existing.length > 0) {
      await db.update(pushSubscriptions)
        .set({ p256dh: keys.p256dh, auth: keys.auth, isActive: true, updatedAt: new Date(), deviceInfo })
        .where(eq(pushSubscriptions.id, existing[0].id));
    } else {
      await db.insert(pushSubscriptions).values({
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceInfo: deviceInfo || null,
        isActive: true,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Push] Subscribe error:', error.message);
    res.status(500).json({ error: 'Subscription kaydedilemedi' });
  }
});

router.post('/api/push/unsubscribe', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?.id) return res.status(401).json({ error: 'Giriş gerekli' });

  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint gerekli' });

  try {
    await db.update(pushSubscriptions)
      .set({ isActive: false })
      .where(and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Push] Unsubscribe error:', error.message);
    res.status(500).json({ error: 'Unsubscribe başarısız' });
  }
});

router.post('/api/push/test', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?.id) return res.status(401).json({ error: 'Giriş gerekli' });

  try {
    await sendPushNotification(user.id, {
      title: 'DOSPRESSO Test',
      message: 'Push bildirimleri çalışıyor!',
      tag: 'test',
      link: '/',
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Push] Test error:', error.message);
    res.status(500).json({ error: 'Test bildirimi gönderilemedi' });
  }
});

router.post('/api/push/cleanup', async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?.id || !['admin', 'ceo', 'cgo'].includes(user.role)) {
    return res.status(403).json({ error: 'Yetkisiz' });
  }

  try {
    const cleaned = await cleanExpiredSubscriptions();
    res.json({ success: true, cleaned });
  } catch (error: any) {
    res.status(500).json({ error: 'Temizleme başarısız' });
  }
});

export default router;
